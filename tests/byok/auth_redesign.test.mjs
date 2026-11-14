// tests/byok/auth_redesign.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/srijal/Desktop/kalpad-mvp';

test('Auth Pages Split-Screen Redesign Suite', async (t) => {
  await t.test('KalPadAuthLayout has split-screen showcasePanel and formPanel', () => {
    const layoutContent = fs.readFileSync(
      path.join(ROOT, 'src/components/auth/KalPadAuthLayout.jsx'),
      'utf8'
    );
    assert.match(layoutContent, /styles\.showcasePanel/, 'Must render desktop showcase panel');
    assert.match(layoutContent, /styles\.formPanel/, 'Must render form panel');
    assert.match(layoutContent, /styles\.formCard/, 'Must render centered form card');
    assert.match(layoutContent, /styles\.modeToggle/, 'Must render segmented sign in / sign up toggle');
    assert.match(layoutContent, /HandwrittenHighlight/, 'Must render handwritten accent highlight');
    assert.match(layoutContent, /IllustrationPlaceholder/, 'Must render IllustrationPlaceholder');
  });

  await t.test('Showcase prompts contain rich, detailed editorial line-art instructions', () => {
    const layoutContent = fs.readFileSync(
      path.join(ROOT, 'src/components/auth/KalPadAuthLayout.jsx'),
      'utf8'
    );
    // Sign In Prompt Checks
    assert.match(layoutContent, /sign-in-scholar-nook/, 'Must have sign in placeholder id');
    assert.match(layoutContent, /Sign In Hero: The Returning Scholar/, 'Must have sign in title');
    assert.match(layoutContent, /steaming ceramic mug of tea/, 'Prompt must mention cozy desk details');
    assert.match(layoutContent, /#F4B942/, 'Prompt must specify honey yellow color');

    // Sign Up Prompt Checks
    assert.match(layoutContent, /sign-up-roadmap-desk/, 'Must have sign up placeholder id');
    assert.match(layoutContent, /Sign Up Hero: The Master Study Blueprint/, 'Must have sign up title');
    assert.match(layoutContent, /unrolling a large glowing master study plan roadmap/, 'Prompt must mention unrolling roadmap');
  });

  await t.test('CSS Module contains responsive rules for mobile and desktop', () => {
    const cssContent = fs.readFileSync(
      path.join(ROOT, 'src/components/auth/KalPadAuthLayout.module.css'),
      'utf8'
    );
    assert.match(cssContent, /@media\s*\(max-width:\s*992px\)\s*\{\s*\.showcasePanel\s*\{\s*display:\s*none/i, 'Showcase panel must be hidden on tablet/mobile');
    assert.match(cssContent, /\.mobileTopNav/, 'Must have mobile top nav');
    assert.match(cssContent, /background:\s*linear-gradient\(145deg,\s*#F4B942/, 'Must have honey yellow warm background');
  });

  await t.test('Sign in and Sign up pages wrap with KalPadAuthLayout', () => {
    const signInContent = fs.readFileSync(path.join(ROOT, 'src/app/sign-in/page.js'), 'utf8');
    assert.match(signInContent, /<KalPadAuthLayout[\s\S]*?mode="sign-in"/, 'Sign In page must use KalPadAuthLayout mode sign-in');

    const signUpContent = fs.readFileSync(path.join(ROOT, 'src/app/sign-up/page.js'), 'utf8');
    assert.match(signUpContent, /<KalPadAuthLayout[\s\S]*?mode="sign-up"/, 'Sign Up page must use KalPadAuthLayout mode sign-up');
  });

  await t.test('Images sign-in.png and sign-up.png are embedded and exist in public folder', () => {
    const layoutContent = fs.readFileSync(
      path.join(ROOT, 'src/components/auth/KalPadAuthLayout.jsx'),
      'utf8'
    );
    assert.match(layoutContent, /\/sign-in\.png/, 'Must embed /sign-in.png');
    assert.match(layoutContent, /\/sign-up\.png/, 'Must embed /sign-up.png');
    assert.ok(fs.existsSync(path.join(ROOT, 'public/sign-in.png')), 'public/sign-in.png must exist');
    assert.ok(fs.existsSync(path.join(ROOT, 'public/sign-up.png')), 'public/sign-up.png must exist');
  });
});
