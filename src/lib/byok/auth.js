// src/lib/byok/auth.js
/**
 * OpenAI Sign in with ChatGPT (SIWC) and Token Sharing Auth Engine.
 * Handles PKCE-authenticated OAuth 2.0 flow, token exchange, concurrency-safe token refresh,
 * credential isolation, and revocation for BYOK ChatGPT accounts.
 */

import { generatePkcePair, CODE_CHALLENGE_METHOD } from './pkce.js';
import {
  saveSession,
  loadSession,
  clearSession,
  isTokenExpired,
  getOrCreateHostId,
  savePendingAuth,
  getPendingAuth,
  clearPendingAuth,
  DIRECT_INFERENCE_SCOPE,
} from './storage.js';

export { isTokenExpired };

export const OPENAI_AUTH_BASE_URL = 'https://auth.openai.com';
export const OPENAI_API_BASE_URL = 'https://api.openai.com';

export const DEFAULT_CLIENT_ID =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BYOK_CLIENT_ID) || 'dynamic_agent_client';
export const DEFAULT_AGENT_NAME = 'KalPad';
export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3000/auth/callback';
export const DEFAULT_SCOPES =
  'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
export const DEFAULT_RESOURCE = 'https://api.openai.com/v1';

/**
 * Resolves the loopback 127.0.0.1 redirect URI matching the active browser port when available.
 * OpenAI SIWC requires an explicit 127.0.0.1 loopback callback with HTTP scheme and a valid port.
 * When hosted on a public domain (e.g. Vercel), it defaults to port 3000 loopback for dynamic_agent_client.
 */
export function resolveLoopbackRedirectUri() {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BYOK_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_BYOK_REDIRECT_URI;
  }
  if (typeof window !== 'undefined' && window.location) {
    // If a custom commercial client ID is registered, use the hosted origin
    if (
      process.env?.NEXT_PUBLIC_BYOK_CLIENT_ID &&
      process.env.NEXT_PUBLIC_BYOK_CLIENT_ID !== 'dynamic_agent_client' &&
      window.location.protocol === 'https:'
    ) {
      return `${window.location.origin}/auth/callback`;
    }
    // OpenAI dynamic_agent_client strictly requires http://127.0.0.1:<port>/auth/callback
    const port = window.location.port || '3000';
    return `http://127.0.0.1:${port}/auth/callback`;
  }
  return DEFAULT_REDIRECT_URI;
}

/**
 * Broadcasts BYOK session state changes across React hook instances and same-origin tabs.
 */
export function notifyByokSessionChanged() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('kalpad-byok-session-changed'));
  } catch (_) {}
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('kalpad_byok_sync');
      ch.postMessage({ type: 'BYOK_SESSION_UPDATED' });
      ch.close();
    }
  } catch (_) {}
}

/**
 * Async mutex to serialize concurrent token refresh operations and prevent
 * refresh token invalidation race conditions when multiple requests fire simultaneously.
 */
class RefreshMutex {
  constructor() {
    this._locked = false;
    this._waiters = [];
  }

  async lock() {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    await new Promise((resolve) => this._waiters.push(resolve));
  }

  unlock() {
    if (this._waiters.length > 0) {
      const next = this._waiters.shift();
      next();
    } else {
      this._locked = false;
    }
  }

  isLocked() {
    return this._locked;
  }
}

const refreshMutex = new RefreshMutex();

/**
 * Decodes the payload portion of a JSON Web Token (JWT) without external dependencies.
 *
 * @param {string} token JWT string (header.payload.signature)
 * @returns {Object|null} Parsed JSON payload or null
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

/**
 * Safely extracts user email from an OpenID Connect id_token.
 *
 * @param {string|null|undefined} idToken
 * @returns {string|null}
 */
export function extractEmailFromIdToken(idToken) {
  if (!idToken) return null;
  const payload = decodeJwtPayload(idToken);
  return payload?.email || payload?.preferred_username || null;
}

/**
 * Validates whether a scope string or array includes the critical chatgpt.tokens.use.direct scope.
 *
 * @param {string|string[]} scope
 * @returns {boolean}
 */
export function hasDirectInferenceScope(scope) {
  if (!scope) return false;
  if (Array.isArray(scope)) {
    return scope.includes(DIRECT_INFERENCE_SCOPE);
  }
  if (typeof scope === 'string') {
    return scope.split(/\s+/).includes(DIRECT_INFERENCE_SCOPE);
  }
  return false;
}

/**
 * Constructs the OpenAI Sign in with ChatGPT authorization URL.
 *
 * @param {Object} [options]
 * @param {string} [options.clientId] Issued client ID ('oaiapp_...') or defaults to 'dynamic_agent_client'
 * @param {string} [options.redirectUri] Callback URI (defaults to 'http://127.0.0.1:3000/auth/callback')
 * @param {string} [options.state] CSRF state parameter
 * @param {string} [options.nonce] OIDC nonce parameter
 * @param {string} [options.codeChallenge] SHA-256 base64url PKCE challenge
 * @param {string} [options.hostId] Stable ext_agent_host_id ('urn:uuid:...')
 * @param {string} [options.agentNameHint] Name hint for dynamic registration (default 'KalPad')
 * @returns {string} Fully formed authorization URL
 */
export function buildAuthorizationUrl({
  clientId = DEFAULT_CLIENT_ID,
  redirectUri = DEFAULT_REDIRECT_URI,
  state,
  nonce,
  codeChallenge,
  hostId,
  agentNameHint = DEFAULT_AGENT_NAME,
  idTokenHint,
  loginHint,
} = {}) {
  const url = new URL(`${OPENAI_AUTH_BASE_URL}/api/accounts/authorize`);
  const effectiveClientId = clientId || DEFAULT_CLIENT_ID;

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', effectiveClientId);
  url.searchParams.set('redirect_uri', redirectUri || DEFAULT_REDIRECT_URI);
  url.searchParams.set('scope', DEFAULT_SCOPES);
  url.searchParams.set('resource', DEFAULT_RESOURCE);

  if (codeChallenge) {
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', CODE_CHALLENGE_METHOD);
  }
  if (state) {
    url.searchParams.set('state', state);
  }
  if (nonce) {
    url.searchParams.set('nonce', nonce);
  }

  // Persistent host identifier distinguishes the execution environment
  const effectiveHostId = hostId || getOrCreateHostId();
  url.searchParams.set('ext_agent_host_id', effectiveHostId);

  // Dynamic registration requires agent_name_hint; returning registrations omit it and pass hints
  if (effectiveClientId === DEFAULT_CLIENT_ID) {
    url.searchParams.set('agent_name_hint', agentNameHint || DEFAULT_AGENT_NAME);
  } else {
    if (idTokenHint) {
      url.searchParams.set('id_token_hint', idTokenHint);
    }
    if (loginHint) {
      url.searchParams.set('login_hint', loginHint);
    }
  }

  return url.toString();
}

/**
 * Alias for buildAuthorizationUrl matching common naming conventions.
 */
export function buildAuthorizeUrl(options) {
  return buildAuthorizationUrl(options);
}

/**
 * Helper to construct the application/x-www-form-urlencoded body string for authorization code exchange.
 *
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.codeVerifier
 * @param {string} [params.redirectUri]
 * @param {string} [params.clientId]
 * @returns {string}
 */
export function buildTokenExchangeBody({ code, codeVerifier, redirectUri, clientId } = {}) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code || '',
    code_verifier: codeVerifier || '',
    redirect_uri: redirectUri || DEFAULT_REDIRECT_URI,
    client_id: clientId || DEFAULT_CLIENT_ID,
    resource: DEFAULT_RESOURCE,
  });
  return params.toString();
}

/**
 * Helper to construct the application/x-www-form-urlencoded body string for refresh token exchange.
 *
 * @param {string} refreshToken
 * @param {string} [clientId]
 * @returns {string}
 */
export function buildRefreshTokenBody(refreshToken, clientId = DEFAULT_CLIENT_ID) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken || '',
    client_id: clientId || DEFAULT_CLIENT_ID,
    resource: DEFAULT_RESOURCE,
  });
  return params.toString();
}

/**
 * Pure parser function translating raw token endpoint JSON into a normalized session model.
 *
 * @param {Object} response Raw token endpoint JSON
 * @param {string} [clientId]
 * @param {string} [hostId]
 * @returns {Object} Hydrated session object
 */
export function parseTokenResponse(response, clientId, hostId) {
  if (!response || typeof response !== 'object') {
    throw new TypeError('parseTokenResponse expects a response object');
  }

  const grantedScopes = typeof response.scope === 'string'
    ? response.scope.split(/\s+/).filter(Boolean)
    : Array.isArray(response.scope)
    ? response.scope
    : [];

  const hasDirect = hasDirectInferenceScope(grantedScopes);
  const expiresIn = typeof response.expires_in === 'number' ? response.expires_in : 3600;
  const expiresAt = Date.now() + expiresIn * 1000;
  const email = extractEmailFromIdToken(response.id_token);

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    idToken: response.id_token || null,
    tokenType: response.token_type || 'Bearer',
    clientId: clientId || DEFAULT_CLIENT_ID,
    hostId: hostId || getOrCreateHostId(),
    scopes: grantedScopes,
    hasDirectInferenceScope: hasDirect,
    expiresIn,
    expiresAt,
    expiresAtMillis: expiresAt,
    email,
  };
}

/**
 * Pure function applying new token data on top of an existing session (with refresh token rotation).
 *
 * @param {Object} currentSession
 * @param {Object} refreshData
 * @returns {Object} Updated session
 */
export function applyTokenRefresh(currentSession, refreshData) {
  const newRefreshToken = refreshData.refresh_token || currentSession.refreshToken;
  const newAccessToken = refreshData.access_token;
  const expiresIn = typeof refreshData.expires_in === 'number' ? refreshData.expires_in : 3600;
  const expiresAt = Date.now() + expiresIn * 1000;
  const grantedScopes = refreshData.scope
    ? (typeof refreshData.scope === 'string'
        ? refreshData.scope.split(/\s+/).filter(Boolean)
        : refreshData.scope)
    : currentSession.scopes;

  const idToken = refreshData.id_token || currentSession.idToken;
  const email = idToken
    ? extractEmailFromIdToken(idToken) || currentSession.email
    : currentSession.email;

  return {
    ...currentSession,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    idToken,
    scopes: grantedScopes,
    expiresIn,
    expiresAt,
    expiresAtMillis: expiresAt,
    email,
    hasDirectInferenceScope: hasDirectInferenceScope(grantedScopes),
  };
}

/**
 * Classifies an error from token refresh to determine whether local credentials should be purged.
 *
 * @param {Object} errorObj
 * @returns {{ shouldPurge: boolean, isTransient: boolean, error: string }}
 */
export function handleRefreshError(errorObj) {
  const code = errorObj?.error || errorObj?.code || '';
  const desc = errorObj?.error_description || errorObj?.message || '';
  const status = errorObj?.status;

  if (
    status === 400 ||
    status === 401 ||
    code === 'invalid_grant' ||
    code === 'refresh_token_expired' ||
    String(desc).includes('invalid_grant')
  ) {
    return { shouldPurge: true, isTransient: false, error: 'UNAUTHENTICATED' };
  }
  return { shouldPurge: false, isTransient: true, error: desc || 'Transient error' };
}

/**
 * Initiates an OAuth sign-in flow by creating PKCE parameters, saving pending auth state,
 * and building the authorization URL.
 *
 * @param {Object} [options]
 * @param {string} [options.redirectUri]
 * @param {string} [options.customClientId]
 * @returns {Promise<{
 *   authUrl: string,
 *   state: string,
 *   nonce: string,
 *   codeVerifier: string,
 *   clientId: string,
 *   redirectUri: string
 * }>}
 */
export async function initiateOAuthSignIn({ redirectUri, customClientId } = {}) {
  const effectiveRedirectUri = redirectUri || resolveLoopbackRedirectUri();
  const existingSession = loadSession();
  const clientId = customClientId || existingSession?.clientId || DEFAULT_CLIENT_ID;

  const pkce = await generatePkcePair();

  savePendingAuth({
    state: pkce.state,
    nonce: pkce.nonce,
    codeVerifier: pkce.codeVerifier,
    clientId,
    redirectUri: effectiveRedirectUri,
  });

  const authUrl = buildAuthorizationUrl({
    clientId,
    redirectUri: effectiveRedirectUri,
    state: pkce.state,
    nonce: pkce.nonce,
    codeChallenge: pkce.codeChallenge,
    idTokenHint: existingSession?.idToken || undefined,
    loginHint: existingSession?.email || undefined,
  });

  return {
    authUrl,
    state: pkce.state,
    nonce: pkce.nonce,
    codeVerifier: pkce.codeVerifier,
    clientId,
    redirectUri: effectiveRedirectUri,
  };
}

/**
 * Exchanges an authorization code for OAuth tokens using the token endpoint.
 *
 * @param {Object} params
 * @param {string} params.code Authorization code received from redirect
 * @param {string} params.codeVerifier The PKCE code verifier matching the challenge
 * @param {string} [params.clientId] The client ID used (issued oaiapp_... or dynamic_agent_client)
 * @param {string} [params.redirectUri] Redirect URI matching the authorization request
 * @returns {Promise<Object>} Hydrated session object
 */
export async function exchangeAuthorizationCode({
  code,
  codeVerifier,
  clientId,
  redirectUri,
}) {
  if (!code || typeof code !== 'string') {
    throw new Error('Authorization code is required for token exchange');
  }
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    throw new Error('codeVerifier is required for token exchange');
  }

  const pending = getPendingAuth();
  const effectiveClientId =
    clientId || pending?.clientId || DEFAULT_CLIENT_ID;
  const effectiveRedirectUri =
    redirectUri || pending?.redirectUri || DEFAULT_REDIRECT_URI;

  const tokenUrl = `${OPENAI_AUTH_BASE_URL}/api/accounts/oauth/token`;
  const bodyString = buildTokenExchangeBody({
    code,
    codeVerifier,
    clientId: effectiveClientId,
    redirectUri: effectiveRedirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyString,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch (_) {}
    const message =
      errorJson?.error_description ||
      errorJson?.error ||
      `Token exchange failed with HTTP ${response.status}: ${errorText}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = errorJson || errorText;
    throw err;
  }

  const data = await response.json();

  // Validate granted scopes
  const grantedScopes = typeof data.scope === 'string'
    ? data.scope.split(/\s+/).filter(Boolean)
    : [];

  if (!hasDirectInferenceScope(grantedScopes)) {
    throw new Error(
      `ChatGPT plan usage not authorized (${DIRECT_INFERENCE_SCOPE} missing)`
    );
  }

  const userEmail = extractEmailFromIdToken(data.id_token);
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  const expiresAtMillis = Date.now() + expiresIn * 1000;

  const session = saveSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token || null,
    clientId: effectiveClientId,
    scopes: grantedScopes,
    expiresAtMillis,
    expiresAt: expiresAtMillis,
    email: userEmail,
  });

  clearPendingAuth();
  notifyByokSessionChanged();
  return session;
}

/**
 * Alias for exchangeAuthorizationCode matching alternative naming conventions.
 */
export async function exchangeCodeForTokens(params) {
  return exchangeAuthorizationCode(params);
}

/**
 * Refreshes the active access token using the stored refresh token.
 * Employs a mutex and double-checked locking to serialize concurrent refresh calls,
 * preventing race conditions that would invalidate rotating refresh tokens.
 *
 * @returns {Promise<Object>} Hydrated updated session object
 */
export async function refreshTokens() {
  await refreshMutex.lock();
  try {
    // Double-checked locking: recheck if session was already refreshed while waiting for lock
    const currentSession = loadSession();
    if (!currentSession || !currentSession.refreshToken) {
      const unauthErr = new Error('UNAUTHENTICATED');
      unauthErr.code = 'UNAUTHENTICATED';
      throw unauthErr;
    }

    if (!isTokenExpired(currentSession, 60)) {
      // Session was refreshed by a concurrent caller
      return currentSession;
    }

    const tokenUrl = `${OPENAI_AUTH_BASE_URL}/api/accounts/oauth/token`;
    const bodyString = buildRefreshTokenBody(
      currentSession.refreshToken,
      currentSession.clientId
    );

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyString,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (_) {}

      const errorAction = handleRefreshError({
        status: response.status,
        error: errorJson?.error,
        error_description: errorJson?.error_description || errorText,
      });

      // On invalid_grant or expired refresh token: purge local session
      if (errorAction.shouldPurge) {
        clearSession();
        const unauthErr = new Error('UNAUTHENTICATED');
        unauthErr.code = 'UNAUTHENTICATED';
        unauthErr.details = errorJson?.error_description || errorText;
        throw unauthErr;
      }

      // Transient server or network error: do not clear session, rethrow
      const transientErr = new Error(
        `Token refresh failed with HTTP ${response.status}: ${errorJson?.error_description || errorText}`
      );
      transientErr.status = response.status;
      throw transientErr;
    }

    const data = await response.json();
    const newRefreshToken = data.refresh_token || currentSession.refreshToken;
    const newAccessToken = data.access_token;
    const newExpiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    const expiresAtMillis = Date.now() + newExpiresIn * 1000;

    const grantedScopes = data.scope
      ? (typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : data.scope)
      : currentSession.scopes;

    const idToken = data.id_token || currentSession.idToken;
    const email = idToken
      ? extractEmailFromIdToken(idToken) || currentSession.email
      : currentSession.email;

    const updatedSession = saveSession({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      idToken,
      clientId: currentSession.clientId,
      scopes: grantedScopes,
      expiresAtMillis,
      expiresAt: expiresAtMillis,
      email,
    });

    return updatedSession;
  } finally {
    refreshMutex.unlock();
  }
}

/**
 * Alias for refreshTokens matching alternative naming conventions.
 */
export async function refreshAccessToken() {
  return refreshTokens();
}

/**
 * Retrieves a valid, non-expired access token.
 * If the active token is within the 60-second expiration buffer, proactively refreshes it.
 * Throws an Error with code 'UNAUTHENTICATED' if no valid session exists or refresh fails.
 *
 * @returns {Promise<string>} Active access token
 */
export async function getValidAccessToken() {
  const session = loadSession();
  if (!session || !session.accessToken) {
    const err = new Error('UNAUTHENTICATED');
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  if (!isTokenExpired(session, 60)) {
    return session.accessToken;
  }

  const refreshedSession = await refreshTokens();
  return refreshedSession.accessToken;
}

/**
 * Returns the currently stored BYOK ChatGPT session, or null if unauthenticated.
 *
 * @param {Storage|Object|null} [storage]
 * @returns {Object|null}
 */
export function getStoredSession(storage = null) {
  return loadSession(storage);
}

/**
 * Signs out of ChatGPT BYOK: revokes the refresh token at OpenAI's revocation endpoint
 * and purges local storage.
 *
 * @returns {Promise<void>}
 */
export async function signOutChatGPT() {
  const session = loadSession();
  if (session && session.refreshToken) {
    try {
      const revokeUrl = `${OPENAI_AUTH_BASE_URL}/api/accounts/oauth/revoke`;
      const bodyParams = new URLSearchParams({
        token: session.refreshToken,
        token_type_hint: 'refresh_token',
        client_id: session.clientId || DEFAULT_CLIENT_ID,
      });

      await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });
    } catch (_) {
      // Revocation is best-effort; always proceed with local purge
    }
  }
  clearSession();
  notifyByokSessionChanged();
}

/**
 * Handles callback parameters received either via redirect or postMessage,
 * validates CSRF state, and completes code exchange.
 *
 * @param {Object} params
 * @param {string} params.code
 * @param {string} [params.state]
 * @param {string} [params.clientId]
 * @param {string} [params.redirectUri]
 * @returns {Promise<Object>} Hydrated session
 */
export async function handleOAuthCallback({
  code,
  state,
  clientId,
  redirectUri,
}) {
  const pending = getPendingAuth();
  if (pending?.state && pending.state !== state) {
    throw new Error('State mismatch: potential CSRF attack detected');
  }

  const codeVerifier = pending?.codeVerifier;
  if (!codeVerifier) {
    throw new Error('Missing codeVerifier for OAuth callback exchange');
  }

  const effectiveClientId = clientId || pending?.clientId || DEFAULT_CLIENT_ID;
  const effectiveRedirectUri = redirectUri || pending?.redirectUri || DEFAULT_REDIRECT_URI;

  return await exchangeAuthorizationCode({
    code,
    codeVerifier,
    clientId: effectiveClientId,
    redirectUri: effectiveRedirectUri,
  });
}
