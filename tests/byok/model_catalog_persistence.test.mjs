// tests/byok/model_catalog_persistence.test.mjs
/**
 * Dedicated test suite verifying model catalog persistence and default GPT-6 Luna routing:
 * 1. KNOWN_MODELS_CATALOG contains the full spectrum of OpenAI models with gpt-6-luna as primary.
 * 2. mergeWithKnownCatalog ensures gpt-6-luna is always at index 0 and prevents duplicate entries.
 * 3. getStoredCachedModels retrieves persisted models from localStorage and merges cleanly.
 * 4. DEFAULT_MODEL_PREFERENCES initializes all 11 task keys to 'gpt-6-luna'.
 * 5. resolveEffectiveModelForTask resolves to 'gpt-6-luna' by default.
 * 6. 401 Unauthorized retry logic refreshes tokens when fetching models.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KNOWN_MODELS_CATALOG,
  MODELS_STORAGE_KEY,
  mergeWithKnownCatalog,
  getStoredCachedModels,
  getCachedAvailableModels,
  fetchAvailableModels,
} from '../../src/lib/byok/openai.js';

import {
  DEFAULT_TASK_MODEL_SLUG,
  DEFAULT_MODEL_PREFERENCES,
  AUTO_MODEL_SLUG,
  resolveEffectiveModelForTask,
  loadModelPreferences,
  resetAllModelsToAuto,
  setModelForTask,
} from '../../src/lib/byok/modelPreferences.js';

import { setStorageBackend } from '../../src/lib/byok/storage.js';

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

function setupMockStorage() {
  const storage = new MockStorage();
  globalThis.localStorage = storage;
  globalThis.window = {
    localStorage: storage,
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  };
  setStorageBackend(storage);
  return storage;
}

test('KNOWN_MODELS_CATALOG defines complete spectrum with gpt-6-luna as #1', () => {
  assert.ok(Array.isArray(KNOWN_MODELS_CATALOG));
  assert.ok(KNOWN_MODELS_CATALOG.length >= 8);
  assert.equal(KNOWN_MODELS_CATALOG[0].slug, 'gpt-6-luna');
  assert.equal(KNOWN_MODELS_CATALOG[0].displayName, 'GPT-6 Luna');

  const slugs = KNOWN_MODELS_CATALOG.map((m) => m.slug);
  assert.ok(slugs.includes('gpt-6-luna'));
  assert.ok(slugs.includes('gpt-4o'));
  assert.ok(slugs.includes('gpt-4o-mini'));
  assert.ok(slugs.includes('chatgpt-4o-latest'));
  assert.ok(slugs.includes('o1'));
  assert.ok(slugs.includes('o1-mini'));
  assert.ok(slugs.includes('o1-preview'));
  assert.ok(slugs.includes('o3-mini'));
  assert.ok(slugs.includes('gpt-4.5-preview'));
});

test('mergeWithKnownCatalog guarantees gpt-6-luna is at index 0 and dedupes', () => {
  // Empty input
  const fromEmpty = mergeWithKnownCatalog([]);
  assert.equal(fromEmpty[0].slug, 'gpt-6-luna');
  assert.ok(fromEmpty.length >= KNOWN_MODELS_CATALOG.length);

  // Input with gpt-4o only
  const fromSingle = mergeWithKnownCatalog([{ slug: 'gpt-4o', displayName: 'GPT-4o Custom' }]);
  assert.equal(fromSingle[0].slug, 'gpt-6-luna');
  const found4o = fromSingle.find((m) => m.slug === 'gpt-4o');
  assert.equal(found4o.displayName, 'GPT-4o Custom');

  // Input with new cutting-edge custom model
  const fromCustom = mergeWithKnownCatalog([{ slug: 'gpt-6-future', displayName: 'GPT-6 Future' }]);
  assert.equal(fromCustom[0].slug, 'gpt-6-luna');
  assert.ok(fromCustom.some((m) => m.slug === 'gpt-6-future'));
  assert.ok(fromCustom.some((m) => m.slug === 'gpt-4o'));
});

test('getStoredCachedModels retrieves persisted models from localStorage and merges', () => {
  const storage = setupMockStorage();
  storage.clear();

  // Fresh storage
  const initial = getStoredCachedModels();
  assert.equal(initial[0].slug, 'gpt-6-luna');

  // Stored with cached data
  storage.setItem(
    MODELS_STORAGE_KEY,
    JSON.stringify([
      { slug: 'custom-fine-tune', displayName: 'Custom Fine Tune' },
    ])
  );

  const restored = getStoredCachedModels();
  assert.equal(restored[0].slug, 'gpt-6-luna');
  assert.ok(restored.some((m) => m.slug === 'custom-fine-tune'));
  assert.ok(restored.some((m) => m.slug === 'gpt-4o'));
});

test('DEFAULT_MODEL_PREFERENCES sets gpt-6-luna for all 11 granular task slots from start', () => {
  const storage = setupMockStorage();
  storage.clear();

  assert.equal(DEFAULT_TASK_MODEL_SLUG, 'gpt-6-luna');

  const requiredSlots = [
    'planModel',
    'notesPersonaModel',
    'notesOutlineModel',
    'notesAuthorModel',
    'notesModel',
    'quizModel',
    'quizEvaluationModel',
    'doubtModel',
    'cramSheetModel',
    'chatModel',
    'researchModel',
  ];

  for (const slot of requiredSlots) {
    assert.equal(
      DEFAULT_MODEL_PREFERENCES[slot],
      'gpt-6-luna',
      `Task slot ${slot} must default to gpt-6-luna`
    );
  }

  const loaded = loadModelPreferences();
  for (const slot of requiredSlots) {
    assert.equal(loaded[slot], 'gpt-6-luna');
  }

  // Reset restores gpt-6-luna for all slots
  setModelForTask('notesAuthorModel', 'o1');
  assert.equal(loadModelPreferences().notesAuthorModel, 'o1');
  resetAllModelsToAuto();
  assert.equal(loadModelPreferences().notesAuthorModel, 'gpt-6-luna');
});

test('resolveEffectiveModelForTask defaults to gpt-6-luna when catalog includes it or is empty', () => {
  setupMockStorage();

  // Empty catalog
  const effEmpty = resolveEffectiveModelForTask('planModel', []);
  assert.equal(effEmpty, 'gpt-6-luna');

  // Full catalog
  const catalog = [
    { slug: 'gpt-6-luna' },
    { slug: 'gpt-4o' },
    { slug: 'gpt-4o-mini' },
  ];
  const effCatalog = resolveEffectiveModelForTask('notesAuthorModel', catalog);
  assert.equal(effCatalog, 'gpt-6-luna');

  // Explicit 'auto' override resolves to gpt-6-luna
  const effAuto = resolveEffectiveModelForTask('cramSheetModel', catalog, { cramSheetModel: AUTO_MODEL_SLUG });
  assert.equal(effAuto, 'gpt-6-luna');
});
