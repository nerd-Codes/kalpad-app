// src/components/FullscreenNoteViewer.jsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconAward,
  IconBolt,
  IconBook,
  IconBrain,
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconFileExport,
  IconFlame,
  IconHighlight,
  IconList,
  IconMessageCircle,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import supabase from '@/lib/supabaseClient';
import { HighlightableMarkdown } from '@/components/HighlightableMarkdown';
import { useNoteTextSelection } from '@/hooks/useNoteTextSelection';
import { buildCanonicalStream, mergeHighlightIntoSet } from '@/lib/noteHighlights';
import { preprocessMathBlocks } from '@/lib/noteMarkdown';
import { solveDoubtBYOK } from '@/lib/byok/pipelines/doubtSolver';
import { generateNoteBYOK } from '@/lib/byok/pipelines/notesGenerator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import classes from './FullscreenNoteViewer.module.css';

const EMPTY_HIGHLIGHTS = Object.freeze([]);

const PDF_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
body { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #222; margin: 2rem; }
h1, h2, h3, h4, h5, h6 { font-weight: 700; margin: 1.5rem 0 0.75rem 0; color: #111; }
pre, code { font-family: monospace; background: #f6f8fa; padding: 0.25rem 0.5rem; border-radius: 4px; }
pre { padding: 1rem; overflow-x: auto; }
img { max-width: 100%; display: block; margin: 1rem auto; }
blockquote { border-left: 4px solid #CC4B00; padding-left: 1rem; color: #555; font-style: italic; }
table { border-collapse: collapse; margin: 1rem 0; width: 100%; }
th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
th { background: #f0f0f0; }
.katex-display { display: block; margin: 1em 0; text-align: center; }
@page { size: A4; margin: 0.3in; }`;

function extractMarkdownOutline(md = '') {
  const headings = [];
  let inCodeBlock = false;
  const lines = String(md || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const match = trimmed.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~[\]]/g, '').trim();
      if (text) {
        headings.push({ index: headings.length, level, text });
      }
    }
  }
  return headings;
}

function getHighlightSnippet(hl, idx) {
  const snippet =
    hl?.anchor?.exact ||
    hl?.quote ||
    hl?.exact ||
    hl?.selectedText ||
    hl?.text ||
    `Highlight #${idx + 1}`;
  return String(snippet).trim();
}

function findTextRangeInElement(root, searchText) {
  if (!root || !searchText) return null;
  const normalizedTarget = searchText.replace(/\s+/g, ' ').trim();
  if (!normalizedTarget) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let fullText = '';
  let node = walker.nextNode();
  while (node) {
    const val = node.nodeValue || '';
    textNodes.push({ node, start: fullText.length, end: fullText.length + val.length });
    fullText += val;
    node = walker.nextNode();
  }

  let matchIndex = fullText.indexOf(normalizedTarget);
  let matchLen = normalizedTarget.length;
  if (matchIndex === -1) {
    const snippetShort = normalizedTarget.slice(0, Math.min(36, normalizedTarget.length));
    matchIndex = fullText.toLowerCase().indexOf(snippetShort.toLowerCase());
    matchLen = snippetShort.length;
  }
  if (matchIndex === -1) return null;

  const matchEnd = matchIndex + matchLen;
  const startNode = textNodes.find((entry) => matchIndex >= entry.start && matchIndex < entry.end);
  const endNode = textNodes.find((entry) => matchEnd > entry.start && matchEnd <= entry.end);
  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode.node, matchIndex - startNode.start);
  range.setEnd(endNode.node, matchEnd - endNode.start);
  return range;
}

function CollapsibleRailCard({
  title,
  count,
  icon: IconComp,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <div className={classes.railCard}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={classes.collapsibleTrigger}
      >
        <span className={classes.railHeadingGroup}>
          <h2 className={classes.railHeading}>{title}</h2>
          {typeof count !== 'undefined' && (
            <span className={classes.railCountPill}>{count}</span>
          )}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {IconComp && <IconComp size={14} stroke={1.8} color="var(--kp-secondary)" />}
          <IconChevronDown
            size={15}
            stroke={1.9}
            color="var(--kp-secondary)"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease',
            }}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FullscreenNoteViewer({
  noteData,
  onClose,
  onUpdate,
  onNoteUpdate,
  onSubTopicNoteSwitch,
  isCramSheet = false,
}) {
  const [activeNoteData, setActiveNoteData] = useState(noteData);
  const [renderContent, setRenderContent] = useState(false);
  const noteContentRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const chatScrollRef = useRef(null);
  const chatInputRef = useRef(null);

  // Keep synced with incoming prop changes
  useEffect(() => {
    setActiveNoteData(noteData);
  }, [noteData]);

  const {
    notes_markdown = 'No content available.',
    highlights = EMPTY_HIGHLIGHTS,
    sub_topic = {},
    day_topic = {},
    exam_name = 'Study Plan',
  } = activeNoteData || {};

  const { selection, clearSelection } = useNoteTextSelection(noteContentRef, !!activeNoteData);

  // Embedded Tutor Chat State (non-blocking inside desktop sidebar, slide-up drawer on mobile)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Collapsible Sidebar Cards State
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [unitProgressOpen, setUnitProgressOpen] = useState(true);

  // Sibling subtopic note switching + caches
  const [cachedDayNotes, setCachedDayNotes] = useState(() =>
    Array.isArray(day_topic?.new_notes) ? day_topic.new_notes : []
  );
  const [switchingSubTopic, setSwitchingSubTopic] = useState(null);

  const [exportModalOpened, setExportModalOpened] = useState(false);
  const [zoomImageSrc, setZoomImageSrc] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [localMarkdown, setLocalMarkdown] = useState(notes_markdown);
  const [localHighlights, setLocalHighlights] = useState(
    Array.isArray(highlights) ? highlights : []
  );

  useEffect(() => {
    setLocalMarkdown(notes_markdown);
  }, [notes_markdown]);

  useEffect(() => {
    setLocalHighlights(Array.isArray(highlights) ? highlights : []);
  }, [highlights]);

  useEffect(() => {
    if (Array.isArray(day_topic?.new_notes)) {
      setCachedDayNotes((prev) => {
        const merged = [...day_topic.new_notes];
        prev.forEach((p) => {
          if (!merged.some((m) => m.sub_topic_text === p.sub_topic_text)) {
            merged.push(p);
          }
        });
        return merged;
      });
    }
  }, [day_topic?.new_notes]);

  useEffect(() => {
    if (!day_topic?.id) return;
    let active = true;
    supabase
      .from('generated_notes')
      .select('*')
      .eq('plan_topic_id', day_topic.id)
      .then(({ data }) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        setCachedDayNotes((prev) => {
          const merged = [...prev];
          data.forEach((row) => {
            const key = (row.sub_topic_text || '').trim().toLowerCase();
            if (!merged.some((m) => (m.sub_topic_text || '').trim().toLowerCase() === key)) {
              merged.push(row);
            }
          });
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [day_topic?.id]);

  useEffect(() => {
    if (activeNoteData) {
      const timer = setTimeout(() => setRenderContent(true), 60);
      return () => clearTimeout(timer);
    }
    setRenderContent(false);
  }, [activeNoteData]);

  // Auto-scroll chat feed cleanly on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!activeNoteData) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (zoomImageSrc) {
        setZoomImageSrc(null);
      } else if (exportModalOpened) {
        setExportModalOpened(false);
      } else {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeNoteData, zoomImageSrc, exportModalOpened, onClose]);

  const outlineHeadings = useMemo(() => extractMarkdownOutline(localMarkdown), [localMarkdown]);

  if (!activeNoteData) return null;

  const canPersistStructuredHighlights = Boolean(activeNoteData.id) && !isCramSheet;
  const hasSelection = Boolean(selection.text.trim());
  const siblingSubTopics = Array.isArray(day_topic?.sub_topics) ? day_topic.sub_topics : [];

  const handleOpenChat = () => {
    setChatOpen(true);
    setTimeout(() => chatInputRef.current?.focus(), 140);
  };

  const handleDoubtRequest = async (action, textOverride = null) => {
    const questionText = (textOverride ?? (action === 'custom' ? chatInput : selection.text)).trim();
    if (!questionText || chatLoading) return;

    const userLabel =
      action === 'explain'
        ? `Explain: "${questionText}"`
        : action === 'analogy'
          ? `Give an analogy for: "${questionText}"`
          : action === 'importance'
            ? `Why does this matter: "${questionText}"`
            : questionText;

    setChatOpen(true);
    if (action === 'custom') setChatInput('');
    clearSelection();

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: userLabel };
    const priorHistory = chatMessages.slice(-4);
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    // Build conversational context for follow-ups while keeping existing /api/solve-doubt contract intact
    const enrichedQuestion =
      priorHistory.length > 0 && action === 'custom'
        ? `Previous chat context:\n${priorHistory
            .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
            .join('\n')}\n\nLatest question: ${questionText}`
        : questionText;

    const bodyPayload = {
      fullNoteContent: localMarkdown,
      context: {
        examName: exam_name,
        dayTopic: day_topic.topic_name,
        subTopic: sub_topic.text,
      },
      action,
      highlightedText: action !== 'custom' ? questionText : undefined,
      question: action === 'custom' ? enrichedQuestion : undefined,
    };

    try {
      const data = await solveDoubtBYOK({
        fullNoteContent: bodyPayload.fullNoteContent,
        context: bodyPayload.context,
        action: bodyPayload.action,
        highlightedText: bodyPayload.highlightedText,
        question: bodyPayload.question,
      });
      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.response },
      ]);
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'error',
          content:
            err?.code === 'BYOK_NOT_CONNECTED'
              ? 'Connect your ChatGPT account in the opened panel to ask the inline tutor.'
              : err?.message || 'Unable to get response.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleScrollToOutline = (headingIdx) => {
    const container = noteContentRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll('h1, h2, h3');
    const target = nodes[headingIdx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToHighlight = (hl, idx) => {
    const scrollEl = scrollAreaRef.current;
    const contentEl = noteContentRef.current;
    if (!scrollEl || !contentEl) return;

    // 1. Prefer structured HighlightableMarkdown overlay rect
    if (hl?.id) {
      const rectEls = Array.from(
        document.querySelectorAll(`[data-highlight-id="${String(hl.id).replace(/"/g, '\\"')}"]`)
      );
      if (rectEls.length > 0) {
        const firstRect = rectEls[0].getBoundingClientRect();
        const containerRect = scrollEl.getBoundingClientRect();
        const targetTop = scrollEl.scrollTop + (firstRect.top - containerRect.top) - 96;
        scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

        rectEls.forEach((el) => el.setAttribute('data-flash', 'true'));
        setTimeout(() => {
          rectEls.forEach((el) => el.removeAttribute('data-flash'));
        }, 1400);
        return;
      }
    }

    // 2. Text-node fallback (for legacy/quote highlights)
    const snippet = getHighlightSnippet(hl, idx);
    const range = findTextRangeInElement(contentEl, snippet);
    if (range) {
      const rect = range.getBoundingClientRect();
      const containerRect = scrollEl.getBoundingClientRect();
      const targetTop = scrollEl.scrollTop + (rect.top - containerRect.top) - 96;
      scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

      const parentBlock =
        range.startContainer?.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : range.startContainer;
      if (parentBlock && typeof parentBlock.animate === 'function') {
        parentBlock.animate(
          [
            { backgroundColor: 'rgba(245, 158, 11, 0.34)' },
            { backgroundColor: 'rgba(245, 158, 11, 0)' },
          ],
          { duration: 1200, easing: 'ease-out' }
        );
      }
    }
  };

  const handleSwitchSubTopic = async (targetSubTopic, subIndex = -1) => {
    if (!targetSubTopic?.text || targetSubTopic.text === sub_topic?.text || switchingSubTopic) {
      return;
    }

    const needle = targetSubTopic.text.trim().toLowerCase();
    const localHit =
      cachedDayNotes.find((n) => (n.sub_topic_text || '').trim().toLowerCase() === needle) ||
      (subIndex === 0 && day_topic?.generated_notes
        ? {
            notes_markdown: day_topic.generated_notes,
            sub_topic_text: targetSubTopic.text,
            highlights: [],
          }
        : null);

    const activateNote = (resolvedNote) => {
      const nextPayload = {
        ...resolvedNote,
        sub_topic: targetSubTopic,
        day_topic: {
          ...day_topic,
          new_notes: cachedDayNotes.some(
            (n) => (n.sub_topic_text || '').trim().toLowerCase() === needle
          )
            ? cachedDayNotes
            : [...cachedDayNotes, resolvedNote],
        },
        exam_name,
      };
      setActiveNoteData(nextPayload);
      setChatMessages([]);
      clearSelection();
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      onSubTopicNoteSwitch?.(nextPayload, targetSubTopic);
    };

    if (localHit) {
      activateNote(localHit);
      return;
    }

    setSwitchingSubTopic(targetSubTopic.text);
    try {
      // Check Supabase for any existing note under this topic before generating
      if (day_topic?.id) {
        const { data: topicNotes } = await supabase
          .from('generated_notes')
          .select('*')
          .eq('plan_topic_id', day_topic.id);

        const matchedRow = Array.isArray(topicNotes)
          ? topicNotes.find((n) => (n.sub_topic_text || '').trim().toLowerCase() === needle)
          : null;

        if (matchedRow) {
          setCachedDayNotes((prev) => [...prev, matchedRow]);
          activateNote(matchedRow);
          return;
        }
      }

      // Generate the note on-demand if it doesn't exist yet
      const data = await generateNoteBYOK({
        planTopicId: day_topic?.id || 0,
        subTopicText: targetSubTopic.text,
        examName: exam_name,
        dayTopic: day_topic?.topic_name,
        isGuest: !day_topic?.id,
      });

      const generated = data.note;
      setCachedDayNotes((prev) => [...prev, generated]);
      activateNote(generated);
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      notifications.show({
        title: 'Note unavailable',
        message:
          err?.code === 'BYOK_NOT_CONNECTED'
            ? 'Connect your ChatGPT account in the opened panel to generate this note.'
            : err?.message || 'Could not open this subtopic note.',
        color: 'orange',
      });
    } finally {
      setSwitchingSubTopic(null);
    }
  };

  const handleMarkAsComplete = () => {
    const subTopicIndex = day_topic.sub_topics?.findIndex((st) => st.text === sub_topic.text);
    if (subTopicIndex !== undefined && subTopicIndex !== -1) {
      const newSubTopics = day_topic.sub_topics.map((st, index) =>
        index === subTopicIndex ? { ...st, completed: true } : st
      );
      onUpdate?.(day_topic.id, { sub_topics: newSubTopics });
      setActiveNoteData((curr) => ({
        ...curr,
        sub_topic: { ...curr.sub_topic, completed: true },
        day_topic: { ...curr.day_topic, sub_topics: newSubTopics },
      }));
      notifications.show({
        title: 'Task completed',
        message: `"${sub_topic.text}" marked complete.`,
        color: 'teal',
      });
    }
  };

  const handleAPIBasedExport = async () => {
    setIsExporting(true);
    setExportModalOpened(false);
    try {
      const response = await fetch('/api/export-note-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: localMarkdown,
          topicName: day_topic.topic_name,
          subTopicName: sub_topic.text,
          css: PDF_CSS,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to export PDF.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(sub_topic.text || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notifications.show({
        title: 'Export started',
        message: 'Downloading PDF...',
        color: 'teal',
      });
    } catch (err) {
      notifications.show({
        title: 'Export failed',
        message: err.message,
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClientSidePrint = () => {
    setIsExporting(true);
    setExportModalOpened(false);
    const printUrl = isCramSheet
      ? `/print-cram-sheet/${activeNoteData.id}`
      : `/print/${activeNoteData.id}`;
    const printWindow = window.open(printUrl, '_blank');
    if (!printWindow) {
      notifications.show({
        title: 'Popup blocked',
        message: 'Please allow popups to print this note.',
        color: 'yellow',
      });
      setIsExporting(false);
      return;
    }
    const handleMessage = (event) => {
      if (event.source === printWindow && event.data === 'KALPAD_PRINT_READY') {
        printWindow.print();
        setIsExporting(false);
        window.removeEventListener('message', handleMessage);
      }
    };
    const handleAfterPrint = () => {
      printWindow.close();
      printWindow.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('message', handleMessage);
    };
    window.addEventListener('message', handleMessage);
    printWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
  };

  const handleHighlightSelection = async () => {
    if (!canPersistStructuredHighlights || !selection.anchor) return;
    if (!noteContentRef.current) return;

    const previousHighlights = localHighlights;
    const stream = buildCanonicalStream(noteContentRef.current);
    const mergedHighlights = mergeHighlightIntoSet(
      localHighlights,
      selection.anchor,
      stream.text,
      'yellow'
    );

    setLocalHighlights(mergedHighlights);
    clearSelection();

    try {
      const { error: saveError } = await supabase
        .from('generated_notes')
        .update({ highlights: mergedHighlights })
        .eq('id', activeNoteData.id);

      if (saveError) throw saveError;
      onNoteUpdate?.(activeNoteData.id, { highlights: mergedHighlights });
    } catch (e) {
      console.error('Highlight save failed', e);
      setLocalHighlights(previousHighlights);
      notifications.show({
        title: 'Highlight save failed',
        message: 'Could not save that highlight. Please try again.',
        color: 'red',
      });
    }
  };

  const customRenderers = {
    img: ({ node, ...props }) => {
      const src = props.src || '';
      return (
        <span style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0' }}>
          <img
            {...props}
            onClick={() => src && setZoomImageSrc(src)}
            alt={props.alt || 'Study diagram'}
          />
        </span>
      );
    },
    mark: ({ node, ...props }) => {
      const textContent = Array.isArray(props.children)
        ? props.children.join('')
        : String(props.children ?? '');

      return (
        <mark
          title="Click to ask AI tutor"
          onClick={(e) => {
            e.stopPropagation();
            handleDoubtRequest('explain', textContent);
          }}
        >
          {props.children}
        </mark>
      );
    },
  };

  const isCompleted = Boolean(sub_topic?.completed);

  const renderChatBody = () => (
    <div className={classes.chatContainer}>
      <div className={classes.chatHeaderRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <IconMessageCircle size={15} stroke={2} color="var(--kp-primary)" />
          <span
            style={{
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--kp-ink)',
            }}
          >
            Tutor chat
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setChatMessages([])}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--kp-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-label="Close tutor chat"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--kp-secondary)',
              display: 'inline-flex',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <IconX size={15} stroke={1.9} />
          </button>
        </div>
      </div>

      <div ref={chatScrollRef} className={`${classes.chatMessages} ${classes.customScroll}`}>
        {chatMessages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--kp-secondary)' }}>
              Ask anything about <strong>{sub_topic?.text}</strong> while you keep reading.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'Summarize the core intuition',
                'Common exam traps here?',
                'Give me a concrete example',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={classes.chatPromptChip}
                  onClick={() => handleDoubtRequest('custom', prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className={classes.chatBubbleUser}>
                {msg.content}
              </div>
            ) : msg.role === 'error' ? (
              <div
                key={msg.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--kp-error-subtle)',
                  color: 'var(--kp-error-ink)',
                  fontSize: '12px',
                }}
              >
                {msg.content}
              </div>
            ) : (
              <div key={msg.id} className={classes.chatBubbleAi}>
                <div className={classes.chatMarkdown}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={customRenderers}
                  >
                    {preprocessMathBlocks(msg.content)}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )
        )}

        {chatLoading && (
          <div className={classes.chatBubbleAi} style={{ color: 'var(--kp-secondary)' }}>
            Thinking through your note...
          </div>
        )}
      </div>

      <form
        className={classes.chatForm}
        onSubmit={(e) => {
          e.preventDefault();
          handleDoubtRequest('custom');
        }}
      >
        <input
          ref={chatInputRef}
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask tutor about this note..."
          aria-label="Ask AI tutor question"
          className={classes.chatInput}
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || chatLoading}
          aria-label="Send message"
          className={classes.chatSendBtn}
        >
          <IconSend size={16} stroke={2} />
        </button>
      </form>
    </div>
  );

  const overlay = (
    <motion.div
      className={classes.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={sub_topic?.text || 'Study note'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top Bar */}
      <header className={classes.topBar}>
        <div className={classes.topBarInner}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={classes.eyebrow}>
              {isCramSheet ? 'CRAM SHEET' : 'STUDY NOTE'} · {exam_name}
            </div>
            <div className={classes.topTitle}>{sub_topic?.text || 'Study note'}</div>
          </div>

          <div className={classes.topMetaGroup}>
            {localHighlights.length > 0 && (
              <span className={classes.metaPill}>
                {localHighlights.length} highlight{localHighlights.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <button
            type="button"
            className={classes.closeBtn}
            onClick={onClose}
            aria-label="Close note"
          >
            <IconX size={20} stroke={1.9} />
          </button>
        </div>
      </header>

      {/* Main Reading Workspace */}
      <div ref={scrollAreaRef} className={`${classes.scrollArea} ${classes.customScroll}`}>
        <div className={classes.readerWorkspace}>
          <article className={classes.articleSheet}>
            <div className={classes.articleShell}>
              <div className={classes.titleBlock}>
                <p className={classes.topicLabel}>{day_topic?.topic_name || exam_name}</p>
                <h1 className={classes.subtopicHeading}>{sub_topic?.text || 'Study note'}</h1>
              </div>

              {switchingSubTopic ? (
                <div style={{ padding: '40px 0', color: 'var(--kp-secondary)', fontSize: '14px' }}>
                  Loading note for <strong>{switchingSubTopic}</strong>...
                </div>
              ) : renderContent ? (
                <HighlightableMarkdown
                  markdown={localMarkdown}
                  highlights={localHighlights}
                  className={classes.markdown}
                  components={customRenderers}
                  contentRef={noteContentRef}
                />
              ) : (
                <div style={{ padding: '32px 0', color: 'var(--kp-secondary)', fontSize: '14px' }}>
                  Loading study note...
                </div>
              )}
            </div>
          </article>

          {/* Persistent Desktop Study Sidebar (>= 960px) */}
          <aside className={`${classes.companionRail} ${classes.customScroll}`} aria-label="Study companion">
            {/* Study Tools & Inline AI Tutor Chat Card */}
            <div className={classes.railCard}>
              <h2 className={classes.railHeading}>Study tools</h2>

              <AnimatePresence>
                {hasSelection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--kp-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--kp-secondary)',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      “{selection.text.trim()}”
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {canPersistStructuredHighlights && (
                        <button
                          type="button"
                          className={classes.railBtn}
                          onClick={handleHighlightSelection}
                          style={{
                            backgroundColor: 'var(--kp-butter)',
                            color: 'var(--kp-primary)',
                            minHeight: '36px',
                            padding: '0 10px',
                          }}
                        >
                          <span>Highlight</span>
                          <IconHighlight size={15} stroke={1.9} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={classes.railBtn}
                        onClick={() => handleDoubtRequest('explain')}
                        disabled={chatLoading}
                        style={{
                          backgroundColor: 'var(--kp-raised)',
                          color: 'var(--kp-ink)',
                          minHeight: '36px',
                          padding: '0 10px',
                        }}
                      >
                        <span>Explain</span>
                        <IconBook size={15} stroke={1.9} />
                      </button>
                      <button
                        type="button"
                        className={classes.railBtn}
                        onClick={() => handleDoubtRequest('analogy')}
                        disabled={chatLoading}
                        style={{
                          backgroundColor: 'var(--kp-mint)',
                          color: 'var(--kp-ink)',
                          minHeight: '36px',
                          padding: '0 10px',
                        }}
                      >
                        <span>Analogy</span>
                        <IconBulb size={15} stroke={1.9} />
                      </button>
                      <button
                        type="button"
                        className={classes.railBtn}
                        onClick={() => handleDoubtRequest('importance')}
                        disabled={chatLoading}
                        style={{
                          backgroundColor: 'var(--kp-apricot)',
                          color: 'var(--kp-primary)',
                          minHeight: '36px',
                          padding: '0 10px',
                        }}
                      >
                        <span>Importance</span>
                        <IconFlame size={15} stroke={1.9} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={classes.railActionStack}>
                <button
                  type="button"
                  className={classes.railBtn}
                  onClick={handleOpenChat}
                  style={{
                    backgroundColor: 'var(--kp-mint)',
                    color: 'var(--kp-ink)',
                    borderColor: chatOpen ? 'var(--kp-border-strong)' : 'var(--kp-border)',
                  }}
                >
                  <span>{chatOpen ? 'Tutor chat open' : 'Ask tutor'}</span>
                  <IconBrain size={17} stroke={1.9} />
                </button>

                <button
                  type="button"
                  className={classes.railBtn}
                  onClick={() => setExportModalOpened(true)}
                  disabled={isExporting}
                  style={{ backgroundColor: 'var(--kp-raised)', color: 'var(--kp-ink)' }}
                >
                  <span>{isExporting ? 'Exporting PDF...' : 'Export / Print PDF'}</span>
                  <IconFileExport size={17} stroke={1.9} />
                </button>

                {!isCramSheet && (
                  <button
                    type="button"
                    className={classes.railBtn}
                    onClick={handleMarkAsComplete}
                    disabled={isCompleted}
                    style={{
                      backgroundColor: isCompleted ? 'var(--kp-mint)' : 'var(--kp-primary)',
                      borderColor: 'transparent',
                      color: isCompleted ? 'var(--kp-success-ink)' : 'var(--kp-on-primary)',
                    }}
                  >
                    <span>{isCompleted ? 'Marked complete' : 'Mark topic complete'}</span>
                    <IconCheck size={17} stroke={2.1} />
                  </button>
                )}
              </div>

              {/* Inline Tutor Chat UI inside Sidebar (does not cover or interrupt reading sheet!) */}
              <AnimatePresence initial={false}>
                {chatOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    {renderChatBody()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapsible On This Page (Outline) Card */}
            {outlineHeadings.length > 0 && (
              <CollapsibleRailCard
                title="On this page"
                count={outlineHeadings.length}
                icon={IconList}
                isOpen={outlineOpen}
                onToggle={() => setOutlineOpen((v) => !v)}
              >
                <nav className={`${classes.outlineList} ${classes.customScroll}`} aria-label="Note sections">
                  {outlineHeadings.map((item) => (
                    <button
                      key={`${item.index}-${item.text}`}
                      type="button"
                      onClick={() => handleScrollToOutline(item.index)}
                      className={`${classes.outlineItem} ${
                        item.level >= 3 ? classes.outlineSubItem : ''
                      }`}
                    >
                      {item.text}
                    </button>
                  ))}
                </nav>
              </CollapsibleRailCard>
            )}

            {/* Collapsible Saved Highlights Card — Click scrolls to highlighted text in notes */}
            {localHighlights.length > 0 && (
              <CollapsibleRailCard
                title="Saved highlights"
                count={localHighlights.length}
                isOpen={highlightsOpen}
                onToggle={() => setHighlightsOpen((v) => !v)}
              >
                <div className={`${classes.highlightsScrollList} ${classes.customScroll}`}>
                  {localHighlights.map((hl, idx) => {
                    const snippet = getHighlightSnippet(hl, idx);
                    return (
                      <div key={hl?.id || idx} className={classes.highlightItemCard}>
                        <button
                          type="button"
                          className={classes.highlightScrollBtn}
                          onClick={() => handleScrollToHighlight(hl, idx)}
                          title="Jump to this highlight in the note"
                        >
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            “{snippet}”
                          </span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-kp-mono)', color: 'var(--kp-secondary)' }}>
                            Click text to jump
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDoubtRequest('explain', snippet)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              fontSize: '10.5px',
                              fontFamily: 'var(--font-kp-mono)',
                              fontWeight: 700,
                              color: 'var(--kp-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            Ask tutor →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleRailCard>
            )}

            {/* Collapsible Unit Progress Card — Clicking another subtopic opens its notes */}
            {siblingSubTopics.length > 0 && (
              <CollapsibleRailCard
                title="Unit progress"
                count={`${siblingSubTopics.filter((s) => s.completed).length}/${siblingSubTopics.length}`}
                isOpen={unitProgressOpen}
                onToggle={() => setUnitProgressOpen((v) => !v)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {siblingSubTopics.map((st, idx) => {
                    const current = st.text === sub_topic?.text;
                    const hasNoteReady =
                      cachedDayNotes.some(
                        (n) => (n.sub_topic_text || '').trim().toLowerCase() === (st.text || '').trim().toLowerCase()
                      ) ||
                      (idx === 0 && Boolean(day_topic?.generated_notes));
                    const isLoadingThis = switchingSubTopic === st.text;
                    return (
                      <button
                        key={st.text || idx}
                        type="button"
                        disabled={Boolean(switchingSubTopic)}
                        onClick={() => handleSwitchSubTopic(st, idx)}
                        className={`${classes.unitSubtopicBtn} ${
                          current ? classes.unitSubtopicCurrent : ''
                        }`}
                        title={current ? 'Currently reading' : 'Open note for this topic'}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '999px',
                              flexShrink: 0,
                              backgroundColor: st.completed
                                ? 'var(--kp-success-ink)'
                                : current
                                  ? 'var(--kp-primary)'
                                  : 'var(--kp-border-strong)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '12.5px',
                              color: current ? 'var(--kp-ink)' : 'var(--kp-secondary)',
                              fontWeight: current ? 700 : 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.text}
                          </span>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: current
                              ? 'var(--kp-primary)'
                              : hasNoteReady
                                ? 'var(--kp-ink)'
                                : 'var(--kp-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          {isLoadingThis
                            ? '...'
                            : current
                              ? 'Reading'
                              : hasNoteReady
                                ? 'Open'
                                : 'Create'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleRailCard>
            )}
          </aside>
        </div>
      </div>

      {/* Floating Bottom Command Dock (< 1024px always, or on desktop while text is selected) */}
      <div
        className={`${classes.floatingDock} ${
          !hasSelection ? classes.floatingDockDesktopHidden : ''
        }`}
      >
        {hasSelection ? (
          <>
            {canPersistStructuredHighlights && (
              <button
                type="button"
                className={classes.dockBtn}
                onClick={handleHighlightSelection}
                style={{
                  backgroundColor: 'var(--kp-butter)',
                  borderColor: 'var(--kp-border)',
                  color: 'var(--kp-primary)',
                }}
              >
                <IconHighlight size={16} stroke={1.9} />
                <span>Highlight</span>
              </button>
            )}
            <button
              type="button"
              className={classes.dockBtn}
              onClick={() => handleDoubtRequest('explain')}
              disabled={chatLoading}
              style={{
                backgroundColor: 'var(--kp-raised)',
                borderColor: 'var(--kp-border)',
                color: 'var(--kp-ink)',
              }}
            >
              <IconBook size={16} stroke={1.9} />
              <span>Explain</span>
            </button>
            <button
              type="button"
              className={classes.dockBtn}
              onClick={() => handleDoubtRequest('analogy')}
              disabled={chatLoading}
              style={{
                backgroundColor: 'var(--kp-mint)',
                borderColor: 'var(--kp-border)',
                color: 'var(--kp-ink)',
              }}
            >
              <IconBulb size={16} stroke={1.9} />
              <span>Analogy</span>
            </button>
            <button
              type="button"
              className={classes.dockBtn}
              onClick={() => handleDoubtRequest('importance')}
              disabled={chatLoading}
              style={{
                backgroundColor: 'var(--kp-apricot)',
                borderColor: 'var(--kp-border)',
                color: 'var(--kp-primary)',
              }}
            >
              <IconFlame size={16} stroke={1.9} />
              <span>Importance</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={classes.dockBtn}
              onClick={handleOpenChat}
              style={{
                backgroundColor: 'var(--kp-mint)',
                borderColor: 'var(--kp-border)',
                color: 'var(--kp-ink)',
              }}
            >
              <IconBrain size={16} stroke={1.9} />
              <span>Ask tutor</span>
            </button>

            <button
              type="button"
              className={classes.dockBtn}
              onClick={() => setExportModalOpened(true)}
              disabled={isExporting}
              style={{
                backgroundColor: 'var(--kp-raised)',
                borderColor: 'var(--kp-border)',
                color: 'var(--kp-ink)',
              }}
            >
              <IconFileExport size={16} stroke={1.9} />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>

            {!isCramSheet && (
              <button
                type="button"
                className={classes.dockBtn}
                onClick={handleMarkAsComplete}
                disabled={isCompleted}
                style={{
                  backgroundColor: isCompleted ? 'var(--kp-mint)' : 'var(--kp-primary)',
                  borderColor: 'transparent',
                  color: isCompleted ? 'var(--kp-success-ink)' : 'var(--kp-on-primary)',
                }}
              >
                <IconCheck size={16} stroke={2.1} />
                <span>{isCompleted ? 'Done' : 'Complete'}</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Mobile Tutor Chat Sheet (< 1024px only; desktop shows Tutor chat inside persistent sidebar) */}
      {chatOpen && (
        <div
          className={`${classes.dialogBackdrop} ${classes.mobileChatModalOnly}`}
          onClick={() => setChatOpen(false)}
        >
          <div
            className={classes.dialogCard}
            style={{ padding: '16px 18px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderChatBody()}
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {exportModalOpened && (
        <div
          className={classes.dialogBackdrop}
          onClick={() => setExportModalOpened(false)}
        >
          <div
            className={classes.dialogCard}
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--kp-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '17px',
                  fontWeight: 700,
                }}
              >
                Export options
              </span>
              <button
                type="button"
                onClick={() => setExportModalOpened(false)}
                aria-label="Close export options"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IconX size={16} stroke={1.8} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleAPIBasedExport}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--kp-mint)',
                    color: 'var(--kp-success-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconBolt size={18} stroke={1.9} />
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Fast export</div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Quick .pdf generation
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleClientSidePrint}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--kp-apricot)',
                    color: 'var(--kp-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconAward size={18} stroke={1.9} />
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>High-quality print</div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Clean typography &amp; math layout
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Image Lightbox */}
      {zoomImageSrc && (
        <div
          className={classes.dialogBackdrop}
          style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3200 }}
          onClick={() => setZoomImageSrc(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImageSrc(null)}
            aria-label="Close zoomed image"
            style={{
              position: 'fixed',
              top: '18px',
              right: '18px',
              width: '42px',
              height: '42px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(24, 24, 27, 0.85)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={20} />
          </button>
          <img
            src={zoomImageSrc}
            alt="Zoomed diagram"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '94vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: '12px',
            }}
          />
        </div>
      )}
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
}
