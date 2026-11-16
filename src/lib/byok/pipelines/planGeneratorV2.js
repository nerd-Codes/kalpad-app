// src/lib/byok/pipelines/planGeneratorV2.js
/**
 * KalPad Plan Generation Engine v2
 * Powered by gpt-6-luna via client-side ChatGPT BYOK quota.
 *
 * Implements:
 * 1. Deep Academic Curriculum Expansion & Prerequisite Discovery (iceberg deconstruction)
 * 2. High-Yield Constraint Ledger & Dynamic Day Allocation (adaptive flex hours, no silent drops)
 * 3. Progressive Deep Task Authoring (chunked multi-day turns for maximum token budget & depth)
 * 4. Verified Coverage Audit & Honest Strategic Communicator (100% truth in advertising)
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { parseAiJson } from '../jsonSanitizer.js';

export const KALPAD_CONSTITUTION_V2 = `
**KalPad Pedagogical Constitution:**
1. Grounded Realism: A 4-unit university syllabus (40+ lecture hours) can be mastered in 3-4 days (7-8h/day) if organized into confidence-builders, high-yield derivations, standard question patterns, and active recall.
2. Unpack the Iceberg: Never treat syllabus lines as shallow checklists. Explode vague headings into the real universe of exam concepts, formulas (with KaTeX e.g. $W = -2.303 nRT \\log(V_2/V_1)$), mandatory derivations, and recurring question patterns.
3. Exam-Type Precision:
   - Theory Exams: Derivations, theorem proofs, diagrams, step-by-step numericals.
   - Viva / Oral: Verbal concept delivery, examiner trap questions, physical significance of terms.
   - Practical / Lab: Apparatus setups, procedures, observation tables, calculation formulas, sources of error.
   - MCQ / Competitive: Speed shortcuts, distractor elimination tricks, high-frequency question patterns.
4. Actionable Tasks with Exact Minute Budgets (MANDATORY):
   Every sub_topic text MUST start with time in parentheses, e.g. "(45 min) Derive the Euler-Lagrange equation..." or "(30 min) Oral drill: Answer top 5 viva traps on Carnot cycle...".
   Sub-topic minutes MUST sum closely to the day's study_hours.
5. Radical Honesty: If a timeline is compressed, prioritize high-ROI 80% mark zones and explicitly explain the triage.
`;

// Topological sort & cycle resolution helpers
function breakCycles(items, idKey, depsKey, relevanceKey) {
  const relevanceScore = { High: 3, Medium: 2, Low: 1 };
  const cloned = items.map((i) => ({ ...i, [depsKey]: [...(i[depsKey] || [])] }));
  const map = new Map(cloned.map((i) => [i[idKey], i]));

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map(cloned.map((i) => [i[idKey], WHITE]));

  function dfs(id) {
    color.set(id, GRAY);
    const item = map.get(id);
    if (!item) {
      color.set(id, BLACK);
      return;
    }

    const deps = item[depsKey];
    for (let i = deps.length - 1; i >= 0; i -= 1) {
      const depId = deps[i];
      if (color.get(depId) === GRAY) {
        const itemScore = relevanceScore[item[relevanceKey]] ?? 2;
        const depItem = map.get(depId);
        const depScore = relevanceScore[depItem?.[relevanceKey]] ?? 2;
        if (itemScore <= depScore) {
          deps.splice(i, 1);
        } else {
          const depDeps = depItem[depsKey];
          const backIdx = depDeps.indexOf(id);
          if (backIdx !== -1) depDeps.splice(backIdx, 1);
        }
      } else if (color.get(depId) === WHITE) {
        dfs(depId);
      }
    }
    color.set(id, BLACK);
  }

  for (const item of cloned) {
    if (color.get(item[idKey]) === WHITE) dfs(item[idKey]);
  }
  return cloned;
}

function topoSort(items, idKey, depsKey) {
  const result = [];
  const visited = new Set();
  const visiting = new Set();
  const map = new Map(items.map((i) => [i[idKey], i]));

  function visit(item) {
    const id = item[idKey];
    if (visited.has(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const depId of item[depsKey] || []) {
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
 * Builds Phase 1 Deep Curriculum Expansion Prompt
 */
export function buildCurriculumExpansionPrompt({
  examName,
  syllabus,
  daysLeft,
  studyHoursPerDay,
  examFormat = 'theory',
  prepLevel = 'standard',
  priorityNote = '',
}) {
  const totalAvailableHours = daysLeft * studyHoursPerDay;
  const isCompressed = daysLeft <= 4;

  return `${KALPAD_CONSTITUTION_V2}

You are the Master Academic Curriculum Architect for "${examName}".
EXAM TARGET: "${examName}"
EXAM FORMAT: "${examFormat}" (e.g. theory, viva, practical, mcq, comprehensive)
PREPARATION BASELINE: "${prepLevel}" (scratch, standard, or cram)
DAYS LEFT: ${daysLeft} days | DECLARED DAILY PACE: ${studyHoursPerDay}h/day | TOTAL BUDGET: ~${totalAvailableHours}h
${priorityNote ? `USER PRIORITY DIRECTIVE: "${priorityNote}"` : ''}

USER SYLLABUS INPUT:
"""${syllabus || '(No syllabus provided by user - populate full authentic standard curriculum based on exam name)'}"""

MISSION:
1. DECONSTRUCT THE ICEBERG: If the user gave an empty or vague syllabus (e.g. "CBSE Class 12 Physics" or "Unit 1-4"), generate the complete authentic curriculum topics, standard derivations, key formulas, and question patterns.
2. IDENTIFY EXAM SPECIFICS FOR "${examFormat}":
   - If Viva: include examiner trap questions and physical meaning of formulas.
   - If Practical: include apparatus, procedures, observation tables, error calculations.
   - If Theory: include standard multi-mark derivations, proofs, diagrams, and numericals.
   - If MCQ: include speed tricks, edge cases, and high-probability problem archetypes.
3. REALISTIC PACING & TRIAGE:
   - Identify "confidence_builders": foundational topics that build momentum early and score quick marks.
   - Identify "high_yield_anchors": recurring, heavy-weightage core topics.
   ${isCompressed ? '- COMPRESSED TIMELINE: Since time is tight (' + daysLeft + ' days), budget realistic high-yield hours for core topics, and condense peripheral/low-ROI descriptive topics so the student still covers the whole syllabus without drowning.' : ''}

Return strictly a valid JSON object matching this schema (no prose outside JSON):
{
  "curriculum_analysis": {
    "detected_exam_type": "${examFormat}",
    "academic_level": "<e.g. University Undergraduate | High School Board | etc.>",
    "total_estimated_study_hours": <number>,
    "confidence_building_topic_ids": ["t1", ...],
    "high_yield_topic_ids": ["t2", ...]
  },
  "sections": [
    {
      "section_id": "s1",
      "section_name": "<Unit / Chapter name>",
      "exam_weight_pct": <number 0-100>,
      "suggested_phase": "<early | mid | late>",
      "inter_section_dependencies": []
    }
  ],
  "topics": [
    {
      "topic_id": "t1",
      "section_id": "s1",
      "topic_name": "<Specific topic name>",
      "time_budget_hours": <number e.g. 2.0>,
      "difficulty": "<Easy | Medium | Hard | Intense>",
      "exam_relevance": "<High | Medium | Low>",
      "status": "<core | condensed | skip>",
      "is_confidence_builder": <boolean>,
      "is_high_yield": <boolean>,
      "intra_dependencies": [],
      "exam_angles": {
        "must_know_concepts": ["concept 1", "concept 2"],
        "formulas_and_derivations": ["formula / derivation 1", "formula 2"],
        "typical_questions": ["sample question 1", "sample question 2"],
        "viva_or_practical_traps": ["examiner question or lab precaution"]
      },
      "triage_notes": "<One sentence justification for time and status>"
    }
  ]
}`;
}

/**
 * Builds the Master Curriculum Ledger by allocating topics across available days.
 * Dynamically flexes hours (e.g. ±1 to 2h) to avoid dropping topics,
 * guarantees confidence builders on Day 1, and respects dependencies.
 */
export function buildMasterCurriculumLedger({
  manifest,
  daysLeft,
  studyHoursPerDay,
  startDate,
  examFormat,
}) {
  const activeTopics = manifest.topics.filter((t) => t.status !== 'skip');
  const sections = manifest.sections || [];

  // Sort sections topologically by phase and dependency
  const phaseOrder = { early: 0, mid: 1, late: 2 };
  const phaseGrouped = [...sections].sort(
    (a, b) => (phaseOrder[a.suggested_phase] ?? 1) - (phaseOrder[b.suggested_phase] ?? 1)
  );
  const cleanSections = breakCycles(phaseGrouped, 'section_id', 'inter_section_dependencies', 'exam_weight_pct');
  const sortedSections = topoSort(cleanSections, 'section_id', 'inter_section_dependencies');

  // Collect ordered topics per section
  let orderedTopics = [];
  for (const section of sortedSections) {
    const sTopics = activeTopics.filter((t) => t.section_id === section.section_id);
    const cleanTopics = breakCycles(sTopics, 'topic_id', 'intra_dependencies', 'exam_relevance');
    const sortedSTopics = topoSort(cleanTopics, 'topic_id', 'intra_dependencies');
    orderedTopics.push(...sortedSTopics);
  }

  // If no sections were returned, fallback to sorted active topics directly
  if (orderedTopics.length === 0) {
    orderedTopics = [...activeTopics];
  }

  // Prioritize confidence builders to the front of early phase, preserving dependencies
  const confidenceIds = new Set(manifest.curriculum_analysis?.confidence_building_topic_ids || []);
  orderedTopics.sort((a, b) => {
    const aConf = confidenceIds.has(a.topic_id) || a.is_confidence_builder;
    const bConf = confidenceIds.has(b.topic_id) || b.is_confidence_builder;
    if (aConf && !bConf) return -1;
    if (!aConf && bConf) return 1;
    return 0;
  });

  // Calculate total topic hours vs capacity
  const totalTopicHours = orderedTopics.reduce((s, t) => s + (t.time_budget_hours || 1.5), 0);
  const baseCapacity = daysLeft * studyHoursPerDay;

  // Compute adaptive daily target hours
  // If compressed (totalTopicHours > baseCapacity), allow dynamic flex up to 1.35x requested hours (capped at 10h/day)
  let targetDailyHours = studyHoursPerDay;
  if (totalTopicHours > baseCapacity) {
    const requiredDaily = totalTopicHours / daysLeft;
    targetDailyHours = Math.min(10, Math.max(studyHoursPerDay, Math.round(requiredDaily * 10) / 10));
  }

  // Pre-scale topic hours if extreme compression to fit tightly into daysLeft without dropping
  const maxAvailableTotalHours = daysLeft * targetDailyHours;
  let scaledTopics = orderedTopics;
  if (totalTopicHours > maxAvailableTotalHours) {
    const scaleFactor = maxAvailableTotalHours / totalTopicHours;
    scaledTopics = orderedTopics.map((t) => ({
      ...t,
      time_budget_hours: Math.max(0.75, Math.round(t.time_budget_hours * scaleFactor * 4) / 4),
    }));
  }

  // Allocate topics into days
  const dayLedger = [];
  let topicIdx = 0;
  let topicHoursRemaining = scaledTopics.length > 0 ? scaledTopics[0].time_budget_hours : 0;

  for (let d = 1; d <= daysLeft; d += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d - 1);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Day flex: Last 2 days or intense days get slight proximity boost
    const isFinalDays = daysLeft - d <= 1;
    const dayCapacity = isFinalDays && daysLeft > 2
      ? Math.round(targetDailyHours * 1.1 * 10) / 10
      : targetDailyHours;

    const daySlot = {
      day: d,
      date: dateStr,
      topics: [],
      target_hours: dayCapacity,
      allocated_hours: 0,
      is_review_only: false,
    };

    while (topicIdx < scaledTopics.length) {
      const topic = scaledTopics[topicIdx];
      const spaceLeft = Math.round((dayCapacity - daySlot.allocated_hours) * 100) / 100;

      if (spaceLeft < 0.4 && daySlot.topics.length > 0) {
        break; // Day is comfortably packed
      }

      if (topicHoursRemaining <= spaceLeft + 0.35) {
        // Fits entirely into this day
        const hrs = Math.max(0.5, Math.round(topicHoursRemaining * 4) / 4);
        daySlot.topics.push({
          ...topic,
          hours_this_day: hrs,
        });
        daySlot.allocated_hours = parseFloat((daySlot.allocated_hours + hrs).toFixed(2));
        topicIdx += 1;
        topicHoursRemaining = topicIdx < scaledTopics.length ? scaledTopics[topicIdx].time_budget_hours : 0;
      } else {
        // Topic spans across to next day or needs chunking
        const hrsToSchedule = Math.max(0.5, Math.round(spaceLeft * 4) / 4);
        daySlot.topics.push({
          ...topic,
          hours_this_day: hrsToSchedule,
          is_partial: true,
        });
        daySlot.allocated_hours = parseFloat((daySlot.allocated_hours + hrsToSchedule).toFixed(2));
        topicHoursRemaining = parseFloat((topicHoursRemaining - hrsToSchedule).toFixed(2));
        break;
      }
    }

    // If day ran out of new topics, mark as consolidation & mock test review
    if (daySlot.topics.length === 0) {
      daySlot.is_review_only = true;
      daySlot.allocated_hours = Math.min(3, studyHoursPerDay);
    } else {
      daySlot.allocated_hours = Math.round(daySlot.allocated_hours * 10) / 10;
    }

    dayLedger.push(daySlot);
  }

  // Ensure 100% of topics are packed: if any topic remained unassigned due to rounding, pack into final day
  while (topicIdx < scaledTopics.length) {
    const unplacedTopic = scaledTopics[topicIdx];
    const targetDay = dayLedger[dayLedger.length - 1];
    const remainingHrs = Math.max(0.5, topicHoursRemaining || unplacedTopic.time_budget_hours);
    const existingLast = targetDay.topics[targetDay.topics.length - 1];

    if (existingLast && existingLast.topic_id === unplacedTopic.topic_id) {
      existingLast.hours_this_day = parseFloat((existingLast.hours_this_day + remainingHrs).toFixed(2));
      existingLast.is_partial = false;
    } else {
      targetDay.topics.push({
        ...unplacedTopic,
        hours_this_day: remainingHrs,
      });
    }
    targetDay.allocated_hours = parseFloat((targetDay.allocated_hours + remainingHrs).toFixed(1));
    topicIdx += 1;
    topicHoursRemaining = topicIdx < scaledTopics.length ? scaledTopics[topicIdx].time_budget_hours : 0;
  }

  return dayLedger;
}

/**
 * Builds Phase 3 Progressive Chunk Authoring Prompt for a batch of days
 */
function buildChunkAuthoringPrompt({
  chunkDays,
  examName,
  examFormat,
  prepLevel,
  manifest,
}) {
  const chunkOutline = chunkDays.map((d) => {
    if (d.is_review_only) {
      return `Day ${d.day} (${d.date}) [${d.allocated_hours}h Target]: Full-Syllabus Mock Test, Formula Revision & Examiner Trap Recall`;
    }
    const topicDetails = d.topics.map((t) => {
      const angles = t.exam_angles || {};
      const mustKnow = (angles.must_know_concepts || []).slice(0, 3).join(', ');
      const formulas = (angles.formulas_and_derivations || []).slice(0, 2).join('; ');
      const typical = (angles.typical_questions || []).slice(0, 2).join('; ');
      const traps = (angles.viva_or_practical_traps || []).slice(0, 1).join('');

      return `  • Topic "${t.topic_name}" (${t.hours_this_day}h):
      - Must-Know: ${mustKnow || 'Core principles'}
      - Formulas/Derivations: ${formulas || 'Standard equations'}
      - Exam Question Patterns: ${typical || 'Pyq patterns'}
      ${traps ? `- Viva / Practical Traps: ${traps}` : ''}`;
    }).join('\n');

    return `Day ${d.day} (${d.date}) [${d.allocated_hours}h Target]:\n${topicDetails}`;
  }).join('\n\n');

  return `${KALPAD_CONSTITUTION_V2}

You are the Master Study Plan Author for "${examName}".
TARGET FORMAT: "${examFormat}"
PREPARATION BASELINE: "${prepLevel}"

Below is the EXACT Master Curriculum Ledger for Days ${chunkDays[0].day} to ${chunkDays[chunkDays.length - 1].day}.
YOU MUST AUTHOR EXHAUSTIVE, MINUTE-BUDGETED, HYPER-ACTIONABLE DAILY MISSIONS FOR EVERY ASSIGNED TOPIC.

LEDGER ASSIGNMENTS:
${chunkOutline}

AUTHORING RULES:
1. Every sub_topic text MUST start with time in parentheses, e.g. "(45 min) ...", "(30 min) ...", "(1h) ...".
2. Sub_topic times for each day MUST sum closely (within 15 min) to that day's target study_hours.
3. Be hyper-specific:
   - For Theory: Name the exact derivation, state initial assumptions, and list key proof checkpoints. Use KaTeX for math formulas e.g. $E = mc^2$.
   - For Viva: Write explicit oral drills: "(30 min) Viva Defense: Verbally explain why [Concept] occurs. Prepare answers for trap questions: [Trap Question]".
   - For Practical: Detail apparatus, precautions, step-by-step experiment procedures, and observation table parameters.
   - For MCQ: Timed practice drills, elimination strategies, and error-logging.
4. Set "day_difficulty" to "Easy", "Medium", "Hard", or "Intense".
5. Write a sharp, inspiring "day_summary" capturing the core victory for the day.

Return strictly a valid JSON object matching this schema:
{
  "authored_days": [
    {
      "day": <number>,
      "date": "<YYYY-MM-DD>",
      "topic_name": "<Primary focus title e.g. 'Thermodynamics: First Law & Enthalpy Derivations (6h)'>",
      "study_hours": <number matching ledger target>,
      "importance": <number 1-10>,
      "day_difficulty": "<Easy | Medium | Hard | Intense>",
      "day_summary": "<One-sentence strategic goal for the day>",
      "sub_topics": [
        {
          "text": "(45 min) Step-by-step actionable instruction with specific concepts, formulas or questions.",
          "completed": false,
          "difficulty": "<Easy | Medium | Hard>",
          "type": "<Concept | Derivation | Practice | Viva_Drill | Lab_Procedure | Summary>"
        }
      ]
    }
  ]
}`;
}

/**
 * Builds Phase 4 Strategic Communicator & Honest Overview Prompt
 */
function buildStrategicCommunicatorPrompt({
  examName,
  examFormat,
  daysLeft,
  studyHoursPerDay,
  actualCoveragePct,
  plannedTopicsCount,
  totalTopicsCount,
  emphasizedTopics,
  condensedTopics,
  skippedTopics,
  userPriorityNote,
}) {
  return `${KALPAD_CONSTITUTION_V2}

Write a sharp, honest, inspiring "overall_approach" battle strategy for a student preparing for "${examName}".
EXAM FORMAT: "${examFormat}" | TIMELINE: ${daysLeft} days | PACE: ${studyHoursPerDay}h/day
ACTUAL VERIFIED COVERAGE: ${actualCoveragePct}% (${plannedTopicsCount} of ${totalTopicsCount} expanded syllabus topics covered)
FOCUS TOPICS: ${JSON.stringify(emphasizedTopics.slice(0, 6))}
${condensedTopics.length > 0 ? `CONDENSED / HIGH-YIELD SPRINT TOPICS: ${JSON.stringify(condensedTopics.slice(0, 5))}` : ''}
${skippedTopics.length > 0 ? `DEPRIORITIZED TOPICS: ${JSON.stringify(skippedTopics.slice(0, 3))}` : ''}
${userPriorityNote ? `USER REQUEST: "${userPriorityNote}"` : ''}

CRITICAL RULES:
- Radical transparency: Explain why topics are sequenced the way they are (confidence builders first $\\rightarrow$ high yield anchors $\\rightarrow$ active recall).
- If timeline was compressed (e.g. 4 units in 2-3 days), openly praise their courage, explain the 80/20 triage strategy, and instruct them to execute Day 1 with zero hesitation.
- Tone: Empathetic, disciplined, academic tutor & topper friend.

Return ONLY a valid JSON object:
{
  "overall_approach": "<Inspiring, strategic, transparent narrative paragraph>"
}`;
}

/**
 * Main Entry Point: generatePlanBYOK_v2
 * Emits legacy-compatible SSE events: 'status', 'strategy', 'plan_topic', 'error'.
 */
export async function generatePlanBYOK_v2({
  examName,
  syllabus,
  examDate,
  studyHoursPerDay = 4,
  planMode = 'default',
  examFormat = 'theory',
  prepLevel = 'standard',
  priorityNote = '',
  onEvent,
  signal,
}) {
  const token = await ensureByokConnected();
  const model = await resolveModelForTask('planModel', { accessToken: token });

  const callJson = async (prompt, developerInstructions = 'Return strictly valid JSON.') => {
    const raw = await generateText({
      accessToken: token,
      model,
      prompt,
      developerInstructions,
      signal,
    });
    return parseAiJson(raw);
  };

  const today = new Date();
  const startDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  const examDateObj = new Date(examDate);
  const daysLeft = Math.max(1, Math.ceil((examDateObj - today) / (1000 * 60 * 60 * 24)));

  onEvent?.({
    type: 'status',
    data: { message: `Booting KalPad Engine v2 on ${model}...` },
  });

  // =========================================================================
  // PHASE 1: DEEP CURRICULUM EXPANSION & PREREQUISITE DISCOVERY
  // =========================================================================
  onEvent?.({
    type: 'status',
    data: { message: `Unpacking syllabus iceberg & exam patterns for "${examName}"...` },
  });

  let manifest = null;
  try {
    const expansionPrompt = buildCurriculumExpansionPrompt({
      examName,
      syllabus,
      daysLeft,
      studyHoursPerDay,
      examFormat,
      prepLevel,
      priorityNote,
    });
    manifest = await callJson(expansionPrompt);
  } catch (err) {
    if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') throw err;
  }

  // Fallback if AI expansion failed to parse JSON
  if (!manifest || !Array.isArray(manifest.topics) || manifest.topics.length === 0) {
    const fallbackLines = (syllabus || examName)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    manifest = {
      curriculum_analysis: {
        detected_exam_type: examFormat,
        academic_level: 'Standard Exam',
        total_estimated_study_hours: daysLeft * studyHoursPerDay,
        confidence_building_topic_ids: ['t1'],
        high_yield_topic_ids: ['t1'],
      },
      sections: [
        {
          section_id: 's1',
          section_name: examName || 'Core Curriculum',
          exam_weight_pct: 100,
          suggested_phase: 'early',
          inter_section_dependencies: [],
        },
      ],
      topics: fallbackLines.length > 0
        ? fallbackLines.map((line, i) => ({
            topic_id: `t${i + 1}`,
            section_id: 's1',
            topic_name: line,
            time_budget_hours: Math.max(1.5, Math.round((daysLeft * studyHoursPerDay / fallbackLines.length) * 2) / 2),
            difficulty: 'Medium',
            exam_relevance: 'High',
            status: 'core',
            is_confidence_builder: i === 0,
            is_high_yield: true,
            intra_dependencies: [],
            exam_angles: {
              must_know_concepts: [`Key fundamentals of ${line}`],
              formulas_and_derivations: [`Core equations for ${line}`],
              typical_questions: [`Standard exam problems on ${line}`],
              viva_or_practical_traps: [`Key definition and exam trap on ${line}`],
            },
            triage_notes: 'Direct syllabus line',
          }))
        : [
            {
              topic_id: 't1',
              section_id: 's1',
              topic_name: examName || 'Core Foundations',
              time_budget_hours: daysLeft * studyHoursPerDay,
              difficulty: 'Medium',
              exam_relevance: 'High',
              status: 'core',
              is_confidence_builder: true,
              is_high_yield: true,
              intra_dependencies: [],
              exam_angles: {},
              triage_notes: 'Primary subject anchor',
            },
          ],
    };
  }

  onEvent?.({
    type: 'status',
    data: {
      message: `Expanded into ${manifest.topics.length} mastery topics. Solving schedule constraints...`,
    },
  });

  // =========================================================================
  // PHASE 2: MASTER CURRICULUM LEDGER & ADAPTIVE ALLOCATOR
  // =========================================================================
  const ledger = buildMasterCurriculumLedger({
    manifest,
    daysLeft,
    studyHoursPerDay,
    startDate,
    examFormat,
  });

  // Calculate audit statistics
  const scheduledTopicIds = new Set();
  ledger.forEach((day) => {
    (day.topics || []).forEach((t) => scheduledTopicIds.add(t.topic_id));
  });

  const totalExpandedTopics = manifest.topics.length;
  const scheduledCount = manifest.topics.filter((t) => scheduledTopicIds.has(t.topic_id)).length;
  const actualCoveragePct = totalExpandedTopics > 0
    ? Math.min(100, Math.round((scheduledCount / totalExpandedTopics) * 100))
    : 100;

  const emphasizedTopics = manifest.topics
    .filter((t) => t.is_high_yield || t.is_confidence_builder)
    .map((t) => ({ topic: t.topic_name, justification: t.triage_notes || 'High ROI for exam score' }));

  const condensedTopics = manifest.topics
    .filter((t) => t.status === 'condensed')
    .map((t) => ({ topic: t.topic_name, justification: t.triage_notes || 'High-yield condensed sprint' }));

  const skippedTopics = manifest.topics
    .filter((t) => t.status === 'skip' && !scheduledTopicIds.has(t.topic_id))
    .map((t) => ({ topic: t.topic_name, justification: t.triage_notes || 'Deprioritized to ensure mastery of core units' }));

  // =========================================================================
  // PHASE 3: PROGRESSIVE CHUNKED TASK AUTHORING (High token budget per day)
  // =========================================================================
  // Batch days in chunks of 3-7 days to prevent output token truncation while keeping quality supreme
  const chunkSize = daysLeft <= 4 ? daysLeft : daysLeft <= 10 ? 4 : 7;
  const authoredDaysMap = new Map();

  for (let c = 0; c < ledger.length; c += chunkSize) {
    const chunkDays = ledger.slice(c, c + chunkSize);
    const startDay = chunkDays[0].day;
    const endDay = chunkDays[chunkDays.length - 1].day;

    onEvent?.({
      type: 'status',
      data: {
        message: `Authoring deep actionable tasks for Days ${startDay}–${endDay}...`,
      },
    });

    try {
      const chunkPrompt = buildChunkAuthoringPrompt({
        chunkDays,
        examName,
        examFormat,
        prepLevel,
        manifest,
      });
      const authoredObj = await callJson(chunkPrompt);
      const daysArray = Array.isArray(authoredObj?.authored_days) ? authoredObj.authored_days : [];

      daysArray.forEach((dayPlan) => {
        authoredDaysMap.set(dayPlan.day, dayPlan);
      });
    } catch (chunkErr) {
      if (chunkErr?.isUsageLimit || chunkErr?.code === 'BYOK_NOT_CONNECTED') throw chunkErr;
      // Fallback authoring from Ledger metadata if chunk completion failed
    }

    // Emit all days in this chunk progressively
    for (const skel of chunkDays) {
      let dayPlan = authoredDaysMap.get(skel.day);

      if (!dayPlan || !Array.isArray(dayPlan.sub_topics) || dayPlan.sub_topics.length === 0) {
        // Deterministic fallback using Phase 1 topic metadata
        dayPlan = {
          day: skel.day,
          date: skel.date,
          topic_name: skel.is_review_only
            ? 'Full Syllabus Recall & Mock Assessment'
            : skel.topics.map((t) => `${t.topic_name} (${t.hours_this_day}h)`).join(' + ') || examName,
          study_hours: skel.allocated_hours,
          importance: skel.topics.some((t) => t.is_high_yield) ? 9 : 7,
          day_difficulty: skel.allocated_hours > 6 ? 'Intense' : skel.allocated_hours >= 4 ? 'Hard' : 'Medium',
          day_summary: skel.is_review_only
            ? 'Timed active recall of all completed concepts, formulas and weak areas.'
            : `Master ${skel.topics.map((t) => t.topic_name).join(' & ')} through derivations and PYQs.`,
          sub_topics: skel.is_review_only
            ? [
                {
                  text: `(${Math.round(skel.allocated_hours * 30)} min) Comprehensive timed test: Solve past 3 years' high-yield questions under exam conditions.`,
                  completed: false,
                  difficulty: 'Hard',
                  type: 'Practice',
                },
                {
                  text: `(${Math.round(skel.allocated_hours * 30)} min) Formula sheet audit & verbal explanation of all recurring exam definitions.`,
                  completed: false,
                  difficulty: 'Medium',
                  type: 'Summary',
                },
              ]
            : skel.topics.flatMap((t) => {
                const mins = Math.max(30, Math.round(t.hours_this_day * 60));
                const p1 = Math.round(mins * 0.45);
                const p2 = mins - p1;
                return [
                  {
                    text: `(${p1} min) Master ${t.topic_name}: Understand core derivations, theorem statements and diagram checkpoints.`,
                    completed: false,
                    difficulty: t.difficulty || 'Medium',
                    type: 'Concept',
                  },
                  {
                    text: `(${p2} min) Solve 5-8 recurring exam problems on ${t.topic_name} and compile formula flash-summary.`,
                    completed: false,
                    difficulty: t.difficulty || 'Medium',
                    type: 'Practice',
                  },
                ];
              }),
        };
      }

      // Guarantee date and day alignment with ledger
      dayPlan.date = skel.date;
      dayPlan.day = skel.day;

      onEvent?.({
        type: 'plan_topic',
        data: dayPlan,
      });
    }
  }

  // =========================================================================
  // PHASE 4: VERIFIED STRATEGIC COMMUNICATOR NARRATIVE
  // =========================================================================
  onEvent?.({
    type: 'status',
    data: { message: 'Finalizing verified strategy & battle plan...' },
  });

  let overallApproach = `Strategic battle plan ready for ${examName}. Target: ${daysLeft} days at ${studyHoursPerDay}h/day with ${actualCoveragePct}% verified syllabus coverage.`;

  try {
    const commPrompt = buildStrategicCommunicatorPrompt({
      examName,
      examFormat,
      daysLeft,
      studyHoursPerDay,
      actualCoveragePct,
      plannedTopicsCount: scheduledCount,
      totalTopicsCount: totalExpandedTopics,
      emphasizedTopics,
      condensedTopics,
      skippedTopics,
      userPriorityNote: priorityNote,
    });
    const commData = await callJson(commPrompt);
    if (commData?.overall_approach) {
      overallApproach = commData.overall_approach;
    }
  } catch (commErr) {
    if (commErr?.isUsageLimit) throw commErr;
  }

  const finalStrategy = {
    estimated_coverage: actualCoveragePct,
    recommended_study_hours_per_day: Math.max(studyHoursPerDay, Math.round(ledger[0]?.allocated_hours || studyHoursPerDay)),
    emphasized_topics: emphasizedTopics,
    deprioritized_topics: condensedTopics,
    skipped_topics: skippedTopics,
    overall_approach: overallApproach,
    user_request: priorityNote,
  };

  onEvent?.({
    type: 'strategy',
    data: finalStrategy,
  });

  return {
    strategy: finalStrategy,
    ledger,
    manifest,
  };
}
