// tests/byok/tutor_chat_and_dashboard_notes.test.mjs
/**
 * Test Suite verifying:
 * 1. FullscreenNoteViewer performance optimization:
 *    - Isolates Chat Input into self-contained TutorChatForm component (no parent re-renders on keystroke)
 *    - Eliminates top-level chatInput state from FullscreenNoteViewer
 *    - Memoizes ChatMessageBubble and NoteArticleBody to avoid KaTeX re-parsing
 *    - Wraps HighlightableMarkdown in React.memo
 *    - Uses ref-bridged customRenderers with static [] dependency array
 * 2. Dashboard Today's Mission Note Button Parity:
 *    - TodayAgenda renders 40px circular buttons matching TimelineDayCard (plan/[id]/page)
 *    - Displays IconEye with var(--kp-apricot) when note exists
 *    - Displays IconLock when note generation is locked
 *    - Displays IconPencilPlus with var(--kp-raised) and kp-spin spinner when generating
 *    - dashboard/page.js invokes startNoteGeneration from GenerationContext for unified dock & task tracking
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

test('FullscreenNoteViewer AI Tutor Typing Performance Contract', () => {
  const noteViewer = readFile('src/components/FullscreenNoteViewer.jsx');
  const highlightable = readFile('src/components/HighlightableMarkdown.jsx');

  // 1. Top-level state must NOT track chatInput keystrokes
  assert.ok(
    !noteViewer.includes("const [chatInput, setChatInput] = useState('');"),
    'FullscreenNoteViewer must not store chatInput in parent state to prevent 100ms+ typing lag'
  );

  // 2. Self-contained TutorChatForm handles local input state
  assert.ok(
    noteViewer.includes('const TutorChatForm = React.memo('),
    'TutorChatForm must be a memoized component with its own local input state'
  );
  assert.ok(
    noteViewer.includes("const [text, setText] = useState('');"),
    'TutorChatForm must manage text state locally'
  );

  // 3. ChatMessageBubble is memoized to avoid re-parsing previous KaTeX blocks
  assert.ok(
    noteViewer.includes('const ChatMessageBubble = React.memo('),
    'ChatMessageBubble must be memoized so older chat messages are not re-parsed with KaTeX'
  );

  // 4. NoteArticleBody is memoized to avoid re-parsing the giant textbook chapter
  assert.ok(
    noteViewer.includes('const NoteArticleBody = React.memo('),
    'NoteArticleBody must be memoized to decouple reading content from tutor chat activity'
  );

  // 5. HighlightableMarkdown is wrapped in React.memo
  assert.ok(
    highlightable.includes('export const HighlightableMarkdown = memo('),
    'HighlightableMarkdown must be wrapped in React.memo'
  );

  // 6. customRenderers uses stable ref bridge with [] dependency array
  assert.ok(
    noteViewer.includes('handleDoubtRequestRef.current = handleDoubtRequest;'),
    'FullscreenNoteViewer must bridge handleDoubtRequest to a ref'
  );
  assert.ok(
    noteViewer.includes('setZoomImageSrcRef.current = setZoomImageSrc;'),
    'FullscreenNoteViewer must bridge setZoomImageSrc to a ref'
  );
  assert.ok(
    noteViewer.includes('const customRenderers = useMemo('),
    'customRenderers must be memoized'
  );
});

test("Dashboard Today's Mission Subtopic Notes Button Parity Contract", () => {
  const todayAgenda = readFile('src/components/dashboard/TodayAgenda.jsx');
  const dashboardPage = readFile('src/app/dashboard/page.js');
  const timelineDayCard = readFile('src/components/TimelineDayCard.jsx');

  // 1. Icon parity: TodayAgenda imports IconEye, IconLock, IconPencilPlus
  assert.ok(todayAgenda.includes('IconEye'), 'TodayAgenda must import IconEye');
  assert.ok(todayAgenda.includes('IconLock'), 'TodayAgenda must import IconLock');
  assert.ok(todayAgenda.includes('IconPencilPlus'), 'TodayAgenda must import IconPencilPlus');
  assert.ok(!todayAgenda.includes('IconListDetails'), 'TodayAgenda must replace generic IconListDetails');

  // 2. Button styling parity with TimelineDayCard: 40px circle, kp-tactile, apricot background for existing note
  assert.ok(
    todayAgenda.includes("backgroundColor: 'var(--kp-apricot)'"),
    'TodayAgenda must use var(--kp-apricot) for existing note button'
  );
  assert.ok(
    todayAgenda.includes("borderRadius: '999px'"),
    'TodayAgenda must use 999px pill/circle border radius'
  );
  assert.ok(
    todayAgenda.includes("width: '40px'") && todayAgenda.includes("height: '40px'"),
    'TodayAgenda must match TimelineDayCard 40px dimensions'
  );
  assert.ok(
    todayAgenda.includes('kp-spin'),
    'TodayAgenda must include kp-spin spinner animation during generation'
  );

  // 3. Generation pipeline parity: dashboard/page.js uses startNoteGeneration from GenerationContext
  assert.ok(
    dashboardPage.includes("import { useGeneration } from '@/context/GenerationContext';"),
    'dashboard/page.js must import useGeneration'
  );
  assert.ok(
    dashboardPage.includes('startNoteGeneration({'),
    'dashboard/page.js must invoke startNoteGeneration'
  );
  assert.ok(
    !dashboardPage.includes('generateNoteBYOK({'),
    'dashboard/page.js must not bypass GenerationDock by directly invoking generateNoteBYOK'
  );

  // 4. Query parity: fetchPlans must query new_notes: generated_notes (*)
  assert.ok(
    dashboardPage.includes('new_notes: generated_notes ( * )'),
    'dashboard/page.js must query generated_notes in plan_topics'
  );

  // 5. Active tasks tracking
  assert.ok(
    dashboardPage.includes('activeNoteTasks={activeNoteTasks}'),
    'dashboard/page.js must pass activeNoteTasks to TodayAgenda'
  );
});

test('FullscreenNoteViewer and HighlightableMarkdown Client Stability Contract', () => {
  const noteViewer = readFile('src/components/FullscreenNoteViewer.jsx');
  const highlightable = readFile('src/components/HighlightableMarkdown.jsx');
  const timelineDayCard = readFile('src/components/TimelineDayCard.jsx');
  const timelineEntry = readFile('src/components/TimelineEntry.jsx');
  const dashboardPage = readFile('src/app/dashboard/page.js');

  // 1. React Rules of Hooks: No early return before hooks in FullscreenNoteViewer
  const hookMatches = [
    'useCallback(',
    'useRef(',
    'useMemo(',
    'useEffect(',
    'useState(',
  ];
  const viewerLines = noteViewer.split('\n');
  const overlayLineIdx = viewerLines.findIndex((line) => line.includes('const overlay = ('));
  assert.ok(overlayLineIdx > 0, 'FullscreenNoteViewer must define overlay');

  // Check that no `return null` or early return exists before all hooks
  const earlyReturnLineIdx = viewerLines.slice(0, overlayLineIdx).findIndex(
    (line) => line.trim() === 'if (!activeNoteData) return null;'
  );
  assert.equal(
    earlyReturnLineIdx,
    -1,
    'FullscreenNoteViewer must NOT have an early return before hooks (violates React Rules of Hooks)'
  );

  // 2. Safe mount and activeNoteData guard placed directly before overlay
  assert.ok(
    noteViewer.includes('if (!mounted || !activeNoteData) return null;'),
    'FullscreenNoteViewer must check mounted and activeNoteData right before overlay creation'
  );

  // 3. Clean portal rendering on document.body
  assert.ok(
    noteViewer.includes('return createPortal(overlay, document.body);'),
    'FullscreenNoteViewer must return createPortal(overlay, document.body) on client'
  );

  // 4. Synchronous prop synchronization pattern
  assert.ok(
    noteViewer.includes('if (noteData !== prevNoteData) {'),
    'FullscreenNoteViewer must synchronize activeNoteData when noteData prop changes'
  );

  // 5. HighlightableMarkdown null-safety for database records with null highlights
  assert.ok(
    highlightable.includes('const safeHighlights = Array.isArray(highlights) ? highlights : [];'),
    'HighlightableMarkdown must define safeHighlights fallback'
  );
  assert.ok(
    !highlightable.includes('highlights.length'),
    'HighlightableMarkdown must not directly read length on nullable highlights'
  );
  assert.ok(
    highlightable.includes('preprocessMathBlocks(markdown || \'\')'),
    'HighlightableMarkdown must pass fallback empty string to preprocessMathBlocks'
  );

  // 6. Call sites must conditionally mount FullscreenNoteViewer only when noteToView is truthy
  assert.ok(
    timelineDayCard.includes('{noteToView && (\n        <FullscreenNoteViewer') ||
    timelineDayCard.includes('{noteToView && ('),
    'TimelineDayCard must guard FullscreenNoteViewer with noteToView'
  );
  assert.ok(
    timelineEntry.includes('{noteToView && ('),
    'TimelineEntry must guard FullscreenNoteViewer with noteToView'
  );
  assert.ok(
    dashboardPage.includes('{noteToView && ('),
    'dashboard/page.js must guard FullscreenNoteViewer with noteToView'
  );
});
