// src/lib/byok/modelPreferences.js
/**
 * Granular Per-Stage AI Model Routing Preferences & Presets for KalPad BYOK.
 * Aligned 1:1 with Android's AIModelPreferences & UserPrefsRepository.kt.
 * Stored solely in browser localStorage so user configuration stays local and immediate.
 */

import { getStorageBackend } from './storage.js';

export const MODEL_PREFS_STORAGE_KEY = 'kalpad_byok_model_preferences';
export const AUTO_MODEL_SLUG = 'auto';

export const DEFAULT_MODEL_PREFERENCES = {
  // Study Plan Generator & Regenerate Plan
  planModel: AUTO_MODEL_SLUG,

  // Notes Generation Pipeline (3 granular calls + legacy fallback)
  notesPersonaModel: AUTO_MODEL_SLUG,
  notesOutlineModel: AUTO_MODEL_SLUG,
  notesAuthorModel: AUTO_MODEL_SLUG,
  notesModel: AUTO_MODEL_SLUG,

  // Quiz & Assessment Pipeline (2 granular calls)
  quizModel: AUTO_MODEL_SLUG,
  quizEvaluationModel: AUTO_MODEL_SLUG,

  // Doubt Solving / Inline Tutor
  doubtModel: AUTO_MODEL_SLUG,

  // Cram Sheet / Revision Summary Forger
  cramSheetModel: AUTO_MODEL_SLUG,

  // Interactive Chat (Temporary Chat & freeform assistant)
  chatModel: AUTO_MODEL_SLUG,

  // Academic Research Consultant
  researchModel: AUTO_MODEL_SLUG,
};

/**
 * Granular task descriptors used both by runtime routing and the Settings Model Selector UI.
 */
export const GRANULAR_TASK_DEFINITIONS = [
  {
    key: 'notesPersonaModel',
    category: 'notes',
    title: 'Stage 0: Exam Persona',
    subtitle: 'Derives academic rigor, prerequisite depth, and pedagogical tone based on exam name.',
    costTip: 'Lightweight / Cost-saver recommended',
  },
  {
    key: 'notesOutlineModel',
    category: 'notes',
    title: 'Stage 1: Pedagogical Outline',
    subtitle: 'Structures chapter hierarchy, worked example placements, and misconception traps.',
    costTip: 'Fast reasoning / standard model recommended',
  },
  {
    key: 'notesAuthorModel',
    category: 'notes',
    title: 'Stage 2: Textbook Authoring',
    subtitle: 'Drafts exhaustive, textbook-grade content with KaTeX formulas, derivations, and examples.',
    costTip: 'Flagship / deep reasoning recommended',
  },
  {
    key: 'quizModel',
    category: 'quiz',
    title: 'Question Generation',
    subtitle: 'Creates concept-driven multiple-choice questions with distractors and LaTeX options.',
    costTip: 'Balanced / standard model recommended',
  },
  {
    key: 'quizEvaluationModel',
    category: 'quiz',
    title: 'Evaluation & Feedback',
    subtitle: 'Explains student mistakes on wrong answers and produces revision guidance.',
    costTip: 'Fast / lightweight model recommended',
  },
  {
    key: 'planModel',
    category: 'planner',
    title: 'Curriculum & Schedule Planner',
    subtitle: 'Builds multi-week blueprints, topic triage, regeneration, and daily sub-topic tasks.',
    costTip: 'High-context standard model recommended',
  },
  {
    key: 'doubtModel',
    category: 'doubt',
    title: 'Conceptual & Math Tutor',
    subtitle: 'Resolves inline note highlights, analogies, exam importance, and custom doubts.',
    costTip: 'Flagship reasoning recommended',
  },
  {
    key: 'cramSheetModel',
    category: 'cram',
    title: 'High-Yield Summary Forger',
    subtitle: 'Compresses whole plans into merged master outlines and pre-exam formula cram sheets.',
    costTip: 'Fast or standard model recommended',
  },
  {
    key: 'chatModel',
    category: 'chat',
    title: 'Interactive Academic Assistant',
    subtitle: 'Low-latency streaming chat used in Profile Temporary Chat and freeform checks.',
    costTip: 'Fast streaming model recommended',
  },
  {
    key: 'researchModel',
    category: 'research',
    title: 'Research Consultant',
    subtitle: 'Synthesizes paper context and technical answers inside Research Lab tabs.',
    costTip: 'Long-context reasoning recommended',
  },
];

export const MODEL_PRESETS = [
  {
    id: 'balanced',
    label: 'Auto All',
    badge: 'Recommended',
    description: 'Lets KalPad pick the optimal available model per stage automatically.',
  },
  {
    id: 'cost_saver',
    label: 'Quota Saver',
    badge: 'Low Quota',
    description: 'Routes mini/fast models to outlines, quizzes & evaluations; saves flagship for textbook notes.',
  },
  {
    id: 'deep_quality',
    label: 'Deep Quality',
    badge: 'Max Depth',
    description: 'Uses strongest reasoning models across planning, textbook authoring, and math doubts.',
  },
];

function notifyModelPrefsChanged() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('kalpad-byok-models-changed'));
  } catch (_) {}
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('kalpad_byok_sync');
      ch.postMessage({ type: 'BYOK_MODELS_UPDATED' });
      ch.close();
    }
  } catch (_) {}
}

/**
 * Loads current granular model preferences merged cleanly with defaults.
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {typeof DEFAULT_MODEL_PREFERENCES}
 */
export function loadModelPreferences(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  try {
    const raw = storage.getItem(MODEL_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODEL_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_MODEL_PREFERENCES };
    }
    return {
      ...DEFAULT_MODEL_PREFERENCES,
      ...parsed,
    };
  } catch (_) {
    return { ...DEFAULT_MODEL_PREFERENCES };
  }
}

/**
 * Persists updated model preferences to browser storage and broadcasts change event.
 * @param {Partial<typeof DEFAULT_MODEL_PREFERENCES>} updates
 * @param {Storage|Object|null} [explicitStorage]
 * @returns {typeof DEFAULT_MODEL_PREFERENCES}
 */
export function saveModelPreferences(updates, explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  const current = loadModelPreferences(storage);
  const next = {
    ...current,
    ...(updates || {}),
  };
  storage.setItem(MODEL_PREFS_STORAGE_KEY, JSON.stringify(next));
  notifyModelPrefsChanged();
  return next;
}

/**
 * Updates a single granular model field cleanly.
 * @param {keyof DEFAULT_MODEL_PREFERENCES} key
 * @param {string} slug
 * @returns {typeof DEFAULT_MODEL_PREFERENCES}
 */
export function setModelForTask(key, slug, explicitStorage = null) {
  if (!key || !(key in DEFAULT_MODEL_PREFERENCES)) {
    throw new Error(`Unknown model preference key: ${key}`);
  }
  return saveModelPreferences({ [key]: slug || AUTO_MODEL_SLUG }, explicitStorage);
}

/**
 * Resets all task selectors back to 'auto'.
 * @returns {typeof DEFAULT_MODEL_PREFERENCES}
 */
export function resetAllModelsToAuto(explicitStorage = null) {
  const storage = getStorageBackend(explicitStorage);
  const clean = { ...DEFAULT_MODEL_PREFERENCES };
  storage.setItem(MODEL_PREFS_STORAGE_KEY, JSON.stringify(clean));
  notifyModelPrefsChanged();
  return clean;
}

/**
 * Applies a curated preset ('balanced' | 'cost_saver' | 'deep_quality') matching available catalog models.
 * Mirrors SettingsViewModel.applyPreset() in Android.
 * @param {'balanced'|'cost_saver'|'deep_quality'} presetId
 * @param {Array<{ slug: string }>} [availableModels=[]]
 * @returns {typeof DEFAULT_MODEL_PREFERENCES}
 */
export function applyModelPreset(presetId, availableModels = [], explicitStorage = null) {
  if (presetId === 'balanced') {
    return resetAllModelsToAuto(explicitStorage);
  }

  const list = Array.isArray(availableModels) ? availableModels : [];
  const fastModel =
    list.find((m) => m.slug?.includes('mini') || m.slug?.includes('nano'))?.slug ||
    list.find((m) => m.slug?.includes('4o'))?.slug ||
    'gpt-4o-mini';

  const standardModel =
    list.find((m) => m.slug === 'gpt-4o')?.slug ||
    list.find((m) => m.slug?.includes('4.1') || m.slug?.includes('5'))?.slug ||
    list[0]?.slug ||
    'gpt-4o';

  const deepModel =
    list.find((m) => /^o\d|codex|pro|gpt-5/.test(m.slug || ''))?.slug || standardModel;

  if (presetId === 'cost_saver') {
    return saveModelPreferences(
      {
        planModel: standardModel,
        notesPersonaModel: fastModel,
        notesOutlineModel: fastModel,
        notesAuthorModel: standardModel,
        notesModel: standardModel,
        cramSheetModel: fastModel,
        doubtModel: standardModel,
        quizModel: fastModel,
        quizEvaluationModel: fastModel,
        chatModel: fastModel,
        researchModel: standardModel,
      },
      explicitStorage
    );
  }

  if (presetId === 'deep_quality') {
    return saveModelPreferences(
      {
        planModel: deepModel,
        notesPersonaModel: standardModel,
        notesOutlineModel: standardModel,
        notesAuthorModel: deepModel,
        notesModel: deepModel,
        cramSheetModel: standardModel,
        doubtModel: deepModel,
        quizModel: standardModel,
        quizEvaluationModel: standardModel,
        chatModel: standardModel,
        researchModel: deepModel,
      },
      explicitStorage
    );
  }

  return loadModelPreferences(explicitStorage);
}

/**
 * Resolves the concrete OpenAI model slug to send to POST /v1/responses for a given granular task key.
 * Handles fallback chains (e.g., notesPersonaModel -> notesModel -> catalog smart match) cleanly.
 *
 * @param {keyof DEFAULT_MODEL_PREFERENCES} taskKey
 * @param {Array<{ slug: string }>} [availableModels=[]]
 * @param {typeof DEFAULT_MODEL_PREFERENCES} [prefsOverride=null]
 * @returns {string}
 */
export function resolveEffectiveModelForTask(taskKey, availableModels = [], prefsOverride = null) {
  const prefs = prefsOverride || loadModelPreferences();
  let configured = prefs?.[taskKey];

  if (
    (!configured || configured === AUTO_MODEL_SLUG) &&
    (taskKey === 'notesPersonaModel' || taskKey === 'notesOutlineModel' || taskKey === 'notesAuthorModel')
  ) {
    configured = prefs?.notesModel;
  }
  if ((!configured || configured === AUTO_MODEL_SLUG) && taskKey === 'quizEvaluationModel') {
    configured = prefs?.quizModel;
  }

  const list = Array.isArray(availableModels) ? availableModels : [];
  if (configured && configured !== AUTO_MODEL_SLUG) {
    if (list.length === 0 || list.some((m) => m.slug === configured)) {
      return configured;
    }
  }

  // Smart Auto routing heuristic: use lightweight model for lightweight stages when present in user's catalog
  const isLightweightStage =
    taskKey === 'notesPersonaModel' || taskKey === 'quizEvaluationModel';
  if (isLightweightStage) {
    const mini = list.find((m) => m.slug?.includes('mini'));
    if (mini?.slug) return mini.slug;
  }

  return (
    list.find((m) => m.slug === 'gpt-4o')?.slug ||
    list.find((m) => m.slug?.includes('4o'))?.slug ||
    list[0]?.slug ||
    'gpt-4o'
  );
}
