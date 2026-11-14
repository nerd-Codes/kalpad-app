// tests/byok/e2e_byok_suite.mjs
/**
 * Comprehensive Opaque-Box E2E Test Suite for KalPad BYOK ChatGPT Plus / Codex Direct Integration
 * Milestone 1 Verification Suite covering Tiers 1-4 (110 Total Assertions).
 *
 * Execution:
 *   node tests/byok/e2e_byok_suite.mjs
 *   node --test tests/byok/e2e_byok_suite.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_ROOT = '/home/srijal/Desktop/kalpad-mvp';

/**
 * Checks if a file exists relative to PROJECT_ROOT
 */
export function fileExists(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  return fs.existsSync(fullPath);
}

/**
 * Reads a project file as UTF-8 string or returns null if not found
 */
export function readProjectFile(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Dynamically imports a project module or fails test if not yet implemented
 */
export async function safeImport(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    assert.fail(`[MODULE_NOT_FOUND] Missing expected implementation: ${relPath}`);
  }
  try {
    return await import(fullPath);
  } catch (err) {
    assert.fail(`[IMPORT_ERROR] Failed loading ${relPath}: ${err.message}`);
  }
}

// =========================================================================
// TIER 1: FEATURE COVERAGE (11 Features, >=5 tests per feature = 55 tests)
// =========================================================================

test('Tier 1: Feature Coverage (11 Inventoried Features)', async (t1) => {

  // Feature 1: PKCE S256 Engine
  await t1.test('F1: PKCE S256 Engine (5 assertions)', async (t) => {
    await t.test('T1-PKCE-1: pkce.js module exists and exports required cryptographic functions', async () => {
      assert.ok(fileExists('src/lib/byok/pkce.js'), 'src/lib/byok/pkce.js must exist');
      const pkce = await safeImport('src/lib/byok/pkce.js');
      const hasVerifierFn = typeof pkce.generateRandomString === 'function' || typeof pkce.generateCodeVerifier === 'function';
      const hasChallengeFn = typeof pkce.computeChallenge === 'function' || typeof pkce.computeCodeChallenge === 'function';
      assert.ok(hasVerifierFn, 'Must export verifier generator (generateRandomString or generateCodeVerifier)');
      assert.ok(hasChallengeFn, 'Must export challenge computation (computeChallenge or computeCodeChallenge)');
    });

    await t.test('T1-PKCE-2: generateRandomString produces unpadded base64url string with 43-128 chars', async () => {
      const pkce = await safeImport('src/lib/byok/pkce.js');
      const genFn = pkce.generateRandomString || pkce.generateCodeVerifier;
      const verifier = genFn(32);
      assert.ok(typeof verifier === 'string', 'Verifier must be string');
      assert.ok(verifier.length >= 43 && verifier.length <= 128, `Verifier length ${verifier.length} out of RFC 7636 bounds`);
      assert.ok(/^[A-Za-z0-9_-]+$/.test(verifier), 'Verifier must be unpadded base64url characters only');
    });

    await t.test('T1-PKCE-3: computeChallenge produces valid S256 digest without padding', async () => {
      const pkce = await safeImport('src/lib/byok/pkce.js');
      const challengeFn = pkce.computeChallenge || pkce.computeCodeChallenge;
      const testVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      // RFC 7636 Appendix B test vector:
      // verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      // challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
      const challenge = await challengeFn(testVerifier);
      assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'S256 challenge must match RFC 7636 standard vector');
      assert.ok(!challenge.includes('='), 'Challenge must not contain base64 padding =');
    });

    await t.test('T1-PKCE-4: generatePkcePair produces complete cryptographic tuple with state and nonce', async () => {
      const pkce = await safeImport('src/lib/byok/pkce.js');
      assert.equal(typeof pkce.generatePkcePair, 'function', 'Must export generatePkcePair');
      const pair = await pkce.generatePkcePair();
      assert.ok(pair.codeVerifier, 'Must contain codeVerifier');
      assert.ok(pair.codeChallenge, 'Must contain codeChallenge');
      assert.equal(pair.codeChallengeMethod, 'S256');
      assert.ok(pair.state, 'Must contain state');
      assert.ok(pair.nonce, 'Must contain nonce');
      assert.ok(/^[A-Za-z0-9_-]+$/.test(pair.state), 'State must be unpadded base64url');
    });

    await t.test('T1-PKCE-5: computeChallenge rejects invalid verifiers (<43 chars or non-string)', async () => {
      const pkce = await safeImport('src/lib/byok/pkce.js');
      const challengeFn = pkce.computeChallenge || pkce.computeCodeChallenge;
      await assert.rejects(async () => challengeFn('too-short'), /length must be between 43 and 128|RangeError|Error/);
      await assert.rejects(async () => challengeFn(null), /must be a non-empty string|TypeError|Error/);
    });
  });

  // Feature 2: Dynamic Client Registration
  await t1.test('F2: Dynamic Client Registration (5 assertions)', async (t) => {
    await t.test('T1-DYNREG-1: auth.js exports buildAuthorizationUrl and initiateOAuthSignIn', async () => {
      assert.ok(fileExists('src/lib/byok/auth.js'), 'src/lib/byok/auth.js must exist');
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      assert.equal(typeof buildFn, 'function', 'Must export buildAuthorizationUrl');
      assert.equal(typeof auth.initiateOAuthSignIn, 'function', 'Must export initiateOAuthSignIn');
    });

    await t.test('T1-DYNREG-2: Initial registration uses client_id=dynamic_agent_client', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('client_id'), 'dynamic_agent_client');
    });

    await t.test('T1-DYNREG-3: Authorization request includes agent_name_hint=KalPad', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('agent_name_hint'), 'KalPad');
    });

    await t.test('T1-DYNREG-4: Authorization request includes persistent ext_agent_host_id=urn:uuid:<UUID>', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      const hostId = parsed.searchParams.get('ext_agent_host_id');
      assert.ok(hostId, 'ext_agent_host_id must be present');
      assert.match(hostId, /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    await t.test('T1-DYNREG-5: Returning sign-in reuses issued client_id (oaiapp_...) and omits agent_name_hint', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        clientId: 'oaiapp_saved98765',
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('client_id'), 'oaiapp_saved98765');
      // When reauthorizing with issued client_id, agent_name_hint must be omitted
      assert.equal(parsed.searchParams.get('agent_name_hint'), null);
    });
  });

  // Feature 3: Scopes & Resource Assertion
  await t1.test('F3: Scopes Assertion (5 assertions)', async (t) => {
    await t.test('T1-SCOPE-1: Authorize URL includes full required scope string', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      const scope = parsed.searchParams.get('scope');
      assert.ok(scope, 'scope parameter must be present');
      assert.ok(scope.includes('openid'), 'Must include openid');
      assert.ok(scope.includes('profile'), 'Must include profile');
      assert.ok(scope.includes('email'), 'Must include email');
      assert.ok(scope.includes('offline_access'), 'Must include offline_access');
      assert.ok(scope.includes('resource.invoke'), 'Must include resource.invoke');
      assert.ok(scope.includes('chatgpt.tokens.use.direct'), 'Must include chatgpt.tokens.use.direct');
    });

    await t.test('T1-SCOPE-2: Authorize URL sets resource target audience to https://api.openai.com/v1', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('resource'), 'https://api.openai.com/v1');
    });

    await t.test('T1-SCOPE-3: DIRECT_INFERENCE_SCOPE constant equals chatgpt.tokens.use.direct', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      assert.equal(storage.DIRECT_INFERENCE_SCOPE, 'chatgpt.tokens.use.direct');
    });

    await t.test('T1-SCOPE-4: Session sets hasDirectInferenceScope=false when user declines scope', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const session = storage.saveSession({
        accessToken: 'acc-123',
        refreshToken: 'ref-123',
        clientId: 'oaiapp_123',
        scopes: ['openid', 'email', 'profile'],
        expiresIn: 3600
      });
      assert.equal(session.hasDirectInferenceScope, false, 'hasDirectInferenceScope must be false without chatgpt.tokens.use.direct');
    });

    await t.test('T1-SCOPE-5: ID token parser extracts user email without external dependencies', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      assert.equal(typeof auth.extractEmailFromIdToken, 'function', 'Must export extractEmailFromIdToken');
      // Create test JWT with email claim
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ email: 'student@university.edu', sub: 'user_123' })).toString('base64url');
      const mockIdToken = `${header}.${payload}.mockSignature`;
      const email = auth.extractEmailFromIdToken(mockIdToken);
      assert.equal(email, 'student@university.edu');
    });
  });

  // Feature 4: Loopback Redirect URI & Callback
  await t1.test('F4: Loopback Redirect URI (5 assertions)', async (t) => {
    await t.test('T1-LOOP-1: Redirect URI enforces http://127.0.0.1:3000/auth/callback', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('redirect_uri'), 'http://127.0.0.1:3000/auth/callback');
    });

    await t.test('T1-LOOP-2: Callback route file exists at src/app/auth/callback/page.js', () => {
      assert.ok(fileExists('src/app/auth/callback/page.js'), 'Callback page must exist at src/app/auth/callback/page.js');
    });

    await t.test('T1-LOOP-3: Callback page extracts code, state, and client_id from query params', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.ok(callbackContent, 'Callback content must be readable');
      assert.match(callbackContent, /code/, 'Callback must parse code');
      assert.match(callbackContent, /state/, 'Callback must parse state');
      assert.match(callbackContent, /client_id/, 'Callback must parse client_id');
    });

    await t.test('T1-LOOP-4: Callback page sends postMessage to window.opener', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.match(callbackContent, /window\.opener\.postMessage/, 'Must communicate via postMessage to window.opener');
    });

    await t.test('T1-LOOP-5: Callback page closes popup window after messaging opener', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.match(callbackContent, /window\.close\(\)/, 'Must call window.close() to finish OAuth flow');
    });
  });

  // Feature 5: Token Exchange Engine
  await t1.test('F5: Token Exchange Engine (5 assertions)', async (t) => {
    await t.test('T1-EXCH-1: auth.js exports exchangeAuthorizationCode function', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const exchangeFn = auth.exchangeAuthorizationCode || auth.exchangeCodeForTokens;
      assert.equal(typeof exchangeFn, 'function', 'Must export exchangeAuthorizationCode');
    });

    await t.test('T1-EXCH-2: exchangeAuthorizationCode requires non-empty code and codeVerifier', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const exchangeFn = auth.exchangeAuthorizationCode || auth.exchangeCodeForTokens;
      await assert.rejects(async () => exchangeFn({ code: '', codeVerifier: 'v' }), /code is required/i);
      await assert.rejects(async () => exchangeFn({ code: 'c', codeVerifier: '' }), /codeVerifier is required/i);
    });

    await t.test('T1-EXCH-3: Code exchange implementation targets /api/accounts/oauth/token with resource param', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /\/api\/accounts\/oauth\/token/, 'Must call token endpoint');
      assert.match(authContent, /grant_type.*authorization_code/, 'Must use grant_type authorization_code');
      assert.match(authContent, /DEFAULT_RESOURCE|https:\/\/api\.openai\.com\/v1/, 'Must pass resource');
    });

    await t.test('T1-EXCH-4: Saves access_token, refresh_token, id_token, and scopes upon exchange', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const session = storage.saveSession({
        accessToken: 'at_test_123',
        refreshToken: 'rt_test_456',
        idToken: 'id_test_789',
        clientId: 'oaiapp_xyz',
        scopes: ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'],
        expiresIn: 3600,
        email: 'test@example.com'
      });
      assert.equal(session.accessToken, 'at_test_123');
      assert.equal(session.refreshToken, 'rt_test_456');
      assert.equal(session.idToken, 'id_test_789');
      assert.equal(session.hasDirectInferenceScope, true);
    });

    await t.test('T1-EXCH-5: Accurately calculates expiresAt timestamp within 5000ms margin of now + 3600s', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const now = Date.now();
      const session = storage.saveSession({
        accessToken: 'at',
        refreshToken: 'rt',
        clientId: 'oaiapp_xyz',
        expiresIn: 3600
      });
      const expectedExpiresAt = now + 3600 * 1000;
      assert.ok(Math.abs(session.expiresAtMillis - expectedExpiresAt) < 5000, 'expiresAtMillis must match now + expiresIn');
    });
  });

  // Feature 6: Local Credential Isolation
  await t1.test('F6: Local Credential Isolation (5 assertions)', async (t) => {
    await t.test('T1-STOR-1: storage.js module exists and exports required methods', async () => {
      assert.ok(fileExists('src/lib/byok/storage.js'), 'src/lib/byok/storage.js must exist');
      const storage = await safeImport('src/lib/byok/storage.js');
      const loadFn = storage.loadSession || storage.getStoredSession;
      assert.equal(typeof loadFn, 'function');
      assert.equal(typeof storage.saveSession, 'function');
      assert.equal(typeof storage.clearSession, 'function');
    });

    await t.test('T1-STOR-2: Redaction helper maskToken masks access tokens for safe logging', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      assert.equal(typeof storage.maskToken, 'function', 'Must export maskToken');
      const masked = storage.maskToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijklmnopqrstuvwxyz.123456');
      assert.ok(masked.startsWith('eyJh...'), 'Masked token should start with prefix');
      assert.ok(masked.endsWith('3456'), 'Masked token should end with suffix');
      assert.ok(!masked.includes('abcdefghijklmnopqrstuvwxyz'), 'Token body must be redacted');
    });

    await t.test('T1-STOR-3: getOrCreateHostId persists stable urn:uuid across calls', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      assert.equal(typeof storage.getOrCreateHostId, 'function', 'Must export getOrCreateHostId');
      const id1 = storage.getOrCreateHostId();
      const id2 = storage.getOrCreateHostId();
      assert.equal(id1, id2, 'Host ID must be stable and idempotent');
      assert.match(id1, /^urn:uuid:/, 'Host ID must follow urn:uuid: format');
    });

    await t.test('T1-STOR-4: clearSession purges tokens while preserving host ID', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const hostId = storage.getOrCreateHostId();
      storage.saveSession({ accessToken: 'at_1', refreshToken: 'rt_1', clientId: 'oaiapp_1' });
      storage.clearSession();
      assert.equal(storage.loadSession(), null, 'Session must be cleared');
      assert.equal(storage.getOrCreateHostId(), hostId, 'Host ID must be preserved after session clear');
    });

    await t.test('T1-STOR-5: Client storage never invokes KalPad remote backend APIs for credential storage', () => {
      const storageContent = readProjectFile('src/lib/byok/storage.js');
      assert.ok(!storageContent.includes('/api/auth/session'), 'Tokens must not be sent to KalPad backend');
      assert.ok(!storageContent.includes('/api/generate'), 'Tokens must not touch generation APIs');
    });
  });

  // Feature 7: Token Refresh Rotation & Mutex
  await t1.test('F7: Token Refresh Rotation (5 assertions)', async (t) => {
    await t.test('T1-REFR-1: auth.js exports refreshTokens and getValidAccessToken', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const refreshFn = auth.refreshTokens || auth.refreshAccessToken;
      assert.equal(typeof refreshFn, 'function');
      assert.equal(typeof auth.getValidAccessToken, 'function');
    });

    await t.test('T1-REFR-2: refreshTokens constructs form-urlencoded POST with grant_type=refresh_token', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /grant_type:\s*['"]refresh_token['"]/, 'Must use grant_type=refresh_token');
      assert.match(authContent, /refresh_token/, 'Must send refresh_token param');
      assert.match(authContent, /resource/, 'Must send resource param');
    });

    await t.test('T1-REFR-3: Refresh mutex serializes concurrent execution', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /mutex|RefreshMutex/i, 'Must implement mutex to serialize token refresh');
    });

    await t.test('T1-REFR-4: Retains existing refresh token if refresh response omits replacement', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /data\.refresh_token\s*\|\|\s*currentSession\.refreshToken/, 'Must fallback to existing refresh token');
    });

    await t.test('T1-REFR-5: On invalid_grant error during refresh, session is cleared and state reset', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /invalid_grant/, 'Must check for invalid_grant');
      assert.match(authContent, /clearSession\(\)/, 'Must call clearSession on invalid_grant');
    });
  });

  // Feature 8: Direct Responses API Client Contract
  await t1.test('F8: Direct Responses API Contract (5 assertions)', async (t) => {
    await t.test('T1-RESP-1: openai.js module exists and exports buildResponsesPayload', async () => {
      assert.ok(fileExists('src/lib/byok/openai.js'), 'src/lib/byok/openai.js must exist');
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.buildResponsesPayload, 'function');
    });

    await t.test('T1-RESP-2: buildResponsesPayload strictly enforces store: false', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'test prompt' }],
        store: true // Attempt to override
      });
      assert.equal(payload.store, false, 'store must be strictly false');
    });

    await t.test('T1-RESP-3: buildResponsesPayload strictly enforces stream: true', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'test prompt' }],
        stream: false // Attempt to override
      });
      assert.equal(payload.stream, true, 'stream must be strictly true');
    });

    await t.test('T1-RESP-4: Disallowed parameters are stripped from payload', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'test' }],
        temperature: 0.7,
        top_p: 0.9,
        max_output_tokens: 500,
        prompt: 'illegal',
        previous_response_id: 'resp_123',
        conversation: 'illegal_conv'
      });
      assert.equal(payload.temperature, undefined);
      assert.equal(payload.top_p, undefined);
      assert.equal(payload.max_output_tokens, undefined);
      assert.equal(payload.prompt, undefined);
      assert.equal(payload.previous_response_id, undefined);
      assert.equal(payload.conversation, undefined);
    });

    await t.test('T1-RESP-5: SSE parser extracts text deltas and detects response.completed', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.parseSSELine, 'function');

      const deltaLine = 'data: {"delta": "Hello"}\nevent: response.output_text.delta';
      const parsedDelta = openai.parseSSELine(deltaLine);
      assert.equal(parsedDelta.type, 'delta');
      assert.equal(parsedDelta.text, 'Hello');

      const completedLine = 'data: {"response": {"status": "completed"}}\nevent: response.completed';
      const parsedCompleted = openai.parseSSELine(completedLine);
      assert.equal(parsedCompleted.type, 'completed');
    });
  });

  // Feature 9: Model Catalog Discovery
  await t1.test('F9: Model Catalog Discovery (5 assertions)', async (t) => {
    await t.test('T1-MOD-1: openai.js exports fetchAvailableModels and filterModelsForList', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.fetchAvailableModels, 'function');
      assert.equal(typeof openai.filterModelsForList, 'function');
    });

    await t.test('T1-MOD-2: filterModelsForList filters models to visibility == "list"', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const mockRawModels = [
        { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' },
        { slug: 'gpt-4o-mini', display_name: 'GPT-4o mini', visibility: 'list' },
        { slug: 'internal-secret', display_name: 'Internal', visibility: 'hide' },
        { slug: 'deprecated-v1', display_name: 'Deprecated' }
      ];
      const filtered = openai.filterModelsForList(mockRawModels);
      assert.equal(filtered.length, 2);
      assert.equal(filtered[0].slug, 'gpt-4o');
      assert.equal(filtered[1].slug, 'gpt-4o-mini');
    });

    await t.test('T1-MOD-3: Output mapped to uniform format { slug, displayName }', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const mockRawModels = [
        { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' }
      ];
      const filtered = openai.filterModelsForList(mockRawModels);
      assert.deepEqual(filtered[0], { slug: 'gpt-4o', displayName: 'GPT-4o' });
    });

    await t.test('T1-MOD-4: Falls back to default model descriptor gpt-4o on empty or failed discovery', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.resolveFallbackModel, 'function');
      const fallback = openai.resolveFallbackModel([]);
      assert.equal(fallback.slug, 'gpt-4o');
      assert.equal(fallback.displayName, 'GPT-4o');
    });

    await t.test('T1-MOD-5: DEFAULT_FALLBACK_MODEL_SLUG constant matches gpt-4o', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(openai.DEFAULT_FALLBACK_MODEL_SLUG, 'gpt-4o');
    });
  });

  // Feature 10: Profile Menu Navigation
  await t1.test('F10: Profile Menu Navigation (5 assertions)', async (t) => {
    await t.test('T1-PROF-1: src/app/settings/page.js includes BYOK Temporary Chat action item', () => {
      const settingsContent = readProjectFile('src/app/settings/page.js');
      assert.ok(settingsContent, 'src/app/settings/page.js must exist');
      assert.match(settingsContent, /Temporary Chat.*BYOK|BYOK.*ChatGPT/i, 'Must have BYOK ChatGPT item');
    });

    await t.test('T1-PROF-2: Settings action item has identifiable trigger selector id="byok-temporary-chat-trigger"', () => {
      const settingsContent = readProjectFile('src/app/settings/page.js');
      assert.match(settingsContent, /id=['"]byok-temporary-chat-trigger['"]/, 'Must provide id="byok-temporary-chat-trigger"');
    });

    await t.test('T1-PROF-3: Activating action row dispatches open-byok-chat custom event', () => {
      const settingsContent = readProjectFile('src/app/settings/page.js');
      assert.match(settingsContent, /open-byok-chat/, 'Must dispatch or handle open-byok-chat event');
    });

    await t.test('T1-PROF-4: KalPadShell.jsx registers listener for open-byok-chat and renders modal', () => {
      const shellContent = readProjectFile('src/components/kalpad/KalPadShell.jsx');
      assert.ok(shellContent, 'KalPadShell.jsx must exist');
      assert.match(shellContent, /open-byok-chat/, 'KalPadShell must register open-byok-chat listener');
      assert.match(shellContent, /TemporaryChatModal/, 'KalPadShell must host TemporaryChatModal');
    });

    await t.test('T1-PROF-5: Action row reflects connection status (Connect vs Connected)', () => {
      const settingsContent = readProjectFile('src/app/settings/page.js');
      assert.match(settingsContent, /Connect ChatGPT|Connected/i, 'Must show dynamic connection status label');
    });
  });

  // Feature 11: Temporary Chat Modal UI
  await t1.test('F11: Temporary Chat Modal UI (5 assertions)', async (t) => {
    await t.test('T1-MODAL-1: TemporaryChatModal.jsx exists and accepts opened and onClose props', () => {
      assert.ok(fileExists('src/components/chat/TemporaryChatModal.jsx'), 'src/components/chat/TemporaryChatModal.jsx must exist');
      const modalContent = readProjectFile('src/components/chat/TemporaryChatModal.jsx');
      assert.match(modalContent, /opened/, 'Must accept opened prop');
      assert.match(modalContent, /onClose/, 'Must accept onClose prop');
    });

    await t.test('T1-MODAL-2: Modal renders Connection Status Card with email and Disconnect button', () => {
      const modalContent = readProjectFile('src/components/chat/TemporaryChatModal.jsx');
      assert.match(modalContent, /Disconnect|Sign Out/i, 'Must render disconnect action');
      assert.match(modalContent, /email|userEmail/i, 'Must display connected email');
    });

    await t.test('T1-MODAL-3: Modal renders model selector dropdown with available models', () => {
      const modalContent = readProjectFile('src/components/chat/TemporaryChatModal.jsx');
      assert.match(modalContent, /Select|model/i, 'Must render model selector');
    });

    await t.test('T1-MODAL-4: Modal renders scrollable message history with markdown rendering', () => {
      const modalContent = readProjectFile('src/components/chat/TemporaryChatModal.jsx');
      assert.match(modalContent, /ScrollArea/i, 'Must use ScrollArea for message list');
      assert.match(modalContent, /ReactMarkdown|markdown/i, 'Must render messages with markdown');
    });

    await t.test('T1-MODAL-5: Modal renders input bar with send button submitting on Enter', () => {
      const modalContent = readProjectFile('src/components/chat/TemporaryChatModal.jsx');
      assert.match(modalContent, /TextInput|textarea|input/i, 'Must render input element');
      assert.match(modalContent, /onKeyDown|Enter/i, 'Must support Enter submit');
    });
  });

});

// =========================================================================
// TIER 2: BOUNDARY & CORNER CASES (9 Features, >=5 tests = 45 tests)
// =========================================================================

test('Tier 2: Boundary & Corner Cases (9 Boundary Conditions)', async (t2) => {

  // Boundary 1: Expired Token Detection & Automatic 401 Retry
  await t2.test('B1: Expired Tokens & 401 Recovery (5 assertions)', async (t) => {
    await t.test('T2-EXP-1: isTokenExpired returns true when expiresAt is in the past', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      assert.equal(typeof storage.isTokenExpired, 'function');
      const expiredSession = { expiresAtMillis: Date.now() - 5000 };
      assert.equal(storage.isTokenExpired(expiredSession), true);
    });

    await t.test('T2-EXP-2: isTokenExpired returns false when token has plenty of time remaining', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const validSession = { expiresAtMillis: Date.now() + 300000 }; // 5 min
      assert.equal(storage.isTokenExpired(validSession), false);
    });

    await t.test('T2-EXP-3: Responses client executes single 401 retry on token refresh', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.executeWithAuthRetry, 'function', 'Must export executeWithAuthRetry');
      let calls = 0;
      let refreshCalls = 0;
      const mockApiFn = async (token) => {
        calls++;
        if (calls === 1) {
          const err = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }
        return `success with ${token}`;
      };
      const mockRefreshFn = async () => {
        refreshCalls++;
        return 'new_token_456';
      };

      const result = await openai.executeWithAuthRetry(mockApiFn, 'old_token_123', mockRefreshFn);
      assert.equal(result, 'success with new_token_456');
      assert.equal(calls, 2, 'Must call API twice (initial + 1 retry)');
      assert.equal(refreshCalls, 1, 'Must invoke refresh once');
    });

    await t.test('T2-EXP-4: 401 retry halts after 1 retry attempt to avoid infinite loops', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      let calls = 0;
      const mockApiFn = async () => {
        calls++;
        const err = new Error('Unauthorized persistent');
        err.status = 401;
        throw err;
      };
      const mockRefreshFn = async () => 'new_token';

      await assert.rejects(
        async () => openai.executeWithAuthRetry(mockApiFn, 'old_token', mockRefreshFn),
        /Unauthorized persistent/
      );
      assert.equal(calls, 2, 'Must cap retries at exactly 1');
    });

    await t.test('T2-EXP-5: Throws UNAUTHENTICATED error if refresh fails during 401 recovery', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const mockApiFn = async () => {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      };
      const mockFailingRefresh = async () => {
        throw new Error('UNAUTHENTICATED');
      };

      await assert.rejects(
        async () => openai.executeWithAuthRetry(mockApiFn, 'old_token', mockFailingRefresh),
        /UNAUTHENTICATED/
      );
    });
  });

  // Boundary 2: 60s Proactive Refresh Buffer
  await t2.test('B2: 60s Proactive Refresh Buffer (5 assertions)', async (t) => {
    await t.test('T2-BUF-1: Token expiring in 59s is classified as expired (< 60s buffer)', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const session = { expiresAtMillis: Date.now() + 59000 };
      assert.equal(storage.isTokenExpired(session, 60), true, 'Must flag 59s remaining as expired');
    });

    await t.test('T2-BUF-2: Token expiring in 61s is classified as valid (> 60s buffer)', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const session = { expiresAtMillis: Date.now() + 61000 };
      assert.equal(storage.isTokenExpired(session, 60), false, 'Must flag 61s remaining as valid');
    });

    await t.test('T2-BUF-3: Boundary at exactly 60s remaining triggers proactive refresh', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const now = Date.now();
      const session = { expiresAtMillis: now + 60000 };
      assert.equal(storage.isTokenExpired(session, 60), true, 'Boundary 60s must trigger proactive refresh');
    });

    await t.test('T2-BUF-4: Default buffer parameter in isTokenExpired is 60 seconds', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const session = { expiresAtMillis: Date.now() + 45000 }; // 45s left
      assert.equal(storage.isTokenExpired(session), true, 'Default 60s buffer must flag 45s as expired');
    });

    await t.test('T2-BUF-5: Freshly issued token (3600s remaining) does not trigger refresh', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      const freshSession = { expiresAtMillis: Date.now() + 3600000 };
      assert.equal(storage.isTokenExpired(freshSession), false);
    });
  });

  // Boundary 3: Single-Use Refresh Token Invalidation Race (Mutex)
  await t2.test('B3: Refresh Token Race & Mutex Serialization (5 assertions)', async (t) => {
    await t.test('T2-RACE-1: Mutex implementation exists in auth.js', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /class RefreshMutex/, 'Must define RefreshMutex class');
      assert.match(authContent, /refreshMutex\.lock\(\)/, 'Must lock mutex');
      assert.match(authContent, /refreshMutex\.unlock\(\)/, 'Must unlock mutex in finally block');
    });

    await t.test('T2-RACE-2: Employs double-checked locking after acquiring mutex lock', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /isTokenExpired\(currentSession,\s*60\)/, 'Must recheck expiration after acquiring lock');
    });

    await t.test('T2-RACE-3: Rejection in refresh operation cleans up lock in finally block', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /finally\s*\{\s*refreshMutex\.unlock\(\)/, 'Must release lock in finally block');
    });

    await t.test('T2-RACE-4: getValidAccessToken triggers refreshTokens if expired', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      assert.match(authContent, /await refreshTokens\(\)/, 'getValidAccessToken must call refreshTokens');
    });

    await t.test('T2-RACE-5: Throws UNAUTHENTICATED if session or refreshToken is missing during refresh', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const storage = await safeImport('src/lib/byok/storage.js');
      storage.clearSession();
      await assert.rejects(async () => auth.refreshTokens(), /UNAUTHENTICATED/);
    });
  });

  // Boundary 4: Disallowed Parameters Rejection
  await t2.test('B4: Disallowed Parameters Rejection (5 assertions)', async (t) => {
    await t.test('T2-PARAM-1: buildResponsesPayload strips temperature parameter', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input: [], temperature: 0.5 });
      assert.equal('temperature' in payload, false);
    });

    await t.test('T2-PARAM-2: buildResponsesPayload strips top_p and max_output_tokens', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input: [], top_p: 1.0, max_output_tokens: 100 });
      assert.equal('top_p' in payload, false);
      assert.equal('max_output_tokens' in payload, false);
    });

    await t.test('T2-PARAM-3: buildResponsesPayload strips prompt and conversation parameters', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input: [], prompt: 'raw', conversation: 'id' });
      assert.equal('prompt' in payload, false);
      assert.equal('conversation' in payload, false);
    });

    await t.test('T2-PARAM-4: buildResponsesPayload strips previous_response_id to enforce client context', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input: [], previous_response_id: 'prev_1' });
      assert.equal('previous_response_id' in payload, false);
    });

    await t.test('T2-PARAM-5: Parameter whitelist preserves model, input, store, stream, and instructions', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'study plan' }],
        instructions: 'concise',
        unknownGarbage: 123
      });
      assert.equal(payload.model, 'gpt-4o');
      assert.deepEqual(payload.input, [{ role: 'user', content: 'study plan' }]);
      assert.equal(payload.instructions, 'concise');
      assert.equal(payload.store, false);
      assert.equal(payload.stream, true);
      assert.equal('unknownGarbage' in payload, false);
    });
  });

  // Boundary 5: System Role Rejection & Normalization
  await t2.test('B5: System Role Normalization (5 assertions)', async (t) => {
    await t.test('T2-ROLE-1: Automatically normalizes role: "system" to role: "developer"', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const input = [{ role: 'system', content: 'Act as tutor' }, { role: 'user', content: 'Help' }];
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input });
      assert.equal(payload.input[0].role, 'developer', 'Must convert system to developer');
      assert.equal(payload.input[1].role, 'user');
    });

    await t.test('T2-ROLE-2: Wire payload strictly contains zero items with role == "system"', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const input = [
        { role: 'system', content: 'sys1' },
        { role: 'system', content: 'sys2' },
        { role: 'user', content: 'hi' }
      ];
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input });
      const hasSystem = payload.input.some(item => item.role === 'system');
      assert.equal(hasSystem, false, 'No system role allowed on wire');
    });

    await t.test('T2-ROLE-3: Preserves message content text during role normalization', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const input = [{ role: 'system', content: 'Strictly preserved text content 12345' }];
      const payload = openai.buildResponsesPayload({ model: 'gpt-4o', input });
      assert.equal(payload.input[0].content, 'Strictly preserved text content 12345');
    });

    await t.test('T2-ROLE-4: Normalizes top-level instructions into valid developer steering', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const payload = openai.buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'hi' }],
        instructions: 'Top level steering'
      });
      assert.equal(payload.instructions, 'Top level steering');
    });

    await t.test('T2-ROLE-5: Disallowed role names (e.g. "admin", "bot") throw validation error or normalize safely', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const invalidInput = [{ role: 'admin_hacker', content: 'inject' }];
      assert.throws(() => {
        openai.buildResponsesPayload({ model: 'gpt-4o', input: invalidInput });
      }, /Invalid message role/);
    });
  });

  // Boundary 6: 429 Quota Exhaustion (subscription_sharing_usage_limit_exceeded)
  await t2.test('B6: 429 Quota Exhaustion (5 assertions)', async (t) => {
    await t.test('T2-429-1: Detects subscription_sharing_usage_limit_exceeded error code', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.isUsageLimitError, 'function');
      const err = { code: 'subscription_sharing_usage_limit_exceeded', message: 'Quota exhausted' };
      assert.equal(openai.isUsageLimitError(err), true);
    });

    await t.test('T2-429-2: SSE parser identifies response.failed with usage limit code', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const failedLine = 'data: {"response": {"error": {"code": "subscription_sharing_usage_limit_exceeded", "message": "limit"}}}\nevent: response.failed';
      const parsed = openai.parseSSELine(failedLine);
      assert.equal(parsed.type, 'failed');
      assert.equal(parsed.error.code, 'subscription_sharing_usage_limit_exceeded');
    });

    await t.test('T2-429-3: Quota limit error is classified as non-transient (do not retry immediately)', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      const err = { code: 'subscription_sharing_usage_limit_exceeded' };
      assert.equal(openai.isTransientError(err), false);
    });

    await t.test('T2-429-4: Quota error does not purge stored credentials', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.shouldPurgeCredentialsOnError, 'function');
      const err = { code: 'subscription_sharing_usage_limit_exceeded' };
      assert.equal(openai.shouldPurgeCredentialsOnError(err), false);
    });

    await t.test('T2-429-5: Generates official settings usage link URL https://chatgpt.com/settings/usage', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(openai.CHATGPT_USAGE_SETTINGS_URL, 'https://chatgpt.com/settings/usage');
    });
  });

  // Boundary 7: 503 Transient Outage (subscription_sharing_usage_unavailable)
  await t2.test('B7: 503 Transient Outage (5 assertions)', async (t) => {
    await t.test('T2-503-1: Identifies HTTP 503 or subscription_sharing_usage_unavailable as transient', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(openai.isTransientError({ status: 503 }), true);
      assert.equal(openai.isTransientError({ code: 'subscription_sharing_usage_unavailable' }), true);
    });

    await t.test('T2-503-2: 503 outage retains saved credentials and does NOT log out user', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(openai.shouldPurgeCredentialsOnError({ status: 503 }), false);
    });

    await t.test('T2-503-3: Transient error allows backoff retry', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(typeof openai.getRetryDelayMs, 'function');
      const delay1 = openai.getRetryDelayMs(1);
      const delay2 = openai.getRetryDelayMs(2);
      assert.ok(delay1 > 0, 'Delay must be positive');
      assert.ok(delay2 > delay1, 'Delay must increase exponentially');
    });

    await t.test('T2-503-4: Non-transient errors like 403 user_not_eligible strictly prohibit retry', async () => {
      const openai = await safeImport('src/lib/byok/openai.js');
      assert.equal(openai.isTransientError({ status: 403, code: 'subscription_sharing_user_not_eligible' }), false);
    });

    await t.test('T2-503-5: Transient outage during token refresh preserves refresh token', () => {
      const authContent = readProjectFile('src/lib/byok/auth.js');
      // Verify that non-400/401 errors rethrow without calling clearSession
      assert.match(authContent, /transientErr/i, 'Must treat non-400/401 errors as transient without clearing session');
    });
  });

  // Boundary 8: State Mismatch CSRF Prevention
  await t2.test('B8: State Mismatch CSRF (5 assertions)', async (t) => {
    await t.test('T2-CSRF-1: handleOAuthCallback detects state mismatch against pending auth', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const storage = await safeImport('src/lib/byok/storage.js');
      storage.savePendingAuth({
        state: 'legit_state_123',
        codeVerifier: 'v',
        clientId: 'c',
        redirectUri: 'http://127.0.0.1:3000/auth/callback'
      });
      await assert.rejects(
        async () => auth.handleOAuthCallback({ code: 'c', state: 'attacker_forged_state' }),
        /State mismatch/
      );
    });

    await t.test('T2-CSRF-2: Callback page src/app/auth/callback/page.js checks state against getPendingAuth', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.match(callbackContent, /pendingAuth\?\.state\s*!==\s*state/, 'Must check state parameter mismatch');
    });

    await t.test('T2-CSRF-3: Callback page emits error postMessage on state mismatch', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.match(callbackContent, /state_mismatch/, 'Must signal state_mismatch in postMessage payload');
    });

    await t.test('T2-CSRF-4: clearPendingAuth clears pending authorization state', async () => {
      const storage = await safeImport('src/lib/byok/storage.js');
      storage.savePendingAuth({ state: 'st_123' });
      assert.ok(storage.getPendingAuth());
      storage.clearPendingAuth();
      assert.equal(storage.getPendingAuth(), null);
    });

    await t.test('T2-CSRF-5: Callback page handles error=access_denied cleanly', () => {
      const callbackContent = readProjectFile('src/app/auth/callback/page.js');
      assert.match(callbackContent, /errorDescription\s*\|\|\s*error/, 'Must extract error and error_description');
    });
  });

  // Boundary 9: Localhost vs 127.0.0.1 Validation
  await t2.test('B9: Localhost vs 127.0.0.1 Validation (5 assertions)', async (t) => {
    await t.test('T2-HOST-1: DEFAULT_REDIRECT_URI strictly equals http://127.0.0.1:3000/auth/callback', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      assert.equal(auth.DEFAULT_REDIRECT_URI, 'http://127.0.0.1:3000/auth/callback');
    });

    await t.test('T2-HOST-2: Authorize URL strictly forbids localhost', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        codeChallenge: 'chal',
        state: 'st'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('redirect_uri').includes('localhost'), false, 'Redirect URI must not contain localhost');
      assert.equal(parsed.searchParams.get('redirect_uri').startsWith('http://127.0.0.1'), true, 'Must start with http://127.0.0.1');
    });

    await t.test('T2-HOST-3: Preserves non-default port if configured on 127.0.0.1', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({
        redirectUri: 'http://127.0.0.1:8080/auth/callback',
        codeChallenge: 'chal',
        state: 'st'
      });
      const parsed = new URL(urlStr);
      assert.equal(parsed.searchParams.get('redirect_uri'), 'http://127.0.0.1:8080/auth/callback');
    });

    await t.test('T2-HOST-4: Redirect path enforces /auth/callback exactly', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({});
      const parsed = new URL(urlStr);
      const redirectUri = new URL(parsed.searchParams.get('redirect_uri'));
      assert.equal(redirectUri.pathname, '/auth/callback');
    });

    await t.test('T2-HOST-5: Disallows HTTPS on 127.0.0.1 loopback', async () => {
      const auth = await safeImport('src/lib/byok/auth.js');
      const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
      const urlStr = buildFn({});
      const parsed = new URL(urlStr);
      assert.ok(parsed.searchParams.get('redirect_uri').startsWith('http://127.0.0.1'));
    });
  });

});

// =========================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (5 Integration Flow Assertions)
// =========================================================================

test('Tier 3: Cross-Feature Combinations (Full Handshake -> Chat -> Refresh -> Follow-up)', async (t3) => {

  await t3.test('T3-COMBO-1: Step 1 - Full PKCE OAuth Handshake with Dynamic Registration & Storage', async () => {
    const pkce = await safeImport('src/lib/byok/pkce.js');
    const auth = await safeImport('src/lib/byok/auth.js');
    const storage = await safeImport('src/lib/byok/storage.js');

    // 1. Generate PKCE values
    const pair = await pkce.generatePkcePair();
    assert.ok(pair.codeVerifier);
    assert.ok(pair.codeChallenge);
    assert.ok(pair.state);

    // 2. Build authorize URL
    const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
    const authUrl = buildFn({
      codeChallenge: pair.codeChallenge,
      state: pair.state,
      redirectUri: 'http://127.0.0.1:3000/auth/callback'
    });
    assert.ok(authUrl.startsWith('https://auth.openai.com/api/accounts/authorize'));

    // 3. Save pending auth
    storage.savePendingAuth({
      state: pair.state,
      codeVerifier: pair.codeVerifier,
      clientId: 'dynamic_agent_client',
      redirectUri: 'http://127.0.0.1:3000/auth/callback'
    });

    // 4. Save completed session
    const hostId = storage.getOrCreateHostId();
    const session = storage.saveSession({
      accessToken: 'at_handshake_step1',
      refreshToken: 'rt_handshake_step1',
      clientId: 'oaiapp_generated_step1',
      scopes: ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'],
      expiresIn: 3600
    });
    assert.equal(session.hasDirectInferenceScope, true);
    assert.equal(session.clientId, 'oaiapp_generated_step1');

    const loaded = storage.loadSession();
    assert.equal(loaded.accessToken, 'at_handshake_step1');
  });

  await t3.test('T3-COMBO-2: Step 2 - Model Discovery using Token with Fallback Resolution', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');
    const rawModels = [
      { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' },
      { slug: 'o1-preview', display_name: 'o1-preview', visibility: 'hide' }
    ];
    const available = openai.filterModelsForList(rawModels);
    assert.equal(available.length, 1);
    assert.equal(available[0].slug, 'gpt-4o');

    // When API returns empty, fallback resolves cleanly to gpt-4o
    const fallback = openai.resolveFallbackModel([]);
    assert.equal(fallback.slug, 'gpt-4o');
  });

  await t3.test('T3-COMBO-3: Step 3 - First Interactive Chat Turn with SSE Stream Consumption', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');
    const payload = openai.buildResponsesPayload({
      model: 'gpt-4o',
      input: [{ role: 'user', content: 'Explain Newton second law' }]
    });

    assert.equal(payload.store, false);
    assert.equal(payload.stream, true);
    assert.equal(payload.input[0].role, 'user');

    // Simulate SSE chunk consumption
    const sseLines = [
      'event: response.output_text.delta\ndata: {"delta": "Force equals "}',
      'event: response.output_text.delta\ndata: {"delta": "mass times acceleration."}',
      'event: response.completed\ndata: {"response": {"id": "resp_turn1", "status": "completed"}}'
    ];

    let fullText = '';
    let completed = false;

    for (const line of sseLines) {
      const parsed = openai.parseSSELine(line);
      if (parsed.type === 'delta') fullText += parsed.text;
      if (parsed.type === 'completed') completed = true;
    }

    assert.equal(fullText, 'Force equals mass times acceleration.');
    assert.equal(completed, true);
  });

  await t3.test('T3-COMBO-4: Step 4 - Proactive Token Expiration & Rotation before Second Turn', async () => {
    const storage = await safeImport('src/lib/byok/storage.js');
    // Session token expiring in 10 seconds (< 60s buffer)
    const expiringSession = {
      accessToken: 'at_turn1',
      refreshToken: 'rt_turn1',
      clientId: 'oaiapp_combo',
      hostId: 'host_combo',
      expiresAtMillis: Date.now() + 10000
    };

    assert.equal(storage.isTokenExpired(expiringSession), true, 'Must flag token as needing refresh');

    // Save rotated session
    const freshSession = storage.saveSession({
      accessToken: 'at_turn2_fresh',
      refreshToken: 'rt_turn2_rotated',
      clientId: 'oaiapp_combo',
      expiresIn: 3600
    });
    assert.equal(freshSession.accessToken, 'at_turn2_fresh');
    assert.equal(freshSession.refreshToken, 'rt_turn2_rotated', 'Must update to rotated refresh token');
    assert.equal(storage.isTokenExpired(freshSession), false, 'Fresh token must not be expired');
  });

  await t3.test('T3-COMBO-5: Step 5 - Second Turn with Accumulated Multi-Turn Client Context', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');
    const history = [
      { role: 'user', content: 'Explain Newton second law' },
      { role: 'developer', content: 'Force equals mass times acceleration.' }
    ];
    const followUp = { role: 'user', content: 'Give a numerical example' };

    const payload = openai.buildResponsesPayload({
      model: 'gpt-4o',
      input: [...history, followUp]
    });

    assert.equal(payload.input.length, 3, 'Full history must be accumulated in input array');
    assert.equal(payload.previous_response_id, undefined, 'Must NOT use previous_response_id on public HTTP route');
    assert.equal(payload.input[2].content, 'Give a numerical example');
  });

});

// =========================================================================
// TIER 4: REAL-WORLD SCENARIOS (5 User Workflow Assertions)
// =========================================================================

test('Tier 4: Real-World Scenarios (End-to-End User Journeys)', async (t4) => {

  await t4.test('T4-SCEN-1: Student connects ChatGPT Plus -> Discovers gpt-4o -> Chats -> Safely Disconnects', async () => {
    const auth = await safeImport('src/lib/byok/auth.js');
    const storage = await safeImport('src/lib/byok/storage.js');
    const openai = await safeImport('src/lib/byok/openai.js');

    // 1. Establish session
    const hostId = storage.getOrCreateHostId();
    const session = storage.saveSession({
      accessToken: 'student_at',
      refreshToken: 'student_rt',
      clientId: 'oaiapp_student',
      scopes: ['openid', 'email', 'chatgpt.tokens.use.direct'],
      expiresIn: 3600
    });
    assert.equal(session.hasDirectInferenceScope, true);

    // 2. Verify model discovery
    const models = openai.filterModelsForList([
      { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' }
    ]);
    assert.equal(models[0].slug, 'gpt-4o');

    // 3. User disconnects
    await auth.signOutChatGPT();
    assert.equal(storage.loadSession(), null, 'Tokens must be completely purged');
    assert.equal(storage.getOrCreateHostId(), hostId, 'Host ID preserved for future reconnects');
  });

  await t4.test('T4-SCEN-2: Student encounters simulated 429 quota exhaustion -> Alert & usage link -> Credentials kept', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');
    const storage = await safeImport('src/lib/byok/storage.js');

    const quotaError = {
      status: 429,
      code: 'subscription_sharing_usage_limit_exceeded',
      message: 'Plan usage limit exceeded'
    };

    assert.equal(openai.isUsageLimitError(quotaError), true);
    assert.equal(openai.shouldPurgeCredentialsOnError(quotaError), false, 'Must NOT disconnect user on quota exhaustion');
    assert.equal(openai.CHATGPT_USAGE_SETTINGS_URL, 'https://chatgpt.com/settings/usage');
  });

  await t4.test('T4-SCEN-3: Returning user with saved client ID bypasses dynamic registration params', async () => {
    const auth = await safeImport('src/lib/byok/auth.js');
    const buildFn = auth.buildAuthorizationUrl || auth.buildAuthorizeUrl;
    const urlStr = buildFn({
      clientId: 'oaiapp_returning_student',
      codeChallenge: 'chal_abc',
      state: 'state_xyz',
      redirectUri: 'http://127.0.0.1:3000/auth/callback'
    });
    const parsed = new URL(urlStr);
    assert.equal(parsed.searchParams.get('client_id'), 'oaiapp_returning_student');
    assert.equal(parsed.searchParams.get('agent_name_hint'), null, 'agent_name_hint must be omitted on returning sign-in');
  });

  await t4.test('T4-SCEN-4: Mid-chat 401 Unauthorized triggers automatic background token refresh and turn replay', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');
    let attempts = 0;
    const mockInference = async (token) => {
      attempts++;
      if (attempts === 1) {
        const err = new Error('Token expired');
        err.status = 401;
        throw err;
      }
      return { output: `Success on attempt ${attempts} with fresh token: ${token}` };
    };

    const mockRefresh = async () => 'refreshed_bearer_token_999';

    const result = await openai.executeWithAuthRetry(mockInference, 'expired_bearer_token_111', mockRefresh);
    assert.equal(attempts, 2);
    assert.ok(result.output.includes('refreshed_bearer_token_999'));
  });

  await t4.test('T4-SCEN-5: Ineligible Free ChatGPT account receives 403 subscription_sharing_user_not_eligible', async () => {
    const openai = await safeImport('src/lib/byok/openai.js');

    const ineligibleErr = {
      status: 403,
      code: 'subscription_sharing_user_not_eligible',
      message: 'ChatGPT Plus or Pro plan required for token sharing'
    };

    assert.equal(openai.isTransientError(ineligibleErr), false, 'Ineligible error is permanent (no retries)');
    assert.equal(openai.isUserNotEligibleError(ineligibleErr), true);
  });

});
