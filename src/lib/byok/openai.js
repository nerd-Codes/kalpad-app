// src/lib/byok/openai.js
/**
 * OpenAI Direct Responses API Client & Streaming Protocol Handler.
 * Executes direct client-side browser inference against the OpenAI Responses API
 * (/v1/responses) using user ChatGPT plan quota with mandatory store: false and stream: true.
 * Provides SSE event parsing, model discovery, automatic 401 token refresh retry,
 * and quota exhaustion handling.
 */

import { getValidAccessToken, refreshTokens, getStoredSession } from './auth.js';
import { resolveEffectiveModelForTask } from './modelPreferences.js';

export const OPENAI_API_BASE_URL = 'https://api.openai.com';
export const RESPONSES_ENDPOINT = `${OPENAI_API_BASE_URL}/v1/responses`;
export const MODELS_ENDPOINT = `${OPENAI_API_BASE_URL}/v1/models`;

export const CHATGPT_USAGE_SETTINGS_URL = 'https://chatgpt.com/settings/usage';
export const DEFAULT_FALLBACK_MODEL_SLUG = 'gpt-4o';
export const DEFAULT_FALLBACK_MODEL_NAME = 'GPT-4o';

/**
 * Parameters strictly prohibited on the OpenAI Responses API for ChatGPT token sharing.
 */
export const DISALLOWED_RESPONSE_PARAMS = [
  'temperature',
  'top_p',
  'max_output_tokens',
  'prompt',
  'conversation',
  'previous_response_id',
];

/**
 * Normalizes message roles. Strictly converts 'system' to 'developer' to satisfy
 * OpenAI Responses API preview limitations. Validates that role is 'user' or 'developer'.
 *
 * @param {string} role Input message role
 * @returns {string} Normalized role ('user' | 'developer')
 * @throws {Error} If role is invalid
 */
export function normalizeMessageRole(role) {
  if (typeof role !== 'string') {
    throw new Error(`Invalid message role: expected string, got ${typeof role}`);
  }
  const normalized = role.trim().toLowerCase();
  if (normalized === 'system' || normalized === 'assistant') {
    return 'developer';
  }
  if (normalized === 'user' || normalized === 'developer') {
    return normalized;
  }
  throw new Error(`Invalid message role: "${role}". Must be "user" or "developer".`);
}

/**
 * Builds and validates the JSON request body for POST /v1/responses.
 * Enforces store: false and stream: true strictly, converts system roles to developer,
 * strips disallowed parameters, and whitelists permitted fields.
 *
 * @param {Object} options
 * @param {string} [options.model='gpt-4o'] Model slug
 * @param {Array<Object>} [options.input=[]] Conversation input turns
 * @param {string} [options.instructions] Top-level developer instructions
 * @param {string} [options.developerInstructions] Alias for instructions
 * @returns {Object} JSON-serializable request payload
 */
export function buildResponsesPayload({
  model = DEFAULT_FALLBACK_MODEL_SLUG,
  input = [],
  instructions = '',
  developerInstructions = '',
} = {}) {
  const chosenModel = model || DEFAULT_FALLBACK_MODEL_SLUG;

  if (!Array.isArray(input)) {
    throw new Error('Input must be an array of message items');
  }

  const sanitizedInput = input.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Input item at index ${idx} must be an object`);
    }
    if (!('role' in item) || !('content' in item)) {
      throw new Error(`Input item at index ${idx} must contain "role" and "content"`);
    }
    const role = normalizeMessageRole(item.role);
    const content = typeof item.content === 'string' ? item.content : String(item.content ?? '');
    return {
      role,
      content,
    };
  });

  const payload = {
    model: chosenModel,
    input: sanitizedInput,
    store: false,
    stream: true,
  };

  const combinedInstructions = developerInstructions || instructions;
  if (
    combinedInstructions &&
    typeof combinedInstructions === 'string' &&
    combinedInstructions.trim().length > 0
  ) {
    payload.instructions = combinedInstructions.trim();
  }

  return payload;
}

/**
 * Parses a single SSE (Server-Sent Events) chunk or line into a structured event object.
 * Handles response.output_text.delta, response.completed, and response.failed events.
 *
 * @param {string} line Raw SSE line or multi-line event chunk
 * @returns {Object} Structured event { type: 'delta'|'completed'|'failed'|'done'|'unknown', ... }
 */
export function parseSSELine(line) {
  if (!line || typeof line !== 'string') {
    return { type: 'unknown', raw: line };
  }

  const lines = line.split(/\r?\n/);
  let eventType = null;
  let dataStr = null;

  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith('event:')) {
      eventType = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('data:')) {
      dataStr = trimmed.slice(5).trim();
    }
  }

  if (dataStr === '[DONE]') {
    return { type: 'done', text: '', response: null, error: null };
  }

  let parsedData = null;
  if (dataStr) {
    try {
      parsedData = JSON.parse(dataStr);
    } catch (_) {
      parsedData = { text: dataStr };
    }
  }

  // Failed event
  if (
    eventType === 'response.failed' ||
    parsedData?.response?.error ||
    parsedData?.error
  ) {
    const errorObj = parsedData?.response?.error || parsedData?.error || { message: 'Inference failed' };
    return {
      type: 'failed',
      error: errorObj,
      raw: parsedData,
    };
  }

  // Delta event
  if (
    eventType === 'response.output_text.delta' ||
    eventType === 'response.content_part.delta' ||
    (parsedData && typeof parsedData.delta === 'string' && eventType !== 'response.completed') ||
    (parsedData && typeof parsedData?.delta?.text === 'string')
  ) {
    const text =
      typeof parsedData?.delta === 'string'
        ? parsedData.delta
        : typeof parsedData?.delta?.text === 'string'
        ? parsedData.delta.text
        : typeof parsedData?.text === 'string'
        ? parsedData.text
        : '';
    return {
      type: 'delta',
      text,
      raw: parsedData,
    };
  }

  // Completed event
  if (
    eventType === 'response.completed' ||
    parsedData?.response?.status === 'completed' ||
    parsedData?.status === 'completed'
  ) {
    return {
      type: 'completed',
      response: parsedData?.response || parsedData,
      raw: parsedData,
    };
  }

  return {
    type: eventType || 'unknown',
    data: parsedData,
    raw: line,
  };
}

/**
 * Filters raw model list from OpenAI to those visible in the list catalog.
 * Maps output to uniform structure: { slug, displayName }.
 *
 * @param {Array<Object>} [models=[]] Raw models from GET /v1/models
 * @returns {Array<{ slug: string, displayName: string }>}
 */
export function filterModelsForList(models = []) {
  if (!Array.isArray(models)) return [];
  const hasVisibilityTags = models.some((m) => m && typeof m.visibility === 'string');
  const filtered = hasVisibilityTags
    ? models.filter((m) => m && m.visibility === 'list')
    : models.filter((m) => m && (m.slug || m.id));

  return filtered.map((m) => ({
    slug: m.slug || m.id,
    displayName: m.display_name || m.displayName || m.name || m.slug || m.id,
  }));
}

/**
 * Resolves default model descriptor if model list is empty or discovery fails.
 *
 * @param {Array<Object>} [models=[]]
 * @returns {{ slug: string, displayName: string }}
 */
export function resolveFallbackModel(models = []) {
  if (Array.isArray(models) && models.length > 0 && models[0]?.slug) {
    return {
      slug: models[0].slug,
      displayName: models[0].displayName || models[0].display_name || models[0].slug,
    };
  }
  return {
    slug: DEFAULT_FALLBACK_MODEL_SLUG,
    displayName: DEFAULT_FALLBACK_MODEL_NAME,
  };
}

/**
 * Fetches available models from GET /v1/models using Bearer auth.
 * Filters to visible models and falls back to gpt-4o on network or empty response.
 *
 * @param {string} [accessToken]
 * @returns {Promise<Array<{ slug: string, displayName: string }>>}
 */
export async function fetchAvailableModels(accessToken) {
  try {
    let token = accessToken;
    if (!token) {
      try {
        token = await getValidAccessToken();
      } catch (_) {
        return [resolveFallbackModel()];
      }
    }

    const response = await fetch(MODELS_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [resolveFallbackModel()];
    }

    const data = await response.json();
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data?.data)
      ? data.data
      : [];

    const filtered = filterModelsForList(rawList);
    if (filtered.length > 0) {
      return filtered;
    }
    return [resolveFallbackModel()];
  } catch (_) {
    return [resolveFallbackModel()];
  }
}

/**
 * Checks whether an error indicates plan quota limit exhaustion.
 *
 * @param {Object|Error|null} err
 * @returns {boolean}
 */
export function isUsageLimitError(err) {
  if (!err) return false;
  const code = err?.code || err?.error?.code || err?.response?.error?.code;
  if (code === 'subscription_sharing_usage_limit_exceeded') return true;
  const msg = err?.message || err?.error?.message || '';
  if (/usage_limit_exceeded|plan usage limit exceeded/i.test(msg)) return true;
  return false;
}

/**
 * Checks whether an error indicates an ineligible user (Free tier account).
 *
 * @param {Object|Error|null} err
 * @returns {boolean}
 */
export function isUserNotEligibleError(err) {
  if (!err) return false;
  const code = err?.code || err?.error?.code || err?.response?.error?.code;
  if (code === 'subscription_sharing_user_not_eligible') return true;
  const msg = err?.message || err?.error?.message || '';
  if (/user_not_eligible|Plus or Pro plan required/i.test(msg)) return true;
  return false;
}

/**
 * Checks whether an error is transient (temporary outage or server error) and safe to retry.
 *
 * @param {Object|Error|null} err
 * @returns {boolean}
 */
export function isTransientError(err) {
  if (!err) return false;
  if (isUsageLimitError(err)) return false;
  if (isUserNotEligibleError(err)) return false;
  const status = err?.status || err?.statusCode;
  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    (status === 429 && !isUsageLimitError(err))
  ) {
    return true;
  }
  const code = err?.code || err?.error?.code || err?.response?.error?.code;
  if (code === 'subscription_sharing_usage_unavailable') return true;
  return false;
}

/**
 * Determines whether stored credentials should be purged for a given error.
 * Quota limit and transient errors do NOT purge credentials.
 *
 * @param {Object|Error|null} err
 * @returns {boolean}
 */
export function shouldPurgeCredentialsOnError(err) {
  if (!err) return false;
  if (isUsageLimitError(err)) return false;
  if (isTransientError(err)) return false;
  if (err?.status === 503) return false;
  const code = err?.code || err?.error?.code || err?.response?.error?.code;
  if (
    code === 'invalid_grant' ||
    code === 'refresh_token_expired' ||
    code === 'unauthorized_client'
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates exponential backoff retry delay in milliseconds.
 *
 * @param {number} [attemptNumber=1]
 * @returns {number} Delay in ms
 */
export function getRetryDelayMs(attemptNumber = 1) {
  const attempt = Math.max(1, attemptNumber);
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
}

/**
 * Executes an API function with automatic 401 retry.
 * If the API function fails with HTTP 401 Unauthorized, automatically refreshes
 * the token and retries the API call exactly once before rethrowing.
 *
 * @param {Function} apiFn Function taking accessToken argument and returning a Promise
 * @param {string} initialToken Initial access token
 * @param {Function} [refreshFn] Optional custom refresh function returning fresh token
 * @returns {Promise<any>}
 */
export async function executeWithAuthRetry(apiFn, initialToken, refreshFn = null) {
  let currentToken = initialToken;
  try {
    return await apiFn(currentToken);
  } catch (err) {
    const is401 =
      err?.status === 401 ||
      err?.statusCode === 401 ||
      /unauthorized|401/i.test(err?.message || '');

    if (!is401) {
      throw err;
    }

    const doRefresh =
      refreshFn ||
      (async () => {
        const refreshed = await refreshTokens();
        return refreshed.accessToken;
      });

    currentToken = await doRefresh();
    // Retry once with new token
    return await apiFn(currentToken);
  }
}

/**
 * Streams chat completion turns from POST https://api.openai.com/v1/responses.
 * Decodes Server-Sent Events (SSE), dispatches deltas, completions, and errors,
 * automatically retries on 401 Unauthorized once with refreshed token,
 * and detects subscription_sharing_usage_limit_exceeded (429).
 *
 * @param {Object} options
 * @param {string} [options.accessToken] Active ChatGPT access token (auto-fetched if omitted)
 * @param {string} [options.model='gpt-4o'] Model slug
 * @param {Array<Object>} [options.input=[]] Conversation input turns
 * @param {string} [options.instructions] System/developer steering
 * @param {string} [options.developerInstructions] Alias for instructions
 * @param {Function} [options.onDelta] Callback for text delta chunks: (deltaText: string) => void
 * @param {Function} [options.onCompleted] Callback on completion: (response: Object) => void
 * @param {Function} [options.onError] Callback on error: (error: Error|Object) => void
 * @param {AbortSignal} [options.signal] Optional abort signal
 * @returns {Promise<void>}
 */
export async function streamResponsesChat({
  accessToken,
  model = DEFAULT_FALLBACK_MODEL_SLUG,
  input = [],
  instructions = '',
  developerInstructions = '',
  onDelta,
  onCompleted,
  onError,
  signal,
} = {}) {
  const payload = buildResponsesPayload({
    model,
    input,
    instructions: instructions || developerInstructions,
  });

  const bodyString = JSON.stringify(payload);

  const performFetch = async (token) => {
    const response = await fetch(RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: bodyString,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (_) {}

      const errorCode = errorJson?.error?.code || errorJson?.code;
      const errorMessage =
        errorJson?.error?.message || errorJson?.message || errorText || `HTTP ${response.status}`;

      if (response.status === 401) {
        const err401 = new Error(errorMessage || 'Unauthorized');
        err401.status = 401;
        throw err401;
      }

      if (response.status === 429 || errorCode === 'subscription_sharing_usage_limit_exceeded') {
        const quotaErr = new Error(
          errorMessage || 'ChatGPT Plus 5-hour rolling usage limit reached.'
        );
        quotaErr.status = 429;
        quotaErr.code = 'subscription_sharing_usage_limit_exceeded';
        quotaErr.isUsageLimit = true;
        quotaErr.settingsUrl = CHATGPT_USAGE_SETTINGS_URL;
        throw quotaErr;
      }

      if (errorCode === 'subscription_sharing_user_not_eligible' || response.status === 403) {
        const ineligibleErr = new Error(
          errorMessage || 'ChatGPT Plus or Pro plan required for token sharing.'
        );
        ineligibleErr.status = response.status;
        ineligibleErr.code = errorCode || 'subscription_sharing_user_not_eligible';
        throw ineligibleErr;
      }

      const generalErr = new Error(errorMessage);
      generalErr.status = response.status;
      generalErr.code = errorCode;
      throw generalErr;
    }

    return response;
  };

  let response;
  try {
    let initialToken = accessToken;
    if (!initialToken) {
      initialToken = await getValidAccessToken();
    }

    response = await executeWithAuthRetry(performFetch, initialToken, async () => {
      const refreshed = await refreshTokens();
      return refreshed.accessToken;
    });
  } catch (err) {
    if (onError) {
      onError(err);
      return;
    }
    throw err;
  }

  // Consume SSE stream
  try {
    if (!response.body) {
      throw new Error('Response body is null or streaming unsupported');
    }

    let buffer = '';
    let completed = false;

    if (typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        if (signal?.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const parsed = parseSSELine(chunk);

          if (parsed.type === 'delta') {
            if (onDelta) onDelta(parsed.text);
          } else if (parsed.type === 'completed') {
            completed = true;
            if (onCompleted) onCompleted(parsed.response);
          } else if (parsed.type === 'failed') {
            const errObj = parsed.error || new Error('Inference turn failed');
            if (isUsageLimitError(errObj)) {
              errObj.isUsageLimit = true;
              errObj.settingsUrl = CHATGPT_USAGE_SETTINGS_URL;
            }
            if (onError) onError(errObj);
            return;
          }
        }
      }
    } else if (Symbol.asyncIterator in response.body) {
      const decoder = new TextDecoder('utf-8');
      for await (const chunk of response.body) {
        if (signal?.aborted) break;
        const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        buffer += text;
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';

        for (const eventChunk of events) {
          if (!eventChunk.trim()) continue;
          const parsed = parseSSELine(eventChunk);

          if (parsed.type === 'delta') {
            if (onDelta) onDelta(parsed.text);
          } else if (parsed.type === 'completed') {
            completed = true;
            if (onCompleted) onCompleted(parsed.response);
          } else if (parsed.type === 'failed') {
            const errObj = parsed.error || new Error('Inference turn failed');
            if (isUsageLimitError(errObj)) {
              errObj.isUsageLimit = true;
              errObj.settingsUrl = CHATGPT_USAGE_SETTINGS_URL;
            }
            if (onError) onError(errObj);
            return;
          }
        }
      }
    }

    // Flush any remaining buffer
    if (buffer.trim()) {
      const parsed = parseSSELine(buffer);
      if (parsed.type === 'delta') {
        if (onDelta) onDelta(parsed.text);
      } else if (parsed.type === 'completed') {
        completed = true;
        if (onCompleted) onCompleted(parsed.response);
      } else if (parsed.type === 'failed') {
        const errObj = parsed.error || new Error('Inference turn failed');
        if (isUsageLimitError(errObj)) {
          errObj.isUsageLimit = true;
          errObj.settingsUrl = CHATGPT_USAGE_SETTINGS_URL;
        }
        if (onError) onError(errObj);
        return;
      }
    }

    if (!completed && onCompleted) {
      onCompleted({ status: 'completed' });
    }
  } catch (streamErr) {
    if (onError) {
      onError(streamErr);
      return;
    }
    throw streamErr;
  }
}

let cachedModelsCatalog = null;
let cachedModelsTimestamp = 0;
let cachedModelsTokenPrefix = null;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetches and caches the authenticated account's visible OpenAI models list.
 * Avoids repeated /v1/models requests inside multi-stage study pipelines.
 *
 * @param {string} [accessToken]
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Array<{ slug: string, displayName: string }>>}
 */
export async function getCachedAvailableModels(accessToken, forceRefresh = false) {
  const token = accessToken || (await getValidAccessToken().catch(() => null));
  const prefix = token ? token.slice(-8) : 'anon';
  const fresh =
    !forceRefresh &&
    Array.isArray(cachedModelsCatalog) &&
    cachedModelsCatalog.length > 0 &&
    cachedModelsTokenPrefix === prefix &&
    Date.now() - cachedModelsTimestamp < MODELS_CACHE_TTL_MS;

  if (fresh) {
    return cachedModelsCatalog;
  }

  const list = await fetchAvailableModels(token);
  cachedModelsCatalog = list;
  cachedModelsTimestamp = Date.now();
  cachedModelsTokenPrefix = prefix;
  return list;
}

/**
 * Verifies an active ChatGPT BYOK session exists and returns a valid access token.
 * Throws a structured BYOK_NOT_CONNECTED error when unauthenticated or missing direct scope.
 *
 * @returns {Promise<string>}
 */
export async function ensureByokConnected() {
  const session = getStoredSession();
  if (!session || !session.accessToken) {
    const err = new Error(
      'Connect your ChatGPT account (Profile → Model routing / Temporary Chat) to generate content with your quota.'
    );
    err.code = 'BYOK_NOT_CONNECTED';
    throw err;
  }

  try {
    return await getValidAccessToken();
  } catch (err) {
    if (err?.code === 'UNAUTHENTICATED' || /UNAUTHENTICATED/i.test(err?.message || '')) {
      const wrapped = new Error(
        'Your ChatGPT session expired. Reconnect your ChatGPT account in Profile settings.'
      );
      wrapped.code = 'BYOK_NOT_CONNECTED';
      throw wrapped;
    }
    throw err;
  }
}

/**
 * Resolves the active model slug configured by the user for a granular task key.
 *
 * @param {string} taskKey
 * @param {{ accessToken?: string, forceRefresh?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function resolveModelForTask(taskKey, { accessToken, forceRefresh = false } = {}) {
  const models = await getCachedAvailableModels(accessToken, forceRefresh);
  return resolveEffectiveModelForTask(taskKey, models);
}

/**
 * Non-interactive wrapper around streamResponsesChat() matching Android's OpenAIProvider.generateText().
 * Streams SSE over POST /v1/responses (required store: false, stream: true), collects output deltas,
 * validates terminal response.completed, and returns the completed text string.
 *
 * @param {Object} options
 * @param {string} [options.model] Model slug (defaults to gpt-4o)
 * @param {string} options.prompt User prompt string
 * @param {string} [options.developerInstructions] System/developer steering
 * @param {string} [options.instructions] Alias for developerInstructions
 * @param {string} [options.accessToken] Optional explicit token
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>}
 */
export async function generateText({
  model = DEFAULT_FALLBACK_MODEL_SLUG,
  prompt,
  developerInstructions = '',
  instructions = '',
  accessToken,
  signal,
} = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('generateText requires a non-empty prompt string.');
  }

  const token = accessToken || (await ensureByokConnected());
  let fullText = '';
  let capturedError = null;
  let didComplete = false;

  await streamResponsesChat({
    accessToken: token,
    model,
    input: [{ role: 'user', content: prompt }],
    instructions: developerInstructions || instructions,
    signal,
    onDelta: (delta) => {
      if (typeof delta === 'string') {
        fullText += delta;
      }
    },
    onCompleted: () => {
      didComplete = true;
    },
    onError: (err) => {
      capturedError = err;
    },
  });

  if (capturedError) {
    if (capturedError instanceof Error) throw capturedError;
    const errObj = new Error(capturedError?.message || 'ChatGPT inference failed.');
    errObj.code = capturedError?.code;
    errObj.isUsageLimit = Boolean(capturedError?.isUsageLimit);
    throw errObj;
  }

  if (!didComplete && !fullText) {
    throw new Error('OpenAI Responses stream ended without a completed response.');
  }

  return fullText;
}
