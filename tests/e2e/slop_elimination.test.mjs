// tests/e2e/slop_elimination.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readProjectFile, getLandingFiles } from './common.mjs';

test('Slop Elimination Suite', async (t) => {
  const landingFiles = getLandingFiles();

  await t.test('SLOP-01: No banned neon purple hex colors (#BF5AF2 or #5E5CE6) in landing files', () => {
    const violations = [];
    for (const file of landingFiles) {
      const content = readProjectFile(file);
      if (/#BF5AF2/i.test(content) || /#5E5CE6/i.test(content)) {
        violations.push(path.basename(file));
      }
    }
    assert.deepEqual(violations, [], `Banned purple tokens (#BF5AF2 / #5E5CE6) found in: ${violations.join(', ')}`);
  });

  await t.test('SLOP-02: No colored glowing box-shadows in landing page components', () => {
    const violations = [];
    const glowPattern = /box-?shadow:\s*['"]?[^;'"]*(?:0\s+0\s+\d+px|rgba\((?:191,\s*90,\s*242|34,\s*211,\s*238|52,\s*199,\s*89|255,\s*59,\s*48)[^)]*\))/i;
    for (const file of landingFiles) {
      const content = readProjectFile(file);
      if (glowPattern.test(content)) {
        violations.push(path.basename(file));
      }
    }
    assert.deepEqual(violations, [], `Colored glowing box-shadows found in: ${violations.join(', ')}`);
  });

  await t.test('SLOP-03: No uppercase tracked labels (letterSpacing >= 0.1em or tt="uppercase")', () => {
    const violations = [];
    const trackedPattern = /letterSpacing:\s*['"]?(?:0\.[1-9]|1\.)\d*em['"]?|tt=['"]uppercase['"]/i;
    for (const file of landingFiles) {
      const content = readProjectFile(file);
      if (trackedPattern.test(content)) {
        violations.push(path.basename(file));
      }
    }
    assert.deepEqual(violations, [], `Uppercase tracked labels found in: ${violations.join(', ')}`);
  });

  await t.test('SLOP-04: No InfiniteVoid aurora loop or sci-fi starfield in page.js', () => {
    const pageContent = readProjectFile('src/app/page.js');
    assert.equal(
      /InfiniteVoid/.test(pageContent),
      false,
      'src/app/page.js still contains the InfiniteVoid component'
    );
    assert.equal(
      /filter:\s*['"]blur\(100px\)['"]/.test(pageContent),
      false,
      'src/app/page.js still contains 100px blurred aurora wash'
    );
  });

  await t.test('SLOP-05: No FloatingThreat looping chaos threat badges in Hero.jsx', () => {
    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
    assert.equal(
      /FloatingThreat/.test(heroContent),
      false,
      'Hero.jsx still contains FloatingThreat floating badges'
    );
  });

  await t.test('SLOP-06: No pulsing thumb keyframe animation on triage slider in TheEngineRoom.jsx', () => {
    const engineContent = readProjectFile('src/components/landing/personality/TheEngineRoom.jsx');
    assert.equal(
      /pulse-thumb/.test(engineContent),
      false,
      'TheEngineRoom.jsx still contains @keyframes pulse-thumb or pulse-thumb animation'
    );
  });

  await t.test('SLOP-07: No suppressed keyboard focus outlines in src/app/globals.css', () => {
    const cssContent = readProjectFile('src/app/globals.css');
    assert.equal(
      /\*:\s*focus\s*\{\s*outline:\s*none\s*!important/i.test(cssContent),
      false,
      'globals.css must NOT wipe focus with *:focus { outline: none !important; }'
    );
  });

  await t.test('SLOP-08: Focus-visible outline using warm amber (#D97706) is properly defined in globals.css', () => {
    const cssContent = readProjectFile('src/app/globals.css');
    const hasFocusVisible = /:focus-visible/i.test(cssContent) && /#D97706/i.test(cssContent);
    assert.equal(
      hasFocusVisible,
      true,
      'globals.css must define :focus-visible with warm amber #D97706 outline'
    );
  });

  await t.test('SLOP-09: No synthetic film grain / NoiseOverlay in Hero.jsx', () => {
    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
    assert.equal(
      /NoiseOverlay|feTurbulence/i.test(heroContent),
      false,
      'Hero.jsx must not contain NoiseOverlay or feTurbulence film grain'
    );
  });

  await t.test('SLOP-10: No 120vw mouse-tracking volumetric spotlight in Hero.jsx', () => {
    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
    assert.equal(
      /useSpring\(mouseX\)|Volumetric Spotlight/i.test(heroContent),
      false,
      'Hero.jsx must not track mouseX/mouseY for large blurred spotlight'
    );
  });

  await t.test('SLOP-11: No 3D skewed screenshot slicer with fallback placeholder in Hero.jsx', () => {
    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
    assert.equal(
      /ScreenshotSlicer|rotateX:\s*12/i.test(heroContent),
      false,
      'Hero.jsx must not use 3D skewed ScreenshotSlicer'
    );
    assert.equal(
      /\[\s*Replace with \/public\/dashboard-screenshot\.png\s*\]/i.test(heroContent),
      false,
      'Hero.jsx must not show raw fallback placeholder text'
    );
  });

  await t.test('SLOP-12: No 280px giant floating Discord icon in TheRealityCheck.jsx', () => {
    const realityContent = readProjectFile('src/components/landing/personality/TheRealityCheck.jsx');
    assert.equal(
      /IconBrandDiscordFilled.*size=\{280\}/i.test(realityContent) || /IconBrandDiscord.*280/i.test(realityContent),
      false,
      'TheRealityCheck.jsx must not contain 280px floating Discord icon filler'
    );
  });

  await t.test('SLOP-13: No looping animated light beam connector in TheMethodology.jsx', () => {
    const methodContent = readProjectFile('src/components/landing/personality/TheMethodology.jsx');
    assert.equal(
      /ConnectorBeam|animate=\{\{\s*top:\s*\['-\d+%',\s*'\d+%'\]/i.test(methodContent),
      false,
      'TheMethodology.jsx must not contain looping ConnectorBeam animation'
    );
  });

  await t.test('SLOP-14: No spinning magic wand or pulsing red alert in TheGodMode.jsx', () => {
    const godContent = readProjectFile('src/components/landing/personality/TheGodMode.jsx');
    assert.equal(
      /IconWand.*animate-spin-slow|animate-spin-slow.*IconWand/i.test(godContent),
      false,
      'TheGodMode.jsx must not have spinning magic wand'
    );
    assert.equal(
      /animate-pulse.*255,\s*59,\s*48/i.test(godContent),
      false,
      'TheGodMode.jsx must not have pulsing red alert glow'
    );
  });

  await t.test('SLOP-15: No 9999px full pills on primary buttons in Navbar and Hero', () => {
    const navContent = readProjectFile('src/components/landing/Navbar.jsx');
    const heroContent = readProjectFile('src/components/landing/personality/Hero.jsx');
    assert.equal(
      /borderRadius:\s*['"]999+px['"]|radius=['"]xl['"]/i.test(navContent),
      false,
      'Navbar buttons must use disciplined radius (8px or 10px), not 9999px pills or radius="xl"'
    );
    assert.equal(
      /borderRadius:\s*['"]999+px['"]|radius=['"]xl['"]/i.test(heroContent),
      false,
      'Hero buttons must use disciplined radius (8px or 10px), not 9999px pills or radius="xl"'
    );
  });

  await t.test('SLOP-16: No neon cyan pill button with heavy cyan glow in ThePledge.jsx', () => {
    const pledgeContent = readProjectFile('src/components/landing/personality/ThePledge.jsx');
    assert.equal(
      /#22d3ee|rgba\(34,\s*211,\s*238/i.test(pledgeContent),
      false,
      'ThePledge.jsx must not use neon cyan button or cyan glowing box-shadow'
    );
  });

  await t.test('SLOP-17: No infinite repeating loops (repeat: Infinity) in landing motion definitions', () => {
    const violations = [];
    for (const file of landingFiles) {
      // Allow only harmless marquee if specifically configured, but landing components should have zero infinite loops
      const content = readProjectFile(file);
      if (/repeat:\s*Infinity/i.test(content)) {
        violations.push(path.basename(file));
      }
    }
    assert.deepEqual(violations, [], `Infinite repeating animation loops (repeat: Infinity) found in: ${violations.join(', ')}`);
  });

  await t.test('SLOP-18: No sparkles icon or emoji badges in TheBlueprint.jsx', () => {
    const blueprintContent = readProjectFile('src/components/landing/personality/TheBlueprint.jsx');
    assert.equal(
      /IconSparkles|✨/i.test(blueprintContent),
      false,
      'TheBlueprint.jsx must not contain sparkle icons or sparkle emoji badges'
    );
  });

  await t.test('SLOP-19: No heavy 900-weight display headlines with purple drop-shadows', () => {
    const violations = [];
    const headlineShadowPattern = /text-?shadow:\s*['"]?[^;'"]*rgba\(191,\s*90,\s*242/i;
    for (const file of landingFiles) {
      const content = readProjectFile(file);
      if (headlineShadowPattern.test(content) || /fontWeight:\s*['"]?900['"]?.*purple/i.test(content)) {
        violations.push(path.basename(file));
      }
    }
    assert.deepEqual(violations, [], `Headlines with purple drop shadows found in: ${violations.join(', ')}`);
  });

  await t.test('SLOP-20: No hand-drawn doodle SVG paths in TheGodMode.jsx', () => {
    const godContent = readProjectFile('src/components/landing/personality/TheGodMode.jsx');
    assert.equal(
      /OrganicCircle/i.test(godContent),
      false,
      'TheGodMode.jsx must not contain OrganicCircle hand-drawn doodles'
    );
  });
});
