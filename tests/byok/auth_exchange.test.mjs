// tests/byok/auth_exchange.test.mjs
/**
 * Test suite for BYOK Auth Engine, Token Storage, and Concurrency Mutex.
 * Verifies OAuth URL construction, token exchange, credential storage,
 * concurrency-safe double-checked locking token refresh, and sign-out revocation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshTokens,
  getValidAccessToken,
  signOutChatGPT,
  getStoredSession,
  decodeJwtPayload,
  extractEmailFromIdToken,
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
} from '../../src/lib/byok/storage.js';

// In-memory isolated storage for testing
class MockStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(k) {
    return this._store.has(k) ? this._store.get(k) : null;
  }
  setItem(k, v) {
    this._store.set(k, String(v));
  }
  removeItem(k) {
    this._store.delete(k);
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
}

// Helper to create a fake JWT with given claims
function createMockJwt(payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode(header)}.${encode(payload)}.signature`;
}

test('buildAuthorizationUrl: constructs compliant SIWC authorization URL for dynamic registration', () => {
  const testHostId = 'urn:uuid:11111111-2222-3333-4444-555555555555';
  const urlString = buildAuthorizationUrl({
    state: 'test-state-123',
    nonce: 'test-nonce-456',
    codeChallenge: 'test-challenge-789',
    hostId: testHostId,
  });

  const parsed = new URL(urlString);
  assert.equal(parsed.origin, 'https://auth.openai.com');
  assert.equal(parsed.pathname, '/api/accounts/authorize');

  // Verify parameters
  assert.equal(parsed.searchParams.get('response_type'), 'code');
  assert.equal(parsed.searchParams.get('client_id'), DEFAULT_CLIENT_ID);
  assert.equal(parsed.searchParams.get('redirect_uri'), DEFAULT_REDIRECT_URI);
  assert.equal(parsed.searchParams.get('scope'), DEFAULT_SCOPES);
  assert.equal(parsed.searchParams.get('resource'), DEFAULT_RESOURCE);
  assert.equal(parsed.searchParams.get('code_challenge'), 'test-challenge-789');
  assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(parsed.searchParams.get('state'), 'test-state-123');
  assert.equal(parsed.searchParams.get('nonce'), 'test-nonce-456');

  // Dynamic registration requires agent_name_hint & ext_agent_host_id
  assert.equal(parsed.searchParams.get('agent_name_hint'), DEFAULT_AGENT_NAME);
  assert.equal(parsed.searchParams.get('ext_agent_host_id'), testHostId);
});

test('buildAuthorizationUrl: preserves issued client ID and suppresses agent_name_hint on reauth', () => {
  const testHostId = 'urn:uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const urlString = buildAuthorizationUrl({
    clientId: 'oaiapp_custom_client_id_999',
    state: 'state-reauth',
    nonce: 'nonce-reauth',
    codeChallenge: 'challenge-reauth',
    hostId: testHostId,
  });

  const parsed = new URL(urlString);
  assert.equal(parsed.searchParams.get('client_id'), 'oaiapp_custom_client_id_999');
  assert.equal(parsed.searchParams.get('ext_agent_host_id'), testHostId);
  // agent_name_hint must NOT be present on reauthorization with existing client ID
  assert.equal(parsed.searchParams.get('agent_name_hint'), null);
});

test('storage: maintains persistent host ID, session lifecycle, and token expiry logic', () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  // 1. Host ID persistence
  const hostId1 = getOrCreateHostId();
  assert.match(hostId1, /^urn:uuid:[0-9a-fA-F-]{36}$/);
  const hostId2 = getOrCreateHostId();
  assert.equal(hostId1, hostId2, 'Host ID must remain invariant across calls');

  // 2. Session saving and loading
  const fakeSession = {
    accessToken: 'test_access_token_123456789',
    refreshToken: 'test_refresh_token_987654321',
    idToken: createMockJwt({ email: 'user@kalpad.app' }),
    clientId: 'oaiapp_test_client',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'],
    expiresIn: 3600,
    email: 'user@kalpad.app',
  };

  const saved = saveSession(fakeSession);
  assert.equal(saved.clientId, 'oaiapp_test_client');
  assert.equal(saved.email, 'user@kalpad.app');
  assert.equal(saved.hasDirectInferenceScope, true);
  assert.equal(saved.hostId, hostId1);

  const loaded = loadSession();
  assert.ok(loaded);
  assert.equal(loaded.accessToken, 'test_access_token_123456789');
  assert.equal(loaded.refreshToken, 'test_refresh_token_987654321');
  assert.equal(loaded.email, 'user@kalpad.app');
  assert.equal(loaded.hasDirectInferenceScope, true);

  // 3. Expiration checks
  assert.equal(isTokenExpired(loaded, 60), false);
  // Expired within buffer:
  const almostExpiredSession = {
    ...loaded,
    expiresAtMillis: Date.now() + 30 * 1000, // 30s remaining, buffer is 60s
  };
  assert.equal(isTokenExpired(almostExpiredSession, 60), true);
  // Completely expired:
  const expiredSession = {
    ...loaded,
    expiresAtMillis: Date.now() - 1000,
  };
  assert.equal(isTokenExpired(expiredSession, 60), true);
  assert.equal(isTokenExpired(null), true);

  // 4. Token masking
  assert.equal(maskToken('test_access_token_123456789'), 'test...6789');
  assert.equal(maskToken('short'), '***');
  assert.equal(maskToken(''), '[EMPTY]');
  assert.equal(maskToken(null), '[EMPTY]');

  const redacted = redactSession(loaded);
  assert.equal(redacted.accessTokenMasked, 'test...6789');
  assert.equal(redacted.hasRefreshToken, true);
  assert.equal(redacted.hasIdToken, true);

  // 5. Session clear retains host ID
  clearSession();
  assert.equal(loadSession(), null);
  assert.equal(getOrCreateHostId(), hostId1, 'Host ID must survive session clear');

  // Reset storage
  setStorageBackend(null);
});

test('JWT helpers: decodeJwtPayload and extractEmailFromIdToken', () => {
  const jwt = createMockJwt({
    sub: 'auth0|123456',
    email: 'learner@example.com',
    name: 'KalPad Learner',
  });

  const payload = decodeJwtPayload(jwt);
  assert.equal(payload.sub, 'auth0|123456');
  assert.equal(payload.email, 'learner@example.com');

  const email = extractEmailFromIdToken(jwt);
  assert.equal(email, 'learner@example.com');

  assert.equal(decodeJwtPayload('invalid-jwt-token'), null);
  assert.equal(extractEmailFromIdToken(null), null);
});

test('exchangeAuthorizationCode: performs form POST to token endpoint and saves session', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedOptions = null;

  const mockIdToken = createMockJwt({ email: 'scholar@kalpad.app' });

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;

    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new_access_token_abc',
        refresh_token: 'new_refresh_token_xyz',
        id_token: mockIdToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
      }),
    };
  };

  try {
    const session = await exchangeAuthorizationCode({
      code: 'auth_code_from_callback',
      codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      clientId: 'oaiapp_issued_client_1',
      redirectUri: 'http://127.0.0.1:3000/auth/callback',
    });

    assert.equal(capturedUrl, 'https://auth.openai.com/api/accounts/oauth/token');
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(
      capturedOptions.headers['Content-Type'],
      'application/x-www-form-urlencoded'
    );

    const bodyParams = new URLSearchParams(capturedOptions.body);
    assert.equal(bodyParams.get('grant_type'), 'authorization_code');
    assert.equal(bodyParams.get('code'), 'auth_code_from_callback');
    assert.equal(bodyParams.get('code_verifier'), 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    assert.equal(bodyParams.get('client_id'), 'oaiapp_issued_client_1');
    assert.equal(bodyParams.get('redirect_uri'), 'http://127.0.0.1:3000/auth/callback');
    assert.equal(bodyParams.get('resource'), 'https://api.openai.com/v1');

    // Verify returned session
    assert.equal(session.accessToken, 'new_access_token_abc');
    assert.equal(session.refreshToken, 'new_refresh_token_xyz');
    assert.equal(session.email, 'scholar@kalpad.app');
    assert.equal(session.hasDirectInferenceScope, true);

    // Verify session persisted to storage
    const stored = loadSession();
    assert.equal(stored.accessToken, 'new_access_token_abc');
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});

test('exchangeAuthorizationCode: throws if chatgpt.tokens.use.direct scope is missing', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: 'identity_only_token',
      refresh_token: 'refresh_only',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile email', // Missing chatgpt.tokens.use.direct!
    }),
  });

  try {
    await assert.rejects(
      async () =>
        await exchangeAuthorizationCode({
          code: 'test_code',
          codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
          clientId: 'oaiapp_issued_client',
        }),
      /chatgpt\.tokens\.use\.direct missing/
    );
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});

test('refreshTokens & getValidAccessToken: serialized mutex with double-checked locking', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  // Initialize an expired session in storage
  saveSession({
    accessToken: 'stale_token_1',
    refreshToken: 'active_refresh_token_1',
    clientId: 'oaiapp_unit_test',
    scopes: ['openid', 'chatgpt.tokens.use.direct'],
    expiresAtMillis: Date.now() - 5000, // Expired
    email: 'concurrent@kalpad.app',
  });

  const originalFetch = globalThis.fetch;
  let refreshCallCount = 0;

  globalThis.fetch = async (url, options) => {
    refreshCallCount++;
    // Simulate network latency (20ms) to ensure concurrent callers arrive while in flight
    await new Promise((r) => setTimeout(r, 20));

    const bodyParams = new URLSearchParams(options.body);
    assert.equal(bodyParams.get('grant_type'), 'refresh_token');
    assert.equal(bodyParams.get('refresh_token'), 'active_refresh_token_1');
    assert.equal(bodyParams.get('client_id'), 'oaiapp_unit_test');

    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: `refreshed_access_token_${refreshCallCount}`,
        refresh_token: 'rotated_refresh_token_2',
        expires_in: 3600,
        scope: 'openid profile chatgpt.tokens.use.direct',
      }),
    };
  };

  try {
    // Fire 5 concurrent requests simultaneously for access tokens
    const results = await Promise.all([
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
    ]);

    // All 5 callers must receive the fresh token
    for (const token of results) {
      assert.equal(token, 'refreshed_access_token_1');
    }

    // CRITICAL: Refresh fetch MUST be called EXACTLY ONCE thanks to mutex double-checked locking!
    assert.equal(
      refreshCallCount,
      1,
      'Double-checked locking must prevent concurrent refresh network calls'
    );

    // Verify storage has rotated refresh token
    const stored = loadSession();
    assert.equal(stored.accessToken, 'refreshed_access_token_1');
    assert.equal(stored.refreshToken, 'rotated_refresh_token_2');
    assert.equal(isTokenExpired(stored, 60), false);
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});

test('refreshTokens: purges session and throws UNAUTHENTICATED on invalid_grant', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  saveSession({
    accessToken: 'stale_token',
    refreshToken: 'revoked_or_expired_refresh_token',
    clientId: 'oaiapp_unit_test',
    scopes: ['chatgpt.tokens.use.direct'],
    expiresAtMillis: Date.now() - 1000,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () =>
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'The refresh token was expired or revoked.',
      }),
  });

  try {
    await assert.rejects(
      async () => await refreshTokens(),
      (err) => {
        assert.equal(err.code, 'UNAUTHENTICATED');
        return true;
      }
    );

    // Session must be purged from storage
    assert.equal(loadSession(), null, 'Storage session must be purged after invalid_grant');
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});

test('signOutChatGPT: revokes refresh token and purges storage', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  saveSession({
    accessToken: 'access_to_sign_out',
    refreshToken: 'refresh_to_revoke_xyz',
    clientId: 'oaiapp_sign_out',
    scopes: ['chatgpt.tokens.use.direct'],
    expiresAtMillis: Date.now() + 100000,
  });

  const originalFetch = globalThis.fetch;
  let revokeUrl = null;
  let revokeBody = null;

  globalThis.fetch = async (url, options) => {
    revokeUrl = url;
    revokeBody = options.body;
    return { ok: true, status: 200, text: async () => '' };
  };

  try {
    await signOutChatGPT();

    assert.equal(revokeUrl, 'https://auth.openai.com/api/accounts/oauth/revoke');
    const params = new URLSearchParams(revokeBody);
    assert.equal(params.get('token'), 'refresh_to_revoke_xyz');
    assert.equal(params.get('token_type_hint'), 'refresh_token');
    assert.equal(params.get('client_id'), 'oaiapp_sign_out');

    // Storage session must be purged
    assert.equal(loadSession(), null);
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});

test('handleOAuthCallback: validates CSRF state and exchanges code', async () => {
  const mockStore = new MockStorage();
  setStorageBackend(mockStore);

  savePendingAuth({
    state: 'valid_csrf_state',
    codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    clientId: 'dynamic_agent_client',
    redirectUri: 'http://127.0.0.1:3000/auth/callback',
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: 'callback_access_token',
      refresh_token: 'callback_refresh_token',
      expires_in: 3600,
      scope: 'openid chatgpt.tokens.use.direct',
    }),
  });

  try {
    // 1. Rejects state mismatch
    await assert.rejects(
      async () =>
        await handleOAuthCallback({
          code: 'any_code',
          state: 'attacker_mismatched_state',
        }),
      /State mismatch/
    );

    // 2. Succeeds with valid state
    const session = await handleOAuthCallback({
      code: 'valid_oauth_code',
      state: 'valid_csrf_state',
      clientId: 'oaiapp_issued_by_callback',
    });

    assert.equal(session.accessToken, 'callback_access_token');
    assert.equal(session.clientId, 'oaiapp_issued_by_callback');
    assert.equal(getPendingAuth(), null, 'Pending auth should be cleared after exchange');
  } finally {
    globalThis.fetch = originalFetch;
    setStorageBackend(null);
  }
});
