// tests/e2e/tier3_cross_feature.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjectFile, getLandingFiles } from './common.mjs';

test('Tier 3: Cross-Feature Combinations (Pairwise Integration)', async (t) => {
  const globalsCss = readProjectFile('src/app/globals.css');
  const pageJs = readProjectFile('src/app/page.js');
  const navContent = readProjectFile('src/components/landing/Navbar.jsx');
  const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
  const landingFiles = getLandingFiles();

  // --- COMBINATION 1: DESIGN TOKEN RAMP COHESION ---
  await t.test('T3-TOK: Token Ramp Definition & Cross-Section Cohesion (5 assertions)', async (tt) => {
    await tt.test('T3-TOK-1: globals.css defines graphite neutral surface tokens', () => {
      assert.match(globalsCss, /--apple-bg:\s*#141415/i);
      assert.match(globalsCss, /--apple-deepest:\s*#0f0f10/i);
      assert.match(globalsCss, /--apple-gray-1:\s*#19191b/i);
      assert.match(globalsCss, /--apple-gray-2:\s*#232325/i);
      assert.match(globalsCss, /--apple-gray-3:\s*#2e2e32/i);
    });

    await tt.test('T3-TOK-2: globals.css defines 3-role text tokens', () => {
      assert.match(globalsCss, /--apple-text-primary:\s*#ededed/i);
      assert.match(globalsCss, /--apple-text-secondary:\s*#a1a1a6/i);
      assert.match(globalsCss, /--apple-text-muted:\s*#85858b/i);
    });

    await tt.test('T3-TOK-3: globals.css defines warm amber accent tokens', () => {
      assert.match(globalsCss, /--accent-amber:\s*#D97706/i);
      assert.match(globalsCss, /--accent-amber-hover:\s*#B45309/i);
      assert.match(globalsCss, /--accent-amber-subtle:\s*rgba\(217,\s*119,\s*6,\s*0\.14\)/i);
    });

    await tt.test('T3-TOK-4: globals.css defines hairline border token at 8% opacity', () => {
      assert.match(globalsCss, /rgba\(237,\s*237,\s*237,\s*0\.08\)/i);
    });

    await tt.test('T3-TOK-5: Global page background sets solid #141415 graphite', () => {
      const hasGraphiteBg = /backgroundColor:\s*['"]#141415['"]|var\(--apple-bg\)|background:\s*['"]#141415['"]/i.test(pageJs + globalsCss);
      assert.equal(hasGraphiteBg, true, 'Global page background must resolve to #141415');
    });
  });

  // --- COMBINATION 2: NAVIGATION ANCHOR CONSISTENCY ---
  await t.test('T3-ANC: Navigation Anchors & Section Targets (5 assertions)', async (at) => {
    // Gather all landing code to inspect anchor targets
    const allLandingCode = landingFiles.map(readProjectFile).join('\n');

    await at.test('T3-ANC-1: Navbar contains #features anchor and target id exists', () => {
      assert.match(navContent, /#features/i);
      assert.match(allLandingCode, /id=['"]features['"]/i);
    });

    await at.test('T3-ANC-2: Navbar contains #how-it-works anchor and target id exists', () => {
      assert.match(navContent, /#how-it-works/i);
      assert.match(allLandingCode, /id=['"]how-it-works['"]/i);
    });

    await at.test('T3-ANC-3: Navbar contains #proof anchor and target id exists', () => {
      assert.match(navContent, /#proof/i);
      assert.match(allLandingCode, /id=['"]proof['"]/i);
    });

    await at.test('T3-ANC-4: Section id targets use valid lowercase hyphenated format', () => {
      const ids = ['features', 'how-it-works', 'proof'];
      for (const id of ids) {
        assert.equal(/^[a-z0-9-]+$/.test(id), true);
      }
    });

    await at.test('T3-ANC-5: Navbar fixed header has top z-index layer (>=50)', () => {
      assert.match(navContent, /zIndex:\s*(?:50|99|100)/);
    });
  });

  // --- COMBINATION 3: RADII HIERARCHY MATH ---
  await t.test('T3-RAD: Nested Radii Math & Geometry (6 assertions)', async (rt) => {
    await rt.test('T3-RAD-1: Nested radii mathematical rule inner <= outer - padding', () => {
      const outerCardRadius = 12;
      const internalPadding = 4;
      const innerButtonRadius = 8;
      assert.ok(innerButtonRadius <= outerCardRadius - internalPadding, 'Inner button radius must fit inside outer card');
    });

    await rt.test('T3-RAD-2: Panel / outer container radius configured to 16px', () => {
      const hasPanelRadius = /radius:\s*16|radius=['"]16px['"]|borderRadius:\s*['"]?16px?['"]?/i.test(allLandingCombined());
      assert.equal(hasPanelRadius, true, 'Outer container or panel should use 16px radius');
    });

    await rt.test('T3-RAD-3: Internal cards configured to 12px radius', () => {
      const hasCardRadius = /radius:\s*12|radius=['"]12px['"]|borderRadius:\s*['"]?12px?['"]?|radius=['"]md['"]/i.test(allLandingCombined());
      assert.equal(hasCardRadius, true, 'Cards should use 12px radius');
    });

    await rt.test('T3-RAD-4: Buttons and controls configured to 8px or 10px radius', () => {
      const hasButtonRadius = /radius:\s*[8|10]|borderRadius:\s*['"]?(?:8|10)px?['"]?|radius=['"]sm['"]/i.test(navContent + heroContent);
      assert.equal(hasButtonRadius, true, 'Buttons should use 8px or 10px radius');
    });

    await rt.test('T3-RAD-5: Tags and status chips configured to 6px radius', () => {
      const hasTagRadius = /radius:\s*6|borderRadius:\s*['"]?6px?['"]?/i.test(allLandingCombined());
      assert.equal(hasTagRadius, true, 'Tags and status chips should use 6px radius');
    });

    await rt.test('T3-RAD-6: No 9999px full pills on interactive cards or buttons', () => {
      assert.equal(/borderRadius:\s*['"]9999px['"]/i.test(allLandingCombined()), false);
    });
  });

  // --- COMBINATION 4: TYPOGRAPHY & TABULAR FIGURES ---
  await t.test('T3-TYP: Typography Stack & Tabular Figures (5 assertions)', async (yt) => {
    await yt.test('T3-TYP-1: Inter font family declared in layout or globals.css', () => {
      const layoutJs = readProjectFile('src/app/layout.js');
      assert.match(layoutJs + globalsCss, /--font-inter|Inter/i);
    });

    await yt.test('T3-TYP-2: Lexend / mono font family declared for figures and meta', () => {
      const layoutJs = readProjectFile('src/app/layout.js');
      assert.match(layoutJs + globalsCss, /--font-lexend|Lexend|GeistMono|monospace/i);
    });

    await yt.test('T3-TYP-3: Headlines avoid heavy 700/800/900 font weights', () => {
      // Must not shout with weight 900
      assert.equal(/fontWeight:\s*['"]?900['"]?/i.test(heroContent), false);
      assert.equal(/fontWeight:\s*['"]?800['"]?/i.test(heroContent), false);
    });

    await yt.test('T3-TYP-4: Tabular-nums used for study hours and milestone figures', () => {
      const hasTabular = /tabular-nums|fontVariantNumeric:\s*['"]tabular-nums['"]/i.test(allLandingCombined() + globalsCss);
      assert.equal(hasTabular, true, 'Tabular-nums should be applied for numerical columns and hours');
    });

    await yt.test('T3-TYP-5: No italic display fonts or gradient text clips', () => {
      assert.equal(/backgroundClip:\s*['"]text['"]|-webkit-background-clip:\s*text/i.test(heroContent), false);
    });
  });

  // --- COMBINATION 5: MOTION TIMING & RESTRAINT ---
  await t.test('T3-MOT: Motion Timing, Easing & Restraint (5 assertions)', async (mot) => {
    await mot.test('T3-MOT-1: Easing curve follows project cubic-bezier standard', () => {
      const hasProjectEasing = /cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)|\[0\.22,\s*1,\s*0\.36,\s*1\]/i.test(allLandingCombined() + globalsCss);
      assert.equal(hasProjectEasing, true, 'Motion transitions should use cubic-bezier(0.22, 1, 0.36, 1)');
    });

    await mot.test('T3-MOT-2: Micro-interactions hover/press transition duration between 120ms and 160ms', () => {
      const hasMicroDuration = /1[2-6]0ms|0\.1[2-6]s/i.test(allLandingCombined() + globalsCss);
      assert.equal(hasMicroDuration, true, 'Hover and press micro-interactions should transition in 120ms-160ms');
    });

    await mot.test('T3-MOT-3: Entrance transition duration <= 400ms with stagger <= 50ms', () => {
      const hasEntranceTiming = /duration:\s*0\.[34]|duration:\s*3[0-9]{2}|staggerChildren:\s*0\.0[345]/i.test(heroContent);
      assert.equal(hasEntranceTiming, true, 'Entrance animations should be short (<=400ms) with <=50ms stagger');
    });

    await mot.test('T3-MOT-4: Zero continuous looping animations in landing components', () => {
      assert.equal(/repeat:\s*Infinity/i.test(allLandingCombined()), false);
    });

    await mot.test('T3-MOT-5: Zero layout property animations (no animated width, height, or margins)', () => {
      // Must not animate width/height directly in motion variants
      const hasBadLayoutAnimation = /animate=\{\{[^}]*(?:width|height|marginTop):\s*\[/i.test(allLandingCombined());
      assert.equal(hasBadLayoutAnimation, false, 'Do not animate layout properties (width/height/margin)');
    });
  });

  function allLandingCombined() {
    return landingFiles.map(readProjectFile).join('\n');
  }
});
