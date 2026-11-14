// tests/byok/pipelines_and_models.test.mjs
/**
 * Comprehensive Unit and Integration Test Suite for:
 * 1. Granular Model Preferences & Presets (mirroring Android AIModelSelectorScreen)
 * 2. Robust AI JSON Sanitizer & LaTeX Escape Preserver
 * 3. OpenAI Client-Side generateText & BYOK Pipeline Guardrails
 * 4. Static Codebase Migration Audit (0 remaining legacy AI callers in UI)
 * 5. Retired Route 410 Gone Responses
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MODEL_PREFS_STORAGE_KEY,
  AUTO_MODEL_SLUG,
  DEFAULT_MODEL_PREFERENCES,
  GRANULAR_TASK_DEFINITIONS,
  MODEL_PRESETS,
  loadModelPreferences,
  saveModelPreferences,
  setModelForTask,
  resetAllModelsToAuto,
  applyModelPreset,
  resolveEffectiveModelForTask,
} from '../../src/lib/byok/modelPreferences.js';

import {
  cleanJson,
  parseAiJson,
  sanitizeDoubleEscapedLatex,
} from '../../src/lib/byok/jsonSanitizer.js';

import {
  generateText,
  ensureByokConnected,
  resolveModelForTask,
  isUsageLimitError,
} from '../../src/lib/byok/openai.js';

import { clearSession, saveSession, setStorageBackend } from '../../src/lib/byok/storage.js';
import { generatePlanBYOK, regeneratePlanBYOK } from '../../src/lib/byok/pipelines/planGenerator.js';
import { generateNoteBYOK } from '../../src/lib/byok/pipelines/notesGenerator.js';
import { solveDoubtBYOK } from '../../src/lib/byok/pipelines/doubtSolver.js';
import { generateQuizBYOK, evaluateQuizSubmissionBYOK } from '../../src/lib/byok/pipelines/quizEngine.js';
import { forgeCramSheetBYOK } from '../../src/lib/byok/pipelines/cramSheetForger.js';
import { askResearchConsultantBYOK } from '../../src/lib/byok/pipelines/researchAssistant.js';
import { handleRetiredAiRoute } from '../../src/lib/byok/retiredRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../../src');

// Mock localStorage for Node test runner
class MockStorage {
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
}

function installMockGlobals() {
  const mockStorage = new MockStorage();
  globalThis.localStorage = mockStorage;
  globalThis.window = {
    localStorage: mockStorage,
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent {
      constructor(type, eventInitDict) {
        this.type = type;
        this.detail = eventInitDict?.detail;
      }
    },
  };
  setStorageBackend(mockStorage);
  return mockStorage;
}

// -----------------------------------------------------------------------------
// 1. Model Preferences & Routing Presets
// -----------------------------------------------------------------------------
test('Model Preferences - default schema matches Android 10-slot granular configuration', () => {
  const storage = installMockGlobals();
  storage.clear();

  assert.equal(AUTO_MODEL_SLUG, 'auto');
  assert.equal(MODEL_PREFS_STORAGE_KEY, 'kalpad_byok_model_preferences');

  const requiredSlots = [
    'notesPersonaModel',
    'notesOutlineModel',
    'notesAuthorModel',
    'notesModel',
    'quizModel',
    'quizEvaluationModel',
    'planModel',
    'doubtModel',
    'cramSheetModel',
    'chatModel',
    'researchModel',
  ];

  for (const slot of requiredSlots) {
    assert.equal(
      DEFAULT_MODEL_PREFERENCES[slot],
      'auto',
      `Default slot ${slot} should be initialized to 'auto'`
    );
  }

  assert.equal(GRANULAR_TASK_DEFINITIONS.length, 10);
  assert.ok(MODEL_PRESETS.some((p) => p.id === 'balanced'));
  assert.ok(MODEL_PRESETS.some((p) => p.id === 'cost_saver'));
  assert.ok(MODEL_PRESETS.some((p) => p.id === 'deep_quality'));
});

test('Model Preferences - persistence, per-task override, and reset to auto', () => {
  const storage = installMockGlobals();
  storage.clear();

  const initial = loadModelPreferences();
  assert.equal(initial.notesAuthorModel, 'auto');

  setModelForTask('notesAuthorModel', 'gpt-4o');
  const afterSet = loadModelPreferences();
  assert.equal(afterSet.notesAuthorModel, 'gpt-4o');
  assert.equal(afterSet.doubtModel, 'auto');

  const rawSaved = JSON.parse(storage.getItem(MODEL_PREFS_STORAGE_KEY));
  assert.equal(rawSaved.notesAuthorModel, 'gpt-4o');

  resetAllModelsToAuto();
  const afterReset = loadModelPreferences();
  for (const [key, val] of Object.entries(afterReset)) {
    assert.equal(val, 'auto', `Slot ${key} should be reset to 'auto'`);
  }
});

test('Model Preferences - Presets application matches design definitions', () => {
  installMockGlobals();

  // Cost Saver Preset
  const costSaver = applyModelPreset('cost_saver');
  assert.equal(costSaver.quizModel, 'gpt-4o-mini');
  assert.equal(costSaver.quizEvaluationModel, 'gpt-4o-mini');
  assert.equal(costSaver.notesPersonaModel, 'gpt-4o-mini');
  assert.equal(costSaver.cramSheetModel, 'gpt-4o-mini');

  // Deep Quality Preset
  const deepQuality = applyModelPreset('deep_quality');
  assert.equal(deepQuality.notesAuthorModel, 'gpt-4o');
  assert.equal(deepQuality.planModel, 'gpt-4o');
  assert.equal(deepQuality.doubtModel, 'gpt-4o');

  // Balanced Preset
  const balanced = applyModelPreset('balanced');
  for (const val of Object.values(balanced)) {
    assert.equal(val, 'auto');
  }
});

test('Model Preferences - resolveEffectiveModelForTask cascades and auto resolution', () => {
  installMockGlobals();

  // Case 1: Custom explicit model set
  const prefs1 = { ...DEFAULT_MODEL_PREFERENCES, notesAuthorModel: 'chatgpt-4o-latest' };
  const effective1 = resolveEffectiveModelForTask('notesAuthorModel', [], prefs1);
  assert.equal(effective1, 'chatgpt-4o-latest');

  // Case 2: Granular cascade: notesPersonaModel is auto, falls back to legacy notesModel
  const prefs2 = {
    ...DEFAULT_MODEL_PREFERENCES,
    notesPersonaModel: 'auto',
    notesModel: 'gpt-4o-mini',
  };
  const effective2 = resolveEffectiveModelForTask('notesPersonaModel', [], prefs2);
  assert.equal(effective2, 'gpt-4o-mini');

  // Case 3: Granular cascade: quizEvaluationModel is auto, falls back to quizModel
  const prefs3 = {
    ...DEFAULT_MODEL_PREFERENCES,
    quizEvaluationModel: 'auto',
    quizModel: 'gpt-4.5-preview',
  };
  const effective3 = resolveEffectiveModelForTask('quizEvaluationModel', [], prefs3);
  assert.equal(effective3, 'gpt-4.5-preview');

  // Case 4: Pure auto fallback with available catalog
  const catalog = [
    { slug: 'gpt-4o-mini' },
    { slug: 'gpt-4o' },
    { slug: 'o3-mini' },
  ];
  const effectiveAutoFast = resolveEffectiveModelForTask('quizEvaluationModel', catalog, DEFAULT_MODEL_PREFERENCES);
  assert.equal(effectiveAutoFast, 'gpt-4o-mini');

  const effectiveAutoStandard = resolveEffectiveModelForTask('planModel', catalog, DEFAULT_MODEL_PREFERENCES);
  assert.equal(effectiveAutoStandard, 'gpt-4o');
});

// -----------------------------------------------------------------------------
// 2. JSON Sanitizer & LaTeX Preservation
// -----------------------------------------------------------------------------
test('JSON Sanitizer - extracts pure JSON from markdown fences and commentary', () => {
  const fenced = '```json\n{"strategy":{"roi":"high"},"tasks":["study","review"]}\n```';
  const parsed1 = parseAiJson(fenced);
  assert.deepEqual(parsed1, { strategy: { roi: 'high' }, tasks: ['study', 'review'] });

  const withPreambleAndTrailing = `
Here is the requested curriculum breakdown:
\`\`\`
{
  "day": 1,
  "topic": "Organic Synthesis",
  "items": [1, 2, 3,]
}
\`\`\`
Hope this helps your study session!
`;
  const parsed2 = parseAiJson(withPreambleAndTrailing);
  assert.equal(parsed2.day, 1);
  assert.equal(parsed2.topic, 'Organic Synthesis');
  assert.deepEqual(parsed2.items, [1, 2, 3]);
});

test('JSON Sanitizer - preserves mathematical LaTeX backslashes without breaking JSON', () => {
  // AI models often output single backslashes like \frac{a}{b} inside JSON strings,
  // which causes JSON.parse to throw "Bad escaped character".
  const rawLatexPayload = `
{
  "question": "Evaluate the integral: \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
  "formula": "\\sum_{k=1}^n k^2 = \\frac{n(n+1)(2n+1)}{6}",
  "plain_escapes": "First line\\nSecond line with \\"quotes\\""
}
`;
  const parsed = parseAiJson(rawLatexPayload);
  assert.ok(parsed.question.includes('\\int'));
  assert.ok(parsed.question.includes('\\frac'));
  assert.ok(parsed.formula.includes('\\sum'));
  assert.ok(parsed.plain_escapes.includes('First line\nSecond line with "quotes"'));
});

// -----------------------------------------------------------------------------
// 3. OpenAI Client-Side SDK & Guardrails
// -----------------------------------------------------------------------------
test('OpenAI BYOK SDK - generateText enforces store: false, stream: true and SSE delta accumulation', async () => {
  installMockGlobals();

  // Save valid mock session
  saveSession({
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600000,
    planType: 'plus',
  });

  let capturedUrl = '';
  let capturedHeaders = null;
  let capturedBody = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    const sseLines = [
      'event: response.output_item.added\ndata: {"type":"response.output_item.added"}\n\n',
      'event: response.content_part.delta\ndata: {"type":"response.content_part.delta","delta":{"text":"{\\"plan\\": "}}\n\n',
      'event: response.content_part.delta\ndata: {"type":"response.content_part.delta","delta":{"text":"\\"ready\\"}"}}\n\n',
      'event: response.completed\ndata: {"type":"response.completed"}\n\n',
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const line of sseLines) {
          controller.enqueue(new TextEncoder().encode(line));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  const text = await generateText({
    model: 'gpt-4o-mini',
    prompt: 'Generate plan',
  });

  assert.equal(capturedUrl, 'https://api.openai.com/v1/responses');
  assert.equal(capturedHeaders.Authorization, 'Bearer test-access-token-12345');
  assert.equal(capturedBody.model, 'gpt-4o-mini');
  assert.equal(capturedBody.store, false, 'store: false is mandatory for SIWC token sharing');
  assert.equal(capturedBody.stream, true, 'stream: true is mandatory for client responses');
  assert.equal(text, '{"plan": "ready"}');
});

test('OpenAI BYOK SDK - unauthenticated callers throw BYOK_NOT_CONNECTED', async () => {
  installMockGlobals();
  clearSession();

  let thrown = null;
  try {
    await generateText({
      model: 'gpt-4o-mini',
      prompt: 'Hi',
    });
  } catch (err) {
    thrown = err;
  }

  assert.ok(thrown);
  assert.equal(thrown.code, 'BYOK_NOT_CONNECTED');
});

test('OpenAI BYOK SDK - usage limit errors are detected by isUsageLimitError', () => {
  const errUsageLimit = new Error('plan usage limit exceeded');
  errUsageLimit.code = 'subscription_sharing_usage_limit_exceeded';
  assert.ok(isUsageLimitError(errUsageLimit));

  const regexErr = new Error('subscription_sharing_usage_limit_exceeded for this model');
  assert.ok(isUsageLimitError(regexErr));
});

// -----------------------------------------------------------------------------
// 4. Pipeline Modules Guardrails (BYOK_NOT_CONNECTED when unauthenticated)
// -----------------------------------------------------------------------------
test('Pipeline Modules - all reject with BYOK_NOT_CONNECTED when ChatGPT is not signed in', async () => {
  installMockGlobals();
  clearSession();

  const pipelineCalls = [
    () => generatePlanBYOK({ examName: 'Test', syllabus: 'Math', examDate: '2026-12-01' }),
    () => regeneratePlanBYOK({ planId: 'plan-1', userFeedback: 'more breaks' }),
    () => generateNoteBYOK({ planTopicId: 'topic-1', subTopicText: 'Algebra', examName: 'Test' }),
    () => solveDoubtBYOK({ fullNoteContent: 'Content', question: 'What is x?', action: 'custom', context: { examName: 'Test' } }),
    () => generateQuizBYOK({ planTopicId: 'topic-1', questionCount: 5, quizMode: 'Core Concepts' }),
    () => evaluateQuizSubmissionBYOK({ planTopicId: 'topic-1', quizMode: 'Core Concepts', attempts: [{ question_id: 1, selected_option: 'A' }] }),
    () => forgeCramSheetBYOK({ planId: 'plan-1' }),
    () => askResearchConsultantBYOK({ query: 'Explain findings', projectId: 'proj-1' }),
  ];

  for (const call of pipelineCalls) {
    let thrown = null;
    try {
      await call();
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Pipeline call should throw when unauthenticated');
    assert.equal(thrown.code, 'BYOK_NOT_CONNECTED');
  }
});

// -----------------------------------------------------------------------------
// 5. Retired Route Handler & HTTP 410 Response
// -----------------------------------------------------------------------------
test('Retired Route Handler - returns HTTP 410 Gone with byok_required flag', async () => {
  const mockReq = {
    headers: {
      get: (header) => (header === 'x-is-guest' ? 'true' : null),
    },
    json: async () => ({}),
  };

  const response = await handleRetiredAiRoute(mockReq, '/api/generate-plan', {
    allowGuestHeader: true,
  });

  assert.equal(response.status, 410);
  const payload = await response.json();
  assert.equal(payload.byok_required, true);
  assert.equal(payload.settings_path, '/settings/models');
  assert.ok(payload.error.includes('AI inference has migrated to client-side ChatGPT BYOK'));
});

// -----------------------------------------------------------------------------
// 6. Static Codebase Audit: Zero unmigrated AI callers in UI components
// -----------------------------------------------------------------------------
test('Static Codebase Audit - UI pages and components do not call retired AI routes', () => {
  const forbiddenPatterns = [
    /fetch\(\s*['"]\/api\/generate-plan['"]/,
    /fetch\(\s*['"]\/api\/generate-notes['"]/,
    /fetch\(\s*['"]\/api\/bulk-generate-notes['"]/,
    /fetch\(\s*['"]\/api\/solve-doubt['"]/,
    /fetch\(\s*['"]\/api\/generate-quiz['"]/,
    /fetch\(\s*['"]\/api\/evaluate-quiz-submission['"]/,
    /fetch\(\s*['"]\/api\/forge-cram-sheet['"]/,
    /fetch\(\s*['"]\/api\/regenerate-plan['"]/,
    /fetch\(\s*['"]\/api\/research\/chat['"]/,
  ];

  const scannedFiles = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'api') {
          walk(fullPath);
        }
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        if (!entry.name.endsWith('.test.mjs') && !entry.name.endsWith('.test.js')) {
          scannedFiles.push(fullPath);
        }
      }
    }
  }

  walk(path.join(SRC_DIR, 'app'));
  walk(path.join(SRC_DIR, 'components'));

  const violations = [];
  for (const filePath of scannedFiles) {
    if (filePath.includes('_old')) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        violations.push({ file: path.relative(SRC_DIR, filePath), pattern: pattern.toString() });
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found unmigrated direct AI endpoint calls in UI components: ${JSON.stringify(violations)}`
  );
});
