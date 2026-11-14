// tests/byok/landing_vibe.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/srijal/Desktop/kalpad-mvp';

test('Landing Page Refinements Suite', async (t) => {
  await t.test('Page.js imports and renders the clean unified sections with dark isolation', () => {
    const pageContent = fs.readFileSync(path.join(ROOT, 'src/app/page.js'), 'utf8');
    assert.match(pageContent, /NewHero/, 'Must render NewHero');
    assert.match(pageContent, /MetricsRibbon/, 'Must render MetricsRibbon');
    assert.match(pageContent, /SmartPrecisionSection/, 'Must render SmartPrecisionSection');
    assert.doesNotMatch(pageContent, /FeatureGridSection/, 'Must NOT render duplicate FeatureGridSection');
    assert.match(pageContent, /ProductShowcaseSection/, 'Must render ProductShowcaseSection');
    assert.match(pageContent, /HowItWorksSection/, 'Must render HowItWorksSection');
    assert.match(pageContent, /GetStartedBanner/, 'Must render GetStartedBanner');
    assert.match(pageContent, /MobileShowcaseSection/, 'Must render MobileShowcaseSection');
    assert.match(pageContent, /FaqSection/, 'Must render FaqSection');
    assert.match(pageContent, /data-kalpad-landing="true"/, 'Must isolate landing page with data-kalpad-landing attribute');
    assert.match(pageContent, /forceColorScheme="light"/, 'Must force Mantine light color scheme on landing page');
  });

  await t.test('Headings use HandwrittenHighlight instead of capsule pills', () => {
    const heroContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/NewHero.jsx'), 'utf8');
    assert.doesNotMatch(heroContent, /highlightPillDark/, 'Must NOT use dark capsule pill for Syllabus');
    assert.match(heroContent, /HandwrittenHighlight/, 'Must use HandwrittenHighlight');
    assert.match(heroContent, /Syllabus/, 'Must highlight Syllabus');

    const smartContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/SmartPrecisionSection.jsx'), 'utf8');
    assert.match(smartContent, /HandwrittenHighlight/, 'Smart section must use HandwrittenHighlight');

    const showcaseContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/ProductShowcaseSection.jsx'), 'utf8');
    assert.match(showcaseContent, /HandwrittenHighlight/, 'Showcase must use HandwrittenHighlight');
  });

  await t.test('Headings font is reverted to Plus Jakarta Sans instead of Space Mono', () => {
    const cssContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/LandingVibe.module.css'), 'utf8');
    assert.match(cssContent, /\.heroTitle[\s\S]*?var\(--font-kp-sans/, 'Hero title must use Plus Jakarta Sans');
    assert.match(cssContent, /\.sectionTitle[\s\S]*?var\(--font-kp-sans/, 'Section title must use Plus Jakarta Sans');
  });

  await t.test('Redundant section badges are removed', () => {
    const smartContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/SmartPrecisionSection.jsx'), 'utf8');
    assert.doesNotMatch(smartContent, /The Quiet Study Engine/, 'Must NOT have The Quiet Study Engine badge');

    const showcaseContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/ProductShowcaseSection.jsx'), 'utf8');
    assert.doesNotMatch(showcaseContent, /Real Academic Outputs/, 'Must NOT have Real Academic Outputs badge');

    const howContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/HowItWorksSection.jsx'), 'utf8');
    assert.doesNotMatch(howContent, /Zero Setup Friction/, 'Must NOT have Zero Setup Friction badge');

    const bannerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/GetStartedBanner.jsx'), 'utf8');
    assert.doesNotMatch(bannerContent, /Get Ready to Excel/, 'Must NOT have Get Ready to Excel badge');

    const mobileContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/MobileShowcaseSection.jsx'), 'utf8');
    assert.doesNotMatch(mobileContent, /Anywhere Access/, 'Must NOT have Anywhere Access badge');

    const faqContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/FaqSection.jsx'), 'utf8');
    assert.doesNotMatch(faqContent, /Clear Answers/, 'Must NOT have Clear Answers badge');
  });

  await t.test('Start Free phrase is reserved strictly for Hero and CTA section', () => {
    const heroContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/NewHero.jsx'), 'utf8');
    assert.match(heroContent, /id="hero-start-free-cta"[^>]*>\s*Start Free/, 'Hero button must say Start Free');

    const bannerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/GetStartedBanner.jsx'), 'utf8');
    assert.match(bannerContent, /id="banner-start-free-cta"[^>]*>\s*<span>Start Free<\/span>/, 'Banner button must say Start Free');

    const smartContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/SmartPrecisionSection.jsx'), 'utf8');
    assert.doesNotMatch(smartContent, /Start Free/, 'Smart precision must NOT have duplicate Start Free button');

    const howContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/HowItWorksSection.jsx'), 'utf8');
    assert.doesNotMatch(howContent, /Start Free/, 'How it works must NOT have duplicate Start Free button');

    const showcaseContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/ProductShowcaseSection.jsx'), 'utf8');
    assert.doesNotMatch(showcaseContent, /Start Free/, 'Showcase cards must NOT have duplicate Start Free buttons');

    const navbarContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/Navbar.jsx'), 'utf8');
    assert.doesNotMatch(navbarContent, /Start Free/, 'Navbar must NOT have Start Free button');

    const footerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/Footer.jsx'), 'utf8');
    assert.doesNotMatch(footerContent, /Start Free/, 'Footer must NOT have Start Free link');
  });

  await t.test('Generated transparent image files sit directly without framing boxes', () => {
    const heroContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/NewHero.jsx'), 'utf8');
    assert.match(heroContent, /Multivariable Calculus Study Desk\.png/, 'Hero must embed Multivariable Calculus Study Desk.png');
    assert.doesNotMatch(heroContent, /imageFrameWrapper/, 'Hero must NOT use card frame wrapper');
    assert.match(heroContent, /transparentHeroImg/, 'Hero must use transparentHeroImg');

    const smartContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/SmartPrecisionSection.jsx'), 'utf8');
    assert.match(smartContent, /Cozy Evening Study Nook\.png/, 'Smart section must embed Cozy Evening Study Nook.png');
    assert.doesNotMatch(smartContent, /imageFrameWrapper/, 'Smart section must NOT use card frame wrapper');
    assert.match(smartContent, /transparentSceneImg/, 'Smart section must use transparentSceneImg');

    const howContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/HowItWorksSection.jsx'), 'utf8');
    assert.match(howContent, /Hands Holding Educational Smartphone\.png/, 'How it works must embed Hands Holding Educational Smartphone.png');
    assert.doesNotMatch(howContent, /imageFrameWrapper/, 'How it works must NOT use card frame wrapper');
    assert.match(howContent, /transparentSceneImg/, 'How it works must use transparentSceneImg');

    const bannerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/GetStartedBanner.jsx'), 'utf8');
    assert.match(bannerContent, /Warm Chalkboard Tutoring Scene\.png/, 'Banner must embed Warm Chalkboard Tutoring Scene.png');
    assert.doesNotMatch(bannerContent, /imageFrameWrapper/, 'Banner must NOT use card frame wrapper');
    assert.match(bannerContent, /transparentBannerImg/, 'Banner must use transparentBannerImg');
  });

  await t.test('What KalPad Builds section renders on high-contrast black background', () => {
    const showcaseContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/ProductShowcaseSection.jsx'), 'utf8');
    assert.match(showcaseContent, /darkShowcaseSection/, 'Showcase must have darkShowcaseSection wrapper with black bg');
    assert.match(showcaseContent, /showcaseCardsGrid/, 'Showcase must have 3 cards grid');
    assert.match(showcaseContent, /LatexBlock/, 'Must use LatexBlock component');
    assert.match(showcaseContent, /\\oint/, 'Must pass integral equation to LatexBlock');
  });

  await t.test('Navbar and Footer have clean links and no pricing', () => {
    const navContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/Navbar.jsx'), 'utf8');
    assert.doesNotMatch(navContent, /IconSun|IconMoon/, 'Must NOT have dark mode toggle');
    assert.doesNotMatch(navContent, /IconBook2/, 'Must NOT have icon logo next to KalPad in header');
    assert.match(navContent, /KalPad/, 'Must have pure wordmark');

    const footerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/Footer.jsx'), 'utf8');
    assert.doesNotMatch(footerContent, /\/pricing/, 'Must NOT link to /pricing');
    assert.ok(!fs.existsSync(path.join(ROOT, 'src/app/pricing')), 'src/app/pricing must be deleted');
  });

  await t.test('Hero and CTA section layout enhancements for image alignment and trust badges', () => {
    const cssContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/LandingVibe.module.css'), 'utf8');
    assert.match(cssContent, /\.trustMicroCopy[\s\S]*?@media\s*\(max-width:\s*768px\)[\s\S]*?display:\s*none\s*!important/, 'Trust microcopy must be hidden on mobile');
    assert.match(cssContent, /\.bannerTitle\s*\{[\s\S]*?font-size:\s*clamp\(28px,\s*3\.4vw,\s*42px\)/, 'Banner title font size must equal other section titles');
    assert.match(cssContent, /\.heroSection\s*\{[\s\S]*?padding-bottom:\s*0\s*!important/, 'Hero section must have padding-bottom: 0 for flush image seating');

    const heroContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/NewHero.jsx'), 'utf8');
    assert.match(heroContent, /heroImageWrapper/, 'Hero must use heroImageWrapper');

    const bannerContent = fs.readFileSync(path.join(ROOT, 'src/components/landing/home/GetStartedBanner.jsx'), 'utf8');
    assert.match(bannerContent, /bannerImageCol/, 'Banner must use bannerImageCol');
    assert.match(bannerContent, /bannerContentCol/, 'Banner must use bannerContentCol');
  });
});
