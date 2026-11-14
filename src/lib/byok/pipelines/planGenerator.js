// src/lib/byok/pipelines/planGenerator.js
/**
 * Client-side Manifest-Driven Study Plan Generator & Regenerator powered by ChatGPT BYOK quota.
 * Uses configured modelPreferences.planModel.
 * Ports exact topological scheduling, cycle-breaking, smoothing, and KalPad Constitution rules
 * from KalPad's server planner & Android LocalPlanGeneratorImpl.
 */

import supabase from '../../supabaseClient.js';
import { ensureByokConnected, generateText, resolveModelForTask } from '../openai.js';
import { parseAiJson } from '../jsonSanitizer.js';
import { mapWithConcurrency } from './concurrency.js';

const KalPad_Constitution = `
  **Core Principles for Plan Generation:**
  1. Think Like a Tutor (Logical Sequencing): Foundational concepts MUST precede advanced topics that build on them.
  2. Radical Transparency (The "Why"): The day_summary must explain the goal and the reason behind the day's structure.
  3. Actionable Depth: Every sub_topic must be specific and immediately actionable — not vague.
  4. Time Awareness (MANDATORY): Every sub_topic text MUST begin with its estimated time in parentheses, e.g. "(30 min) Study Newton's First Law focusing on inertia..." or "(1h) Solve 10 integration problems from exam pattern...". Sub_topic times must sum closely to the day's total study_hours.
`;

const SCHEDULING_CONFIG = {
  default: { cap_daily_hours: true, overflow: 'drop_to_next_day' },
  hardcore: { cap_daily_hours: 'recommended', overflow: 'extend_day' },
  sprint: { cap_daily_hours: true, overflow: 'drop_to_next_day' },
  revision: { cap_daily_hours: true, overflow: 'compress' },
  skill: { cap_daily_hours: true, overflow: 'drop_to_next_day' },
};

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

function presplitTopics(topics, dailyCap) {
  const result = [];
  for (const topic of topics) {
    const budget = topic.time_budget_hours || 0;
    const maxPerSlot = Math.max(dailyCap * 1.5, dailyCap + 1);
    if (budget <= maxPerSlot) {
      result.push(topic);
      continue;
    }

    let remaining = budget;
    let partNum = 1;
    while (remaining > 0.25) {
      const chunk = Math.min(remaining, dailyCap);
      result.push({
        ...topic,
        topic_id: `${topic.topic_id}_p${partNum}`,
        topic_name: `${topic.topic_name} (Part ${partNum})`,
        time_budget_hours: Math.round(chunk * 4) / 4,
        intra_section_dependencies:
          partNum === 1
            ? topic.intra_section_dependencies || []
            : [`${topic.topic_id}_p${partNum - 1}`],
      });
      remaining = Math.round((remaining - chunk) * 100) / 100;
      partNum += 1;
    }
  }
  return result;
}

function smoothDaySkeleton(days, studyHoursPerDay, recommendedHours, planMode) {
  const softTarget = planMode === 'hardcore' ? recommendedHours : studyHoursPerDay;
  const lowerBound = softTarget * 0.5;
  const upperBound = softTarget * 1.5;

  const topicDayIndex = new Map();
  days.forEach((day, di) => {
    (day.topics || []).forEach((t) => topicDayIndex.set(t.topic_id, di));
  });

  const canMoveToDay = (topic, targetDayIndex) =>
    (topic.intra_section_dependencies || []).every((depId) => {
      const depIdx = topicDayIndex.get(depId);
      return depIdx === undefined || depIdx < targetDayIndex;
    });

  for (let pass = 0; pass < 2; pass += 1) {
    const indices =
      pass === 0
        ? Array.from({ length: Math.max(0, days.length - 1) }, (_, i) => i)
        : Array.from({ length: Math.max(0, days.length - 1) }, (_, i) => days.length - 2 - i);

    for (const i of indices) {
      const dayA = days[i];
      const dayB = days[i + 1];
      if (!dayA || !dayB || dayA.is_review || dayB.is_review) continue;

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

  days.forEach((day) => {
    if (!day.is_review) {
      day.total_hours =
        Math.round((day.topics || []).reduce((s, t) => s + (t.hours_this_day || 0), 0) * 10) / 10;
    }
  });
  return days;
}

function buildDaySkeleton(manifest, daysLeft, studyHoursPerDay, planMode, startDate, recommendedHours) {
  const config = SCHEDULING_CONFIG[planMode] || SCHEDULING_CONFIG.default;
  const dailyCap =
    config.cap_daily_hours === 'recommended'
      ? Math.max(studyHoursPerDay, recommendedHours ?? studyHoursPerDay)
      : config.cap_daily_hours
      ? studyHoursPerDay
      : 24;

  const phaseOrder = { early: 0, mid: 1, late: 2 };
  const phaseGrouped = [...manifest.sections].sort(
    (a, b) => (phaseOrder[a.suggested_phase] ?? 1) - (phaseOrder[b.suggested_phase] ?? 1)
  );
  const cleanSections = breakCycles(phaseGrouped, 'section_id', 'inter_section_dependencies', 'exam_weight_percent');
  const sortedSections = topoSort(cleanSections, 'section_id', 'inter_section_dependencies');

  let orderedTopics = [];
  for (const section of sortedSections) {
    const sectionTopics = manifest.topics.filter(
      (t) => t.section_id === section.section_id && t.status !== 'skip'
    );
    const cleanTopics = breakCycles(sectionTopics, 'topic_id', 'intra_section_dependencies', 'exam_relevance');
    const sortedTopics = topoSort(cleanTopics, 'topic_id', 'intra_section_dependencies');
    orderedTopics.push(...sortedTopics);
  }

  orderedTopics = presplitTopics(orderedTopics, dailyCap);

  const days = [];
  let topicIdx = 0;
  let topicHoursUsed = 0;

  for (let d = 1; d <= daysLeft; d += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d - 1);
    const dateStr = currentDate.toISOString().split('T')[0];

    if (topicIdx >= orderedTopics.length) {
      days.push({
        day: d,
        date: dateStr,
        topics: [],
        total_hours: Math.min(1.5, studyHoursPerDay),
        is_review: true,
      });
      continue;
    }

    const day = { day: d, date: dateStr, topics: [], total_hours: 0, is_review: false };

    while (topicIdx < orderedTopics.length) {
      const topic = orderedTopics[topicIdx];
      const topicRemaining = parseFloat((topic.time_budget_hours - topicHoursUsed).toFixed(2));
      const dayRemaining = parseFloat((dailyCap - day.total_hours).toFixed(2));

      if (dayRemaining < 0.25) break;

      if (day.topics.length > 0) {
        const dominantSection = day.topics[0].section_id;
        if (topic.section_id !== dominantSection && dayRemaining < dailyCap * 0.45) {
          break;
        }
      }

      if (topicRemaining <= dayRemaining + 0.25) {
        const hoursScheduled = Math.round(topicRemaining * 4) / 4;
        day.topics.push({ ...topic, hours_this_day: hoursScheduled });
        day.total_hours = parseFloat((day.total_hours + topicRemaining).toFixed(2));
        topicIdx += 1;
        topicHoursUsed = 0;
      } else if (config.overflow === 'extend_day') {
        const hoursScheduled = Math.round(topicRemaining * 4) / 4;
        day.topics.push({ ...topic, hours_this_day: hoursScheduled });
        day.total_hours = parseFloat((day.total_hours + topicRemaining).toFixed(2));
        topicIdx += 1;
        topicHoursUsed = 0;
        break;
      } else if (day.topics.length === 0 || config.overflow === 'compress') {
        const hoursScheduled = Math.round(dayRemaining * 4) / 4;
        day.topics.push({ ...topic, hours_this_day: hoursScheduled });
        day.total_hours = parseFloat((day.total_hours + dayRemaining).toFixed(2));
        topicHoursUsed = parseFloat((topicHoursUsed + dayRemaining).toFixed(2));
        break;
      } else {
        break;
      }
    }

    day.total_hours = Math.round(day.total_hours * 10) / 10;
    days.push(day);
  }

  return smoothDaySkeleton(days, studyHoursPerDay, recommendedHours ?? studyHoursPerDay, planMode);
}

function synthesizeStrategy(manifest, studyHoursPerDay, daysLeft) {
  const all = manifest.topics;
  const active = all.filter((t) => t.status !== 'skip');
  const core = all.filter((t) => t.status === 'core');
  const standard = all.filter((t) => t.status === 'standard');
  const condensed = all.filter((t) => t.status === 'condensed');
  const skipped = all.filter((t) => t.status === 'skip');

  const totalHoursNeeded = active.reduce((sum, t) => sum + (t.time_budget_hours || 0), 0);
  const rawRecommended = totalHoursNeeded / Math.max(1, daysLeft);
  const recommended = Math.min(
    24,
    Math.max(studyHoursPerDay, Math.round(rawRecommended * 10) / 10)
  );
  const coverage = all.length > 0 ? Math.round((active.length / all.length) * 100) : 100;

  const emphasized = [
    ...core,
    ...standard.filter((t) => t.exam_relevance === 'High'),
  ].map((t) => ({
    topic: t.topic_name,
    justification: t.notes || `${t.difficulty} difficulty · ${t.exam_relevance} exam relevance`,
  }));

  return {
    estimated_coverage: coverage,
    recommended_study_hours_per_day: recommended,
    emphasized_topics: emphasized,
    deprioritized_topics: condensed.map((t) => ({
      topic: t.topic_name,
      justification: t.notes || 'Condensed format — lower ROI relative to time cost',
    })),
    skipped_topics: skipped.map((t) => ({
      topic: t.topic_name,
      justification:
        t.notes || 'Skipped — disproportionate time investment for likely exam return',
    })),
  };
}

function buildPhase1aPrompt(syllabus, examName, daysLeft, studyHoursPerDay, planMode) {
  const modeContext = {
    default: 'BALANCED MODE: Identify sections and flag their ROI.',
    hardcore: 'HARDCORE MODE: Cover all sections thoroughly; flag nothing skippable.',
    sprint: 'SPRINT MODE: Highlight highest-yield sections aggressively.',
    revision: 'REVISION MODE: Quick refresher focus across all units.',
    skill: 'SKILL BUILDER MODE: Practical/hands-on backbone first.',
  };

  return `You are an academic architect. Decompose the syllabus into its natural sections and assign strategic metadata. Do NOT plan daily tasks.

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
      "raw_topics": ["exact topic 1", "exact topic 2"],
      "exam_weight_percent": 20,
      "suggested_phase": "early",
      "inter_section_dependencies": [],
      "section_notes": "One sentence: why this phase and weight"
    }
  ]
}

RULES:
- section_id must be sequential (s1, s2, ...)
- suggested_phase: ONLY "early", "mid", or "late"
- Include every syllabus topic cleanly in raw_topics.`;
}

function buildPhase1bPrompt(section, allSections, examName, planMode, totalAvailableHours) {
  const siblingContext = allSections
    .filter((s) => s.section_id !== section.section_id)
    .map((s) => `  • ${s.section_id}: ${s.section_name} (${s.exam_weight_percent}% of exam)`)
    .join('\n');

  return `Enrich topics for ONE section of "${examName}". Mode: "${planMode}". Total study hours: ${totalAvailableHours}h.

SECTION: "${section.section_name}" (${section.exam_weight_percent}% weight)
OTHER SECTIONS:
${siblingContext || '(none)'}

TOPICS TO ENRICH:
${(section.raw_topics || []).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

Return ONLY valid JSON:
{
  "section_id": "${section.section_id}",
  "enriched_topics": [
    {
      "topic_id": "${section.section_id}_t1",
      "topic_name": "Exact topic name",
      "time_budget_hours": 2.0,
      "status": "core",
      "difficulty": "Medium",
      "exam_relevance": "High",
      "intra_section_dependencies": [],
      "notes": "One-sentence classification justification"
    }
  ]
}`;
}

function normalizeEnrichedSection(enrichedSection, fallbackSectionId) {
  const sectionId = enrichedSection?.section_id || fallbackSectionId;
  const topics = Array.isArray(enrichedSection?.enriched_topics)
    ? enrichedSection.enriched_topics
    : [];
  const idMap = new Map();

  topics.forEach((t, i) => {
    const canonical = `${sectionId}_t${i + 1}`;
    idMap.set(t.topic_id, canonical);
    t.topic_id = canonical;
  });

  topics.forEach((t) => {
    t.intra_section_dependencies = (t.intra_section_dependencies || [])
      .map((depId) => idMap.get(depId) || depId)
      .filter((depId) => depId !== t.topic_id);
    t.time_budget_hours = parseFloat(t.time_budget_hours) || 1.5;
  });

  return { section_id: sectionId, enriched_topics: topics };
}

function getCommunicatorPrompt(planMode, strategyData, studyHoursPerDay, examName, userRequest) {
  return `${KalPad_Constitution}
Write a sharp, honest, empathetic "overall_approach" paragraph for a student preparing for "${examName}" (${planMode} mode).
Recommended Pace: ${strategyData.recommended_study_hours_per_day}h/day | Requested: ${studyHoursPerDay}h/day | Est. Coverage: ${strategyData.estimated_coverage}%.
Focus Topics: ${JSON.stringify(strategyData.emphasized_topics.slice(0, 6).map((t) => t.topic))}
Skipped Topics: ${JSON.stringify(strategyData.skipped_topics.slice(0, 5).map((t) => t.topic))}
User Request: "${userRequest || 'None'}"

Return ONLY a single valid JSON object:
{ "overall_approach": "<your narrative paragraph>", "user_request": "<detected request or empty string>" }`;
}

function buildPhase3Prompt(weekSkeleton, examName, strategy, planMode) {
  const weekSkeletonStr = weekSkeleton
    .map((d) => {
      if (d.is_review) return `Day ${d.day} (${d.date}) [${d.total_hours}h]: REVIEW & CONSOLIDATION DAY`;
      const topicList = d.topics.map((t) => `${t.topic_name} (${t.hours_this_day}h)`).join(', ');
      return `Day ${d.day} (${d.date}) [${d.total_hours}h]: ${topicList}`;
    })
    .join('\n');

  const firstDay = weekSkeleton[0]?.day ?? 1;
  const lastDay = weekSkeleton[weekSkeleton.length - 1]?.day ?? firstDay;

  return `${KalPad_Constitution}

You are the Weekly Task Writer for "${examName}" (${planMode} mode).
THE SCHEDULE BELOW IS FIXED:
${weekSkeletonStr}

OVERALL STRATEGY: "${strategy.overall_approach}"

Mandatory: Every sub_topic text MUST begin with time in parentheses e.g. "(45 min) ..." and spell out concepts cleanly.

Return ONLY valid JSON:
{
  "weekly_plan": [
    {
      "day": <day number>,
      "date": "<YYYY-MM-DD>",
      "topic_name": "<Primary topic name (Xh)>",
      "study_hours": <number>,
      "importance": <1-10>,
      "day_difficulty": "<Easy|Medium|Hard|Intense>",
      "day_summary": "One sentence goal for today.",
      "sub_topics": [
        {
          "text": "(45 min) Specific actionable task.",
          "completed": false,
          "difficulty": "<Easy|Medium|Hard>",
          "type": "Concept"
        }
      ]
    }
  ]
}

Generate exactly ${weekSkeleton.length} day objects for days ${firstDay} through ${lastDay}.`;
}

/**
 * Runs a full streaming study plan generation in the browser via ChatGPT BYOK quota.
 * Emits events matching KalPad's legacy stream contract: { type: 'status'|'strategy'|'plan_topic'|'error', data }.
 */
export async function generatePlanBYOK({
  examName,
  syllabus,
  examDate,
  studyHoursPerDay = 3,
  planMode = 'default',
  isGuest = false,
  onEvent,
  signal,
}) {
  const todayCheck = new Date();
  const examDateObj = new Date(examDate);
  const diffDays = Math.ceil(Math.abs(examDateObj - todayCheck) / (1000 * 60 * 60 * 24));
  if (isGuest && diffDays > 8) {
    throw new Error('Guest plans are limited to 1 week. Please sign up for longer plans.');
  }

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('planModel', { accessToken: token });

  const callJson = async (prompt) => {
    const raw = await generateText({
      accessToken: token,
      model,
      prompt,
      developerInstructions: 'Return strictly valid JSON matching the requested schema.',
      signal,
    });
    return parseAiJson(raw);
  };

  onEvent?.({
    type: 'status',
    data: { message: `Initializing planner on ${model}...` },
  });

  const today = new Date();
  const startDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - today) / (1000 * 60 * 60 * 24)));
  const totalHours = daysLeft * studyHoursPerDay;

  onEvent?.({ type: 'status', data: { message: 'Analyzing syllabus structure...' } });

  let sections = [];
  try {
    const phase1aData = await callJson(
      buildPhase1aPrompt(syllabus, examName, daysLeft, studyHoursPerDay, planMode)
    );
    sections = Array.isArray(phase1aData?.sections) ? phase1aData.sections : [];
  } catch (err) {
    if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') throw err;
  }

  if (sections.length === 0) {
    const fallbackLines = syllabus
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 12);
    sections = [
      {
        section_id: 's1',
        section_name: examName || 'Core Syllabus',
        raw_topics: fallbackLines.length > 0 ? fallbackLines : [examName || 'Core Concepts'],
        exam_weight_percent: 100,
        suggested_phase: 'early',
        inter_section_dependencies: [],
        section_notes: 'Direct decomposition',
      },
    ];
  }

  onEvent?.({
    type: 'status',
    data: { message: `Identified ${sections.length} section(s). Weighing exam ROI...` },
  });

  const enrichedSections = await mapWithConcurrency(sections, 3, async (section) => {
    try {
      const enriched = await callJson(
        buildPhase1bPrompt(section, sections, examName, planMode, totalHours)
      );
      return normalizeEnrichedSection(enriched, section.section_id);
    } catch (err) {
      if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') throw err;
      return normalizeEnrichedSection(
        {
          section_id: section.section_id,
          enriched_topics: (section.raw_topics || []).map((t, idx) => ({
            topic_id: `${section.section_id}_t${idx + 1}`,
            topic_name: t,
            time_budget_hours: 2.0,
            status: 'standard',
            difficulty: 'Medium',
            exam_relevance: 'Medium',
            intra_section_dependencies: [],
            notes: 'Standard priority',
          })),
        },
        section.section_id
      );
    }
  });

  const manifest = {
    sections,
    topics: enrichedSections.flatMap((es) =>
      es.enriched_topics.map((t) => ({ ...t, section_id: es.section_id }))
    ),
  };

  const strategyData = synthesizeStrategy(manifest, studyHoursPerDay, daysLeft);

  onEvent?.({ type: 'status', data: { message: 'Finalizing study strategy...' } });
  let communicatorData = { overall_approach: 'Personalized study roadmap ready.', user_request: '' };
  try {
    communicatorData = await callJson(
      getCommunicatorPrompt(planMode, strategyData, studyHoursPerDay, examName, '')
    );
  } catch (err) {
    if (err?.isUsageLimit) throw err;
  }

  const strategy = {
    ...strategyData,
    overall_approach: communicatorData?.overall_approach || 'Here is your personalized study plan.',
    user_request: communicatorData?.user_request || '',
  };

  onEvent?.({ type: 'strategy', data: strategy });

  const skeleton = buildDaySkeleton(
    manifest,
    daysLeft,
    studyHoursPerDay,
    planMode,
    startDate,
    strategy.recommended_study_hours_per_day
  );

  for (let w = 0; w < skeleton.length; w += 7) {
    const weekSkeleton = skeleton.slice(w, w + 7);
    const weekNumber = Math.floor(w / 7) + 1;
    onEvent?.({ type: 'status', data: { message: `Scheduling Week ${weekNumber}...` } });

    try {
      const weekObj = await callJson(buildPhase3Prompt(weekSkeleton, examName, strategy, planMode));
      const weekPlan = Array.isArray(weekObj?.weekly_plan) ? weekObj.weekly_plan : [];

      for (const dayPlan of weekPlan) {
        const skel = weekSkeleton.find((d) => d.day === dayPlan.day);
        if (skel) {
          dayPlan.date = skel.date;
          dayPlan.day = skel.day;
        }
        onEvent?.({ type: 'plan_topic', data: dayPlan });
      }
    } catch (err) {
      if (err?.isUsageLimit || err?.code === 'BYOK_NOT_CONNECTED') throw err;
      for (const skel of weekSkeleton) {
        onEvent?.({
          type: 'plan_topic',
          data: {
            day: skel.day,
            date: skel.date,
            topic_name:
              skel.topics.map((t) => `${t.topic_name} (${t.hours_this_day}h)`).join(' + ') ||
              'Review & Active Recall',
            study_hours: skel.total_hours,
            importance: 7,
            day_difficulty: 'Medium',
            day_summary: 'Master scheduled syllabus topics cleanly.',
            sub_topics:
              skel.topics.length > 0
                ? skel.topics.map((t) => ({
                    text: `(${Math.max(30, Math.round(t.hours_this_day * 60))} min) Study ${t.topic_name} with worked examples and active recall.`,
                    completed: false,
                    difficulty: t.difficulty || 'Medium',
                    type: 'Concept',
                  }))
                : [
                    {
                      text: '(60 min) Timed active recall of completed concepts and weak spots.',
                      completed: false,
                      difficulty: 'Medium',
                      type: 'Summary',
                    },
                  ],
          },
        });
      }
    }
  }
}

function analyzeUserPerformance(planTopics = [], userDeclaredHours = 4) {
  let totalPlannedHours = 0;
  let totalCompletedSubTopics = 0;
  let totalPlannedSubTopics = 0;
  const today = new Date();

  planTopics.forEach((day) => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    if (dayDate < today && day.sub_topics) {
      totalPlannedHours += day.study_hours || userDeclaredHours;
      totalPlannedSubTopics += day.sub_topics.length;
      totalCompletedSubTopics += day.sub_topics.filter((s) => s.completed).length;
    }
  });

  if (totalPlannedSubTopics === 0) {
    return {
      analysisSummary:
        "Not enough past performance data to analyze. Sticking to the user's declared pace.",
      realistic_hours_per_day: userDeclaredHours,
    };
  }

  const completionRate = totalCompletedSubTopics / totalPlannedSubTopics;
  const daysAnalyzed = planTopics.filter((d) => new Date(d.date) < today).length || 1;
  const avgPlannedHours = totalPlannedHours / daysAnalyzed;
  const realisticHours = Math.max(1, Math.min(Math.round(avgPlannedHours * completionRate), 8));
  return {
    analysisSummary: `User declared ${userDeclaredHours}h/day. Completion rate ${Math.round(completionRate * 100)}% over ${daysAnalyzed} past day(s) indicates a realistic pace of ${realisticHours}h/day.`,
    realistic_hours_per_day: realisticHours,
  };
}

/**
 * Runs adaptive plan regeneration in the browser via ChatGPT BYOK quota.
 */
export async function regeneratePlanBYOK({
  planId,
  userFeedback = '',
  userDeclaredHours = 4,
  onEvent,
  signal,
}) {
  if (!planId) throw new Error('Plan ID is required.');

  const token = await ensureByokConnected();
  const model = await resolveModelForTask('planModel', { accessToken: token });

  const callJson = async (prompt) => {
    const raw = await generateText({
      accessToken: token,
      model,
      prompt,
      developerInstructions: 'Return strictly valid JSON.',
      signal,
    });
    return parseAiJson(raw);
  };

  onEvent?.({ type: 'status', data: { message: 'Analyzing study progress...' } });

  const { data: existingPlan, error: fetchError } = await supabase
    .from('study_plans')
    .select('*, plan_topics(*, quiz_sessions(score, created_at))')
    .eq('id', planId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch existing plan: ${fetchError.message}`);
  }

  const today = new Date();
  const startDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  const examDateObj = new Date(existingPlan.exam_date);
  const daysLeft = Math.max(1, Math.ceil((examDateObj - today) / (1000 * 60 * 60 * 24)));

  const completedTopics = [];
  const incompletePastTopics = [];
  (existingPlan.plan_topics || []).forEach((day) => {
    const dayDate = new Date(day.date);
    if (dayDate < today && day.sub_topics) {
      day.sub_topics.forEach((sub) => {
        if (sub.completed) completedTopics.push(sub.text);
        else incompletePastTopics.push(sub.text);
      });
    }
  });

  const performanceData = (existingPlan.plan_topics || [])
    .filter((t) => t.quiz_sessions && t.quiz_sessions.length > 0)
    .map((t) => {
      const scores = [...t.quiz_sessions]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map((s) => s.score);
      return `Topic "${t.topic_name}" quiz scores: ${scores.join(', ')}`;
    })
    .join('\n');

  const perf = analyzeUserPerformance(existingPlan.plan_topics, userDeclaredHours);

  const triagePrompt = `Analyze this student dossier and output a JSON strategic triage.
- Syllabus: """${existingPlan.syllabus || existingPlan.exam_name}"""
- Days Remaining: ${daysLeft}
- Declared Pace: ${userDeclaredHours}h/day
- Performance Reality: ${perf.analysisSummary}
- Quiz Performance: ${performanceData || 'None yet'}
- Backlog to Reschedule: ${incompletePastTopics.join(', ') || 'None'}
- Student Feedback (Priority): "${userFeedback || 'None'}"

Return ONLY valid JSON:
{
  "estimated_coverage": <integer>,
  "recommended_study_hours_per_day": <integer>,
  "emphasized_topics": [{ "topic": "...", "justification": "..." }],
  "deprioritized_topics": [{ "topic": "...", "justification": "..." }],
  "skipped_topics": [{ "topic": "...", "justification": "..." }]
}`;

  const triageData = await callJson(triagePrompt);

  const communicatorPrompt = `${KalPad_Constitution}
Write ONE motivational, direct strategy paragraph explaining this regenerated plan to the student.
Coverage: ${triageData.estimated_coverage}%, Pace: ${triageData.recommended_study_hours_per_day}h/day.
Student Feedback: "${userFeedback || 'None'}".
Return ONLY JSON: { "overall_approach": "..." }`;

  let overallApproach = 'Updated strategic battle plan tailored to your pace.';
  try {
    const comm = await callJson(communicatorPrompt);
    if (comm?.overall_approach) overallApproach = comm.overall_approach;
  } catch (err) {
    if (err?.isUsageLimit) throw err;
  }

  const strategy = { ...triageData, overall_approach: overallApproach };
  onEvent?.({ type: 'strategy', data: strategy });

  const weeklyPlanPrompt = `${KalPad_Constitution}
Create a week-by-week plan outline for ${daysLeft} days.
Overall Strategy: ${strategy.overall_approach}
Syllabus: """${existingPlan.syllabus || existingPlan.exam_name}"""
Return JSON array of objects: [{ "week": 1, "main_focus_topics": ["..."], "goals": "..." }]`;

  const weeklyPlan = await callJson(weeklyPlanPrompt);
  const weeks = Array.isArray(weeklyPlan) ? weeklyPlan : weeklyPlan?.weeks || [];

  let dayCounter = 0;
  let plannedTopicsList = [...completedTopics];

  for (const weekData of weeks) {
    if (dayCounter >= daysLeft) break;
    const daysInThisWeek = Math.min(7, daysLeft - dayCounter);
    const startDay = dayCounter + 1;

    const batchPrompt = `${KalPad_Constitution}
Schedule days ${startDay} to ${startDay + daysInThisWeek - 1} (~${strategy.recommended_study_hours_per_day}h/day, max ${userDeclaredHours}h/day).
Focus: ${JSON.stringify(strategy.emphasized_topics)}
Exclude skipped: ${JSON.stringify(strategy.skipped_topics)}
Week Goals: "${weekData.goals || ''}" | Week Topics: "${(weekData.main_focus_topics || []).join(', ')}"
Already Planned (do not repeat): "${plannedTopicsList.slice(-15).join(', ') || 'None'}"

Return JSON:
{
  "weekly_plan": [
    {
      "day": ${startDay},
      "date": "YYYY-MM-DD",
      "topic_name": "Session title (Xh)",
      "study_hours": ${userDeclaredHours},
      "importance": 8,
      "day_difficulty": "Medium",
      "day_summary": "One-sentence goal.",
      "sub_topics": [{ "text": "(45 min) Actionable task.", "completed": false, "difficulty": "Medium", "type": "Concept" }]
    }
  ]
}`;

    const weekObj = await callJson(batchPrompt);
    const weekDays = Array.isArray(weekObj?.weekly_plan) ? weekObj.weekly_plan : [];

    for (const dayPlan of weekDays) {
      if (dayCounter >= daysLeft) break;
      dayCounter += 1;
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayCounter - 1);
      dayPlan.date = d.toISOString().split('T')[0];
      dayPlan.day = dayCounter;
      if (dayPlan.topic_name) plannedTopicsList.push(dayPlan.topic_name);
      onEvent?.({ type: 'plan_topic', data: dayPlan });
    }
  }
}
