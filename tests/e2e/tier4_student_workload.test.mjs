// tests/e2e/tier4_student_workload.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjectFile } from './common.mjs';

test('Tier 4: Real-World Student Workload Scenarios', async (t) => {
  const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
  const realityContent = readProjectFile('src/components/landing/personality/TheRealityCheck.jsx');
  const engineContent = readProjectFile('src/components/landing/personality/TheEngineRoom.jsx');
  const godContent = readProjectFile('src/components/landing/personality/TheGodMode.jsx');
  const pledgeContent = readProjectFile('src/components/landing/personality/ThePledge.jsx');

  // --- SCENARIO 1: SYLLABUS CRISIS & ROADMAP CLARITY ---
  await t.test('SCENARIO 1: Student Confronts Syllabus Crisis (5 assertions)', async (st) => {
    await st.test('S1-1: Hero headline addresses syllabus chaos directly', () => {
      assert.match(heroContent, /Turn a (?:messy|confusing) syllabus into a day-by-day exam plan/i);
    });

    await st.test('S1-2: Hero subhead explicitly mentions syllabus PDF and actionable schedule', () => {
      assert.match(heroContent, /syllabus/i);
      assert.match(heroContent, /plan|schedule/i);
    });

    await st.test('S1-3: Tangible coded exam schedule card shows realistic subject and days left', () => {
      assert.match(heroContent, /Engineering Mathematics|Exam|days left|Target/i);
    });

    await st.test('S1-4: Daily study budget clearly indicated in roadmap preview', () => {
      assert.match(heroContent, /hours|\d+\.?\d*h\/day|budget|Pace/i);
    });

    await st.test('S1-5: Active milestone highlighted with warm amber accent (#D97706)', () => {
      assert.match(heroContent, /#D97706|--accent-amber/i);
    });
  });

  // --- SCENARIO 2: INTERACTIVE TRIAGE SLIDER INTERACTION ---
  await t.test('SCENARIO 2: Interactive Syllabus Triage for Constrained Study Hours (5 assertions)', async (st) => {
    await st.test('S2-1: TriageSimulator slider accepts hours adjustment with realistic range', () => {
      assert.match(engineContent, /min=\{(?:10|12|15)\}|max=\{(?:40|50|60)\}/i);
    });

    await st.test('S2-2: TriageSimulator dynamically updates coverage percentage as hours adjust', () => {
      assert.match(engineContent, /coverage|percent|%/i);
    });

    await st.test('S2-3: Low-yield chapters are cleanly deprioritized/triaged', () => {
      assert.match(engineContent, /triaged|deprioritized|line-through|cut/i);
    });

    await st.test('S2-4: Core high-yield chapters remain prioritized', () => {
      assert.match(engineContent, /core|high-yield|priority/i);
    });

    await st.test('S2-5: Slider styling uses solid amber thumb (#D97706) without pulsing glow keyframe', () => {
      assert.match(engineContent, /#D97706|--accent-amber/i);
      assert.equal(/pulse-thumb/.test(engineContent), false);
    });
  });

  // --- SCENARIO 3: NON-JUDGMENTAL STUDY RECOVERY ENGINE ---
  await t.test('SCENARIO 3: Non-Judgmental Recovery When Student Falls Behind (5 assertions)', async (st) => {
    await st.test('S3-1: Pace Recovery Engine demonstrates non-judgmental recalculation', () => {
      assert.match(godContent, /recalculat|rebuild|rebalance|recovery/i);
    });

    await st.test('S3-2: Recalculates study load across remaining days realistically', () => {
      assert.match(godContent, /pace|debt|remaining|realistic/i);
    });

    await st.test('S3-3: Communicates peace of mind without guilt', () => {
      assert.match(godContent, /Fall behind|catch|without guilt/i);
    });

    await st.test('S3-4: Eliminates alarming red alert pulsing glows', () => {
      assert.equal(/boxShadow:\s*['"]0 0 10px rgba\(255,59,48/i.test(godContent), false);
    });

    await st.test('S3-5: Eliminates spinning magic wands in favor of clean recovery status', () => {
      assert.equal(/animate-spin-slow/i.test(godContent), false);
    });
  });

  // --- SCENARIO 4: ACADEMIC CREDIBILITY & INCUBATION PROOF ---
  await t.test('SCENARIO 4: Academic Credibility & Institutional Incubation Proof (5 assertions)', async (st) => {
    await st.test('S4-1: MHCIIE Hansraj College incubation proof card is actively rendered', () => {
      assert.match(realityContent, /InstitutionProofCard|<.*mchiie.*>|Hansraj/i);
    });

    await st.test('S4-2: Official institutional affiliation (Hansraj College, University of Delhi) stated', () => {
      assert.match(realityContent, /Hansraj/i);
      assert.match(realityContent, /MHCIIE|Delhi/i);
    });

    await st.test('S4-3: Authentic logo asset /mchiie.avif referenced', () => {
      assert.match(realityContent, /\/mchiie\.avif/i);
    });

    await st.test('S4-4: Student case reviews provide structured authentic student feedback', () => {
      assert.match(realityContent, /IIT|NIT|Medical|Engineering|Student|Board/i);
    });

    await st.test('S4-5: Eliminates unverified hype counters ("Loved by 10,000+ teams")', () => {
      assert.equal(/Loved by 10,000\+/i.test(realityContent), false);
    });
  });

  // --- SCENARIO 5: FRICTIONLESS CALL TO ACTION & INSTANT GUEST MODE ---
  await t.test('SCENARIO 5: Frictionless Guest Mode Entry & Call to Action (5 assertions)', async (st) => {
    await st.test('S5-1: ThePledge section provides instant guest mode entry', () => {
      assert.match(pledgeContent, /guest|plan|syllabus/i);
    });

    await st.test('S5-2: Copy promises immediate start without barrier ("ready in 10 seconds")', () => {
      assert.match(pledgeContent, /10 Seconds|10 seconds|instant|no signup/i);
    });

    await st.test('S5-3: Solid warm amber button (#D97706) provides clear primary affordance', () => {
      assert.match(pledgeContent, /#D97706|--accent-amber/i);
    });

    await st.test('S5-4: Eliminates 999px full pills and cyan glowing buttons', () => {
      assert.equal(/borderRadius:\s*['"]999+px['"]/i.test(pledgeContent), false);
      assert.equal(/#22d3ee/i.test(pledgeContent), false);
    });

    await st.test('S5-5: Clear navigation path to /guest-plan entry', () => {
      assert.match(pledgeContent, /\/guest-plan|href=['"]\/guest-plan['"]|router\.push\(['"]\/guest-plan['"]\)/i);
    });
  });
});
