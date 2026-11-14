// tests/byok/responses_api.test.mjs
/**
 * Unit Test Suite for Direct Responses API Client & Streaming Protocol.
 * Verifies request payload construction, parameter whitelisting, role normalization,
 * model catalog discovery & fallback, SSE event decoding, automatic 401 retries,
 * and quota exhaustion handling.
 *
 * Execution:
 *   node tests/byok/responses_api.test.mjs
 *   node --test tests/byok/responses_api.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResponsesPayload,
  parseSSELine,
  fetchAvailableModels,
  filterModelsForList,
  resolveFallbackModel,
  DEFAULT_FALLBACK_MODEL_SLUG,
  DEFAULT_FALLBACK_MODEL_NAME,
  executeWithAuthRetry,
  isUsageLimitError,
  isUserNotEligibleError,
  isTransientError,
  shouldPurgeCredentialsOnError,
  CHATGPT_USAGE_SETTINGS_URL,
  getRetryDelayMs,
  normalizeMessageRole,
  streamResponsesChat,
} from '../../src/lib/byok/openai.js';

test('Responses API Unit Test Suite', async (suite) => {

  // -------------------------------------------------------------------------
  // 1. buildResponsesPayload Tests
  // -------------------------------------------------------------------------
  await suite.test('buildResponsesPayload: Parameter Enforcement & Role Normalization', async (t) => {
    await t.test('enforces store: false strictly even if overridden', () => {
      const payload = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'test prompt' }],
        store: true,
      });
      assert.equal(payload.store, false, 'store must be strictly false');
    });

    await t.test('enforces stream: true strictly even if overridden', () => {
      const payload = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'test prompt' }],
        stream: false,
      });
      assert.equal(payload.stream, true, 'stream must be strictly true');
    });

    await t.test('strips disallowed parameters (temperature, top_p, max_output_tokens, prompt, conversation, previous_response_id)', () => {
      const payload = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'prompt' }],
        temperature: 0.7,
        top_p: 0.9,
        max_output_tokens: 1000,
        prompt: 'illegal',
        conversation: 'illegal_conv',
        previous_response_id: 'prev_123',
        unknownProperty: 'strip_me',
      });

      assert.equal(payload.temperature, undefined);
      assert.equal(payload.top_p, undefined);
      assert.equal(payload.max_output_tokens, undefined);
      assert.equal(payload.prompt, undefined);
      assert.equal(payload.conversation, undefined);
      assert.equal(payload.previous_response_id, undefined);
      assert.equal(payload.unknownProperty, undefined);
      assert.equal(payload.model, 'gpt-4o');
      assert.equal(payload.store, false);
      assert.equal(payload.stream, true);
    });

    await t.test('converts role: "system" to role: "developer" and preserves content', () => {
      const input = [
        { role: 'system', content: 'You are an expert tutor.' },
        { role: 'user', content: 'Explain thermodynamics.' },
      ];
      const payload = buildResponsesPayload({ model: 'gpt-4o', input });

      assert.equal(payload.input[0].role, 'developer');
      assert.equal(payload.input[0].content, 'You are an expert tutor.');
      assert.equal(payload.input[1].role, 'user');
      assert.equal(payload.input[1].content, 'Explain thermodynamics.');
    });

    await t.test('normalizes role: "assistant" to "developer" for multi-turn history', () => {
      const input = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const payload = buildResponsesPayload({ model: 'gpt-4o', input });

      assert.equal(payload.input[1].role, 'developer');
      assert.equal(payload.input[1].content, 'Hi there!');
    });

    await t.test('rejects disallowed roles (e.g. "admin", "bot") with validation error', () => {
      assert.throws(() => {
        buildResponsesPayload({
          model: 'gpt-4o',
          input: [{ role: 'admin_hacker', content: 'inject' }],
        });
      }, /Invalid message role/);
    });

    await t.test('supports top-level developer instructions or developerInstructions', () => {
      const payload1 = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'hi' }],
        instructions: 'Respond concisely.',
      });
      assert.equal(payload1.instructions, 'Respond concisely.');

      const payload2 = buildResponsesPayload({
        model: 'gpt-4o',
        input: [{ role: 'user', content: 'hi' }],
        developerInstructions: 'Act as a calculus professor.',
      });
      assert.equal(payload2.instructions, 'Act as a calculus professor.');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Model Catalog Discovery & Fallback Tests
  // -------------------------------------------------------------------------
  await suite.test('fetchAvailableModels & filterModelsForList: Model Discovery & Fallback', async (t) => {
    await t.test('filterModelsForList filters to visibility == "list" and maps to { slug, displayName }', () => {
      const mockRaw = [
        { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' },
        { slug: 'gpt-4o-mini', display_name: 'GPT-4o mini', visibility: 'list' },
        { slug: 'internal-preview', display_name: 'Internal', visibility: 'hide' },
        { slug: 'deprecated-v0', display_name: 'Deprecated' },
      ];

      const filtered = filterModelsForList(mockRaw);
      assert.equal(filtered.length, 2);
      assert.deepEqual(filtered[0], { slug: 'gpt-4o', displayName: 'GPT-4o' });
      assert.deepEqual(filtered[1], { slug: 'gpt-4o-mini', displayName: 'GPT-4o mini' });
    });

    await t.test('resolveFallbackModel returns default gpt-4o descriptor on empty list', () => {
      const fallback = resolveFallbackModel([]);
      assert.equal(fallback.slug, 'gpt-4o');
      assert.equal(fallback.displayName, 'GPT-4o');
      assert.equal(DEFAULT_FALLBACK_MODEL_SLUG, 'gpt-4o');
      assert.equal(DEFAULT_FALLBACK_MODEL_NAME, 'GPT-4o');
    });

    await t.test('fetchAvailableModels fetches and filters models on valid response', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes('/v1/models'));
        assert.equal(opts.headers.Authorization, 'Bearer test_token_xyz');
        return {
          ok: true,
          json: async () => ({
            models: [
              { slug: 'gpt-4o', display_name: 'GPT-4o', visibility: 'list' },
              { slug: 'o1-preview', display_name: 'o1 Preview', visibility: 'hide' },
            ],
          }),
        };
      };

      try {
        const models = await fetchAvailableModels('test_token_xyz');
        assert.equal(models.length, 1);
        assert.deepEqual(models[0], { slug: 'gpt-4o', displayName: 'GPT-4o' });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('fetchAvailableModels gracefully falls back to gpt-4o on network error or HTTP failure', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error('Network offline');
      };

      try {
        const models = await fetchAvailableModels('bad_token');
        assert.equal(models.length, 1);
        assert.equal(models[0].slug, 'gpt-4o');
        assert.equal(models[0].displayName, 'GPT-4o');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. SSE Stream Parser Tests
  // -------------------------------------------------------------------------
  await suite.test('parseSSELine: Server-Sent Events Line Parser', async (t) => {
    await t.test('parses response.output_text.delta events', () => {
      const chunk = 'event: response.output_text.delta\ndata: {"delta": "Hello world"}\n';
      const parsed = parseSSELine(chunk);
      assert.equal(parsed.type, 'delta');
      assert.equal(parsed.text, 'Hello world');
    });

    await t.test('parses response.completed events', () => {
      const chunk = 'event: response.completed\ndata: {"response": {"id": "resp_001", "status": "completed"}}\n';
      const parsed = parseSSELine(chunk);
      assert.equal(parsed.type, 'completed');
      assert.equal(parsed.response.id, 'resp_001');
    });

    await t.test('parses response.failed events and extracts error', () => {
      const chunk = 'event: response.failed\ndata: {"response": {"error": {"code": "subscription_sharing_usage_limit_exceeded", "message": "Limit reached"}}}\n';
      const parsed = parseSSELine(chunk);
      assert.equal(parsed.type, 'failed');
      assert.equal(parsed.error.code, 'subscription_sharing_usage_limit_exceeded');
    });

    await t.test('handles [DONE] stream termination', () => {
      const chunk = 'data: [DONE]\n';
      const parsed = parseSSELine(chunk);
      assert.equal(parsed.type, 'done');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Error Classification & Quota Limit Tests
  // -------------------------------------------------------------------------
  await suite.test('Error Classification & Quota Limit Detection', async (t) => {
    await t.test('isUsageLimitError identifies subscription_sharing_usage_limit_exceeded', () => {
      assert.equal(
        isUsageLimitError({ code: 'subscription_sharing_usage_limit_exceeded' }),
        true
      );
      assert.equal(
        isUsageLimitError({ error: { code: 'subscription_sharing_usage_limit_exceeded' } }),
        true
      );
      assert.equal(
        isUsageLimitError({ message: 'Plan usage limit exceeded' }),
        true
      );
      assert.equal(
        isUsageLimitError({ code: 'invalid_grant' }),
        false
      );
    });

    await t.test('isTransientError identifies 503 and usage_unavailable but NOT usage_limit_exceeded', () => {
      assert.equal(isTransientError({ status: 503 }), true);
      assert.equal(isTransientError({ code: 'subscription_sharing_usage_unavailable' }), true);
      assert.equal(isTransientError({ code: 'subscription_sharing_usage_limit_exceeded' }), false);
      assert.equal(isTransientError({ status: 403, code: 'subscription_sharing_user_not_eligible' }), false);
    });

    await t.test('shouldPurgeCredentialsOnError preserves credentials on quota or transient errors', () => {
      assert.equal(shouldPurgeCredentialsOnError({ code: 'subscription_sharing_usage_limit_exceeded' }), false);
      assert.equal(shouldPurgeCredentialsOnError({ status: 503 }), false);
      assert.equal(shouldPurgeCredentialsOnError({ code: 'invalid_grant' }), true);
      assert.equal(shouldPurgeCredentialsOnError({ code: 'refresh_token_expired' }), true);
    });

    await t.test('CHATGPT_USAGE_SETTINGS_URL links to official settings URL', () => {
      assert.equal(CHATGPT_USAGE_SETTINGS_URL, 'https://chatgpt.com/settings/usage');
    });

    await t.test('getRetryDelayMs produces exponential backoff', () => {
      const d1 = getRetryDelayMs(1);
      const d2 = getRetryDelayMs(2);
      const d3 = getRetryDelayMs(3);
      assert.ok(d1 > 0);
      assert.ok(d2 > d1);
      assert.ok(d3 > d2);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Automatic 401 Auth Retry Tests
  // -------------------------------------------------------------------------
  await suite.test('executeWithAuthRetry: Single 401 Replay Logic', async (t) => {
    await t.test('retries turn once on 401 Unauthorized with refreshed token', async () => {
      let attempts = 0;
      let refreshed = 0;

      const mockApi = async (token) => {
        attempts++;
        if (attempts === 1) {
          const err = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }
        return `response from ${token}`;
      };

      const mockRefresh = async () => {
        refreshed++;
        return 'fresh_token_456';
      };

      const result = await executeWithAuthRetry(mockApi, 'expired_token_123', mockRefresh);
      assert.equal(result, 'response from fresh_token_456');
      assert.equal(attempts, 2, 'Must attempt exactly twice');
      assert.equal(refreshed, 1, 'Must refresh exactly once');
    });

    await t.test('caps retries at exactly 1 attempt to avoid infinite loops', async () => {
      let attempts = 0;
      const mockApi = async () => {
        attempts++;
        const err = new Error('Unauthorized persistent');
        err.status = 401;
        throw err;
      };

      await assert.rejects(
        async () => executeWithAuthRetry(mockApi, 'token_1', async () => 'token_2'),
        /Unauthorized persistent/
      );
      assert.equal(attempts, 2);
    });

    await t.test('propagates UNAUTHENTICATED error if token refresh fails', async () => {
      const mockApi = async () => {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      };

      await assert.rejects(
        async () =>
          executeWithAuthRetry(mockApi, 'token_1', async () => {
            const unauth = new Error('UNAUTHENTICATED');
            unauth.code = 'UNAUTHENTICATED';
            throw unauth;
          }),
        /UNAUTHENTICATED/
      );
    });
  });

  // -------------------------------------------------------------------------
  // 6. streamResponsesChat End-to-End SSE Streaming Simulation
  // -------------------------------------------------------------------------
  await suite.test('streamResponsesChat: Streaming Execution & Callbacks', async (t) => {
    await t.test('streams deltas and completes via callbacks', async () => {
      const originalFetch = globalThis.fetch;
      const sseStreamText = [
        'event: response.output_text.delta\ndata: {"delta": "Photosynthesis "}\n\n',
        'event: response.output_text.delta\ndata: {"delta": "converts light to energy."}\n\n',
        'event: response.completed\ndata: {"response": {"id": "resp_done", "status": "completed"}}\n\n',
      ].join('');

      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes('/v1/responses'));
        assert.equal(opts.method, 'POST');
        assert.equal(opts.headers.Accept, 'text/event-stream');

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseStreamText));
            controller.close();
          },
        });

        return {
          ok: true,
          status: 200,
          body: stream,
        };
      };

      try {
        let accumulated = '';
        let completed = false;

        await streamResponsesChat({
          accessToken: 'valid_test_token',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'Explain photosynthesis' }],
          onDelta: (text) => {
            accumulated += text;
          },
          onCompleted: (resp) => {
            completed = true;
          },
        });

        assert.equal(accumulated, 'Photosynthesis converts light to energy.');
        assert.equal(completed, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test('detects 429 quota exhaustion and surfaces usage settings URL', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 429,
          text: async () =>
            JSON.stringify({
              error: {
                code: 'subscription_sharing_usage_limit_exceeded',
                message: 'Rate limit reached',
              },
            }),
        };
      };

      try {
        let caughtError = null;
        await streamResponsesChat({
          accessToken: 'token_quota_test',
          model: 'gpt-4o',
          input: [{ role: 'user', content: 'hi' }],
          onError: (err) => {
            caughtError = err;
          },
        });

        assert.ok(caughtError, 'Must invoke onError callback');
        assert.equal(caughtError.status, 429);
        assert.equal(caughtError.code, 'subscription_sharing_usage_limit_exceeded');
        assert.equal(caughtError.isUsageLimit, true);
        assert.equal(caughtError.settingsUrl, 'https://chatgpt.com/settings/usage');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. useChatGPTBYOK React Hook Contract
  // -------------------------------------------------------------------------
  await suite.test('useChatGPTBYOK: React Hook Module Contract', async (t) => {
    await t.test('useChatGPTBYOK is exported as a function from src/hooks/useChatGPTBYOK.js', async () => {
      const hookModule = await import('../../src/hooks/useChatGPTBYOK.js');
      assert.equal(typeof hookModule.useChatGPTBYOK, 'function', 'Must export useChatGPTBYOK function');
    });
  });

});
