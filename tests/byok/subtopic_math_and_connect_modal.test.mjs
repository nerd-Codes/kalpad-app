// tests/byok/subtopic_math_and_connect_modal.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/srijal/Desktop/kalpad-mvp';

test('SubTopicMathText Component Contract', async (t) => {
  const filePath = path.join(ROOT, 'src/components/common/SubTopicMathText.jsx');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  await t.test('imports KaTeX and remark-math dependencies', () => {
    assert.match(fileContent, /remarkMath/);
    assert.match(fileContent, /rehypeKatex/);
    assert.match(fileContent, /katex\/dist\/katex\.min\.css/);
    assert.match(fileContent, /preprocessMathBlocks/);
  });

  await t.test('formats subtopic text and auto-wraps bare LaTeX commands', () => {
    assert.match(fileContent, /function formatSubTopicText/);
    assert.match(fileContent, /text\.includes\('\$'\)/);
    assert.match(fileContent, /latexCommandPattern/);
  });

  await t.test('exports SubTopicMathText memo component', () => {
    assert.match(fileContent, /export const SubTopicMathText/);
    assert.match(fileContent, /export default SubTopicMathText/);
  });
});

test('ChatGPTConnectModal Onboarding & Privacy Contract', async (t) => {
  const filePath = path.join(ROOT, 'src/components/byok/ChatGPTConnectModal.jsx');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  await t.test('displays requirement for any paid ChatGPT subscription', () => {
    assert.match(fileContent, /Requires an OpenAI Paid Subscription/);
    assert.match(fileContent, /ChatGPT Plus, Team, Enterprise, or Pro/);
  });

  await t.test('explicitly guarantees 100% client-side privacy and per-device requirement', () => {
    assert.match(fileContent, /Zero Server Storage & Device-Exclusive Privacy/);
    assert.match(fileContent, /KalPad never stores your credentials on any server/);
    assert.match(fileContent, /connect your ChatGPT account on each device or browser/);
  });

  await t.test('provides step-by-step tutorial detailing desktop 127.0.0.1 loopback behavior', () => {
    assert.match(fileContent, /HOW TO CONNECT \(STEP-BY-STEP\)/);
    assert.match(fileContent, /127\.0\.0\.1:3000\/auth\/callback/);
    assert.match(fileContent, /This site can’t be reached/);
    assert.match(fileContent, /copy the entire link\/URL from the address bar/);
  });

  await t.test('includes fallback URL input and complete sign-in button', () => {
    assert.match(fileContent, /modal-byok-manual-code-input/);
    assert.match(fileContent, /Complete Sign-In/);
  });
});

test('TemporaryChatModal Fallback Loading Bug Fix', async (t) => {
  const filePath = path.join(ROOT, 'src/components/chat/TemporaryChatModal.jsx');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  await t.test('Complete Sign-In button loading is decoupled from OAuth popup state', () => {
    // Must NOT be `loading={chat.isAuthenticating}`
    assert.doesNotMatch(fileContent, /<Button[^>]+loading=\{chat\.isAuthenticating\}[^>]*>\s*Complete Sign-In/s);
    assert.match(fileContent, /chat\.isSubmittingManual/);
  });

  await t.test('handleManualCodeSubmit is not blocked by popup wait', () => {
    assert.doesNotMatch(fileContent, /if \(!manualCodeInput\.trim\(\) \|\| chat\.isAuthenticating\) return;/);
  });
});

test('KalPadShell Auto-Prompt Contract', async (t) => {
  const filePath = path.join(ROOT, 'src/components/kalpad/KalPadShell.jsx');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  await t.test('mounts ChatGPTConnectModal and auto-prompts on unauthenticated session', () => {
    assert.match(fileContent, /ChatGPTConnectModal/);
    assert.match(fileContent, /getStoredSession/);
    assert.match(fileContent, /kalpad_byok_prompt_dismissed/);
    assert.match(fileContent, /setByokConnectOpened\(true\)/);
  });
});
