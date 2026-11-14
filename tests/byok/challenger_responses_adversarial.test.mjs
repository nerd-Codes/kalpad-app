// tests/byok/challenger_responses_adversarial.test.mjs
/**
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE: ChatGPT BYOK Responses & Streaming Engine
 *
 * Designed to aggressively probe and stress-test:
 * 1. Single 401 retry loop prevention and auth replay defense
 * 2. ChatGPT 429 quota exhaustion & usage limits handling
 * 3. Pathological SSE chunk fragmentation (1-byte, split UTF-8, split CRLF, fuzzing)
 * 4. Strict parameter whitelisting and disallowed parameter stripping
 * 5. Model discovery fallback resilience on network/server errors
 *
 * Execution:
 *   NODE_OPTIONS="--max-old-space-size=1280" node --test tests/byok/challenger_responses_adversarial.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResponsesPayload,
  parseSSELine,
  streamResponsesChat,
  fetchAvailableModels,
  filterModelsForList,
  resolveFallbackModel,
  executeWithAuthRetry,
  isUsageLimitError,
  isUserNotEligibleError,
  isTransientError,
  shouldPurgeCredentialsOnError,
  CHATGPT_USAGE_SETTINGS_URL,
  DEFAULT_FALLBACK_MODEL_SLUG,
  DEFAULT_FALLBACK_MODEL_NAME,
  DISALLOWED_RESPONSE_PARAMS,
  normalizeMessageRole,
  RESPONSES_ENDPOINT,
  MODELS_ENDPOINT,
} from '../../src/lib/byok/openai.js';

import {
  refreshTokens,
  getValidAccessToken,
} from '../../src/lib/byok/auth.js';

import {
  saveSession,
  loadSession,
  clearSession,
  setStorageBackend,
  STORAGE_KEYS,
  DIRECT_INFERENCE_SCOPE,
} from '../../src/lib/byok/storage.js';

// In-Memory Storage mock for isolated test state
class AdversarialMemoryStorage {
  constructor() {
    this._map = new Map();
  }
  getItem(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }
  setItem(key, value) {
    this._map.set(key, String(value));
  }
  removeItem(key) {
    this._map.delete(key);
  }
  clear() {
    this._map.clear();
  }
  get length() {
    return this._map.size;
  }
}

/**
 * Creates a mock ReadableStream that emits UTF-8 byte chunks of specified sizes.
 * Can be sliced into fixed chunk size (e.g. 1 byte) or variable chunk sizes.
 *
 * @param {string} text Full stream text content
 * @param {number|number[]|Function} sliceConfig Chunk size or sizing function
 * @returns {ReadableStream}
 */
function createFragmentedStream(text, sliceConfig = 1) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  return new ReadableStream({
    start(controller) {
      let offset = 0;
      let chunkIdx = 0;

      while (offset < bytes.length) {
        let size = 1;
        if (typeof sliceConfig === 'number') {
          size = sliceConfig;
        } else if (Array.isArray(sliceConfig)) {
          size = sliceConfig[chunkIdx % sliceConfig.length];
        } else if (typeof sliceConfig === 'function') {
          size = sliceConfig(chunkIdx, offset);
        }

        const sliceSize = Math.max(1, Math.min(size, bytes.length - offset));
        const chunk = bytes.subarray(offset, offset + sliceSize);
        controller.enqueue(chunk);
        offset += sliceSize;
        chunkIdx++;
      }
      controller.close();
    },
  });
}

test('CHALLENGER 2: Responses & Streaming Adversarial Suite', async (suite) => {

  // =========================================================================
  // 1. SINGLE 401 RETRY LOOP PREVENTION & REPLAY DEFENSE
  // =========================================================================
  await suite.test('1. Single 401 Retry Loop Prevention & Termination', async (t) => {

    await t.test('1.1: executeWithAuthRetry refreshes token upon initial 401 and succeeds on retry', async () => {
      let attempts = 0;
      let refreshCount = 0;

      const mockApi = async (token) => {
        attempts++;
        if (attempts === 1) {
          assert.equal(token, 'expired_token_001');
          const err = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }
        assert.equal(token, 'refreshed_token_002');
        return 'success_payload';
      };

      const mockRefresh = async () => {
        refreshCount++;
        return 'refreshed_token_002';
      };

      const result = await executeWithAuthRetry(mockApi, 'expired_token_001', mockRefresh);
      assert.equal(result, 'success_payload');
      assert.equal(attempts, 2, 'Must attempt exactly 2 times (initial + 1 retry)');
      assert.equal(refreshCount, 1, 'Must refresh exactly once');
    });

    await t.test('1.2: executeWithAuthRetry halts after exactly 1 retry when consecutive 401s occur', async () => {
      let attempts = 0;
      let refreshCount = 0;

      const mockApi = async (token) => {
        attempts++;
        const err = new Error(`Unauthorized on attempt ${attempts} with token ${token}`);
        err.status = 401;
        throw err;
      };

      const mockRefresh = async () => {
        refreshCount++;
        return `refreshed_token_${refreshCount}`;
      };

      const startTime = Date.now();
      await assert.rejects(
        async () => executeWithAuthRetry(mockApi, 'token_init', mockRefresh),
        /Unauthorized on attempt 2/
      );
      const elapsed = Date.now() - startTime;

      assert.equal(attempts, 2, 'Consecutive 401 must terminate after exactly 2 attempts (initial + 1 retry)');
      assert.equal(refreshCount, 1, 'Must NOT attempt repeated refreshes in a loop');
      assert.ok(elapsed < 2000, `Execution took ${elapsed}ms; must not hang or loop`);
    });

    await t.test('1.3: streamResponsesChat handles consecutive 401s on expired token: refreshes once and halts cleanly', async () => {
      const originalFetch = globalThis.fetch;
      let responsesCallCount = 0;
      let refreshCallCount = 0;

      const mockStorage = new AdversarialMemoryStorage();
      setStorageBackend(mockStorage);
      // Save an expired session (expiresIn: -10) so isTokenExpired triggers network refresh
      saveSession({
        accessToken: 'initial_expired_token',
        refreshToken: 'valid_refresh_token',
        clientId: 'oaiapp_test',
        expiresIn: -10,
      });

      globalThis.fetch = async (url, opts) => {
        if (url.includes('/v1/responses')) {
          responsesCallCount++;
          return {
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: { message: 'Invalid or expired token', code: 'invalid_token' } }),
          };
        }
        if (url.includes('/oauth/token')) {
          refreshCallCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'new_refreshed_token',
              refresh_token: 'new_rotated_refresh_token',
              expires_in: 3600,
              scope: DIRECT_INFERENCE_SCOPE,
            }),
          };
        }
        throw new Error(`Unexpected fetch call to ${url}`);
      };

      try {
        let caughtError = null;
        await streamResponsesChat({
          accessToken: 'initial_expired_token',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'Hello' }],
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.ok(caughtError, 'Must propagate error to onError callback');
        assert.equal(caughtError.status, 401, 'Error status must be 401');
        assert.equal(responsesCallCount, 2, 'Must send exactly 2 requests to /v1/responses (1 initial + 1 retry)');
        assert.equal(refreshCallCount, 1, 'Must invoke token refresh exactly once');
      } finally {
        globalThis.fetch = originalFetch;
        clearSession();
        setStorageBackend(null);
      }
    });

    await t.test('1.4: Refresh endpoint failure with invalid_grant rejects with UNAUTHENTICATED and purges session', async () => {
      const originalFetch = globalThis.fetch;
      let responsesCallCount = 0;
      let refreshCallCount = 0;

      const mockStorage = new AdversarialMemoryStorage();
      setStorageBackend(mockStorage);
      // Save session with expired token so refreshTokens reaches out to token endpoint
      saveSession({
        accessToken: 'expired_access_token',
        refreshToken: 'revoked_refresh_token',
        clientId: 'oaiapp_test',
        expiresIn: -10,
      });

      globalThis.fetch = async (url) => {
        if (url.includes('/v1/responses')) {
          responsesCallCount++;
          return {
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: { message: 'Token expired', code: 'invalid_token' } }),
          };
        }
        if (url.includes('/oauth/token')) {
          refreshCallCount++;
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token expired or revoked' }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      };

      try {
        let caughtError = null;
        await streamResponsesChat({
          accessToken: 'expired_access_token',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'Test' }],
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.ok(caughtError, 'Must report error to onError callback');
        assert.match(caughtError.message, /UNAUTHENTICATED/, 'Must indicate UNAUTHENTICATED session');
        assert.equal(responsesCallCount, 1, 'Must NOT retry /v1/responses if refresh failed with invalid_grant');
        assert.equal(refreshCallCount, 1, 'Attempted refresh once');
        assert.equal(loadSession(), null, 'Stored session must be purged after invalid_grant');
      } finally {
        globalThis.fetch = originalFetch;
        clearSession();
        setStorageBackend(null);
      }
    });

    await t.test('1.5: Rapid series of 5 sequential 401 calls: each terminates cleanly at exactly 1 retry', async () => {
      let totalApiAttempts = 0;
      let totalRefreshes = 0;

      const mockApi = async () => {
        totalApiAttempts++;
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      };

      const mockRefresh = async () => {
        totalRefreshes++;
        return `fresh_${totalRefreshes}`;
      };

      for (let i = 0; i < 5; i++) {
        await assert.rejects(
          async () => executeWithAuthRetry(mockApi, `tok_${i}`, mockRefresh),
          /Unauthorized/
        );
      }

      assert.equal(totalApiAttempts, 10, '5 calls * 2 attempts each = 10 total attempts');
      assert.equal(totalRefreshes, 5, '5 calls * 1 refresh each = 5 total refreshes');
    });

  });

  // =========================================================================
  // 2. CHATGPT 429 QUOTA EXHAUSTION & USAGE LIMITS
  // =========================================================================
  await suite.test('2. ChatGPT 429 Quota Exhaustion & Usage Limits', async (t) => {

    await t.test('2.1: HTTP 429 with subscription_sharing_usage_limit_exceeded surfaces settingsUrl and isUsageLimit', async () => {
      const originalFetch = globalThis.fetch;
      const mockStorage = new AdversarialMemoryStorage();
      setStorageBackend(mockStorage);
      const saved = saveSession({
        accessToken: 'quota_user_token',
        refreshToken: 'quota_refresh_token',
        clientId: 'oaiapp_quota',
        expiresIn: 3600,
      });

      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 429,
          text: async () => JSON.stringify({
            error: {
              code: 'subscription_sharing_usage_limit_exceeded',
              message: 'ChatGPT Plus 5-hour rolling usage limit reached. Resets at 3:00 PM.',
            },
          }),
        };
      };

      try {
        let caughtError = null;
        await streamResponsesChat({
          accessToken: 'quota_user_token',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'Generate code' }],
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.ok(caughtError, 'Must invoke onError callback');
        assert.equal(caughtError.status, 429);
        assert.equal(caughtError.code, 'subscription_sharing_usage_limit_exceeded');
        assert.equal(caughtError.isUsageLimit, true, 'Must flag isUsageLimit = true');
        assert.equal(caughtError.settingsUrl, CHATGPT_USAGE_SETTINGS_URL);
        assert.equal(caughtError.settingsUrl, 'https://chatgpt.com/settings/usage');

        // Check that session was PRESERVED in storage
        const currentSession = loadSession();
        assert.ok(currentSession, 'Stored session must NOT be cleared on 429 quota exhaustion');
        assert.equal(currentSession.accessToken, 'quota_user_token');
        assert.equal(currentSession.refreshToken, 'quota_refresh_token');
      } finally {
        globalThis.fetch = originalFetch;
        clearSession();
        setStorageBackend(null);
      }
    });

    await t.test('2.2: Mid-stream SSE response.failed event with usage limit code flags isUsageLimit and preserves storage', async () => {
      const originalFetch = globalThis.fetch;
      const mockStorage = new AdversarialMemoryStorage();
      setStorageBackend(mockStorage);
      saveSession({
        accessToken: 'stream_user_token',
        refreshToken: 'stream_refresh_token',
        clientId: 'oaiapp_stream',
        expiresIn: 3600,
      });

      const sseText = [
        'event: response.output_text.delta\ndata: {"delta": "Partial output before limit..."}\n\n',
        'event: response.failed\ndata: {"response": {"error": {"code": "subscription_sharing_usage_limit_exceeded", "message": "Usage limit reached mid-stream"}}}\n\n',
      ].join('');

      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          body: createFragmentedStream(sseText, 16),
        };
      };

      try {
        let accumulatedDelta = '';
        let caughtError = null;

        await streamResponsesChat({
          accessToken: 'stream_user_token',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'Hi' }],
          onDelta: (delta) => {
            accumulatedDelta += delta;
          },
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.equal(accumulatedDelta, 'Partial output before limit...');
        assert.ok(caughtError, 'Must invoke onError callback on response.failed');
        assert.equal(caughtError.isUsageLimit, true, 'Mid-stream response.failed must set isUsageLimit = true');
        assert.equal(caughtError.settingsUrl, 'https://chatgpt.com/settings/usage');

        // Verify credentials preserved
        assert.ok(loadSession(), 'Local credentials must be preserved on mid-stream quota exhaustion');
      } finally {
        globalThis.fetch = originalFetch;
        clearSession();
        setStorageBackend(null);
      }
    });

    await t.test('2.3: isUsageLimitError exhaustive pattern matching on all error formats', () => {
      // Top-level code
      assert.equal(isUsageLimitError({ code: 'subscription_sharing_usage_limit_exceeded' }), true);
      // Nested error.code
      assert.equal(isUsageLimitError({ error: { code: 'subscription_sharing_usage_limit_exceeded' } }), true);
      // Deeply nested response.error.code
      assert.equal(isUsageLimitError({ response: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } }), true);
      // Error object with code
      const quotaErrWithCode = new Error('ChatGPT Plus 5-hour rolling usage limit reached.');
      quotaErrWithCode.code = 'subscription_sharing_usage_limit_exceeded';
      assert.equal(isUsageLimitError(quotaErrWithCode), true);
      // Message regex matches (usage_limit_exceeded or plan usage limit exceeded)
      assert.equal(isUsageLimitError(new Error('ChatGPT plan usage limit exceeded for current window')), true);
      assert.equal(isUsageLimitError({ message: 'ChatGPT plan usage limit exceeded' }), true);
      assert.equal(isUsageLimitError({ error: { message: 'subscription_sharing_usage_limit_exceeded' } }), true);

      // Non-quota errors must be false
      assert.equal(isUsageLimitError({ code: 'subscription_sharing_user_not_eligible' }), false);
      assert.equal(isUsageLimitError({ code: 'invalid_grant' }), false);
      assert.equal(isUsageLimitError(new Error('Internal server error')), false);
      assert.equal(isUsageLimitError(null), false);
      assert.equal(isUsageLimitError(undefined), false);
    });

    await t.test('2.4: isTransientError strictly classifies 429 quota exhaustion as non-transient', () => {
      const quotaErr = {
        status: 429,
        code: 'subscription_sharing_usage_limit_exceeded',
      };
      assert.equal(isTransientError(quotaErr), false, 'Quota exhaustion must NOT be marked transient');

      // Contrast with real transient errors
      assert.equal(isTransientError({ status: 503 }), true);
      assert.equal(isTransientError({ status: 502 }), true);
      assert.equal(isTransientError({ status: 504 }), true);
      assert.equal(isTransientError({ code: 'subscription_sharing_usage_unavailable' }), true);
      // Plain 429 (not quota limit) is transient rate limit
      assert.equal(isTransientError({ status: 429 }), true);
    });

    await t.test('2.5: shouldPurgeCredentialsOnError preserves credentials on quota and transient errors', () => {
      // Quota limit: DO NOT PURGE
      assert.equal(shouldPurgeCredentialsOnError({ code: 'subscription_sharing_usage_limit_exceeded' }), false);
      // Transient 503: DO NOT PURGE
      assert.equal(shouldPurgeCredentialsOnError({ status: 503 }), false);
      // Ineligible account (403): DO NOT PURGE
      assert.equal(shouldPurgeCredentialsOnError({ code: 'subscription_sharing_user_not_eligible' }), false);

      // Invalid or revoked tokens: PURGE
      assert.equal(shouldPurgeCredentialsOnError({ code: 'invalid_grant' }), true);
      assert.equal(shouldPurgeCredentialsOnError({ code: 'refresh_token_expired' }), true);
      assert.equal(shouldPurgeCredentialsOnError({ code: 'unauthorized_client' }), true);
    });

  });

  // =========================================================================
  // 3. PATHOLOGICAL SSE CHUNK FRAGMENTATION & UNICODE STRESS TESTING
  // =========================================================================
  await suite.test('3. Pathological SSE Chunk Fragmentation & Unicode Stress', async (t) => {

    await t.test('3.1: 1-byte chunk stream: reconstructs entire message stream with 100% fidelity', async () => {
      const originalFetch = globalThis.fetch;
      const expectedFullText = 'The quick brown fox jumps over the lazy dog. 1234567890! @#$%^&*()';

      const sseText = [
        'event: response.output_text.delta\ndata: {"delta": "The quick "}\n\n',
        'event: response.output_text.delta\ndata: {"delta": "brown fox "}\n\n',
        'event: response.output_text.delta\ndata: {"delta": "jumps over "}\n\n',
        'event: response.output_text.delta\ndata: {"delta": "the lazy dog. "}\n\n',
        'event: response.output_text.delta\ndata: {"delta": "1234567890! @#$%^&*()"}\n\n',
        'event: response.completed\ndata: {"response": {"id": "resp_1byte_test", "status": "completed"}}\n\n',
      ].join('');

      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          body: createFragmentedStream(sseText, 1), // EXACTLY 1 BYTE PER CHUNK
        };
      };

      try {
        let reconstructed = '';
        let completedResponse = null;

        await streamResponsesChat({
          accessToken: 'valid_tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onDelta: (delta) => {
            reconstructed += delta;
          },
          onCompleted: (resp) => {
            completedResponse = resp;
          },
        });

        assert.equal(reconstructed, expectedFullText, 'Reconstructed text must match byte-for-byte');
        assert.ok(completedResponse, 'Must trigger onCompleted');
        assert.equal(completedResponse.id, 'resp_1byte_test');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('3.2: Multibyte UTF-8 boundary slicing: splits 2-byte, 3-byte (CJK), and 4-byte (emojis) across chunks', async () => {
      const originalFetch = globalThis.fetch;
      // High-density multibyte UTF-8 payload:
      // 2-byte: é, ñ, ü, λ, Ω
      // 3-byte: 漢, 字, 学, 習, 日本語
      // 4-byte emojis: 🚀, 🔥, 🤖, ✨, 🧠, 💻, 🌍
      const testUnicodeString = 'Greek: λ, Ω | CJK: 漢字学習 日本語 | Emojis: 🚀🔥🤖✨🧠💻🌍 | Accents: café, naïve, résumé';

      const sseText = [
        `event: response.output_text.delta\ndata: {"delta": ${JSON.stringify(testUnicodeString)}}\n\n`,
        'event: response.completed\ndata: {"response": {"status": "completed"}}\n\n',
      ].join('');

      // Test with 1-byte, 2-byte, and 3-byte chunking
      for (const chunkSize of [1, 2, 3]) {
        globalThis.fetch = async () => ({
          ok: true,
          status: 200,
          body: createFragmentedStream(sseText, chunkSize),
        });

        let output = '';
        await streamResponsesChat({
          accessToken: 'valid_tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onDelta: (delta) => {
            output += delta;
          },
        });

        assert.equal(
          output,
          testUnicodeString,
          `Multibyte UTF-8 slicing failed with chunk size ${chunkSize}`
        );
        // Verify no Unicode replacement characters (U+FFFD) were introduced
        assert.equal(output.includes('\uFFFD'), false, 'Stream must not contain corrupt U+FFFD characters');
      }

      globalThis.fetch = originalFetch;
    });

    await t.test('3.3: Split newlines across chunk boundaries (CR in chunk N, LF in chunk N+1)', async () => {
      const originalFetch = globalThis.fetch;
      // Mix of Windows \r\n and Unix \n split across chunk boundaries
      const sseLines = [
        'event: response.output_text.delta\r\ndata: {"delta": "Line 1\\n"}\r\n\r\n',
        'event: response.output_text.delta\ndata: {"delta": "Line 2\\n"}\n\n',
        'event: response.output_text.delta\r\ndata: {"delta": "Line 3"}\r\n\r\n',
        'event: response.completed\r\ndata: {"response": {"status": "completed"}}\r\n\r\n',
      ].join('');

      // Slicing pattern: cycle through [3, 2, 1, 4] bytes to deliberately split \r and \n
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        body: createFragmentedStream(sseLines, [3, 2, 1, 4]),
      });

      try {
        let reconstructed = '';
        await streamResponsesChat({
          accessToken: 'tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onDelta: (d) => {
            reconstructed += d;
          },
        });

        assert.equal(reconstructed, 'Line 1\nLine 2\nLine 3');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('3.4: Adversarial JSON line slicing: field names, quotes, and escaped characters split across chunks', async () => {
      const originalFetch = globalThis.fetch;
      const jsonWithEscapes = 'Quote: \\"Hello\\", Backslash: \\\\, Tab: \\t, Unicode: \\u0041';
      const sseText = `event: response.output_text.delta\ndata: {"delta": "${jsonWithEscapes}"}\n\n`;

      // Slice specifically at 2-byte increments
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        body: createFragmentedStream(sseText, 2),
      });

      try {
        let reconstructed = '';
        await streamResponsesChat({
          accessToken: 'tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onDelta: (d) => {
            reconstructed += d;
          },
        });

        assert.equal(reconstructed, 'Quote: "Hello", Backslash: \\, Tab: \t, Unicode: A');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('3.5: Chunk size fuzzing harness: 25 iterations with pseudorandom slice sizes (1-17 bytes)', async () => {
      const originalFetch = globalThis.fetch;
      const targetText = 'Adversarial fuzz testing ensures that streaming SSE buffers remain invariant under arbitrary network packet fragmentation!';

      const events = [];
      const words = targetText.split(' ');
      for (const word of words) {
        events.push(`event: response.output_text.delta\ndata: {"delta": "${word} "}\n\n`);
      }
      events.push('event: response.completed\ndata: {"response": {"status": "completed"}}\n\n');
      const ssePayload = events.join('');

      // Simple deterministic PRNG for reproducible test runs
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      for (let iter = 0; iter < 25; iter++) {
        const sliceSequence = [];
        for (let j = 0; j < 50; j++) {
          sliceSequence.push(Math.floor(pseudoRandom() * 17) + 1); // 1 to 17 bytes
        }

        globalThis.fetch = async () => ({
          ok: true,
          status: 200,
          body: createFragmentedStream(ssePayload, sliceSequence),
        });

        let output = '';
        await streamResponsesChat({
          accessToken: 'tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onDelta: (d) => {
            output += d;
          },
        });

        assert.equal(
          output.trim(),
          targetText.trim(),
          `Fuzz iteration ${iter} failed to reconstruct exact stream text`
        );
      }

      globalThis.fetch = originalFetch;
    });

    await t.test('3.6: Pathological 1-byte sliced response.failed event correctly parses and dispatches error', async () => {
      const originalFetch = globalThis.fetch;
      const ssePayload = 'event: response.failed\ndata: {"response": {"error": {"code": "subscription_sharing_usage_limit_exceeded", "message": "1-byte sliced limit reached"}}}\n\n';

      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        body: createFragmentedStream(ssePayload, 1),
      });

      try {
        let caughtError = null;
        await streamResponsesChat({
          accessToken: 'tok',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'test' }],
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.ok(caughtError, 'Must invoke onError on 1-byte sliced error event');
        assert.equal(caughtError.isUsageLimit, true);
        assert.equal(caughtError.code, 'subscription_sharing_usage_limit_exceeded');
        assert.equal(caughtError.settingsUrl, 'https://chatgpt.com/settings/usage');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

  });

  // =========================================================================
  // 4. STRICT PARAMETER WHITELISTING & ROLE NORMALIZATION
  // =========================================================================
  await suite.test('4. Strict Parameter Whitelisting & Role Normalization', async (t) => {

    await t.test('4.1: Strips all disallowed parameters defined in DISALLOWED_RESPONSE_PARAMS', () => {
      assert.deepEqual(DISALLOWED_RESPONSE_PARAMS, [
        'temperature',
        'top_p',
        'max_output_tokens',
        'prompt',
        'conversation',
        'previous_response_id',
      ]);

      const payload = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'Clean test' }],
        temperature: 0.7,
        top_p: 0.95,
        max_output_tokens: 2048,
        prompt: 'illegal legacy prompt',
        conversation: 'conv_888',
        previous_response_id: 'resp_previous_111',
      });

      for (const disallowed of DISALLOWED_RESPONSE_PARAMS) {
        assert.equal(
          disallowed in payload,
          false,
          `Disallowed parameter "${disallowed}" must NOT exist in output payload`
        );
      }
    });

    await t.test('4.2: Strips arbitrary injected and extraneous properties from payload root', () => {
      const payload = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'Hello' }],
        messages: [{ role: 'user', content: 'injected' }],
        n: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        logit_bias: {},
        seed: 12345,
        tools: [{ type: 'function' }],
        response_format: { type: 'json_object' },
        user: 'attacker_identifier',
        hackKey: 'malicious',
      });

      assert.equal('messages' in payload, false);
      assert.equal('n' in payload, false);
      assert.equal('frequency_penalty' in payload, false);
      assert.equal('presence_penalty' in payload, false);
      assert.equal('logit_bias' in payload, false);
      assert.equal('seed' in payload, false);
      assert.equal('tools' in payload, false);
      assert.equal('response_format' in payload, false);
      assert.equal('user' in payload, false);
      assert.equal('hackKey' in payload, false);
    });

    await t.test('4.3: Strictly enforces store: false even when passed store: true or string', () => {
      const payload1 = buildResponsesPayload({ model: 'gpt-4o', input: [], store: true });
      assert.equal(payload1.store, false);

      const payload2 = buildResponsesPayload({ model: 'gpt-4o', input: [], store: 'true' });
      assert.equal(payload2.store, false);

      const payload3 = buildResponsesPayload({ model: 'gpt-4o', input: [], store: 1 });
      assert.equal(payload3.store, false);
    });

    await t.test('4.4: Strictly enforces stream: true even when passed stream: false or null', () => {
      const payload1 = buildResponsesPayload({ model: 'gpt-4o', input: [], stream: false });
      assert.equal(payload1.stream, true);

      const payload2 = buildResponsesPayload({ model: 'gpt-4o', input: [], stream: null });
      assert.equal(payload2.stream, true);
    });

    await t.test('4.5: Normalizes role: "system" to role: "developer" and preserves text content', () => {
      const input = [
        { role: 'system', content: 'System instruction line 1\nLine 2' },
        { role: 'user', content: 'User question' },
      ];
      const payload = buildResponsesPayload({ model: 'gpt-4o', input });

      assert.equal(payload.input[0].role, 'developer');
      assert.equal(payload.input[0].content, 'System instruction line 1\nLine 2');
      assert.equal(payload.input[1].role, 'user');
    });

    await t.test('4.6: Normalizes role: "assistant" to role: "developer" in multi-turn history', () => {
      const input = [
        { role: 'user', content: 'Turn 1' },
        { role: 'assistant', content: 'Assistant turn 1' },
        { role: 'user', content: 'Turn 2' },
      ];
      const payload = buildResponsesPayload({ model: 'gpt-4o', input });

      assert.equal(payload.input[1].role, 'developer');
      assert.equal(payload.input[1].content, 'Assistant turn 1');
    });

    await t.test('4.7: normalizeMessageRole validates and throws descriptive Error on illegal roles', () => {
      assert.equal(normalizeMessageRole('user'), 'user');
      assert.equal(normalizeMessageRole('developer'), 'developer');
      assert.equal(normalizeMessageRole('system'), 'developer');
      assert.equal(normalizeMessageRole('assistant'), 'developer');
      assert.equal(normalizeMessageRole(' USER '), 'user');
      assert.equal(normalizeMessageRole(' SYSTEM '), 'developer');

      // Illegal roles must throw
      assert.throws(() => normalizeMessageRole('admin'), /Invalid message role/);
      assert.throws(() => normalizeMessageRole('root'), /Invalid message role/);
      assert.throws(() => normalizeMessageRole('bot'), /Invalid message role/);
      assert.throws(() => normalizeMessageRole('model'), /Invalid message role/);
      assert.throws(() => normalizeMessageRole(123), /expected string/);
      assert.throws(() => normalizeMessageRole(null), /expected string/);
    });

    await t.test('4.8: Wire verification: intercepts fetch body and asserts strict whitelist adherence', async () => {
      const originalFetch = globalThis.fetch;
      let interceptedBody = null;

      globalThis.fetch = async (url, opts) => {
        if (url.includes('/v1/responses')) {
          interceptedBody = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            body: createFragmentedStream('event: response.completed\ndata: {"response": {"status": "completed"}}\n\n', 64),
          };
        }
        throw new Error(`Unexpected url: ${url}`);
      };

      try {
        await streamResponsesChat({
          accessToken: 'test_token',
          model: 'gpt-4o',
          input: [
            { role: 'system', content: 'System steer' },
            { role: 'user', content: 'User prompt' },
          ],
          instructions: 'Top-level steering instructions',
          // Pass illegal params to ensure streamResponsesChat strips them
          temperature: 0.7,
          max_output_tokens: 500,
        });

        assert.ok(interceptedBody, 'Fetch body must be intercepted');

        // Whitelisted root keys only: model, input, store, stream, instructions
        const rootKeys = Object.keys(interceptedBody).sort();
        const expectedKeys = ['input', 'instructions', 'model', 'store', 'stream'].sort();
        assert.deepEqual(rootKeys, expectedKeys, 'Root JSON payload must strictly match whitelist');

        assert.equal(interceptedBody.model, 'gpt-4o');
        assert.equal(interceptedBody.store, false);
        assert.equal(interceptedBody.stream, true);
        assert.equal(interceptedBody.instructions, 'Top-level steering instructions');

        // Verify each message in input contains only { role, content } and valid roles
        for (const item of interceptedBody.input) {
          const itemKeys = Object.keys(item).sort();
          assert.deepEqual(itemKeys, ['content', 'role']);
          assert.ok(item.role === 'user' || item.role === 'developer', `Role ${item.role} is not permitted on wire`);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

  });

  // =========================================================================
  // 5. MODEL DISCOVERY FALLBACK & RESILIENCE
  // =========================================================================
  await suite.test('5. Model Discovery Fallback & Resilience', async (t) => {

    await t.test('5.1: Network offline error (fetch throws TypeError) gracefully falls back to gpt-4o', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch: net::ERR_INTERNET_DISCONNECTED');
      };

      try {
        const models = await fetchAvailableModels('mock_token');
        assert.ok(Array.isArray(models), 'Must return an array');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, DEFAULT_FALLBACK_MODEL_SLUG);
        assert.equal(models[0].slug, 'gpt-4o');
        assert.equal(models[0].displayName, DEFAULT_FALLBACK_MODEL_NAME);
        assert.equal(models[0].displayName, 'GPT-4o');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('5.2: HTTP 500 / 502 / 503 / 504 server outages gracefully fall back to gpt-4o', async () => {
      const originalFetch = globalThis.fetch;

      for (const statusCode of [500, 502, 503, 504]) {
        globalThis.fetch = async () => ({
          ok: false,
          status: statusCode,
          text: async () => 'Internal Server Error',
        });

        const models = await fetchAvailableModels('mock_token');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, 'gpt-4o', `Failed on HTTP ${statusCode}`);
      }

      globalThis.fetch = originalFetch;
    });

    await t.test('5.3: HTTP 401 / 403 / 404 client errors gracefully fall back to gpt-4o', async () => {
      const originalFetch = globalThis.fetch;

      for (const statusCode of [401, 403, 404]) {
        globalThis.fetch = async () => ({
          ok: false,
          status: statusCode,
          text: async () => JSON.stringify({ error: { message: 'Unauthorized or forbidden' } }),
        });

        const models = await fetchAvailableModels('mock_token');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, 'gpt-4o', `Failed on HTTP ${statusCode}`);
      }

      globalThis.fetch = originalFetch;
    });

    await t.test('5.4: Corrupted or non-JSON response body (e.g. HTML gateway page) falls back to gpt-4o', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      try {
        const models = await fetchAvailableModels('mock_token');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, 'gpt-4o');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('5.5: Empty models catalog response formats fall back to gpt-4o', async () => {
      const originalFetch = globalThis.fetch;

      const emptyResponses = [
        [],
        { models: [] },
        { data: [] },
        {},
        null,
      ];

      for (const emptyBody of emptyResponses) {
        globalThis.fetch = async () => ({
          ok: true,
          status: 200,
          json: async () => emptyBody,
        });

        const models = await fetchAvailableModels('mock_token');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, 'gpt-4o');
      }

      globalThis.fetch = originalFetch;
    });

    await t.test('5.6: Filter models catalog excludes hidden models and falls back if none visible', () => {
      const hiddenCatalog = [
        { slug: 'secret-model-1', visibility: 'hide' },
        { slug: 'internal-canary', visibility: 'hide' },
      ];
      const filtered = filterModelsForList(hiddenCatalog);
      assert.equal(filtered.length, 0, 'Hidden models must be excluded');

      // If filter returns empty, resolveFallbackModel provides default
      const fallback = resolveFallbackModel(filtered);
      assert.equal(fallback.slug, 'gpt-4o');
      assert.equal(fallback.displayName, 'GPT-4o');
    });

    await t.test('5.7: resolveFallbackModel returns default gpt-4o descriptor on nullish or malformed input', () => {
      assert.deepEqual(resolveFallbackModel(null), { slug: 'gpt-4o', displayName: 'GPT-4o' });
      assert.deepEqual(resolveFallbackModel(undefined), { slug: 'gpt-4o', displayName: 'GPT-4o' });
      assert.deepEqual(resolveFallbackModel([]), { slug: 'gpt-4o', displayName: 'GPT-4o' });
      assert.deepEqual(resolveFallbackModel([{}]), { slug: 'gpt-4o', displayName: 'GPT-4o' });

      // Valid model list picks the first model
      assert.deepEqual(
        resolveFallbackModel([{ slug: 'gpt-4o-mini', displayName: 'GPT-4o Mini' }]),
        { slug: 'gpt-4o-mini', displayName: 'GPT-4o Mini' }
      );
    });

  });

});
