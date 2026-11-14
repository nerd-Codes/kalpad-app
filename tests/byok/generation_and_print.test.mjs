// tests/byok/generation_and_print.test.mjs
/**
 * Test Suite for Non-Blocking Persistent Generation and Unified Print Overhaul.
 * Verifies:
 * 1. Print sub-layouts contain NO duplicate <html> or <body> tags
 * 2. Root layout covers both /print and /print-cram-sheet
 * 3. Print CSS has fluid mobile responsive rules and crisp A4 pagination
 * 4. All print pages import KaTeX styles and wire readiness handlers correctly
 * 5. Generation system eliminates fullscreen blocking overlays and provides persistent tasks
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// -----------------------------------------------------------------------------
// 1. Print Sub-Layouts & Root Layout Audit
// -----------------------------------------------------------------------------
test('Print Sub-Layouts - do NOT contain invalid duplicate <html> or <body> tags', () => {
  const printLayout = readFile('src/app/print/layout.js');
  const cramLayout = readFile('src/app/print-cram-sheet/layout.js');

  assert.ok(!printLayout.includes('<html'), 'print/layout.js must not render duplicate <html>');
  assert.ok(!printLayout.includes('<body'), 'print/layout.js must not render duplicate <body>');
  assert.ok(!cramLayout.includes('<html'), 'print-cram-sheet/layout.js must not render duplicate <html>');
  assert.ok(!cramLayout.includes('<body'), 'print-cram-sheet/layout.js must not render duplicate <body>');

  assert.ok(printLayout.includes('MantineProvider'), 'print/layout.js must provide MantineProvider');
  assert.ok(cramLayout.includes('MantineProvider'), 'print-cram-sheet/layout.js must provide MantineProvider');
});

test('Root Layout - recognizes both /print and /print-cram-sheet paths', () => {
  const rootLayout = readFile('src/app/layout.js');

  assert.ok(
    rootLayout.includes("pathname.startsWith('/print') || pathname.startsWith('/print-cram-sheet')"),
    'Root layout must check both /print and /print-cram-sheet for lightweight print variant'
  );
});

// -----------------------------------------------------------------------------
// 2. Print CSS & Mobile Performance
// -----------------------------------------------------------------------------
test('Print CSS - contains mobile responsive rules and A4 page break directives', () => {
  const printCss = readFile('src/app/print/[noteId]/print.css');

  // Mobile rules
  assert.ok(printCss.includes('@media screen and (max-width: 768px)'), 'Must define mobile screen styles');
  assert.ok(printCss.includes('box-shadow: none !important'), 'Mobile view must drop heavy drop shadows');
  assert.ok(printCss.includes('width: 100% !important'), 'Mobile sheet must be fluid');

  // Print rules
  assert.ok(printCss.includes('@media print'), 'Must define @media print rules');
  assert.ok(printCss.includes('size: A4 portrait'), 'Must define standard A4 portrait paper size');
  assert.ok(printCss.includes('page-break-after: avoid') || printCss.includes('break-after: avoid'), 'Headings must avoid page break after');
  assert.ok(printCss.includes('page-break-inside: avoid') || printCss.includes('break-inside: avoid'), 'Tables/code must avoid page break inside');
  assert.ok(printCss.includes('.katex-display'), 'Must format KaTeX display math formulas');
});

test('Print Pages - KaTeX stylesheet and readiness handler contracts', () => {
  const printNote = readFile('src/app/print/[noteId]/page.js');
  const printDay = readFile('src/app/print/day/[planTopicId]/page.js');
  const printCram = readFile('src/app/print-cram-sheet/[cramSheetId]/page.js');

  // KaTeX CSS imported
  assert.ok(printNote.includes('katex/dist/katex.min.css'), 'print/[noteId] must import katex css');
  assert.ok(printDay.includes('katex/dist/katex.min.css'), 'print/day must import katex css');
  assert.ok(printCram.includes('katex/dist/katex.min.css'), 'print-cram-sheet must import katex css');

  // Unified paper-sheet and printable-content wrappers
  assert.ok(printNote.includes('className="paper-sheet"'));
  assert.ok(printDay.includes('className="paper-sheet"'));
  assert.ok(printCram.includes('className="paper-sheet"'));

  // Handler prop fix
  assert.ok(printNote.includes('onReady='), 'print/[noteId] must supply onReady to PrintableMarkdownBlock');
});

// -----------------------------------------------------------------------------
// 3. Non-Blocking Generation & Fullscreen Overlay Removal
// -----------------------------------------------------------------------------
test('PageLoader - replaces fullscreen blocking modal with non-blocking GenerationDock', () => {
  const pageLoader = readFile('src/components/PageLoader.jsx');

  assert.ok(!pageLoader.includes('.loaderOverlay'), 'PageLoader must not render full-screen blocking overlay');
  assert.ok(!pageLoader.includes('rgba(191, 90, 242'), 'PageLoader must not contain neon purple glow');
  assert.ok(pageLoader.includes('GenerationDock'), 'PageLoader must render non-blocking GenerationDock');
});

test('GenerationDock - verifies non-blocking pointer events and visual structure', () => {
  const dock = readFile('src/components/kalpad/GenerationDock.jsx');

  assert.ok(dock.includes("pointerEvents: 'none'"), 'Outer wrapper must have pointerEvents: none so page is fully clickable');
  assert.ok(dock.includes("pointerEvents: 'auto'"), 'Card itself must capture interaction');
  assert.ok(dock.includes('useGeneration'), 'Must consume useGeneration context');
});

test('GenerationContext - exports required non-blocking task handlers and legacy compatibility', () => {
  const ctx = readFile('src/context/GenerationContext.jsx');

  assert.ok(ctx.includes('startPlanGeneration'), 'Must provide startPlanGeneration');
  assert.ok(ctx.includes('startNoteGeneration'), 'Must provide startNoteGeneration');
  assert.ok(ctx.includes('startCramSheetGeneration'), 'Must provide startCramSheetGeneration');
  assert.ok(ctx.includes('useLoading'), 'Must provide backward-compatible useLoading hook');
});

test('NewPlanPage - wires persistent plan generation across navigation', () => {
  const newPlan = readFile('src/app/new-plan/page.js');

  assert.ok(newPlan.includes('useGeneration'), 'NewPlanPage must import useGeneration');
  assert.ok(newPlan.includes('startPlanGeneration'), 'NewPlanPage must call startPlanGeneration');
  assert.ok(newPlan.includes('activePlanTask'), 'NewPlanPage must synchronize with activePlanTask');
});
