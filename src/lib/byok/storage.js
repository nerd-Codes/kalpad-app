// src/lib/byok/storage.js
/**
 * Persistent client-side credential storage for BYOK ChatGPT authentication.
 * Stores tokens in browser localStorage with an in-memory fallback for SSR and test execution.
 * Enforces strict credential isolation: ChatGPT tokens remain solely in the user's browser.
 */

export const STORAGE_KEYS = {
  SESSION: 'kalpad_byok_chatgpt_session',
  HOST_ID: 'kalpad_byok_ext_agent_host_id',
  PENDING_AUTH: 'kalpad_byok_pending_auth',
};

export const DIRECT_INFERENCE_SCOPE = 'chatgpt.tokens.use.direct';

/**
 * In-memory storage fallback when localStorage is unavailable (SSR or headless testing).
 */
class MemoryStorage {
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

const defaultMemoryStorage = new MemoryStorage();
let activeStorageOverride = null;

/**
 * Overrides the storage backend (primarily for unit testing and state isolation).
 * @param {Storage|null} customBackend
 */
export function setStorageBackend(customBackend) {
  activeStorageOverride = customBackend;
}

/**
 * Resolves the active storage backend (localStorage if available, or memory fallback).
 * @param {Storage|Object|null} [explicitStorage] Optional explicit storage provider
 * @returns {Storage|MemoryStorage}
 */
export function getStorageBackend(explicitStorage = null) {
  if (explicitStorage) {
    return explicitStorage;
  }
  if (activeStorageOverride) {
    return activeStorageOverride;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probe = '__byok_storage_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (_) {
      // Storage restricted or quota exceeded
    }
  }
  return defaultMemoryStorage;
}

/**
 * Retrieves the persistent host identifier (ext_agent_host_id) for this client installation.
 * In accordance with OpenAI SIWC specifications, this ID is formatted as `urn:uuid:<UUID>`
 * and remains invariant across all sign-in and re-authorization events.
 *
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {string} e.g. "urn:uuid:12345678-1234-4234-8234-123456789abc"
 */
export function getOrCreateHostId(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  let hostId = storage.getItem(STORAGE_KEYS.HOST_ID);
  if (!hostId || !hostId.startsWith('urn:uuid:')) {
    const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : crypto;
    const uuid = typeof cryptoObj?.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    hostId = `urn:uuid:${uuid}`;
    storage.setItem(STORAGE_KEYS.HOST_ID, hostId);
  }
  return hostId;
}

/**
 * Masks a token or secret to prevent plain-text exposure in logs and telemetry.
 * Formats: "sk-p...1234" for tokens > 8 chars, or "***" for short strings.
 *
 * @param {string|null|undefined} token
 * @returns {string}
 */
export function maskToken(token) {
  if (!token || typeof token !== 'string') {
    return '[EMPTY]';
  }
  const trimmed = token.trim();
  if (trimmed.length <= 8) {
    return '***';
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Checks whether an access token is expired or within a safety renewal buffer.
 *
 * @param {{ expiresAtMillis?: number, expiresAt?: number }|null} session
 * @param {number} [bufferSeconds=60] Proactive renewal buffer in seconds (default 60s)
 * @returns {boolean} True if token is missing, expired, or within bufferSeconds of expiring
 */
export function isTokenExpired(session, bufferSeconds = 60) {
  if (!session) return true;
  const expiry = session.expiresAtMillis || session.expiresAt;
  if (typeof expiry !== 'number' || isNaN(expiry)) {
    return true;
  }
  const now = Date.now();
  const bufferMillis = Math.max(0, bufferSeconds) * 1000;
  return now >= (expiry - bufferMillis);
}

/**
 * Normalizes and stores a BYOK ChatGPT session in persistent client storage.
 *
 * @param {{
 *   accessToken: string,
 *   refreshToken: string,
 *   idToken?: string|null,
 *   clientId: string,
 *   scopes?: string[]|string,
 *   expiresAtMillis?: number,
 *   expiresAt?: number,
 *   expiresIn?: number,
 *   email?: string|null
 * }} sessionData
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {Object} Hydrated session object
 */
export function saveSession(sessionData, explicitStorage = null) {
  if (!sessionData || typeof sessionData !== 'object') {
    throw new TypeError('saveSession expects a valid sessionData object');
  }

  const {
    accessToken,
    refreshToken,
    idToken = null,
    clientId = 'dynamic_agent_client',
    scopes,
    expiresAtMillis,
    expiresAt,
    expiresIn,
    email = null,
  } = sessionData;

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('accessToken is required and must be a string');
  }
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('refreshToken is required and must be a string');
  }

  // Normalize scopes into array of strings
  let normalizedScopes = [];
  if (Array.isArray(scopes)) {
    normalizedScopes = scopes.filter((s) => typeof s === 'string' && s.trim().length > 0);
  } else if (typeof scopes === 'string') {
    normalizedScopes = scopes.split(/\s+/).filter(Boolean);
  }

  // Calculate expiration timestamp
  let calculatedExpiry = expiresAtMillis || expiresAt;
  if (!calculatedExpiry && typeof expiresIn === 'number') {
    calculatedExpiry = Date.now() + expiresIn * 1000;
  }
  if (!calculatedExpiry || typeof calculatedExpiry !== 'number') {
    // Default 1 hour (3600 seconds) if unspecified
    calculatedExpiry = Date.now() + 3600 * 1000;
  }

  const hostId = getOrCreateHostId(explicitStorage);
  const hasDirectInferenceScope = normalizedScopes.includes(DIRECT_INFERENCE_SCOPE);

  const session = {
    accessToken,
    refreshToken,
    idToken: idToken || null,
    clientId: clientId || 'dynamic_agent_client',
    scopes: normalizedScopes,
    expiresAtMillis: calculatedExpiry,
    expiresAt: calculatedExpiry, // Alias for contract compatibility
    email: email || null,
    hostId,
    hasDirectInferenceScope,
  };

  const storage = getStorageBackend(explicitStorage);
  storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

  return session;
}

/**
 * Loads the stored BYOK ChatGPT session from client storage.
 *
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {Object|null} Hydrated session object, or null if unauthenticated or invalid
 */
export function loadSession(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  const raw = storage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }

    const hostId = getOrCreateHostId(explicitStorage);
    const scopesList = Array.isArray(parsed.scopes)
      ? parsed.scopes
      : typeof parsed.scopes === 'string'
      ? parsed.scopes.split(/\s+/).filter(Boolean)
      : [];

    const expiresAtMillis = Number(parsed.expiresAtMillis || parsed.expiresAt) || 0;

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      idToken: parsed.idToken || null,
      clientId: parsed.clientId || 'dynamic_agent_client',
      scopes: scopesList,
      expiresAtMillis,
      expiresAt: expiresAtMillis,
      email: parsed.email || null,
      hostId,
      hasDirectInferenceScope: scopesList.includes(DIRECT_INFERENCE_SCOPE),
    };
  } catch (_) {
    return null;
  }
}

/**
 * Alias for loadSession to satisfy the interface contract.
 *
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {Object|null}
 */
export function getStoredSession(explicitStorage = null) {
  return loadSession(explicitStorage);
}

/**
 * Clears the stored BYOK ChatGPT session (access token, refresh token, user email).
 * Invariant: Preserves host ID (ext_agent_host_id) for install stability.
 *
 * @param {Storage|Object|null} [explicitStorage]
 */
export function clearSession(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  storage.removeItem(STORAGE_KEYS.SESSION);
  storage.removeItem(STORAGE_KEYS.PENDING_AUTH);
}

/**
 * Returns a redacted representation of a session object safe for diagnostics, logging, and inspection.
 *
 * @param {Object|null} session
 * @returns {Object|null}
 */
export function redactSession(session) {
  if (!session) return null;
  return {
    clientId: session.clientId,
    hostId: session.hostId,
    email: session.email,
    scopes: session.scopes,
    expiresAtMillis: session.expiresAtMillis,
    expiresAt: session.expiresAt || session.expiresAtMillis,
    isExpired: isTokenExpired(session),
    hasDirectInferenceScope: session.hasDirectInferenceScope,
    accessTokenMasked: maskToken(session.accessToken),
    hasRefreshToken: Boolean(session.refreshToken),
    hasIdToken: Boolean(session.idToken),
  };
}

/**
 * Saves pending OAuth transaction parameters prior to redirect/popup.
 *
 * @param {{
 *   state: string,
 *   codeVerifier?: string,
 *   clientId?: string,
 *   redirectUri?: string,
 *   nonce?: string
 * }} pendingData
 * @param {Storage|Object|null} [explicitStorage]
 */
export function savePendingAuth(pendingData, explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  storage.setItem(
    STORAGE_KEYS.PENDING_AUTH,
    JSON.stringify({
      ...pendingData,
      createdAt: Date.now(),
    })
  );
}

/**
 * Retrieves the pending OAuth transaction parameters.
 *
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {Object|null}
 */
export function getPendingAuth(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  const raw = storage.getItem(STORAGE_KEYS.PENDING_AUTH);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Clears the pending OAuth transaction parameters.
 *
 * @param {Storage|Object|null} [explicitStorage]
 */
export function clearPendingAuth(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  storage.removeItem(STORAGE_KEYS.PENDING_AUTH);
}
