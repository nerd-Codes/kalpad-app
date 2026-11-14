// tests/e2e/tier1_feature_coverage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjectFile, fileExists } from './common.mjs';

test('Tier 1: Feature Coverage (8 Core Sections)', async (t) => {
  const pageContent = readProjectFile('src/app/page.js');

  // --- SECTION 1: NAVBAR ---
  await t.test('T1-NAV: Navbar structure and unslop compliance (6 assertions)', async (nt) => {
    await nt.test('T1-NAV-1: Navbar file exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/Navbar.jsx'), true);
      assert.match(pageContent, /<Navbar\s*\/>/);
    });

    const navContent = readProjectFile('src/components/landing/Navbar.jsx');

    await nt.test('T1-NAV-2: Fixed top bar positioning with standard 56px height', () => {
      const has56Height = /height:\s*['"]?56px?['"]?|h-14|56/.test(navContent);
      assert.equal(has56Height, true, 'Navbar should specify 56px height for quiet fixed bar');
      assert.match(navContent, /position:\s*['"]fixed['"]/);
    });

    await nt.test('T1-NAV-3: Background uses graphite deepest tone (#0f0f10)', () => {
      const hasGraphiteDeep = /#0f0f10|--apple-deepest/i.test(navContent);
      assert.equal(hasGraphiteDeep, true, 'Navbar background must use graphite deepest surface');
    });

    await nt.test('T1-NAV-4: Primary action button styled with warm amber (#D97706)', () => {
      const hasAmberCTA = /#D97706|--accent-amber/i.test(navContent);
      assert.equal(hasAmberCTA, true, 'Navbar primary button must use warm amber token');
    });

    await nt.test('T1-NAV-5: Anchor navigation links present for features, how-it-works, and proof', () => {
      assert.match(navContent, /#features/i);
      assert.match(navContent, /#how-it-works/i);
      assert.match(navContent, /#proof/i);
    });

    await nt.test('T1-NAV-6: Quiet Sign in text link without competing button styling', () => {
      assert.match(navContent, /Sign in/i);
      // Ensure cyan pill button is not competing in navbar
      assert.equal(/color=['"]cyan['"]/i.test(navContent), false);
    });
  });

  // --- SECTION 2: HERO ---
  await t.test('T1-HERO: Hero section and roadmap ledger (6 assertions)', async (ht) => {
    await ht.test('T1-HERO-1: Hero component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/Hero.jsx'), true);
      assert.match(pageContent, /<Hero\s*\/>/);
    });

    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');

    await ht.test('T1-HERO-2: Headline promises turning messy syllabus into day-by-day exam plan', () => {
      assert.match(heroContent, /Turn a (?:messy|confusing) syllabus into a day-by-day exam plan/i);
    });

    await ht.test('T1-HERO-3: Subhead communicates syllabus PDF upload and realistic schedule', () => {
      assert.match(heroContent, /syllabus/i);
      assert.match(heroContent, /schedule|plan/i);
    });

    await ht.test('T1-HERO-4: Primary CTA button uses warm amber (#D97706)', () => {
      const hasAmber = /#D97706|--accent-amber/i.test(heroContent);
      assert.equal(hasAmber, true, 'Hero primary CTA button must use warm amber token');
    });

    await ht.test('T1-HERO-5: Tangible coded exam roadmap ledger preview is present', () => {
      // Must contain exam schedule / roadmap concepts (Engineering Mathematics, milestone dates, study budget)
      const hasRoadmapConcept = /roadmap|ledger|milestone|schedule|exam/i.test(heroContent);
      assert.equal(hasRoadmapConcept, true, 'Hero must contain coded roadmap ledger preview');
      assert.match(heroContent, /buffer|Day \d+|hours/i);
    });

    await ht.test('T1-HERO-6: Restrained entrance motion without infinite loops or spring overshoot', () => {
      assert.equal(/repeat:\s*Infinity/i.test(heroContent), false);
      assert.equal(/stiffness:\s*150,\s*damping:\s*15/i.test(heroContent), false);
    });
  });

  // --- SECTION 3: THE REALITY CHECK ---
  await t.test('T1-REALITY: Reality Check & MHCIIE Incubation Proof (6 assertions)', async (rt) => {
    await rt.test('T1-REALITY-1: TheRealityCheck component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/TheRealityCheck.jsx'), true);
      assert.match(pageContent, /<TheRealityCheck\s*\/>/);
    });

    const realityContent = readProjectFile('src/components/landing/personality/TheRealityCheck.jsx');

    await rt.test('T1-REALITY-2: MHCIIE Hansraj College incubation proof card is rendered', () => {
      assert.match(realityContent, /InstitutionProofCard|<.*mchiie.*>|Hansraj/i);
      // Verify InstitutionProofCard is actually invoked in JSX, not orphaned
      const isCardRendered = /<InstitutionProofCard[\s\/>]/i.test(realityContent) || /mchiie\.avif/i.test(realityContent);
      assert.equal(isCardRendered, true, 'MHCIIE incubation proof must be rendered in TheRealityCheck');
    });

    await rt.test('T1-REALITY-3: Mentions official incubation by Hansraj College / MHCIIE', () => {
      assert.match(realityContent, /Hansraj/i);
      assert.match(realityContent, /MHCIIE|Centre for Innovation/i);
    });

    await rt.test('T1-REALITY-4: Structured student case reviews rendered on graphite cards (#19191b)', () => {
      const hasGraphiteCard = /#19191b|--apple-gray-1/i.test(realityContent);
      assert.equal(hasGraphiteCard, true, 'Student reviews must use graphite card surface');
    });

    await rt.test('T1-REALITY-5: Student reviews avoid arbitrary rotational tilts', () => {
      assert.equal(/rotate:\s*[-]?\d+deg|rotate=\{[-]?\d+\}/i.test(realityContent), false);
    });

    await rt.test('T1-REALITY-6: Semantic green indicator without neon glowing box-shadow', () => {
      assert.equal(/boxShadow:\s*['"]0\s+0\s+10px\s+#34C759['"]/i.test(realityContent), false);
    });
  });

  // --- SECTION 4: THE METHODOLOGY ---
  await t.test('T1-METHOD: 3-Step Study Pipeline (6 assertions)', async (mt) => {
    await mt.test('T1-METHOD-1: TheMethodology component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/TheMethodology.jsx'), true);
      assert.match(pageContent, /<TheMethodology\s*\/>/);
    });

    const methodContent = readProjectFile('src/components/landing/personality/TheMethodology.jsx');

    await mt.test('T1-METHOD-2: Presents 3-step study pipeline', () => {
      assert.match(methodContent, /Find What Matters/i);
      assert.match(methodContent, /Make The Plan/i);
      assert.match(methodContent, /You Study/i);
    });

    await mt.test('T1-METHOD-3: Uses unified graphite ramp cards (#19191b)', () => {
      const hasGraphite = /#19191b|--apple-gray-1/i.test(methodContent);
      assert.equal(hasGraphite, true, 'Methodology cards must use graphite neutral surface');
    });

    await mt.test('T1-METHOD-4: Clean hairlines without multi-colored rainbow borders', () => {
      assert.equal(/border:\s*['"]\d+px solid #BF5AF2['"]/i.test(methodContent), false);
      assert.equal(/border:\s*['"]\d+px solid #22d3ee['"]/i.test(methodContent), false);
    });

    await mt.test('T1-METHOD-5: Single warm amber (#D97706) accent on active step indicator', () => {
      const hasAmber = /#D97706|--accent-amber/i.test(methodContent);
      assert.equal(hasAmber, true, 'Active methodology step must use warm amber');
    });

    await mt.test('T1-METHOD-6: Sentence-case section title without purple italic accents', () => {
      assert.equal(/color:\s*['"]#BF5AF2['"]/i.test(methodContent), false);
      assert.match(methodContent, /How (?:KalPad )?works/i);
    });
  });

  // --- SECTION 5: THE BLUEPRINT ---
  await t.test('T1-BLUEPRINT: High-Yield Topic & Prerequisite Blueprint (6 assertions)', async (bt) => {
    await bt.test('T1-BLUEPRINT-1: TheBlueprint component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/TheBlueprint.jsx'), true);
      assert.match(pageContent, /<TheBlueprint\s*\/>/);
    });

    const blueprintContent = readProjectFile('src/components/landing/personality/TheBlueprint.jsx');

    await bt.test('T1-BLUEPRINT-2: Covers high-yield practice questions and question repetition', () => {
      assert.match(blueprintContent, /high-?yield|repeat/i);
    });

    await bt.test('T1-BLUEPRINT-3: Covers prerequisite dependencies and active recall', () => {
      assert.match(blueprintContent, /prerequisite|recall|foundation/i);
    });

    await bt.test('T1-BLUEPRINT-4: Standardized graphite card surfaces without colored glows', () => {
      assert.equal(/boxShadow:\s*['"]0 0 60px/i.test(blueprintContent), false);
    });

    await bt.test('T1-BLUEPRINT-5: Uses clean line icons inheriting text color', () => {
      assert.match(blueprintContent, /IconTarget|IconCheck|IconGitBranch|IconArrow/i);
    });

    await bt.test('T1-BLUEPRINT-6: Sentence-case subtitles without uppercase tracking', () => {
      assert.equal(/KNOW WHAT TO STUDY FIRST/i.test(blueprintContent), false);
      assert.equal(/PRACTICE WHAT REPEATS/i.test(blueprintContent), false);
    });
  });

  // --- SECTION 6: THE ENGINE ROOM ---
  await t.test('T1-ENGINE: Interactive Syllabus Triage Simulator & Bento (6 assertions)', async (et) => {
    await et.test('T1-ENGINE-1: TheEngineRoom component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/TheEngineRoom.jsx'), true);
      assert.match(pageContent, /<TheEngineRoom\s*\/>/);
    });

    const engineContent = readProjectFile('src/components/landing/personality/TheEngineRoom.jsx');

    await et.test('T1-ENGINE-2: Features interactive TriageSimulator with available hours slider', () => {
      assert.match(engineContent, /TriageSimulator|Slider/i);
      assert.match(engineContent, /hours/i);
    });

    await et.test('T1-ENGINE-3: Slider thumb styled with warm amber (#D97706)', () => {
      const hasAmber = /#D97706|--accent-amber/i.test(engineContent);
      assert.equal(hasAmber, true, 'Slider must use warm amber thumb');
    });

    await et.test('T1-ENGINE-4: Dynamic chapter triage logic differentiates core from deprioritized topics', () => {
      assert.match(engineContent, /triage|deprioritize|core|priority/i);
    });

    await et.test('T1-ENGINE-5: Scientific diagram uses calm textbook palette (amber curve, neutral grid)', () => {
      // Must not use neon multi-color radiation lines
      assert.equal(/stroke=['"]#FF3B30['"].*stroke=['"]#BF5AF2['"]/i.test(engineContent), false);
    });

    await et.test('T1-ENGINE-6: Active recall quiz card explains conceptual traps', () => {
      assert.match(engineContent, /recall|explanation|Planck|question/i);
    });
  });

  // --- SECTION 7: THE GOD MODE ---
  await t.test('T1-GOD: Pace Recovery Engine & Lecture Scout (6 assertions)', async (gt) => {
    await gt.test('T1-GOD-1: TheGodMode component exists and is rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/TheGodMode.jsx'), true);
      assert.match(pageContent, /<TheGodMode\s*\/>/);
    });

    const godContent = readProjectFile('src/components/landing/personality/TheGodMode.jsx');

    await gt.test('T1-GOD-2: Features Pace Recovery Engine demonstrating schedule recalculation', () => {
      assert.match(godContent, /recovery|recalculate|pace|debt/i);
    });

    await gt.test('T1-GOD-3: Non-judgmental messaging reassuring students when study sessions are missed', () => {
      assert.match(godContent, /Fall behind|catch|rebuild|without guilt/i);
    });

    await gt.test('T1-GOD-4: Clean sentence-case headline (weight 500, no uppercase shouting)', () => {
      assert.equal(/FALL BEHIND\. WE'LL CATCH YOU\./.test(godContent), false);
    });

    await gt.test('T1-GOD-5: Avoids spinning wand and pulsing red glow button', () => {
      assert.equal(/IconWand.*animate-spin-slow/i.test(godContent), false);
      assert.equal(/animate-pulse.*255,\s*59,\s*48/i.test(godContent), false);
    });

    await gt.test('T1-GOD-6: Absence of ambient green lighting blur or hand-drawn doodle', () => {
      assert.equal(/filter:\s*['"]blur\(80px\)['"]/i.test(godContent), false);
    });
  });

  // --- SECTION 8: THE PLEDGE & FOOTER ---
  await t.test('T1-PLEDGE: Bottom Pledge & Calm Footer (6 assertions)', async (pt) => {
    await pt.test('T1-PLEDGE-1: ThePledge and Footer components exist and are rendered in page.js', () => {
      assert.equal(fileExists('src/components/landing/personality/ThePledge.jsx'), true);
      assert.equal(fileExists('src/components/landing/Footer.jsx'), true);
      assert.match(pageContent, /<ThePledge\s*\/>/);
      assert.match(pageContent, /<Footer\s*\/>/);
    });

    const pledgeContent = readProjectFile('src/components/landing/personality/ThePledge.jsx');
    const footerContent = readProjectFile('src/components/landing/Footer.jsx');

    await pt.test('T1-PLEDGE-2: Free toolkit pledge card on graphite surface (#19191b)', () => {
      const hasGraphite = /#19191b|--apple-gray-1/i.test(pledgeContent);
      assert.equal(hasGraphite, true, 'Pledge card must use graphite surface');
    });

    await pt.test('T1-PLEDGE-3: Solid warm amber (#D97706) primary CTA button', () => {
      const hasAmber = /#D97706|--accent-amber/i.test(pledgeContent);
      assert.equal(hasAmber, true, 'Pledge primary button must use warm amber');
    });

    await pt.test('T1-PLEDGE-4: Instant guest mode entry copy is sentence-case', () => {
      assert.equal(/INSTANT GUEST MODE/.test(pledgeContent), false);
      assert.match(pledgeContent, /guest mode|start studying/i);
    });

    await pt.test('T1-PLEDGE-5: Calm footer with sentence-case link columns', () => {
      assert.equal(/tt=['"]uppercase['"]/i.test(footerContent), false);
      assert.match(footerContent, /Product|Legal|Support/i);
    });

    await pt.test('T1-PLEDGE-6: Cookie consent banner on graphite surface with amber CTA', () => {
      const cookieContent = readProjectFile('src/components/landing/CookieConsent.jsx');
      assert.equal(/#BF5AF2/i.test(cookieContent), false);
      const hasAmber = /#D97706|--accent-amber/i.test(cookieContent);
      assert.equal(hasAmber, true, 'Cookie consent banner button must use warm amber token');
    });
  });
});
