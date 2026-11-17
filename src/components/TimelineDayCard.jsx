// src/components/TimelineDayCard.jsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconListCheck,
  IconLock,
  IconPencilPlus,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import { differenceInCalendarDays, isToday, parseISO } from 'date-fns';
import { notifications } from '@mantine/notifications';
import supabase from '@/lib/supabaseClient';
import { useLoading } from '@/context/LoadingContext';
import { useGeneration } from '@/context/GenerationContext';
import { useGuest } from '@/context/GuestContext';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { generateNoteBYOK } from '@/lib/byok/pipelines/notesGenerator';
import { SubTopicMathText } from '@/components/common/SubTopicMathText';
import { FullscreenNoteViewer } from './FullscreenNoteViewer';
import { QuizOrchestratorModal } from './QuizOrchestratorModal';

function typeStyle(type) {
  switch (type?.toLowerCase()) {
    case 'concept':
      return { bg: 'var(--kp-butter)', fg: 'var(--kp-ink)' };
    case 'problem-solving':
      return { bg: 'var(--kp-apricot)', fg: 'var(--kp-primary)' };
    case 'derivation':
    case 'review':
      return { bg: 'var(--kp-mint)', fg: 'var(--kp-success-ink)' };
    default:
      return { bg: 'var(--kp-raised)', fg: 'var(--kp-secondary)' };
  }
}

export function TimelineDayCard({
  plan,
  dayTopic,
  onUpdate,
  isInitiallyCollapsed,
  onNoteGenerated,
  viewMode = 'plan',
  isReadOnly = false,
  onConfirmBulkGenerate,
  isGuestMode = false,
  setPlan,
}) {
  const { setIsLoading } = useLoading();
  const { startNoteGeneration } = useGeneration();
  const { guestArtifact, updateGuestNote } = useGuest();

  const [userTier, setUserTier] = useState('free');

  useEffect(() => {
    const checkTier = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (data) setUserTier(data.tier);
    };
    checkTier();
  }, []);

  const isNoteGenerationLocked = isGuestMode
    ? (guestArtifact?.generatedNotes?.length || 0) >= 1
    : userTier === 'free' && !isToday(parseISO(dayTopic.date));

  const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
  const [detailsOpened, setDetailsOpened] = useState(!isInitiallyCollapsed);
  const [noteToView, setNoteToView] = useState(null);

  const [bulkNoteModalOpened, setBulkNoteModalOpened] = useState(false);
  const [bulkNoteSelection, setBulkNoteSelection] = useState([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [quizOpened, setQuizOpened] = useState(false);

  const [internalSubTopics, setInternalSubTopics] = useState(dayTopic.sub_topics || []);
  const [localNotes, setLocalNotes] = useState(dayTopic.new_notes || []);

  useEffect(() => {
    setInternalSubTopics(dayTopic.sub_topics || []);
  }, [dayTopic.sub_topics]);

  useEffect(() => {
    setLocalNotes(dayTopic.new_notes || []);
  }, [dayTopic.new_notes]);

  const completedCount = internalSubTopics.filter((s) => s.completed).length;
  const totalCount = internalSubTopics.length;
  const allTopicsCompleted = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCheckboxChange = (subTopicIndex, isChecked) => {
    if (isReadOnly) return;
    const newSubTopics = internalSubTopics.map((sub, index) =>
      index === subTopicIndex ? { ...sub, completed: isChecked } : sub
    );
    setInternalSubTopics(newSubTopics);
    onUpdate(dayTopic.id, { sub_topics: newSubTopics });
  };

  const patchNoteLocally = (noteId, patch) => {
    if (!noteId) return;

    setLocalNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, ...patch } : note))
    );
    setNoteToView((currentNote) =>
      currentNote?.id === noteId ? { ...currentNote, ...patch } : currentNote
    );

    if (!setPlan) return;

    setPlan((currentPlan) => {
      const nextPlanTopics = currentPlan.plan_topics.map((topic) => {
        if (topic.id !== dayTopic.id) return topic;
        return {
          ...topic,
          new_notes: (topic.new_notes || []).map((note) =>
            note.id === noteId ? { ...note, ...patch } : note
          ),
        };
      });
      return { ...currentPlan, plan_topics: nextPlanTopics };
    });
  };

  const handleGenerateNotes = async (subTopicText) => {
    if (isGuestMode) {
      const currentNotes = guestArtifact?.generatedNotes || [];
      if (currentNotes.length >= 1) {
        notifications.show({
          title: 'Guest limit',
          message: 'Sign up to generate unlimited notes.',
          color: 'orange',
        });
        return;
      }
    }

    setGeneratingNotesFor(subTopicText);
    try {
      const newNote = await startNoteGeneration({
        planTopicId: isGuestMode ? 0 : dayTopic.id,
        subTopicText,
        examName: plan.exam_name,
        dayTopic: dayTopic.topic_name,
        isGuest: isGuestMode,
      });

      if (!newNote) return;

      if (isGuestMode) {
        updateGuestNote(dayTopic.day, subTopicText, newNote.notes_markdown);
        notifications.show({
          title: 'Sample note ready',
          message: 'Sign up to save notes across devices.',
          color: 'teal',
        });
      } else {
        setLocalNotes((currentNotes) => {
          const existingNoteIndex = currentNotes.findIndex(
            (n) => n.sub_topic_text === subTopicText
          );
          if (existingNoteIndex > -1) {
            const updatedNotes = [...currentNotes];
            updatedNotes[existingNoteIndex] = newNote;
            return updatedNotes;
          }
          return [...currentNotes, newNote];
        });
      }

      if (!isGuestMode && setPlan) {
        setPlan((currentPlan) => {
          const newPlanTopics = currentPlan.plan_topics.map((topic) => {
            if (topic.id === dayTopic.id) {
              const existingNotes = topic.new_notes || [];
              const existingNoteIndex = existingNotes.findIndex(
                (n) => n.sub_topic_text === subTopicText
              );
              let updatedNotes;
              if (existingNoteIndex > -1) {
                updatedNotes = [...existingNotes];
                updatedNotes[existingNoteIndex] = newNote;
              } else {
                updatedNotes = [...existingNotes, newNote];
              }
              return { ...topic, new_notes: updatedNotes };
            }
            return topic;
          });
          return { ...currentPlan, plan_topics: newPlanTopics };
        });
        notifications.show({
          title: 'Note ready',
          message: 'Added to your study day.',
          color: 'teal',
        });
      } else if (!isGuestMode) {
        if (onNoteGenerated) await onNoteGenerated();
      }
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      notifications.show({
        title: 'Error',
        message:
          err?.code === 'BYOK_NOT_CONNECTED'
            ? 'Connect your ChatGPT account in the opened panel to generate notes.'
            : err?.message || 'Failed to create note.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
      setGeneratingNotesFor(null);
    }
  };

  const handleConfirmBulkGenerate = async () => {
    if (bulkNoteSelection.length === 0) return;

    if (onConfirmBulkGenerate) {
      setIsBulkGenerating(true);
      setBulkNoteModalOpened(false);
      try {
        await onConfirmBulkGenerate(dayTopic, bulkNoteSelection);
      } finally {
        setIsBulkGenerating(false);
        setBulkNoteSelection([]);
      }
      return;
    }

    setIsBulkGenerating(true);
    setBulkNoteModalOpened(false);
    let completedBulkCount = 0;
    const notificationId = `bulk-notes-${dayTopic.id}`;

    notifications.show({
      id: notificationId,
      loading: true,
      title: `Writing notes... (0/${bulkNoteSelection.length})`,
      message: 'Starting...',
      autoClose: false,
      withCloseButton: false,
    });

    const newlyGeneratedNotes = [];

    for (const subTopicText of bulkNoteSelection) {
      try {
        const { note } = await generateNoteBYOK({
          planTopicId: dayTopic.id,
          subTopicText,
          examName: plan.exam_name,
          dayTopic: dayTopic.topic_name,
          isGuest: false,
        });
        if (note) {
          newlyGeneratedNotes.push(note);
          completedBulkCount += 1;
          notifications.update({
            id: notificationId,
            title: `Writing notes... (${completedBulkCount}/${bulkNoteSelection.length})`,
            message: `Ready: ${subTopicText}`,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (err) {
        if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-byok-chat'));
          notifications.update({
            id: notificationId,
            loading: false,
            title: 'Connect ChatGPT for bulk notes',
            message: 'Sign in with ChatGPT in the opened panel, then retry.',
            color: 'orange',
            autoClose: 5000,
          });
          break;
        }
        console.error(err);
      }
    }

    if (setPlan && newlyGeneratedNotes.length > 0) {
      setPlan((currentPlan) => {
        const newPlanTopics = currentPlan.plan_topics.map((topic) => {
          if (topic.id === dayTopic.id) {
            const existingNotes = new Map(
              (topic.new_notes || []).map((n) => [n.sub_topic_text, n])
            );
            newlyGeneratedNotes.forEach((n) => existingNotes.set(n.sub_topic_text, n));
            return { ...topic, new_notes: Array.from(existingNotes.values()) };
          }
          return topic;
        });
        return { ...currentPlan, plan_topics: newPlanTopics };
      });
    }

    if (newlyGeneratedNotes.length > 0) {
      setLocalNotes((currentNotes) => {
        const existingNotes = new Map(currentNotes.map((note) => [note.sub_topic_text, note]));
        newlyGeneratedNotes.forEach((note) => existingNotes.set(note.sub_topic_text, note));
        return Array.from(existingNotes.values());
      });
    }

    notifications.update({
      id: notificationId,
      loading: false,
      color: 'teal',
      title: 'Notes ready',
      message: `Created ${completedBulkCount} study notes.`,
      autoClose: 5000,
    });
    setIsBulkGenerating(false);
    setBulkNoteSelection([]);
  };

  const daysLeft = differenceInCalendarDays(new Date(plan.exam_date), new Date());

  return (
    <div style={{ marginBottom: viewMode === 'dashboard' ? '16px' : 0 }}>
      {viewMode === 'dashboard' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            gap: '8px',
          }}
        >
          {!isGuestMode ? (
            <Link
              href={`/plan/${plan.id}`}
              style={{
                textDecoration: 'none',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              {plan.exam_name}
            </Link>
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              {plan.exam_name}
            </span>
          )}
          <span
            style={{
              borderRadius: '8px',
              backgroundColor: daysLeft <= 7 ? 'var(--kp-error-subtle)' : 'var(--kp-apricot)',
              color: daysLeft <= 7 ? 'var(--kp-error-ink)' : 'var(--kp-primary)',
              padding: '4px 8px',
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {daysLeft > 0 ? `${daysLeft}d left` : 'EXAM DAY'}
          </span>
        </div>
      )}

      {/* Quiet Study Desk Day Card */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Header Badges + Bulk + Expand */}
        <div
          onClick={() => setDetailsOpened((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--kp-apricot)',
                color: 'var(--kp-primary)',
                padding: '4px 8px',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              DAY {dayTopic.day}
            </span>

            <span
              style={{
                borderRadius: '8px',
                backgroundColor: allTopicsCompleted ? 'var(--kp-mint)' : 'var(--kp-raised)',
                color: allTopicsCompleted ? 'var(--kp-success-ink)' : 'var(--kp-secondary)',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {allTopicsCompleted
                ? `All ${totalCount} done`
                : `${completedCount} of ${totalCount} done`}
            </span>

            {dayTopic.day_difficulty && (
              <span
                style={{
                  borderRadius: '8px',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-muted)',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {dayTopic.day_difficulty}
              </span>
            )}
          </div>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {!isReadOnly && !isGuestMode && totalCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (isNoteGenerationLocked) {
                    window.dispatchEvent(new CustomEvent('open-upgrade-modal'));
                  } else {
                    setBulkNoteModalOpened(true);
                  }
                }}
                disabled={isBulkGenerating}
                className="kp-tactile"
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: isNoteGenerationLocked
                    ? 'var(--kp-butter)'
                    : 'var(--kp-raised)',
                  color: isNoteGenerationLocked ? 'var(--kp-primary)' : 'var(--kp-ink)',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                {isNoteGenerationLocked ? <IconLock size={13} /> : <IconListCheck size={14} />}
                <span>
                  {isBulkGenerating
                    ? 'Creating...'
                    : isNoteGenerationLocked
                      ? 'Unlock bulk'
                      : 'Bulk notes'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDetailsOpened((v) => !v)}
              aria-label={detailsOpened ? 'Collapse day topics' : 'Expand day topics'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--kp-border)',
                backgroundColor: 'var(--kp-raised)',
                color: 'var(--kp-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IconChevronDown
                size={16}
                style={{
                  transform: detailsOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 160ms ease',
                }}
              />
            </button>
          </div>
        </div>

        {/* Topic Title & Progress */}
        <div>
          <h2
            style={{
              margin: '0 0 10px 0',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '19px',
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--kp-ink)',
            }}
          >
            {dayTopic.topic_name}
          </h2>
          <KalPadProgress
            value={progressPct}
            color={allTopicsCompleted ? 'var(--kp-success-ink)' : 'var(--kp-primary)'}
            height={5}
          />
        </div>

        {dayTopic.day_summary && (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.55,
              color: 'var(--kp-secondary)',
            }}
          >
            {dayTopic.day_summary}
          </p>
        )}

        {/* Subtopics Checklist */}
        <AnimatePresence initial={false}>
          {detailsOpened && (
            <motion.div
              key="subtopics-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '2px',
              }}
            >
            {internalSubTopics.map((subTopic, index) => {
              const guestNote = isGuestMode
                ? guestArtifact?.generatedNotes?.find((n) => n.sub_topic_text === subTopic.text)
                : null;
              const v2Note = localNotes.find((n) => n.sub_topic_text === subTopic.text);
              const v1Note =
                index === 0 && dayTopic.generated_notes
                  ? { notes_markdown: dayTopic.generated_notes, sub_topic_text: subTopic.text }
                  : null;
              const existingNote = isGuestMode ? guestNote : v2Note || v1Note;
              const lecture = dayTopic.curated_lectures?.find(
                (l) => l.sub_topic_text === subTopic.text
              );
              const isGeneratingThis = generatingNotesFor === subTopic.text;
              const badgeStyle = typeStyle(subTopic.type);

              return (
                <div
                  key={`${dayTopic.id}-sub-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 10px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--kp-canvas)',
                    border: '1px solid var(--kp-border)',
                  }}
                >
                  {/* PlanCircularCheckbox */}
                  <motion.button
                    type="button"
                    disabled={isReadOnly}
                    whileTap={isReadOnly ? undefined : { scale: 0.88 }}
                    animate={subTopic.completed ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => handleCheckboxChange(index, !subTopic.completed)}
                    aria-label={
                      subTopic.completed
                        ? `Mark ${subTopic.text} incomplete`
                        : `Mark ${subTopic.text} complete`
                    }
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '999px',
                      border: `1.5px solid ${
                        subTopic.completed ? 'var(--kp-success-ink)' : 'var(--kp-secondary)'
                      }`,
                      backgroundColor: subTopic.completed ? 'var(--kp-mint)' : 'transparent',
                      color: 'var(--kp-success-ink)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: isReadOnly ? 'default' : 'pointer',
                      padding: 0,
                      transition: 'background-color 160ms ease, border-color 160ms ease',
                    }}
                  >
                    {subTopic.completed && <IconCheck size={13} stroke={2.5} />}
                  </motion.button>

                  {/* Title & Tiny Badges */}
                  <div
                    onClick={() => !isReadOnly && handleCheckboxChange(index, !subTopic.completed)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      cursor: isReadOnly ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: 1.4,
                        color: subTopic.completed ? 'var(--kp-muted)' : 'var(--kp-ink)',
                      }}
                    >
                      <SubTopicMathText text={subTopic.text} completed={subTopic.completed} />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {subTopic.type && (
                        <span
                          style={{
                            borderRadius: '6px',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.fg,
                            padding: '2px 7px',
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {subTopic.type}
                        </span>
                      )}
                      {isGeneratingThis ? (
                        <span
                          style={{
                            borderRadius: '6px',
                            backgroundColor: 'var(--kp-apricot)',
                            color: 'var(--kp-primary)',
                            padding: '2px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          Writing note...
                        </span>
                      ) : existingNote ? (
                        <span
                          style={{
                            borderRadius: '6px',
                            backgroundColor: 'var(--kp-mint)',
                            color: 'var(--kp-success-ink)',
                            padding: '2px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          Note ready
                        </span>
                      ) : null}

                      {lecture?.video_url && (
                        <a
                          href={lecture.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            borderRadius: '6px',
                            backgroundColor: 'var(--kp-raised)',
                            color: 'var(--kp-ink)',
                            padding: '2px 7px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          <IconPlayerPlay size={10} />
                          <span>Lecture</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Note Action Circle Button */}
                  {!isReadOnly && (
                    <div>
                      {existingNote ? (
                        <button
                          type="button"
                          onClick={() =>
                            setNoteToView({
                              ...existingNote,
                              sub_topic: subTopic,
                              day_topic: { ...dayTopic, new_notes: localNotes },
                              exam_name: plan.exam_name,
                            })
                          }
                          aria-label={`Read note for ${subTopic.text}`}
                          title="Read note"
                          className="kp-tactile"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid var(--kp-border-strong)',
                            backgroundColor: 'var(--kp-apricot)',
                            color: 'var(--kp-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <IconEye size={18} stroke={1.9} />
                        </button>
                      ) : isNoteGenerationLocked ? (
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                          aria-label={`Unlock note creation for ${subTopic.text}`}
                          title="Unlock notes"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid var(--kp-border)',
                            backgroundColor: 'var(--kp-raised)',
                            color: 'var(--kp-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <IconLock size={17} stroke={1.8} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isGeneratingThis}
                          onClick={() => handleGenerateNotes(subTopic.text)}
                          aria-label={`Create note for ${subTopic.text}`}
                          title="Create note"
                          className="kp-tactile"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid var(--kp-border)',
                            backgroundColor: 'var(--kp-raised)',
                            color: 'var(--kp-ink)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isGeneratingThis ? 'wait' : 'pointer',
                          }}
                        >
                          {isGeneratingThis ? (
                            <span
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '999px',
                                border: '2px solid var(--kp-border)',
                                borderTopColor: 'var(--kp-primary)',
                                animation: 'kp-spin 0.8s linear infinite',
                              }}
                            />
                          ) : (
                            <IconPencilPlus size={18} stroke={1.8} />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer Quiz CTA when all tasks complete */}
            {!isReadOnly && !isGuestMode && allTopicsCompleted && (
              <button
                type="button"
                onClick={() => setQuizOpened(true)}
                className="kp-tactile"
                style={{
                  marginTop: '6px',
                  width: '100%',
                  height: '46px',
                  borderRadius: '14px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-mint)',
                  color: 'var(--kp-success-ink)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                }}
              >
                <IconBrain size={17} stroke={1.9} />
                <span>Start daily practice quiz</span>
              </button>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <style>{`@keyframes kp-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Modals */}
      <QuizOrchestratorModal
        opened={quizOpened}
        onClose={() => setQuizOpened(false)}
        planTopicId={dayTopic.id}
      />
      <FullscreenNoteViewer
        noteData={noteToView}
        onClose={() => setNoteToView(null)}
        onUpdate={onUpdate}
        onNoteUpdate={patchNoteLocally}
        onSubTopicNoteSwitch={(resolvedPayload) => {
          if (!resolvedPayload?.id) return;
          setLocalNotes((prev) =>
            prev.some((n) => n.id === resolvedPayload.id) ? prev : [...prev, resolvedPayload]
          );
        }}
      />

      {/* Bulk Forge Dialog */}
      {bulkNoteModalOpened && (
        <div
          onClick={() => setBulkNoteModalOpened(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Bulk note forge"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3300,
            backgroundColor: 'rgba(17, 19, 23, 0.54)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '20px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              color: 'var(--kp-ink)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                }}
              >
                Bulk note forge
              </h3>
              <button
                type="button"
                onClick={() => setBulkNoteModalOpened(false)}
                aria-label="Close bulk note forge"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IconX size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--kp-secondary)' }}>
              Select topics to auto-generate notes for this day.
            </p>

            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {internalSubTopics.map((sub, i) => {
                const exists = isGuestMode
                  ? guestArtifact?.generatedNotes?.find((n) => n.sub_topic_text === sub.text)
                  : localNotes.find((n) => n.sub_topic_text === sub.text);
                const isSelected = bulkNoteSelection.includes(sub.text);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={Boolean(exists)}
                    onClick={() =>
                      setBulkNoteSelection((prev) =>
                        prev.includes(sub.text)
                          ? prev.filter((t) => t !== sub.text)
                          : [...prev, sub.text]
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      backgroundColor: exists
                        ? 'var(--kp-raised)'
                        : isSelected
                          ? 'var(--kp-apricot)'
                          : 'transparent',
                      border: `1px solid ${
                        isSelected ? 'var(--kp-primary)' : 'var(--kp-border)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: exists ? 'default' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        border: `1.5px solid ${
                          exists || isSelected ? 'var(--kp-success-ink)' : 'var(--kp-secondary)'
                        }`,
                        backgroundColor:
                          exists || isSelected ? 'var(--kp-mint)' : 'transparent',
                        color: 'var(--kp-success-ink)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {(exists || isSelected) && <IconCheck size={11} stroke={2.5} />}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        color: exists ? 'var(--kp-muted)' : 'var(--kp-ink)',
                      }}
                    >
                      <SubTopicMathText text={sub.text} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setBulkNoteModalOpened(false)}
                style={{
                  height: '40px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkGenerate}
                disabled={isBulkGenerating || bulkNoteSelection.length === 0}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor:
                    bulkNoteSelection.length > 0 && !isBulkGenerating
                      ? 'var(--kp-primary)'
                      : 'var(--kp-raised)',
                  color:
                    bulkNoteSelection.length > 0 && !isBulkGenerating
                      ? 'var(--kp-on-primary)'
                      : 'var(--kp-secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor:
                    isBulkGenerating || bulkNoteSelection.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                Start forge ({bulkNoteSelection.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
