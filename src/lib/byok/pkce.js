// src/lib/byok/pkce.js
/**
 * PKCE (Proof Key for Code Exchange) Engine for OpenAI Sign in with ChatGPT (SIWC).
 * Implements RFC 7636 S256 challenge generation using universal Web Crypto.
 */

export const CODE_CHALLENGE_METHOD = 'S256';

/**
 * Encodes a buffer or string into an unpadded Base64URL string (RFC 7636 Section 3).
 * Replaces '+' with '-', '/' with '_', and strips all '=' padding.
 * Compatible across modern browsers and Node.js environments.
 *
 * @param {Uint8Array|ArrayBuffer|string} input
 * @returns {string}
 */
export function base64UrlEncode(input) {
  let bytes;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    throw new TypeError('base64UrlEncode expects Uint8Array, ArrayBuffer, or string');
  }

  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a cryptographically secure random string encoded in unpadded Base64URL.
 * Default 32 bytes produces exactly 43 Base64URL characters (valid per RFC 7636: 43-128 chars).
 *
 * @param {number} [byteLength=32]
 * @returns {string}
 */
export function generateRandomString(byteLength = 32) {
  if (byteLength < 32 || byteLength > 96) {
    // 32 bytes -> 43 chars, 96 bytes -> 128 chars
    throw new RangeError('byteLength must be between 32 and 96 bytes to satisfy RFC 7636 length bounds');
  }
  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : crypto;
  const buffer = new Uint8Array(byteLength);
  cryptoObj.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

/**
 * Generates a cryptographically secure PKCE code verifier (RFC 7636).
 *
 * @param {number} [byteLength=32]
 * @returns {string}
 */
export function generateCodeVerifier(byteLength = 32) {
  return generateRandomString(byteLength);
}

/**
 * Generates a cryptographically secure random state parameter for CSRF mitigation.
 *
 * @returns {string}
 */
export function generateState() {
  return generateRandomString(32);
}

/**
 * Generates a cryptographically secure random nonce parameter for OIDC token binding.
 *
 * @returns {string}
 */
export function generateNonce() {
  return generateRandomString(32);
}

/**
 * Computes the S256 code challenge from a code verifier.
 * Computes SHA-256 digest of ASCII code_verifier and encodes in unpadded Base64URL.
 *
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function computeChallenge(verifier) {
  if (typeof verifier !== 'string' || verifier.length === 0) {
    throw new Error('codeVerifier must be a non-empty string');
  }
  if (verifier.length < 43 || verifier.length > 128) {
    throw new RangeError(`codeVerifier length must be between 43 and 128 characters, received ${verifier.length}`);
  }
  if (!/^[A-Za-z0-9_.~-]+$/.test(verifier)) {
    throw new TypeError('codeVerifier must contain only RFC 7636 unreserved characters [A-Za-z0-9_.~-]');
  }

  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : crypto;
  const data = new TextEncoder().encode(verifier);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
}

/**
 * Alias for computeChallenge matching OAuth standard nomenclature.
 *
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function computeCodeChallenge(verifier) {
  return computeChallenge(verifier);
}

/**
 * Verifies whether a code verifier matches a given S256 code challenge.
 *
 * @param {string} verifier
 * @param {string} challenge
 * @returns {Promise<boolean>}
 */
export async function verifyCodeChallenge(verifier, challenge) {
  if (!verifier || !challenge || typeof verifier !== 'string' || typeof challenge !== 'string') {
    return false;
  }
  try {
    const computed = await computeChallenge(verifier);
    return computed === challenge;
  } catch (_) {
    return false;
  }
}

/**
 * Generates a complete PKCE parameter set: codeVerifier, codeChallenge, state, and nonce.
 *
 * @param {number} [byteLength=32] Byte length for code verifier (default 32 bytes -> 43 chars)
 * @returns {Promise<{
 *   codeVerifier: string,
 *   codeChallenge: string,
 *   codeChallengeMethod: 'S256',
 *   state: string,
 *   nonce: string
 * }>}
 */
export async function generatePkcePair(byteLength = 32) {
  const codeVerifier = generateCodeVerifier(byteLength);
  const codeChallenge = await computeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: CODE_CHALLENGE_METHOD,
    state,
    nonce,
  };
}
