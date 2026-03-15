// src/app/api/generate-plan/route.js
// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE: Manifest-Driven Pipeline
//
//  Phase 1a │ Section Skeleton    → Fast single call, identifies structure
//  Phase 1b │ Topic Enrichment    → Parallel calls (one per section), bounded output
//  Scheduler│ Deterministic       → Pure JS bin-packing, no LLM reasoning
//  Comm.    │ Communicator        → Writes overall_approach narrative (UX + perceived speed)
//  Phase 3  │ Week Enricher       → LLM as writer only, schedule already fixed
//
// Frontend contract: identical streaming events (status / strategy / plan_topic / error)
// ─────────────────────────────────────────────────────────────────────────────

import { getVertexAIModel } from '@/lib/vertexai';
import { logRouteResult, resolveRouteAuth, unauthorizedResponse } from '@/lib/routeAuth';

export const dynamic = 'force-dynamic';


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const KalPad_Constitution = `
  **Core Principles for Plan Generation:**
  1. Think Like a Tutor (Logical Sequencing): Foundational concepts MUST precede advanced topics that build on them.
  2. Radical Transparency (The "Why"): The day_summary must explain the goal and the reason behind the day's structure.
  3. Actionable Depth: Every sub_topic must be specific and immediately actionable — not vague.
  4. Time Awareness (MANDATORY): Every sub_topic text MUST begin with its estimated time in parentheses, e.g. "(30 min) Study Newton's First Law focusing on inertia..." or "(1h) Solve 10 integration problems from exam pattern...". Sub_topic times must sum closely to the day's total study_hours.
`;

// One config object per mode. The scheduler reads ONLY this — no mode logic inside the scheduler.
const SCHEDULING_CONFIG = {
  default:  { cap_daily_hours: true,  overflow: 'drop_to_next_day' },
  hardcore: { cap_daily_hours: 'recommended', overflow: 'extend_day'       }, // cap = recommendedHours (totalHoursNeeded/daysLeft), NOT 24
  sprint:   { cap_daily_hours: true,  overflow: 'drop_to_next_day' },
  revision: { cap_daily_hours: true,  overflow: 'compress'         }, // squeeze partial topic into remaining time
  skill:    { cap_daily_hours: true,  overflow: 'drop_to_next_day' },
};


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — TOPOLOGY & SCHEDULING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FIX: CIRCULAR DEPENDENCY BREAKER
 *
 * Detects cycles in a dependency graph via DFS coloring (WHITE/GRAY/BLACK).
 * When a back-edge is found (cycle), it severs the weakest link: the dep-edge
 * touching the item with the lower relevance score. If scores are equal, the
 * back-edge pointing INTO the currently-visited node is always severed.
 *
 * Returns a deep-enough copy (deps arrays are new arrays) so originals are safe.
 * Must be called BEFORE topoSort.
 */
function breakCycles(items, idKey, depsKey, relevanceKey) {
  const relevanceScore = { High: 3, Medium: 2, Low: 1 };

  // Shallow-clone items but deep-clone their deps arrays so we can mutate safely
  const cloned = items.map(i => ({ ...i, [depsKey]: [...(i[depsKey] || [])] }));
  const map    = new Map(cloned.map(i => [i[idKey], i]));

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(cloned.map(i => [i[idKey], WHITE]));

  function dfs(id) {
    color.set(id, GRAY);
    const item = map.get(id);
    if (!item) { color.set(id, BLACK); return; }

    const deps = item[depsKey];
    for (let i = deps.length - 1; i >= 0; i--) {
      const depId = deps[i];

      if (color.get(depId) === GRAY) {
        // Back-edge → cycle found. Sever the weaker side.
        const itemScore = relevanceScore[item[relevanceKey]] ?? 2;
        const depItem   = map.get(depId);
        const depScore  = relevanceScore[depItem?.[relevanceKey]] ?? 2;

        if (itemScore <= depScore) {
          // Current item is weaker or equal — drop this dep from the current item
          deps.splice(i, 1);
        } else {
          // depItem is weaker — remove the reciprocal reference from depItem
          const depDeps = depItem[depsKey];
          const backIdx = depDeps.indexOf(id);
          if (backIdx !== -1) depDeps.splice(backIdx, 1);
        }
        console.warn(`[KalPad Scheduler] Cycle severed: ${id} ↔ ${depId}`);

      } else if (color.get(depId) === WHITE) {
        dfs(depId);
      }
      // BLACK = already fully visited, safe to skip
    }
    color.set(id, BLACK);
  }

  for (const item of cloned) {
    if (color.get(item[idKey]) === WHITE) dfs(item[idKey]);
  }

  return cloned;
}

/**
 * Topological sort on a guaranteed DAG (call breakCycles first).
 * Items must have a unique ID field and a deps array field.
 */
function topoSort(items, idKey, depsKey) {
  const result   = [];
  const visited  = new Set();
  const visiting = new Set();
  const map      = new Map(items.map(i => [i[idKey], i]));

  function visit(item) {
    const id = item[idKey];
    if (visited.has(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const depId of (item[depsKey] || [])) {
      const dep = map.get(depId);
      if (dep) visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
    result.push(item);
  }

  for (const item of items) visit(item);
  return result;
}

/**
 * FIX: OVERWEIGHT TOPIC PRE-SPLITTER
 *
 * Any topic with time_budget_hours > dailyCap × 1.5 would cause the bin-packer
 * to mis-behave (extend_day absorbs the entire day, or the topic starts/stops
 * awkwardly across 3+ days with no clean entry point).
 *
 * Pre-splitting into _p1, _p2 ... chunks of at most dailyCap hours gives the
 * bin-packer predictably-sized items and produces clean "Part 1 / Part 2" days.
 *
 * Must run AFTER topoSort and BEFORE the bin-packing loop.
 */
function presplitTopics(topics, dailyCap) {
  const result = [];

  for (const topic of topics) {
    const budget     = topic.time_budget_hours || 0;
    const maxPerSlot = Math.max(dailyCap * 1.5, dailyCap + 1); // tolerance: only split if significantly over

    if (budget <= maxPerSlot) {
      result.push(topic);
      continue;
    }

    let remaining = budget;
    let partNum   = 1;

    while (remaining > 0.25) {
      const chunk = Math.min(remaining, dailyCap);
      result.push({
        ...topic,
        topic_id:          `${topic.topic_id}_p${partNum}`,
        topic_name:        `${topic.topic_name} (Part ${partNum})`,
        time_budget_hours: Math.round(chunk * 4) / 4,
        // Part 1 keeps original deps; subsequent parts depend on the previous part
        intra_section_dependencies: partNum === 1
          ? (topic.intra_section_dependencies || [])
          : [`${topic.topic_id}_p${partNum - 1}`],
      });
      remaining = Math.round((remaining - chunk) * 100) / 100;
      partNum++;
    }
  }

  return result;
}

/**
 * FIX: POST-SCHEDULING SMOOTHING PASS
 *
 * Greedy bin-packing produces correct but lumpy output — the last few days of a
 * plan can be dramatically lighter than earlier days (all big topics consumed early).
 * In hardcore mode the inverse happens: a day with one giant topic sits next to a
 * day with five tiny ones.
 *
 * This two-pass smoother (forward then backward) slides topics between adjacent days
 * to keep every day within [softTarget × 0.5 … softTarget × 1.5]. It never moves a
 * topic past its dependency boundary, ensuring curriculum order is always preserved.
 */
function smoothDaySkeleton(days, studyHoursPerDay, recommendedHours, planMode) {
  // Hardcore: smooth around the RECOMMENDED hours (which may exceed user's stated hours)
  // All other modes: smooth around the user's stated daily hours
  const softTarget = planMode === 'hardcore' ? recommendedHours : studyHoursPerDay;
  const lowerBound = softTarget * 0.50;
  const upperBound = softTarget * 1.50;

  // Position map: topic_id → day index. Used to validate dependency ordering.
  const topicDayIndex = new Map();
  days.forEach((day, di) => {
    (day.topics || []).forEach(t => topicDayIndex.set(t.topic_id, di));
  });

  const canMoveToDay = (topic, targetDayIndex) => {
    return (topic.intra_section_dependencies || []).every(depId => {
      const depIdx = topicDayIndex.get(depId);
      // Dep must be scheduled BEFORE the target day (strictly earlier index)
      return depIdx === undefined || depIdx < targetDayIndex;
    });
  };

  // Two passes: forward (left→right) then backward (right→left)
  for (let pass = 0; pass < 2; pass++) {
    const indices = pass === 0
      ? Array.from({ length: days.length - 1 }, (_, i) => i)
      : Array.from({ length: days.length - 1 }, (_, i) => days.length - 2 - i);

    for (const i of indices) {
      const dayA = days[i];
      const dayB = days[i + 1];

      // Never touch review days
      if (dayA.is_review || dayB.is_review) continue;

      // ── Move LAST topic of heavy dayA → start of dayB ──
      if (dayA.total_hours > upperBound && dayA.topics.length > 1) {
        const candidate = dayA.topics[dayA.topics.length - 1];
        const newAHours = parseFloat((dayA.total_hours - candidate.hours_this_day).toFixed(2));
        const newBHours = parseFloat((dayB.total_hours + candidate.hours_this_day).toFixed(2));

        if (newAHours >= lowerBound && newBHours <= upperBound * 1.1 && canMoveToDay(candidate, i + 1)) {
          dayA.topics.pop();
          dayB.topics.unshift(candidate);
          dayA.total_hours = newAHours;
          dayB.total_hours = parseFloat(newBHours.toFixed(1));
          topicDayIndex.set(candidate.topic_id, i + 1);
        }
      }

      // ── Move FIRST topic of heavy dayB → end of dayA ──
      if (dayB.total_hours > upperBound && dayB.topics.length > 1) {
        const candidate = dayB.topics[0];
        const newAHours = parseFloat((dayA.total_hours + candidate.hours_this_day).toFixed(2));
        const newBHours = parseFloat((dayB.total_hours - candidate.hours_this_day).toFixed(2));

        if (newBHours >= lowerBound && newAHours <= upperBound * 1.1 && canMoveToDay(candidate, i)) {
          dayB.topics.shift();
          dayA.topics.push(candidate);
          dayA.total_hours = parseFloat(newAHours.toFixed(1));
          dayB.total_hours = newBHours;
          topicDayIndex.set(candidate.topic_id, i);
        }
      }
    }
  }

  // Recalculate total_hours cleanly after all moves
  days.forEach(day => {
    if (!day.is_review) {
      day.total_hours = Math.round(
        (day.topics || []).reduce((s, t) => s + (t.hours_this_day || 0), 0) * 10
      ) / 10;
    }
  });

  return days;
}

/**
 * Deterministic bin-packing scheduler.
 *
 * Inputs:  manifest (Phase 1 output), timing constraints, mode config
 * Output:  flat array of day skeletons with topics pre-assigned
 *
 * This function does ZERO reasoning. All strategic decisions are encoded in the
 * manifest. The scheduler only packs and smooths.
 *
 * Fixes applied here:
 *   FIX 1 — Frankenstein Day:   section-cohesion gate before adding a cross-unit topic
 *   FIX 2 — Overweight Topics:  presplitTopics() runs before the loop
 *   FIX 3 — Circular Deps:      breakCycles() runs before topoSort()
 *   FIX 4 — Hardcore Black Hole: break after extend_day so day closes after one extension
 *   FIX 5 — Lumpy Days:          smoothDaySkeleton() runs after the loop
 */
function buildDaySkeleton(manifest, daysLeft, studyHoursPerDay, planMode, startDate, recommendedHours) {
  const config   = SCHEDULING_CONFIG[planMode] || SCHEDULING_CONFIG.default;
  // hardcore: cap at recommendedHours (the honest daily average = totalHoursNeeded / daysLeft).
  // Using 24 was wrong — it let the entire syllabus collapse onto Day 1 when all topics
  // fit within 24h. extend_day now means: "allowed to slightly exceed recommendedHours to
  // avoid splitting ONE topic mid-session" — not "schedule everything today."
  const dailyCap = config.cap_daily_hours === 'recommended'
    ? Math.max(studyHoursPerDay, recommendedHours ?? studyHoursPerDay)
    : config.cap_daily_hours ? studyHoursPerDay : 24; // fallback only

  // ── Step 1: Sort sections by phase, then topologically ──
  const phaseOrder   = { early: 0, mid: 1, late: 2 };
  const phaseGrouped = [...manifest.sections].sort(
    (a, b) => (phaseOrder[a.suggested_phase] ?? 1) - (phaseOrder[b.suggested_phase] ?? 1)
  );
  // FIX 3: Break cycles before sorting (section level)
  const cleanSections  = breakCycles(phaseGrouped, 'section_id', 'inter_section_dependencies', 'exam_weight_percent');
  const sortedSections = topoSort(cleanSections, 'section_id', 'inter_section_dependencies');

  // ── Step 2: Build ordered topic queue ──
  let orderedTopics = [];
  for (const section of sortedSections) {
    const sectionTopics = manifest.topics.filter(
      t => t.section_id === section.section_id && t.status !== 'skip'
    );
    // FIX 3: Break cycles before sorting (topic level)
    const cleanTopics  = breakCycles(sectionTopics, 'topic_id', 'intra_section_dependencies', 'exam_relevance');
    const sortedTopics = topoSort(cleanTopics, 'topic_id', 'intra_section_dependencies');
    orderedTopics.push(...sortedTopics);
  }

  // FIX 2: Pre-split topics that would overflow the daily cap by >50%.
  // splitCap mirrors dailyCap so hardcore splits against recommendedHours, not a hardcoded 8.
  const splitCap = dailyCap;
  orderedTopics  = presplitTopics(orderedTopics, splitCap);

  // ── Step 3: Bin-pack into days ──
  const days         = [];
  let topicIdx       = 0;
  let topicHoursUsed = 0;

  for (let d = 1; d <= daysLeft; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d - 1);
    const dateStr = currentDate.toISOString().split('T')[0];

    if (topicIdx >= orderedTopics.length) {
      days.push({ day: d, date: dateStr, topics: [], total_hours: Math.min(1.5, studyHoursPerDay), is_review: true });
      continue;
    }

    const day = { day: d, date: dateStr, topics: [], total_hours: 0, is_review: false };

    while (topicIdx < orderedTopics.length) {
      const topic          = orderedTopics[topicIdx];
      const topicRemaining = parseFloat((topic.time_budget_hours - topicHoursUsed).toFixed(2));
      const dayRemaining   = parseFloat((dailyCap - day.total_hours).toFixed(2));

      if (dayRemaining < 0.25) break; // day is full

      // FIX 1 (Frankenstein Day): If the incoming topic is from a DIFFERENT section than
      // what's already on this day, only accept it if there's enough space to make it
      // meaningful (≥45% of the full daily cap). Otherwise close the day cleanly.
      if (day.topics.length > 0) {
        const dominantSection = day.topics[0].section_id;
        if (topic.section_id !== dominantSection && dayRemaining < dailyCap * 0.45) {
          break; // leave a short gap rather than creating cognitive whiplash
        }
      }

      if (topicRemaining <= dayRemaining + 0.25) {
        // Topic fits today
        const hoursScheduled = Math.round(topicRemaining * 4) / 4;
        day.topics.push({ ...topic, hours_this_day: hoursScheduled });
        day.total_hours = parseFloat((day.total_hours + topicRemaining).toFixed(2));
        topicIdx++;
        topicHoursUsed = 0;

      } else {
        if (config.overflow === 'extend_day') {
          // FIX 4 (Hardcore Black Hole): Finish this one topic, then CLOSE the day.
          // Without the break, the loop would continue and absorb the next topic too,
          // creating 12h days followed by 1.5h days.
          const hoursScheduled = Math.round(topicRemaining * 4) / 4;
          day.topics.push({ ...topic, hours_this_day: hoursScheduled });
          day.total_hours = parseFloat((day.total_hours + topicRemaining).toFixed(2));
          topicIdx++;
          topicHoursUsed = 0;
          break; // ← THE FIX: one extension per day maximum, then close

        } else if (day.topics.length === 0) {
          // Topic bigger than a full day (after presplit, this should be rare)
          // Start it today, continue tomorrow
          const hoursScheduled = Math.round(dayRemaining * 4) / 4;
          day.topics.push({ ...topic, hours_this_day: hoursScheduled });
          day.total_hours   = parseFloat((day.total_hours + dayRemaining).toFixed(2));
          topicHoursUsed    = parseFloat((topicHoursUsed + dayRemaining).toFixed(2));
          break;

        } else if (config.overflow === 'compress') {
          // Revision: absorb remaining capacity into a partial session of this topic
          const hoursScheduled = Math.round(dayRemaining * 4) / 4;
          day.topics.push({ ...topic, hours_this_day: hoursScheduled });
          day.total_hours   = parseFloat((day.total_hours + dayRemaining).toFixed(2));
          topicHoursUsed    = parseFloat((topicHoursUsed + dayRemaining).toFixed(2));
          break;

        } else {
          // drop_to_next_day: close cleanly, topic starts fresh tomorrow
          break;
        }
      }
    }

    day.total_hours = Math.round(day.total_hours * 10) / 10;
    days.push(day);
  }

  // FIX 5: Smooth day hours — redistributes topics between adjacent days to eliminate
  // outlier days (12h followed by 1.5h). Never violates topic ordering.
  return smoothDaySkeleton(days, studyHoursPerDay, recommendedHours ?? studyHoursPerDay, planMode);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — STRATEGY SYNTHESIZER
// Converts the manifest into the strategy object the frontend expects.
// Shape is IDENTICAL to what the old triage+communicator produced.
// ═══════════════════════════════════════════════════════════════════════════

function synthesizeStrategy(manifest, studyHoursPerDay, daysLeft) {
  const all       = manifest.topics;
  const active    = all.filter(t => t.status !== 'skip');
  const core      = all.filter(t => t.status === 'core');
  const standard  = all.filter(t => t.status === 'standard');
  const condensed = all.filter(t => t.status === 'condensed');
  const skipped   = all.filter(t => t.status === 'skip');

  const totalHoursNeeded = active.reduce((sum, t) => sum + (t.time_budget_hours || 0), 0);
  const rawRecommended   = totalHoursNeeded / Math.max(1, daysLeft);
  const recommended      = Math.min(24, Math.max(studyHoursPerDay, Math.round(rawRecommended * 10) / 10));
  const coverage         = all.length > 0 ? Math.round((active.length / all.length) * 100) : 100;

  // emphasized = core + high-relevance standard (mirrors old triage output shape)
  const emphasized = [
    ...core,
    ...standard.filter(t => t.exam_relevance === 'High'),
  ].map(t => ({
    topic: t.topic_name,
    justification: t.notes || `${t.difficulty} difficulty · ${t.exam_relevance} exam relevance`,
  }));

  return {
    estimated_coverage:               coverage,
    recommended_study_hours_per_day:  recommended,
    emphasized_topics:                emphasized,
    deprioritized_topics:             condensed.map(t => ({
      topic:         t.topic_name,
      justification: t.notes || 'Condensed format — lower ROI relative to time cost',
    })),
    skipped_topics: skipped.map(t => ({
      topic:         t.topic_name,
      justification: t.notes || 'Skipped — disproportionate time investment for likely exam return',
    })),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — PHASE 1A: SECTION SKELETON PROMPT
// ═══════════════════════════════════════════════════════════════════════════

function buildPhase1aPrompt(syllabus, examName, daysLeft, studyHoursPerDay, planMode) {
  const modeContext = {
    default:  'BALANCED MODE: Identify sections and flag their ROI. Some sections may be high-yield (important for exam score) vs low-yield (time-consuming, rarely tested).',
    hardcore: 'HARDCORE MODE: All sections must be covered with full depth. Flag nothing as skippable. Distribute weight evenly unless the syllabus clearly has foundational vs advanced units.',
    sprint:   'SPRINT MODE: Identify which sections are the highest-yield (likely tested heavily). Flag low-yield sections clearly — they will be aggressively trimmed in the next phase.',
    revision: 'REVISION MODE: User already knows this material. Identify all sections. Flag which ones need deeper review vs a quick formula refresh.',
    skill:    'SKILL BUILDER MODE: Distinguish practical/hands-on sections from pure theory. Practical sections are the backbone. Pure theory is secondary unless it directly enables practice.',
  };

  return `You are an academic architect. Your ONLY job is to decompose the provided syllabus into its major natural sections/units and assign strategic metadata. Do NOT plan daily tasks.

EXAM / GOAL: "${examName}"
TOTAL DAYS: ${daysLeft} | DAILY HOURS: ${studyHoursPerDay} | TOTAL HOURS AVAILABLE: ${daysLeft * studyHoursPerDay}
MODE: ${modeContext[planMode] || modeContext.default}

FULL SYLLABUS:
"""${syllabus}"""

Return ONLY this JSON object (no prose, no markdown fences):
{
  "sections": [
    {
      "section_id": "s1",
      "section_name": "Exact section or unit name",
      "raw_topics": ["exact topic 1 as written in syllabus", "exact topic 2"],
      "exam_weight_percent": 20,
      "suggested_phase": "early",
      "inter_section_dependencies": [],
      "section_notes": "One sentence: why this phase, why this weight, any special considerations"
    }
  ]
}

STRICT RULES:
- section_id: must be sequential — s1, s2, s3, s4 ...
- exam_weight_percent: values must sum to exactly 100 across all sections
- suggested_phase: ONLY "early" (foundational), "mid" (intermediate), or "late" (advanced/application)
- inter_section_dependencies: array of section_ids that MUST be studied before this section. Empty array if none.
- raw_topics: copy topic names EXACTLY as they appear in the syllabus. Do NOT invent, rename, or merge topics.
- Create only as many sections as naturally exist in the syllabus. Do not force groupings.
- Every single topic from the syllabus must appear in exactly one section's raw_topics array.
`;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — PHASE 1B: TOPIC ENRICHMENT PROMPT (one per section, run in parallel)
// ═══════════════════════════════════════════════════════════════════════════

function buildPhase1bPrompt(section, allSections, examName, planMode, totalAvailableHours) {
  const statusRules = {
    default: `
STATUS RULES (Balanced — maximize exam score, not coverage):
  "core"      → High exam weight, foundational for other topics, or very frequently tested. Must be deeply understood.
  "standard"  → Moderate importance. Cover properly but do not over-invest.
  "condensed" → Low ROI. Cover in one quick session (key formulas / definitions only).
  "skip"      → Extremely obscure, highly niche, OR requires disproportionate time for minimal exam return.`,

    hardcore: `
STATUS RULES (Hardcore — 100% coverage, no exceptions):
  "core"      → Foundational topics or topics that underpin others.
  "standard"  → All remaining topics.
  NEVER use "condensed" or "skip". Every single topic must be core or standard.`,

    sprint: `
STATUS RULES (Sprint — be RUTHLESS, max score velocity):
  "core"      → Absolute highest-yield only. The golden 20% that yields ~80% of marks. Maximum 20–25% of topics.
  "condensed" → Prerequisite-only topics that must be briefly touched to understand core topics.
  "skip"      → EVERYTHING else. The majority of topics should be "skip". This is intentional.`,

    revision: `
STATUS RULES (Revision — breadth first, no skipping):
  "standard"  → Needs real review: practice problems, formula recall, concept check.
  "condensed" → Needs only a quick formula glance or definition reminder.
  NEVER use "skip". User wants to touch every topic before the exam.`,

    skill: `
STATUS RULES (Skill Builder — hands-on first):
  "core"      → Practical, hands-on, project-oriented topics. The user will BUILD something with these.
  "standard"  → Foundational theory that directly enables practice.
  "condensed" → Supporting theory with limited direct practical application.
  "skip"      → Purely academic theory irrelevant to the practical skill goal.`,
  };

  const timeRules = {
    default:  'REALISTIC time budgets: complex/hard topics 2.5–4h, standard topics 1.5–2.5h, condensed topics 0.5–1h, skip = 0h.',
    hardcore: 'GENEROUS time budgets for true mastery (include problem-solving time): hard topics 4–6h, medium 2.5–4h, easy 1.5–2.5h. Never under-estimate.',
    sprint:   'Core topics get DEEP time (3–5h for mastery). Condensed get 0.5–1h. Skip gets 0h.',
    revision: 'ALL budgets must be SHORT — max 1.5h per topic. This is a refresh, not initial learning.',
    skill:    'Practical/project topics: 3–5h (includes doing, not just watching). Theory topics: 1–2h.',
  };

  const siblingContext = allSections
    .filter(s => s.section_id !== section.section_id)
    .map(s => `  • ${s.section_id}: ${s.section_name} (${s.exam_weight_percent}% of exam)`)
    .join('\n');

  return `You are enriching the topics for ONE section of the ${examName} syllabus. Be precise, honest, and granular.

SECTION: "${section.section_name}"
SECTION CONTEXT: ${section.section_notes}
SECTION EXAM WEIGHT: ${section.exam_weight_percent}% of total exam
TOTAL AVAILABLE STUDY HOURS (entire syllabus): ${totalAvailableHours}h

OTHER SECTIONS (for context and cross-referencing dependencies only):
${siblingContext}

${statusRules[planMode] || statusRules.default}

${timeRules[planMode] || timeRules.default}

TOPICS TO ENRICH — all ${section.raw_topics.length} topics listed below. You MUST enrich every single one:
${section.raw_topics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

Return ONLY this JSON (no prose, no markdown fences):
{
  "section_id": "${section.section_id}",
  "enriched_topics": [
    {
      "topic_id": "${section.section_id}_t1",
      "topic_name": "Exact topic name as listed above",
      "time_budget_hours": 2.0,
      "status": "core",
      "difficulty": "Medium",
      "exam_relevance": "High",
      "intra_section_dependencies": [],
      "notes": "One-sentence justification for this classification"
    }
  ]
}

CRITICAL RULES:
- Enrich EVERY topic in the list above. Do not drop, merge, or rename any.
- topic_id: use exactly this format: "${section.section_id}_t1", "${section.section_id}_t2" ... (strictly sequential, matching the order above)
- intra_section_dependencies: array of topic_ids from THIS section ONLY that must be studied before this topic. Empty array if none.
- difficulty: ONLY "Easy", "Medium", or "Hard"
- exam_relevance: ONLY "High", "Medium", or "Low"
- status: ONLY "core", "standard", "condensed", or "skip"
- time_budget_hours: a float between 0.5 and 8.0 (use 0 only for skip topics)
`;
}

/**
 * Post-processing: normalize topic IDs to sequential format and remap any dep references.
 * Guards against LLM mis-numbering IDs in Phase 1b output.
 */
function normalizeEnrichedSection(enrichedSection) {
  const idMap = new Map();

  enrichedSection.enriched_topics.forEach((t, i) => {
    const canonical = `${enrichedSection.section_id}_t${i + 1}`;
    idMap.set(t.topic_id, canonical);
    t.topic_id = canonical;
  });

  enrichedSection.enriched_topics.forEach(t => {
    t.intra_section_dependencies = (t.intra_section_dependencies || [])
      .map(depId => idMap.get(depId) || depId)           // remap to canonical ID
      .filter(depId => depId !== t.topic_id);            // remove any self-references
    t.time_budget_hours = parseFloat(t.time_budget_hours) || 0;
  });

  return enrichedSection;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6 — COMMUNICATOR PROMPTS
// Kept intact from original, adapted to receive synthesized strategyData
// (same field names: emphasized_topics, deprioritized_topics, skipped_topics,
//  estimated_coverage, recommended_study_hours_per_day)
// ═══════════════════════════════════════════════════════════════════════════

function getCommunicatorPrompt(planMode, strategyData, studyHoursPerDay, examName, userRequest) {
  const sharedFooter = `
**USER REQUEST:** "${userRequest || 'None'}" (ACKNOWLEDGE THIS EXPLICITLY IF NOT EMPTY OR NONE).

**FINAL STRATEGIC DECISIONS (THE GROUND TRUTH):**
- Recommended Pace: ${strategyData.recommended_study_hours_per_day} hours/day
- User's Requested Pace: ${studyHoursPerDay} hours/day
- Estimated Syllabus Coverage: ${strategyData.estimated_coverage}%
- Core Focus Topics: ${JSON.stringify(strategyData.emphasized_topics.slice(0, 8).map(t => t.topic))}
- Condensed/Quick Topics: ${JSON.stringify(strategyData.deprioritized_topics.slice(0, 5).map(t => t.topic))}
- Skipped Topics: ${JSON.stringify(strategyData.skipped_topics.slice(0, 5).map(t => t.topic))}

**UNBREAKABLE OUTPUT RULE:** Your ONLY output must be a single valid JSON object:
{ "overall_approach": "<your narrative paragraph>", "user_request": "<any detected special user request, or empty string>" }
`;

  const personas = {
    revision: `
- YOUR PERSONA: You are KalPad in "Revision Coach" mode. Calm, experienced, and encouraging. The tone says: "You've done the hard work — now let's lock it in."
- YOUR MISSION: Write the "overall_approach" narrative for a revision plan covering:
  1. Reassurance that the learning phase is over and revision begins.
  2. The active-recall strategy: moving quickly, using formula reviews, practice problems, quick concept checks.
  3. The sustainable ${strategyData.recommended_study_hours_per_day}h/day pacing — consistency beats intensity at this stage.
  4. A confident, motivating close: "Follow this, and you'll walk into that exam ready for anything."
`,
    hardcore: `
- YOUR PERSONA: You are KalPad in "Hardcore" mode. Direct, intense, no-nonsense. Like a demanding professor who won't let you take shortcuts.
- YOUR MISSION: Write the "overall_approach" covering:
  1. Direct mission statement: 100% mastery, no exceptions.
  2. Honest reality check on pace:
     - If ${studyHoursPerDay}h/day is sufficient: "Your requested pace is sufficient. The required daily commitment for total mastery is ${strategyData.recommended_study_hours_per_day} hours. Stick to it."
     - If INSUFFICIENT: "Your requested ${studyHoursPerDay}h/day is not enough. To achieve 100% coverage, you need ${strategyData.recommended_study_hours_per_day} hours every day. This plan is built on that. Are you ready?"
  3. The logical build-from-foundations structure.
  4. A closing mandate focused on discipline.
`,
    sprint: `
- YOUR PERSONA: You are KalPad in "Sprint Mode." High-energy, urgent, like a hackathon teammate in the final hours.
- YOUR MISSION: Write the "overall_approach" covering:
  1. Immediate high-energy acknowledgment of the time pressure.
  2. The ruthless triage: "We are deliberately ignoring a large chunk of the syllabus to laser-focus on the ${strategyData.estimated_coverage}% that contains the bulk of exam marks."
  3. Momentum structure: theory → application fast, one core topic per block, no distractions.
  4. A direct closing command: "No more planning. Let's execute. Now."
`,
    skill: `
- YOUR PERSONA: You are KalPad in "Skill Builder" mode. Supportive, practical, like a senior engineer mentoring a junior.
- YOUR MISSION: Write the "overall_approach" covering:
  1. The build-don't-memorize philosophy: learning happens by making things.
  2. Project-driven progression from simple to complex, with tangible milestones each week.
  3. The ${strategyData.recommended_study_hours_per_day}h/day commitment and what they'll actually ship.
  4. An inspiring close about having real, demonstrable skills by the end.
`,
    default: `
- YOUR PERSONA: You are KalPad — the super-smart, brutally honest senior from an Indian college. Hinglish-aware, witty, direct. You cut through the BS and tell students exactly what's happening.
- YOUR MISSION: Write the "overall_approach" covering:
  1. Direct acknowledgment of their request (if any). "You asked for '${userRequest || '...'}', so here is the deal..."
  2. The "why" of the triage: "We are skipping [skipped] because it's a time-sink. We're doubling down on [focused] because that's where the marks are."
  3. Reality check if they asked for too much in too little time: "100% coverage in 5 days isn't happening. I've optimized for a smart 80% score instead."
  4. No fluff. Say "We will master Integration first because Differential Equations depends on it" — not "We will build a strong foundation."
`,
  };

  const persona = personas[planMode] || personas.default;
  return `${KalPad_Constitution}\n${persona}\n${sharedFooter}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7 — PHASE 3 DIRECTIVES (writing style per mode)
// The LLM in Phase 3 is a WRITER, not a planner. It cannot change the schedule.
// ═══════════════════════════════════════════════════════════════════════════

function getPhase3Directive(planMode) {
  const directives = {
    default: `
WRITING STYLE (Balanced):
- Mix of concept learning and application. Every conceptual task should be followed by a practice task.
- Sub_topic types to use: "Concept", "Problem", "Derivation", "Summary", "Challenge"
- For every "core" or Hard/Intense topic: generate one "Challenge" sub_topic with a GOLDEN QUESTION.
  Format: "GOLDEN QUESTION: [The single most important exam-style question for this topic]"
`,
    hardcore: `
WRITING STYLE (Hardcore — go deep, no shortcuts):
- Every sub_topic demands real understanding. Proofs, derivations, and hard problems are expected.
- Sub_topic types to use: "Concept", "Derivation", "Proof", "Problem", "Challenge"
- EVERY core or Hard topic MUST include a GOLDEN QUESTION Challenge sub_topic.
- Do NOT create easy tasks for Hard/Intense days. Demand full engagement.
- Assume the user is willing to work hard — write tasks that reflect that.
`,
    sprint: `
WRITING STYLE (Sprint — maximum score velocity):
- Skip lengthy theory explanations. Jump straight to exam-pattern problems.
- Sub_topic types to use: "Concept", "Problem", "Challenge"
- EVERY single day must have at least one GOLDEN QUESTION Challenge sub_topic.
- Tasks should be exam-centric: "Solve 5 past paper questions on X", "Identify and solve the most common trap question type for Y"
- Time is the scarcest resource. Every sub_topic must earn its place.
`,
    revision: `
WRITING STYLE (Revision — active recall, no re-teaching):
- The user already knows this material. Do NOT explain concepts from scratch. Trigger memory.
- Sub_topic types to use: "Recall", "Formula", "Problem", "Summary"
- Task verbs: "Recall X without notes", "Write out formula for Y from memory", "Solve 3 quick problems on Z", "Summarise chapter in 5 bullet points"
- Zero lengthy explanations. Every task is a test of existing knowledge.
`,
    skill: `
WRITING STYLE (Skill Builder — build things, not notes):
- Every day must produce a tangible output: a component, a working script, a configured tool.
- Sub_topic types to use: "Build", "Code", "Practice", "Project", "Configure"
- Theory sub_topics must immediately link to practice: "Understand X concept (15 min), then implement it in your project (45 min)"
- No sub_topic should be purely passive. Reading must lead to doing.
`,
  };
  return directives[planMode] || directives.default;
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8 — POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request) {
  const auth = await resolveRouteAuth(request, { allowGuest: true });
  const session  = auth.user ? { user: auth.user } : null;
  const isGuest  = auth.isGuest;
  const authMode = auth.authMode;

  if (!session && !isGuest) {
    logRouteResult('/api/generate-plan', authMode, 401);
    return unauthorizedResponse();
  }

  const {
    examName,
    syllabus,
    examDate,
    useDocuments,       // kept in signature for API compatibility, RAG handled separately
    studyHoursPerDay,
    planMode = 'default',
  } = await request.json();

  // Guest plan length constraint
  const todayCheck  = new Date();
  const examDateObj = new Date(examDate);
  const diffDays    = Math.ceil(Math.abs(examDateObj - todayCheck) / (1000 * 60 * 60 * 24));
  if (isGuest && diffDays > 8) {
    logRouteResult('/api/generate-plan', authMode, 403);
    return new Response(
      JSON.stringify({ error: 'Guest plans are limited to 1 week. Please sign up for longer plans.' }),
      { status: 403 }
    );
  }

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {

      // ── Heartbeat: keeps connection alive during long AI calls ──
      const startHeartbeat = (interval = 15000) => {
        const id = setInterval(() => {
          console.log('[KalPad] Heartbeat — AI is still thinking...');
        }, interval);
        return () => clearInterval(id);
      };

      // ── Stream helpers ──
      const streamUpdate = (type, message) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type, data: { message } }) + '\n---\n')
          );
        } catch (e) {
          console.warn(`Could not stream update ('${type}') to a closed controller.`);
        }
      };

      const streamJSON = (type, data) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type, data }) + '\n---\n')
          );
        } catch (e) {
          console.warn(`Could not stream JSON ('${type}') to a closed controller.`);
        }
      };

      try {
        streamUpdate('status', 'Connection established. Initializing planner...');

        const today      = new Date();
        const startDate  = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
                              .toISOString().split('T')[0];
        const daysLeft   = Math.max(1, Math.ceil((new Date(examDate) - today) / (1000 * 60 * 60 * 24)));
        const totalHours = daysLeft * studyHoursPerDay;

        const plannerModel       = await getVertexAIModel('gemini-2.5-flash',      { responseMimeType: 'application/json' });
        const communicatorModel  = await getVertexAIModel('gemini-2.5-flash-lite', { responseMimeType: 'application/json' });

        const callModel = async (model, prompt) => {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          return JSON.parse(result.response.candidates[0].content.parts[0].text);
        };


        // ─────────────────────────────────────────────────────────
        // PHASE 1A — SECTION SKELETON (single fast call)
        // ─────────────────────────────────────────────────────────
        streamUpdate('status', 'Analyzing syllabus structure...');
        const phase1aData = await callModel(
          plannerModel,
          buildPhase1aPrompt(syllabus, examName, daysLeft, studyHoursPerDay, planMode)
        );
        const sections = phase1aData.sections;
        streamUpdate('status', `Identified ${sections.length} section(s). Enriching all topics in parallel...`);


        // ─────────────────────────────────────────────────────────
        // PHASE 1B — TOPIC ENRICHMENT (parallel, one call per section)
        // Each call is bounded to one section so output quality stays high
        // regardless of syllabus length.
        // ─────────────────────────────────────────────────────────
        const phase1bPromises = sections.map(section =>
          callModel(
            plannerModel,
            buildPhase1bPrompt(section, sections, examName, planMode, totalHours)
          )
          .then(data => normalizeEnrichedSection(data))
          .catch(err => {
            // Graceful fallback: if enrichment fails for a section, build basic topics
            console.error(`Phase 1b failed for section ${section.section_id}:`, err);
            return normalizeEnrichedSection({
              section_id: section.section_id,
              enriched_topics: section.raw_topics.map((t, i) => ({
                topic_id:                    `${section.section_id}_t${i + 1}`,
                topic_name:                  t,
                time_budget_hours:           2.0,
                status:                      'standard',
                difficulty:                  'Medium',
                exam_relevance:              'Medium',
                intra_section_dependencies:  [],
                notes:                       'Fallback: enrichment call failed for this section.',
              })),
            });
          })
        );

        const enrichedSections = await Promise.all(phase1bPromises);

        // Assemble the full manifest — the single source of truth for all downstream steps
        const manifest = {
          sections: sections,
          topics:   enrichedSections.flatMap(es =>
            es.enriched_topics.map(t => ({ ...t, section_id: es.section_id }))
          ),
        };

        const totalTopics  = manifest.topics.length;
        const activeTopics = manifest.topics.filter(t => t.status !== 'skip').length;
        streamUpdate('status', `Manifest complete: ${activeTopics}/${totalTopics} topics scheduled. Building strategy...`);


        // ─────────────────────────────────────────────────────────
        // SYNTHESIZE STRATEGY from manifest (pure JS — no LLM)
        // ─────────────────────────────────────────────────────────
        const strategyData = synthesizeStrategy(manifest, studyHoursPerDay, daysLeft);


        // ─────────────────────────────────────────────────────────
        // COMMUNICATOR — writes overall_approach narrative + detects user_request
        // Kept for UX: communicates the plan intent to the user in natural language
        // ─────────────────────────────────────────────────────────
        streamUpdate('status', 'Translating strategy into guidance...');
        const communicatorData = await callModel(
          communicatorModel,
          getCommunicatorPrompt(planMode, strategyData, studyHoursPerDay, examName, '')
        );

        const strategy = {
          ...strategyData,
          overall_approach: communicatorData.overall_approach || 'Here is your personalized study plan.',
          user_request:     communicatorData.user_request     || '',
        };

        // Stream strategy event — same shape the frontend always received
        streamJSON('strategy', strategy);


        // ─────────────────────────────────────────────────────────
        // DETERMINISTIC SCHEDULER — pure JS, no LLM
        // Returns flat array of day objects with topics already assigned
        // ─────────────────────────────────────────────────────────
        streamUpdate('status', 'Building deterministic day-by-day schedule...');
        const daySkeleton = buildDaySkeleton(manifest, daysLeft, studyHoursPerDay, planMode, startDate, strategyData.recommended_study_hours_per_day);

        // Group skeleton days into weekly batches for Phase 3
        const weeks = [];
        for (let i = 0; i < daySkeleton.length; i += 7) {
          weeks.push(daySkeleton.slice(i, i + 7));
        }

        streamUpdate('status', 'Architecture complete. Generating detailed daily tasks...');
        const phase3Directive = getPhase3Directive(planMode);


        // ─────────────────────────────────────────────────────────
        // PHASE 3 — WEEK-BY-WEEK TASK ENRICHMENT (streaming)
        // LLM role: writer only. It cannot change which topics appear or when.
        // ─────────────────────────────────────────────────────────
        for (const [weekIdx, weekSkeleton] of weeks.entries()) {
          streamUpdate('status', `Generating detailed plan for Week ${weekIdx + 1} of ${weeks.length}...`);

          // Build a human-readable skeleton string so the LLM clearly sees the fixed schedule
          const weekSkeletonStr = weekSkeleton.map(day => {
            if (day.is_review) {
              return `Day ${day.day} — ${day.date} (${day.total_hours}h): REVISION DAY — consolidate and practice previous topics.`;
            }
            const topicsStr = day.topics.map(t =>
              `    • ${t.topic_name} — ${t.hours_this_day}h  [status: ${t.status} | difficulty: ${t.difficulty} | relevance: ${t.exam_relevance}]`
            ).join('\n');
            return `Day ${day.day} — ${day.date} (${day.total_hours}h total):\n${topicsStr}`;
          }).join('\n\n');

          const firstDay = weekSkeleton[0]?.day ?? 0;
          const lastDay  = weekSkeleton[weekSkeleton.length - 1]?.day ?? 0;

          const phase3Prompt = `
${KalPad_Constitution}

You are the Weekly Task Writer for "${examName}". Your SOLE job is to write detailed, actionable sub-tasks for each day listed below.

THE SCHEDULE BELOW IS FIXED AND NON-NEGOTIABLE:
- Do NOT change which topics appear on which day.
- Do NOT change the hours allocated to any topic.
- Do NOT add or remove topics.
- Your ONLY job: write the sub_topics, day_summary, importance, and day_difficulty for each day.

═══════ FIXED WEEK SCHEDULE ═══════
${weekSkeletonStr}
═══════════════════════════════════

OVERALL STUDY CONTEXT:
- Exam / Goal: "${examName}"
- Strategy: "${strategy.overall_approach}"
- User Request: "${strategy.user_request || 'None'}"

${phase3Directive}

TIME IN SUB-TOPICS (MANDATORY): Every sub_topic text MUST begin with the estimated time in parentheses.
  ✓ CORRECT: "(30 min) Study Newton's First Law — focus on the concept of inertia and real-world examples."
  ✓ CORRECT: "(1h) Solve 10 integration problems covering substitution and integration by parts."
  ✗ WRONG: "Study Newton's First Law." (no time)
The sum of all sub_topic times for a day must closely match that day's total study hours.

TOPIC NAME FORMAT (MANDATORY): In the topic_name field, always include the hours:
  ✓ CORRECT: "Newton's Laws of Motion (2h)"
  ✓ CORRECT: "Electromagnetic Induction (3.5h)"
  If a day has multiple topics, use the primary topic: "Thermodynamics Intro (1.5h) + Zeroth Law (0.5h)"

IMPORTANCE SCORING:
  10 = core + High relevance
   8 = core + Medium relevance
   7 = standard + High relevance
   5 = standard + Medium relevance
   4 = condensed
   2 = review day

Return ONLY this JSON (no prose, no markdown fences):
{
  "weekly_plan": [
    {
      "day": <day number>,
      "date": "<YYYY-MM-DD>",
      "topic_name": "<Primary topic name (Xh)>",
      "study_hours": <total hours for this day as a number>,
      "importance": <1–10>,
      "day_difficulty": "<Easy|Medium|Hard|Intense>",
      "day_summary": "One sentence: what the student will achieve today and why it matters.",
      "sub_topics": [
        {
          "text": "(X min) Specific, immediately actionable task description.",
          "completed": false,
          "difficulty": "<Easy|Medium|Hard>",
          "type": "<type appropriate for mode>"
        }
      ]
    }
  ]
}

Generate exactly ${weekSkeleton.length} day objects, for days ${firstDay} through ${lastDay}.
day_difficulty guide: Easy = review/light day or <2h, Medium = 2–3h standard, Hard = 3–4h, Intense = >4h or heavy cognitive load.
`;

          let stopHeartbeat;
          try {
            stopHeartbeat = startHeartbeat();

            const weekResult = await plannerModel.generateContent({
              contents: [{ role: 'user', parts: [{ text: phase3Prompt }] }],
            });
            stopHeartbeat();

            const weekPlanObject = JSON.parse(weekResult.response.candidates[0].content.parts[0].text);
            const weekPlanArray  = weekPlanObject.weekly_plan || [];

            // Stamp dates from skeleton (LLM date can drift — scheduler is authoritative)
            for (const dayPlan of weekPlanArray) {
              const skeletonDay = weekSkeleton.find(d => d.day === dayPlan.day);
              if (skeletonDay) {
                dayPlan.date = skeletonDay.date;
                dayPlan.day  = skeletonDay.day;
              }
              // Stream each day — same event type as before
              streamJSON('plan_topic', dayPlan);
            }

          } catch (error) {
            if (stopHeartbeat) stopHeartbeat();
            console.error(`Error generating Phase 3 for Week ${weekIdx + 1}:`, error);
            streamUpdate('error', `Failed to generate detailed tasks for Week ${weekIdx + 1}. Continuing...`);
          }
        }

        controller.close();

      } catch (error) {
        console.error('Critical Error in generate-plan stream:', error);
        streamUpdate('error', error.message || 'An unknown error occurred.');
        controller.close();
      }
    },
  });

  logRouteResult('/api/generate-plan', authMode, 200);
  return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
}