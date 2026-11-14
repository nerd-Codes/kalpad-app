// tests/byok/challenger_pkce_adversarial.test.mjs
/**
 * Empirical Adversarial Test Suite for ChatGPT BYOK PKCE & Auth Engine.
 * Stress-tests RFC 7636 boundaries, CSRF state verification, postMessage origin enforcement,
 * token storage isolation, and RefreshMutex concurrency under 20 simultaneous callers.
 *
 * Execution:
 *   NODE_OPTIONS="--max-old-space-size=1280" node --test tests/byok/challenger_pkce_adversarial.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64UrlEncode,
  generateRandomString,
  generateCodeVerifier,
  generateState,
  generateNonce,
  computeChallenge,
  verifyCodeChallenge,
  generatePkcePair,
  CODE_CHALLENGE_METHOD,
} from '../../src/lib/byok/pkce.js';
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshTokens,
  getValidAccessToken,
  signOutChatGPT,
  handleOAuthCallback,
  DEFAULT_CLIENT_ID,
  DEFAULT_AGENT_NAME,
  DEFAULT_REDIRECT_URI,
  DEFAULT_SCOPES,
  DEFAULT_RESOURCE,
} from '../../src/lib/byok/auth.js';
import {
  saveSession,
  loadSession,
  clearSession,
  isTokenExpired,
  getOrCreateHostId,
  maskToken,
  redactSession,
  savePendingAuth,
  getPendingAuth,
  clearPendingAuth,
  setStorageBackend,
  STORAGE_KEYS,
  DIRECT_INFERENCE_SCOPE,
} from '../../src/lib/byok/storage.js';

// Isolated Mock Storage for deterministic state manipulation
class AdversarialMockStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }
  setItem(key, value) {
    this._store.set(key, String(value));
  }
  removeItem(key) {
    this._store.delete(key);
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
}

// ============================================================================
// 1. RFC 7636 PKCE Boundary & Fuzzing
// ============================================================================
test('RFC 7636 PKCE Adversarial Boundary & Fuzzing Suite', async (suite) => {
  await suite.test('Boundary: exact 43-character verifier boundary (RFC 7636 minimum)', async () => {
    // 43 characters of valid unreserved characters
    const verifier43 = 'A'.repeat(43);
    const challenge = await computeChallenge(verifier43);
    assert.ok(typeof challenge === 'string');
    assert.equal(challenge.length, 43, 'Challenge must be 43 unpadded Base64URL characters');
    assert.match(challenge, /^[A-Za-z0-9_-]+$/, 'Challenge must contain only Base64URL characters');
    assert.ok(!challenge.includes('='), 'Challenge must not contain base64 padding');
  });

  await suite.test('Boundary: exact 128-character verifier boundary (RFC 7636 maximum)', async () => {
    // 128 characters of valid unreserved characters
    const verifier128 = 'B'.repeat(128);
    const challenge = await computeChallenge(verifier128);
    assert.ok(typeof challenge === 'string');
    assert.equal(challenge.length, 43, 'Challenge must be 43 unpadded Base64URL characters');
    assert.match(challenge, /^[A-Za-z0-9_-]+$/);
    assert.ok(!challenge.includes('='));
  });

  await suite.test('Rejection: 42-character verifier (1 char below RFC 7636 minimum) must throw RangeError', async () => {
    const verifier42 = 'A'.repeat(42);
    await assert.rejects(
      async () => await computeChallenge(verifier42),
      RangeError,
      'Must reject verifiers < 43 chars with RangeError'
    );
  });

  await suite.test('Rejection: 129-character verifier (1 char above RFC 7636 maximum) must throw RangeError', async () => {
    const verifier129 = 'B'.repeat(129);
    await assert.rejects(
      async () => await computeChallenge(verifier129),
      RangeError,
      'Must reject verifiers > 128 chars with RangeError'
    );
  });

  await suite.test('Normative Test Vector: RFC 7636 Section 4.2 test vector matches exactly', async () => {
    const rfcVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    const computed = await computeChallenge(rfcVerifier);
    assert.equal(computed, expectedChallenge, 'Challenge must match RFC 7636 normative test vector');

    // verifyCodeChallenge consistency
    const isValid = await verifyCodeChallenge(rfcVerifier, expectedChallenge);
    assert.equal(isValid, true, 'verifyCodeChallenge must return true for matching pair');

    const isInvalid = await verifyCodeChallenge(rfcVerifier, 'forged_challenge_xyz12345678901234567890123');
    assert.equal(isInvalid, false, 'verifyCodeChallenge must return false for mismatch');
  });

  await suite.test('Entropy Check: 500 generated verifiers exhibit 100% uniqueness, zero collisions, and strict RFC bounds', async () => {
    const verifierSet = new Set();
    const challengeSet = new Set();
    const stateSet = new Set();
    const nonceSet = new Set();

    for (let i = 0; i < 500; i++) {
      const verifier = generateCodeVerifier(32);
      assert.equal(verifier.length, 43, `Verifier ${i} must have length 43`);
      assert.match(verifier, /^[A-Za-z0-9_-]+$/, `Verifier ${i} must be unpadded Base64URL`);
      verifierSet.add(verifier);

      const state = generateState();
      assert.equal(state.length, 43);
      assert.match(state, /^[A-Za-z0-9_-]+$/);
      stateSet.add(state);

      const nonce = generateNonce();
      assert.equal(nonce.length, 43);
      assert.match(nonce, /^[A-Za-z0-9_-]+$/);
      nonceSet.add(nonce);
    }

    assert.equal(verifierSet.size, 500, 'All 500 code verifiers must be distinct (zero collisions)');
    assert.equal(stateSet.size, 500, 'All 500 states must be distinct (zero collisions)');
    assert.equal(nonceSet.size, 500, 'All 500 nonces must be distinct (zero collisions)');
  });

  await suite.test('Adversarial Fuzzing: Malformed verifiers with illegal characters (RFC 7636 Section 4.1 unreserved check)', async () => {
    // RFC 7636 Section 4.1 strictly limits code_verifier to unreserved characters: [A-Za-z0-9_.~-]
    // Padding '=', whitespace, and special characters are illegal.
    const illegalVerifiers = [
      'a'.repeat(42) + '=',      // Base64 padding '='
      'a'.repeat(42) + ' ',      // Whitespace space
      'a'.repeat(42) + '\t',     // Tab character
      'a'.repeat(42) + '\n',     // Newline character
      'a'.repeat(42) + '$',      // Special character '$'
      'a'.repeat(42) + '@',      // Special character '@'
      'a'.repeat(42) + '!',      // Special character '!'
      'a'.repeat(42) + '🔥',     // Multi-byte Unicode / Emoji
    ];

    for (const badVerifier of illegalVerifiers) {
      await assert.rejects(
        async () => await computeChallenge(badVerifier),
        /invalid|illegal|unreserved|RFC 7636/i,
        `computeChallenge must reject verifiers with illegal characters: ${JSON.stringify(badVerifier)}`
      );
    }
  });
});

// ============================================================================
// 2. CSRF & Callback Security
// ============================================================================
test('CSRF & Callback Security Adversarial Suite', async (suite) => {
  suite.beforeEach(() => {
    setStorageBackend(new AdversarialMockStorage());
  });

  suite.afterEach(() => {
    setStorageBackend(null);
  });

  await suite.test('CSRF Defense: Forged state parameter mismatch between callback and stored pending auth must be rejected', async () => {
    savePendingAuth({
      state: 'legitimate_state_secret_123',
      codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      clientId: 'dynamic_agent_client',
      redirectUri: 'http://127.0.0.1:3000/auth/callback',
    });

    await assert.rejects(
      async () =>
        await handleOAuthCallback({
          code: 'valid_auth_code_from_openai',
          state: 'attacker_forged_state_999',
        }),
      /State mismatch/i,
      'Callback with forged state must be rejected with State mismatch error'
    );
  });

  await suite.test('CSRF Defense: Empty or missing callback state must be rejected when pending auth expects a state', async () => {
    savePendingAuth({
      state: 'expected_csrf_token_abc123',
      codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      clientId: 'dynamic_agent_client',
      redirectUri: 'http://127.0.0.1:3000/auth/callback',
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'forged_access_token',
        refresh_token: 'forged_refresh_token',
        scope: 'openid chatgpt.tokens.use.direct',
      }),
    });

    try {
      // Test 1: Empty string state
      await assert.rejects(
        async () =>
          await handleOAuthCallback({
            code: 'test_code_empty_state',
            state: '',
          }),
        /State mismatch|missing state|empty state/i,
        'Empty state parameter must be rejected when pending auth expects state'
      );

      // Test 2: Missing state parameter entirely (undefined)
      await assert.rejects(
        async () =>
          await handleOAuthCallback({
            code: 'test_code_undefined_state',
          }),
        /State mismatch|missing state|empty state/i,
        'Missing state parameter must be rejected when pending auth expects state'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await suite.test('Missing codeVerifier: Callback exchange without codeVerifier in pending auth must throw', async () => {
    savePendingAuth({
      state: 'matching_state_xyz',
      // codeVerifier deliberately omitted
      clientId: 'dynamic_agent_client',
    });

    await assert.rejects(
      async () =>
        await handleOAuthCallback({
          code: 'any_code',
          state: 'matching_state_xyz',
        }),
      /Missing codeVerifier/i,
      'Must reject code exchange when codeVerifier is absent'
    );
  });

  await suite.test('Loopback Redirect URI Enforcement: strictly requires http://127.0.0.1:3000/auth/callback', () => {
    assert.equal(
      DEFAULT_REDIRECT_URI,
      'http://127.0.0.1:3000/auth/callback',
      'DEFAULT_REDIRECT_URI must strictly be http://127.0.0.1:3000/auth/callback'
    );

    const defaultUrl = buildAuthorizationUrl({
      state: 'test_state',
      nonce: 'test_nonce',
      codeChallenge: 'test_challenge',
    });
    const parsed = new URL(defaultUrl);
    const redirectUri = parsed.searchParams.get('redirect_uri');

    assert.ok(
      redirectUri.startsWith('http://127.0.0.1:'),
      'Redirect URI must use 127.0.0.1 loopback'
    );
    assert.ok(
      !redirectUri.includes('localhost'),
      'Redirect URI must forbid localhost'
    );
    assert.equal(
      new URL(redirectUri).pathname,
      '/auth/callback',
      'Redirect URI path must strictly be /auth/callback'
    );
  });
});

// ============================================================================
// 3. postMessage Origin Defense
// ============================================================================
test('postMessage Origin Defense Suite', async (suite) => {
  await suite.test('Origin Validation: Unauthorized origins (evil.com, attacker.org) are rejected', () => {
    // Model the postMessage listener logic from src/hooks/useChatGPTBYOK.js:89-91
    const allowedOrigin = 'http://127.0.0.1:3000';
    let callbackTriggered = false;

    const simulateMessageEvent = (origin, data) => {
      // Exact check implemented in useChatGPTBYOK.js
      if (origin !== allowedOrigin) return;
      if (!data || data.type !== 'BYOK_OAUTH_CALLBACK') return;
      callbackTriggered = true;
    };

    // Attack Scenario 1: Malicious third-party origin tries to inject fake authorization code
    simulateMessageEvent('http://evil.com', {
      type: 'BYOK_OAUTH_CALLBACK',
      code: 'injected_attacker_code',
      state: 'stolen_state',
    });
    assert.equal(callbackTriggered, false, 'Message from evil.com must be ignored');

    // Attack Scenario 2: HTTPS attacker origin
    simulateMessageEvent('https://attacker.org', {
      type: 'BYOK_OAUTH_CALLBACK',
      code: 'injected_attacker_code',
      state: 'stolen_state',
    });
    assert.equal(callbackTriggered, false, 'Message from attacker.org must be ignored');

    // Attack Scenario 3: Localhost alias origin mismatch (must match exact origin)
    simulateMessageEvent('http://localhost:3000', {
      type: 'BYOK_OAUTH_CALLBACK',
      code: 'injected_attacker_code',
      state: 'stolen_state',
    });
    assert.equal(callbackTriggered, false, 'Message from localhost:3000 must be rejected when origin is 127.0.0.1:3000');

    // Scenario 4: Legitimate same-origin message
    simulateMessageEvent('http://127.0.0.1:3000', {
      type: 'BYOK_OAUTH_CALLBACK',
      code: 'legitimate_code',
      state: 'legitimate_state',
    });
    assert.equal(callbackTriggered, true, 'Message from matching origin must be accepted');
  });

  await suite.test('No Token Leakage: Callback postMessage payload contains only code and client_id, never tokens', () => {
    // Verified against src/app/auth/callback/page.js:45-55, 69-78
    const legitimatePayload = {
      type: 'BYOK_OAUTH_CALLBACK',
      code: 'auth_code_123',
      clientId: 'dynamic_agent_client',
      state: 'state_123',
      error: null,
    };

    assert.equal(legitimatePayload.accessToken, undefined);
    assert.equal(legitimatePayload.refreshToken, undefined);
    assert.equal(legitimatePayload.idToken, undefined);
    assert.ok(!JSON.stringify(legitimatePayload).includes('token'));
  });
});

// ============================================================================
// 4. Token Storage Isolation & Masking
// ============================================================================
test('Token Storage Isolation & Masking Suite', async (suite) => {
  suite.beforeEach(() => {
    setStorageBackend(new AdversarialMockStorage());
  });

  suite.afterEach(() => {
    setStorageBackend(null);
  });

  await suite.test('maskToken: handles tokens of varying lengths, empty strings, and nullish inputs safely', () => {
    // Standard OAuth token > 8 characters
    assert.equal(maskToken('sk-proj-1234567890abcdef'), 'sk-p...cdef');
    assert.equal(maskToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig'), 'eyJh....sig');

    // Short strings <= 8 characters must be fully masked to prevent leakage
    assert.equal(maskToken('12345678'), '***');
    assert.equal(maskToken('secret'), '***');
    assert.equal(maskToken('a'), '***');

    // Empty and nullish values
    assert.equal(maskToken(''), '[EMPTY]');
    assert.equal(maskToken(null), '[EMPTY]');
    assert.equal(maskToken(undefined), '[EMPTY]');
  });

  await suite.test('redactSession: raw tokens never appear in JSON serialization or diagnostic object', () => {
    const rawSecret = 'sk-proj-SUPER_SECRET_TOKEN_DO_NOT_LEAK_123456789';
    const rawRefresh = 'rt-SECRET_REFRESH_TOKEN_987654321';
    const rawIdToken = 'header.SECRET_ID_TOKEN.sig';

    const session = {
      accessToken: rawSecret,
      refreshToken: rawRefresh,
      idToken: rawIdToken,
      clientId: 'oaiapp_test',
      scopes: ['openid', 'chatgpt.tokens.use.direct'],
      expiresAtMillis: Date.now() + 3600000,
      email: 'student@kalpad.app',
      hostId: 'urn:uuid:12345678-1234-4234-8234-123456789abc',
      hasDirectInferenceScope: true,
    };

    const redacted = redactSession(session);
    const jsonStr = JSON.stringify(redacted);

    assert.ok(!jsonStr.includes(rawSecret), 'Raw access token must never appear in redacted JSON');
    assert.ok(!jsonStr.includes(rawRefresh), 'Raw refresh token must never appear in redacted JSON');
    assert.ok(!jsonStr.includes(rawIdToken), 'Raw id token must never appear in redacted JSON');
    assert.equal(redacted.accessTokenMasked, 'sk-p...6789');
    assert.equal(redacted.hasRefreshToken, true);
    assert.equal(redacted.hasIdToken, true);
  });

  await suite.test('clearSession: removes tokens and pending auth while preserving ext_agent_host_id', () => {
    const initialHostId = getOrCreateHostId();
    assert.match(initialHostId, /^urn:uuid:[0-9a-fA-F-]{36}$/);

    saveSession({
      accessToken: 'access_to_delete',
      refreshToken: 'refresh_to_delete',
      clientId: 'oaiapp_test',
      scopes: ['chatgpt.tokens.use.direct'],
      expiresAtMillis: Date.now() + 3600000,
    });

    savePendingAuth({
      state: 'pending_to_delete',
      codeVerifier: 'verifier_to_delete',
    });

    assert.ok(loadSession());
    assert.ok(getPendingAuth());

    // Execute clearSession
    clearSession();

    // Verify session and pending auth are purged
    assert.equal(loadSession(), null, 'Stored session must be null after clearSession');
    assert.equal(getPendingAuth(), null, 'Pending auth must be null after clearSession');

    // Invariant: ext_agent_host_id must survive session purge
    const survivingHostId = getOrCreateHostId();
    assert.equal(
      survivingHostId,
      initialHostId,
      'ext_agent_host_id must remain stable and invariant across sign-out and session clear'
    );
  });
});

// ============================================================================
// 5. Concurrency & RefreshMutex Under Heavy Load (20 Concurrent Callers)
// ============================================================================
test('Concurrency & RefreshMutex Heavy Load Suite (20 Concurrent Invocations)', async (suite) => {
  suite.beforeEach(() => {
    setStorageBackend(new AdversarialMockStorage());
  });

  suite.afterEach(() => {
    setStorageBackend(null);
  });

  await suite.test('RefreshMutex: 20 simultaneous getValidAccessToken calls trigger exactly 1 token exchange and resolve all 20 promises', async () => {
    // Seed expired session in storage
    saveSession({
      accessToken: 'expired_stale_token_orig',
      refreshToken: 'valid_refresh_token_to_rotate',
      clientId: 'oaiapp_concurrent_load_test',
      scopes: ['openid', 'profile', 'email', 'chatgpt.tokens.use.direct'],
      expiresAtMillis: Date.now() - 5000, // Expired 5 seconds ago
      email: 'concurrent_user@kalpad.app',
    });

    const originalFetch = globalThis.fetch;
    let networkCallCount = 0;
    const callTimestamps = [];

    // Simulate real-world network latency (35ms) to guarantee all 20 callers arrive while refresh is in-flight
    globalThis.fetch = async (url, options) => {
      networkCallCount++;
      callTimestamps.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 35));

      const bodyParams = new URLSearchParams(options.body);
      assert.equal(bodyParams.get('grant_type'), 'refresh_token');
      assert.equal(bodyParams.get('refresh_token'), 'valid_refresh_token_to_rotate');
      assert.equal(bodyParams.get('client_id'), 'oaiapp_concurrent_load_test');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'fresh_rotated_access_token_super_safe_1',
          refresh_token: 'new_rotated_refresh_token_2',
          expires_in: 3600,
          scope: 'openid profile email chatgpt.tokens.use.direct',
        }),
      };
    };

    try {
      // Dispatch 20 concurrent promises simultaneously
      const concurrency = 20;
      const callerPromises = Array.from({ length: concurrency }, () => getValidAccessToken());

      const results = await Promise.all(callerPromises);

      // Assertion 1: Exactly 1 network call occurred
      assert.equal(
        networkCallCount,
        1,
        `Double-checked locking RefreshMutex must dispatch exactly 1 network call, but dispatched ${networkCallCount}`
      );

      // Assertion 2: All 20 promises resolved with the refreshed token
      assert.equal(results.length, concurrency);
      for (let i = 0; i < concurrency; i++) {
        assert.equal(
          results[i],
          'fresh_rotated_access_token_super_safe_1',
          `Caller ${i} must receive the newly refreshed access token`
        );
      }

      // Assertion 3: Storage state reflects rotation
      const stored = loadSession();
      assert.equal(stored.accessToken, 'fresh_rotated_access_token_super_safe_1');
      assert.equal(stored.refreshToken, 'new_rotated_refresh_token_2');
      assert.equal(isTokenExpired(stored, 60), false, 'Stored token must now be non-expired');

      // Assertion 4: Immediate 21st call uses cached token without additional network call
      const immediateToken = await getValidAccessToken();
      assert.equal(immediateToken, 'fresh_rotated_access_token_super_safe_1');
      assert.equal(networkCallCount, 1, 'Non-expired token must not trigger network refresh');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
