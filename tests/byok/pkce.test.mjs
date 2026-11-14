// tests/byok/pkce.test.mjs
/**
 * Test suite for PKCE (Proof Key for Code Exchange) Engine.
 * Verifies RFC 7636 S256 challenge computation, random generation, and base64url encoding.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64UrlEncode,
  generateRandomString,
  computeChallenge,
  generatePkcePair,
  CODE_CHALLENGE_METHOD,
} from '../../src/lib/byok/pkce.js';

test('base64UrlEncode: converts Uint8Array to unpadded Base64URL string', () => {
  // Test bytes without padding
  const bytes1 = new Uint8Array([0x66, 0x6f, 0x6f]); // 'foo'
  assert.equal(base64UrlEncode(bytes1), 'Zm9v');

  // Test bytes requiring '+' and '/' replacements
  const bytes2 = new Uint8Array([0xfb, 0xff, 0xbf]); // in base64: +/+/
  assert.equal(base64UrlEncode(bytes2), '-_-_');

  // Test stripping of '=' padding
  const bytes3 = new Uint8Array([0x66, 0x6f]); // 'fo' -> in base64 'Zm8='
  assert.equal(base64UrlEncode(bytes3), 'Zm8');
  assert.ok(!base64UrlEncode(bytes3).includes('='));

  // Test string input
  assert.equal(base64UrlEncode('hello world'), 'aGVsbG8gd29ybGQ');
});

test('generateRandomString: generates secure unpadded Base64URL string within bounds', () => {
  const str32 = generateRandomString(32);
  // 32 bytes -> 43 base64url characters
  assert.equal(str32.length, 43);
  assert.match(str32, /^[A-Za-z0-9_-]+$/);
  assert.ok(!str32.includes('+'));
  assert.ok(!str32.includes('/'));
  assert.ok(!str32.includes('='));

  const str64 = generateRandomString(64);
  // 64 bytes -> 86 base64url characters
  assert.equal(str64.length, 86);
  assert.match(str64, /^[A-Za-z0-9_-]+$/);

  // Out of bounds checks
  assert.throws(() => generateRandomString(16), RangeError);
  assert.throws(() => generateRandomString(100), RangeError);
});

test('computeChallenge: matches RFC 7636 Section 4.2 normative test vector', async () => {
  // Official test vector from RFC 7636 Section 4.2
  const rfcVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  const computed = await computeChallenge(rfcVerifier);
  assert.equal(computed, expectedChallenge);
  assert.equal(computed.length, 43);
  assert.match(computed, /^[A-Za-z0-9_-]+$/);
});

test('computeChallenge: validates input constraints', async () => {
  await assert.rejects(
    async () => await computeChallenge(''),
    /codeVerifier must be a non-empty string/
  );
  await assert.rejects(
    async () => await computeChallenge(null),
    /codeVerifier must be a non-empty string/
  );
  await assert.rejects(
    async () => await computeChallenge(12345),
    /codeVerifier must be a non-empty string/
  );
  // Too short (< 43 chars per RFC 7636)
  await assert.rejects(
    async () => await computeChallenge('short_verifier_too_few_chars'),
    /length must be between 43 and 128 characters/
  );
  // Too long (> 128 chars per RFC 7636)
  const tooLong = 'a'.repeat(129);
  await assert.rejects(
    async () => await computeChallenge(tooLong),
    /length must be between 43 and 128 characters/
  );
});

test('generatePkcePair: produces compliant codeVerifier, challenge, state, and nonce', async () => {
  const pair = await generatePkcePair();

  // Validate structure
  assert.ok(pair.codeVerifier);
  assert.ok(pair.codeChallenge);
  assert.equal(pair.codeChallengeMethod, 'S256');
  assert.equal(pair.codeChallengeMethod, CODE_CHALLENGE_METHOD);
  assert.ok(pair.state);
  assert.ok(pair.nonce);

  // Validate lengths
  assert.ok(pair.codeVerifier.length >= 43 && pair.codeVerifier.length <= 128);
  assert.equal(pair.codeChallenge.length, 43);
  assert.equal(pair.state.length, 43);
  assert.equal(pair.nonce.length, 43);

  // Validate character sets
  assert.match(pair.codeVerifier, /^[A-Za-z0-9_-]+$/);
  assert.match(pair.codeChallenge, /^[A-Za-z0-9_-]+$/);
  assert.match(pair.state, /^[A-Za-z0-9_-]+$/);
  assert.match(pair.nonce, /^[A-Za-z0-9_-]+$/);

  // Validate challenge consistency: recomputing challenge from verifier matches
  const recomputed = await computeChallenge(pair.codeVerifier);
  assert.equal(recomputed, pair.codeChallenge);
});

test('generatePkcePair: validates entropy and distinctness across calls', async () => {
  const pairs = await Promise.all([
    generatePkcePair(),
    generatePkcePair(),
    generatePkcePair(),
    generatePkcePair(),
  ]);

  const verifiers = new Set(pairs.map((p) => p.codeVerifier));
  const challenges = new Set(pairs.map((p) => p.codeChallenge));
  const states = new Set(pairs.map((p) => p.state));
  const nonces = new Set(pairs.map((p) => p.nonce));

  assert.equal(verifiers.size, 4, 'Verifiers must be uniquely generated');
  assert.equal(challenges.size, 4, 'Challenges must be uniquely generated');
  assert.equal(states.size, 4, 'States must be uniquely generated');
  assert.equal(nonces.size, 4, 'Nonces must be uniquely generated');
});
