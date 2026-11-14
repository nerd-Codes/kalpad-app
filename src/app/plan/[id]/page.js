// src/app/plan/[id]/page.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  IconArchive,
  IconBrain,
  IconChartLine,
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconDownload,
  IconFlame,
  IconRefresh,
  IconShare3,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { differenceInCalendarDays, format, isToday, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import supabase from '@/lib/supabaseClient';
import { getDayNoteSections } from '@/lib/dayNotes';
import { wittyFacts as cramSheetFacts } from '@/lib/newplanFacts';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { TimelineDayCard } from '@/components/TimelineDayCard';
import { RegeneratePlanModal } from '@/components/RegeneratePlanModal';
import { QuizOrchestratorModal } from '@/components/QuizOrchestratorModal';
import { forgeCramSheetBYOK } from '@/lib/byok/pipelines/cramSheetForger';
import classes from '@/components/plans/PlanDetail.module.css';

function formatSafeDate(dateStr, pattern = 'd MMM yyyy') {
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr || '';
  }
}

function DayPill({ topic, selected, compact, onClick }) {
  let isCurrent = false;
  try {
    isCurrent = Boolean(topic.date && isToday(parseISO(topic.date)));
  } catch {
    isCurrent = false;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={compact ? classes.dayPillCompact : classes.dayPill}
      style={{
        backgroundColor: selected
          ? 'var(--kp-apricot)'
          : isCurrent
            ? 'var(--kp-butter)'
            : 'var(--kp-canvas)',
        border: selected
          ? '1.5px solid var(--kp-orange)'
          : isCurrent
            ? '1px solid var(--kp-border-strong)'
            : '1px solid var(--kp-border)',
        transform: selected ? 'scale(1)' : 'scale(0.96)',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: selected ? 'var(--kp-accent-ink)' : 'var(--kp-muted)',
        }}
      >
        Day
      </span>
      <span
        style={{
          fontFamily: 'var(--font-kp-mono)',
          fontSize: compact ? '15px' : '18px',
          fontWeight: 700,
          lineHeight: 1.1,
          color: selected || isCurrent ? 'var(--kp-accent-ink)' : 'var(--kp-ink)',
        }}
      >
        {topic.day}
      </span>
      {isCurrent && !selected && (
        <span
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '999px',
            backgroundColor: 'var(--kp-orange)',
          }}
        />
      )}
    </button>
  );
}

function OverviewCard({ dayTopic, completedTasks, totalTasks, progressPercent }) {
  return (
    <section
      style={{
        borderRadius: '20px',
        backgroundColor: 'var(--kp-mint)',
        border: '1px solid var(--kp-border)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <IconChartLine size={17} stroke={1.9} color="var(--kp-ink)" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--kp-ink)',
            }}
          >
            STUDY PATH
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-kp-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--kp-ink)',
          }}
        >
          {progressPercent}%
        </span>
      </div>

      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
        }}
      >
        {completedTasks} of {totalTasks} topics complete
      </div>

      <KalPadProgress value={progressPercent} height={5} color="var(--kp-primary)" />

      {dayTopic && (
        <div style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
          Day {dayTopic.day} · {formatSafeDate(dayTopic.date)} ·{' '}
          {(dayTopic.sub_topics || []).length} tasks
        </div>
      )}
    </section>
  );
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const mobileScrubberRef = useRef(null);
  const desktopScrubberRef = useRef(null);

  const [quizOpened, setQuizOpened] = useState(false);
  const [regenerateModalOpened, setRegenerateModalOpened] = useState(false);
  const [shareModalOpened, setShareModalOpened] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const [isForging, setIsForging] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [cramSheet, setCramSheet] = useState(null);
  const [shareableLink, setShareableLink] = useState('');

  const scrollToDay = useCallback(
    (index) => {
      setSlideDirection(index >= selectedDayIndex ? 1 : -1);
      setSelectedDayIndex(index);

      if (mobileScrubberRef.current) {
        const scrollPos = index * 62 - mobileScrubberRef.current.clientWidth / 2 + 27;
        mobileScrubberRef.current.scrollTo({
          left: Math.max(0, scrollPos),
          behavior: 'smooth',
        });
      }
      if (desktopScrubberRef.current) {
        const scrollPos = index * 72 - desktopScrubberRef.current.clientWidth / 2 + 32;
        desktopScrubberRef.current.scrollTo({
          left: Math.max(0, scrollPos),
          behavior: 'smooth',
        });
      }
    },
    [selectedDayIndex]
  );

  const fetchPlanData = useCallback(
    async (activeSession) => {
      if (!activeSession || !planId) {
        setError(planId ? 'Please sign in to open this plan.' : 'Plan ID not found.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('study_plans')
          .select(
            `
            id, exam_name, exam_date, syllabus, generation_context, is_active,
            plan_topics (
              *,
              curated_lectures ( plan_topic_id, sub_topic_text, video_url ),
              topic_confidence ( score, activity_type ),
              new_notes:generated_notes ( * )
            ),
            generated_cram_sheets ( id, status )
          `
          )
          .eq('id', planId)
          .eq('user_id', activeSession.user.id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Plan not found or permission denied.');

        data.plan_topics = [...(data.plan_topics || [])].sort((a, b) => a.day - b.day);
        setPlan(data);
        setCramSheet(data.generated_cram_sheets?.[0] || null);

        let initialDayIndex = data.plan_topics.findIndex((t) => {
          try {
            return Boolean(t.date && isToday(parseISO(t.date)));
          } catch {
            return false;
          }
        });
        if (initialDayIndex === -1) initialDayIndex = 0;

        setSelectedDayIndex(initialDayIndex);
        setTimeout(() => {
          if (mobileScrubberRef.current) {
            const pos = initialDayIndex * 62 - mobileScrubberRef.current.clientWidth / 2 + 27;
            mobileScrubberRef.current.scrollTo({ left: Math.max(0, pos), behavior: 'smooth' });
          }
          if (desktopScrubberRef.current) {
            const pos = initialDayIndex * 72 - desktopScrubberRef.current.clientWidth / 2 + 32;
            desktopScrubberRef.current.scrollTo({ left: Math.max(0, pos), behavior: 'smooth' });
          }
        }, 250);

        if (typeof window !== 'undefined' && window.Android?.cachePlanForOffline) {
          window.Android.cachePlanForOffline(JSON.stringify(data));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [planId]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data?.session || null;
      setSession(currentSession);
      if (currentSession && planId) {
        fetchPlanData(currentSession);
      } else {
        setLoading(false);
      }
    });
  }, [planId, fetchPlanData]);

  const handleUpdateTopic = (planTopicId, updates) => {
    setPlan((currentPlan) => {
      if (!currentPlan) return currentPlan;
      return {
        ...currentPlan,
        plan_topics: currentPlan.plan_topics.map((topic) =>
          topic.id === planTopicId ? { ...topic, ...updates } : topic
        ),
      };
    });

    supabase
      .from('plan_topics')
      .update(updates)
      .eq('id', planTopicId)
      .then(({ error: updateError }) => {
        if (updateError) console.error(updateError);
      });
  };

  const handleSharePlan = async () => {
    if (!plan) return;
    setIsSharing(true);
    setShareableLink('');
    setCopiedShareLink(false);
    try {
      const response = await fetch('/api/share-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Share failed.');
      const { public_id } = await response.json();
      setShareableLink(`${window.location.origin}/shared/${public_id}`);
      setShareModalOpened(true);
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleForgeCramSheet = async () => {
    if (!plan) return;
    setIsForging(true);
    let wittyMessageIndex = 0;
    const notificationId = notifications.show({
      loading: true,
      title: 'Building cram sheet...',
      message: cramSheetFacts[0],
      autoClose: false,
      withCloseButton: false,
    });
    const wittyInterval = setInterval(() => {
      wittyMessageIndex = (wittyMessageIndex + 1) % cramSheetFacts.length;
      notifications.update({ id: notificationId, message: cramSheetFacts[wittyMessageIndex] });
    }, 5000);

    try {
      await forgeCramSheetBYOK({
        planId: plan.id,
        onEvent: async (message) => {
          if (message.type === 'status') {
            notifications.update({
              id: notificationId,
              title: message.data?.title || 'Building cram sheet...',
            });
          } else if (message.type === 'complete') {
            clearInterval(wittyInterval);
            notifications.update({
              id: notificationId,
              loading: false,
              title: 'Cram sheet ready',
              message: 'Opening your revision summary.',
              color: 'teal',
              autoClose: 4500,
            });
            await fetchPlanData(session);
            router.push(`/cram-sheet/${message.data.cramSheetId}`);
          } else if (message.type === 'error') {
            throw new Error(message.data?.message || 'Cram sheet failed');
          }
        },
      });
    } catch (err) {
      clearInterval(wittyInterval);
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      notifications.update({
        id: notificationId,
        loading: false,
        title: 'Cram sheet failed',
        message:
          err?.code === 'BYOK_NOT_CONNECTED'
            ? 'Connect your ChatGPT account in the opened panel to forge your cram sheet.'
            : err?.message || 'Could not forge cram sheet.',
        color: 'red',
        autoClose: 6000,
      });
    } finally {
      setIsForging(false);
    }
  };

  const handleDownloadDayNotes = () => {
    const selectedDayTopic = plan?.plan_topics?.[selectedDayIndex];
    if (!selectedDayTopic) return;

    const printableSections = getDayNoteSections(selectedDayTopic);
    if (printableSections.length === 0) {
      notifications.show({
        title: 'No notes yet',
        message: 'Create at least one note for this day before exporting.',
        color: 'yellow',
      });
      return;
    }

    const printWindow = window.open(`/print/day/${selectedDayTopic.id}`, '_blank');
    if (!printWindow) {
      notifications.show({
        title: 'Popup blocked',
        message: 'Please allow popups to export the day notes.',
        color: 'yellow',
      });
      return;
    }

    const handleMessage = (event) => {
      if (event.source === printWindow && event.data === 'KALPAD_PRINT_READY') {
        printWindow.print();
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

  const topics = useMemo(() => plan?.plan_topics || [], [plan]);
  const selectedDayTopic = topics[selectedDayIndex] || null;
  const selectedDayNoteCount = selectedDayTopic ? getDayNoteSections(selectedDayTopic).length : 0;
  const canDownloadSelectedDayNotes = selectedDayNoteCount > 0;

  const { totalTasks, completedTasks, planProgress, daysLeft } = useMemo(() => {
    const total = topics.reduce((acc, t) => acc + (t.sub_topics || []).length, 0);
    const done = topics.reduce(
      (acc, t) => acc + (t.sub_topics || []).filter((s) => s.completed).length,
      0
    );
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    let remaining = null;
    if (plan?.exam_date) {
      try {
        remaining = differenceInCalendarDays(parseISO(plan.exam_date), new Date());
      } catch {
        remaining = null;
      }
    }
    return { totalTasks: total, completedTasks: done, planProgress: pct, daysLeft: remaining };
  }, [topics, plan]);

  const cramSheetLabel = isForging
    ? 'Forging...'
    : cramSheet?.status === 'complete'
      ? 'View sheet'
      : 'Cram sheet';

  const handleCramSheetAction = () => {
    if (cramSheet?.status === 'complete') {
      router.push(`/cram-sheet/${cramSheet.id}`);
    } else {
      handleForgeCramSheet();
    }
  };

  const handleJumpToday = () => {
    const todayIdx = topics.findIndex((t) => {
      try {
        return Boolean(t.date && isToday(parseISO(t.date)));
      } catch {
        return false;
      }
    });
    if (todayIdx !== -1) scrollToDay(todayIdx);
  };

  const handleCopyShareLink = async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      notifications.show({ title: 'Copy failed', message: 'Select and copy the link manually.' });
    }
  };

  return (
    <KalPadShell session={session} maxWidth="1320px">
      {loading ? (
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'var(--kp-surface)',
            border: '1px solid var(--kp-border)',
            padding: '28px',
            color: 'var(--kp-secondary)',
            fontSize: '14px',
          }}
        >
          Opening study plan...
        </div>
      ) : !plan || !plan.is_active ? (
        <section
          style={{
            maxWidth: '520px',
            margin: '48px auto 0',
            borderRadius: '20px',
            backgroundColor: 'var(--kp-surface)',
            border: '1px solid var(--kp-border)',
            padding: '28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '999px',
              backgroundColor: 'var(--kp-error-subtle)',
              color: 'var(--kp-error-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconArchive size={26} stroke={1.8} />
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            Plan archived
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.5,
              color: 'var(--kp-secondary)',
            }}
          >
            {error || 'This plan was archived or deleted. It is no longer active.'}
          </p>
          <Link
            href="/plans"
            style={{
              marginTop: '6px',
              height: '44px',
              padding: '0 18px',
              borderRadius: '14px',
              backgroundColor: 'var(--kp-raised)',
              border: '1px solid var(--kp-border)',
              color: 'var(--kp-ink)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            Return to plans
          </Link>
        </section>
      ) : (
        <div className={classes.page}>
          {/* Header */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Link
                href="/plans"
                aria-label="Back to plans"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                  color: 'var(--kp-ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  textDecoration: 'none',
                }}
              >
                <IconChevronLeft size={20} stroke={1.9} />
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-secondary)',
                  }}
                >
                  ACTIVE STUDY PLAN
                </div>
                <h1
                  style={{
                    margin: '2px 0 0 0',
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: 'clamp(1.45rem, 3vw, 2rem)',
                    lineHeight: 1.18,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--kp-ink)',
                    wordBreak: 'break-word',
                  }}
                >
                  {plan.exam_name}
                </h1>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '10px',
                  }}
                >
                  {daysLeft !== null && (
                    <span
                      style={{
                        borderRadius: '8px',
                        backgroundColor:
                          daysLeft <= 7 ? 'var(--kp-error-subtle)' : 'var(--kp-apricot)',
                        color: daysLeft <= 7 ? 'var(--kp-error-ink)' : 'var(--kp-primary)',
                        padding: '4px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {daysLeft <= 0 ? 'Exam today' : `${daysLeft} days left`}
                    </span>
                  )}
                  <span
                    style={{
                      borderRadius: '8px',
                      backgroundColor: 'var(--kp-raised)',
                      color: 'var(--kp-secondary)',
                      padding: '4px 9px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {topics.length} study days
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: planProgress === 100 ? 'var(--kp-success-ink)' : 'var(--kp-primary)',
                      marginLeft: 'auto',
                    }}
                  >
                    {completedTasks}/{totalTasks} tasks ({planProgress}%)
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile Day Scrubber */}
          <div className={classes.mobileOnly}>
            <div ref={mobileScrubberRef} className={classes.scrubberStrip}>
              {topics.map((topic, index) => (
                <DayPill
                  key={topic.id}
                  topic={topic}
                  selected={index === selectedDayIndex}
                  compact={true}
                  onClick={() => scrollToDay(index)}
                />
              ))}
            </div>
          </div>

          {/* Desktop Timeline Scrubber Card */}
          <div className={classes.desktopOnly}>
            <section
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  borderBottom: '1px solid var(--kp-border)',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-secondary)',
                  }}
                >
                  Timeline
                </span>
                <button
                  type="button"
                  onClick={handleJumpToday}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--kp-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  Jump to today
                </button>
              </div>
              <div
                ref={desktopScrubberRef}
                className={classes.scrubberStrip}
                style={{ padding: '14px 16px' }}
              >
                {topics.map((topic, index) => (
                  <DayPill
                    key={topic.id}
                    topic={topic}
                    selected={index === selectedDayIndex}
                    compact={false}
                    onClick={() => scrollToDay(index)}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Mobile Overview Card & Action Ribbon */}
          <div className={classes.mobileStack}>
            <OverviewCard
              dayTopic={selectedDayTopic}
              completedTasks={completedTasks}
              totalTasks={totalTasks}
              progressPercent={planProgress}
            />

            <div className={classes.ribbonRow}>
              <button
                type="button"
                onClick={() => setQuizOpened(true)}
                className={classes.ribbonPill}
                style={{
                  backgroundColor: 'var(--kp-apricot)',
                  border: '1px solid var(--kp-border-strong)',
                  color: 'var(--kp-primary)',
                }}
              >
                <IconBrain size={15} stroke={1.9} />
                <span>Start quiz</span>
              </button>

              <button
                type="button"
                disabled={isForging}
                onClick={handleCramSheetAction}
                className={classes.ribbonPill}
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                  color: 'var(--kp-ink)',
                }}
              >
                <IconFlame size={15} stroke={1.9} />
                <span>{cramSheetLabel}</span>
              </button>

              <button
                type="button"
                disabled={!canDownloadSelectedDayNotes}
                onClick={handleDownloadDayNotes}
                className={classes.ribbonPill}
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                  color: 'var(--kp-ink)',
                }}
              >
                <IconDownload size={15} stroke={1.9} />
                <span>Day notes PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setRegenerateModalOpened(true)}
                className={classes.ribbonPill}
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                  color: 'var(--kp-ink)',
                }}
              >
                <IconRefresh size={15} stroke={1.9} />
                <span>Refine plan</span>
              </button>

              <button
                type="button"
                disabled={isSharing}
                onClick={handleSharePlan}
                className={classes.ribbonPill}
                style={{
                  backgroundColor: 'var(--kp-raised)',
                  border: '1px solid var(--kp-border)',
                  color: 'var(--kp-ink)',
                }}
              >
                <IconShare3 size={15} stroke={1.9} />
                <span>{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Main Desktop Two-Column Split (Left Day Card / Right Context Rail) */}
          <div className={classes.desktopSplit}>
            <div style={{ minWidth: 0 }}>
              {selectedDayTopic ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedDayTopic.id}
                    initial={{ opacity: 0, x: slideDirection * 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDirection * -18 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  >
                    <TimelineDayCard
                      plan={plan}
                      dayTopic={selectedDayTopic}
                      onUpdate={handleUpdateTopic}
                      setPlan={setPlan}
                      isInitiallyCollapsed={false}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div
                  style={{
                    borderRadius: '20px',
                    backgroundColor: 'var(--kp-surface)',
                    border: '1px solid var(--kp-border)',
                    padding: '24px',
                    color: 'var(--kp-secondary)',
                    fontSize: '14px',
                  }}
                >
                  No topics found for this day.
                </div>
              )}
            </div>

            {/* Desktop Context Rail */}
            <aside className={classes.desktopStack}>
              <OverviewCard
                dayTopic={selectedDayTopic}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                progressPercent={planProgress}
              />

              <section
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-surface)',
                  border: '1px solid var(--kp-border)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-secondary)',
                    marginBottom: '2px',
                  }}
                >
                  Actions
                </div>

                <button
                  type="button"
                  onClick={() => setQuizOpened(true)}
                  className={`${classes.railActionBtn} kp-tactile`}
                  style={{
                    backgroundColor: 'var(--kp-apricot)',
                    border: '1px solid var(--kp-border-strong)',
                    color: 'var(--kp-primary)',
                  }}
                >
                  <IconBrain size={16} stroke={1.9} />
                  <span>Start Quiz</span>
                </button>

                <button
                  type="button"
                  disabled={isForging}
                  onClick={handleCramSheetAction}
                  className={`${classes.railActionBtn} kp-tactile`}
                  style={{
                    backgroundColor: 'var(--kp-raised)',
                    border: '1px solid var(--kp-border)',
                    color: 'var(--kp-ink)',
                  }}
                >
                  <IconFlame size={16} stroke={1.9} />
                  <span>
                    {cramSheet?.status === 'complete' ? 'View Cram Sheet' : 'Forge Cram Sheet'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!canDownloadSelectedDayNotes}
                  onClick={handleDownloadDayNotes}
                  className={classes.railActionBtn}
                  style={{
                    backgroundColor: 'var(--kp-raised)',
                    border: '1px solid var(--kp-border)',
                    color: 'var(--kp-ink)',
                  }}
                >
                  <IconDownload size={16} stroke={1.9} />
                  <span>Download Day Notes</span>
                </button>

                <button
                  type="button"
                  disabled={isSharing}
                  onClick={handleSharePlan}
                  className={classes.railActionBtn}
                  style={{
                    backgroundColor: 'var(--kp-raised)',
                    border: '1px solid var(--kp-border)',
                    color: 'var(--kp-ink)',
                  }}
                >
                  <IconShare3 size={16} stroke={1.9} />
                  <span>{isSharing ? 'Sharing...' : 'Share'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegenerateModalOpened(true)}
                  className={classes.railActionBtn}
                  style={{
                    backgroundColor: 'var(--kp-raised)',
                    border: '1px solid var(--kp-border)',
                    color: 'var(--kp-ink)',
                  }}
                >
                  <IconRefresh size={16} stroke={1.9} />
                  <span>Refine Plan</span>
                </button>
              </section>

              {selectedDayTopic && (
                <section
                  style={{
                    borderRadius: '20px',
                    backgroundColor: 'var(--kp-surface)',
                    border: '1px solid var(--kp-border)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    Details
                  </div>
                  <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--kp-secondary)' }}>Date</span>
                    <span style={{ fontWeight: 600, color: 'var(--kp-ink)' }}>
                      {formatSafeDate(selectedDayTopic.date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--kp-secondary)' }}>Tasks</span>
                    <span style={{ fontWeight: 600, color: 'var(--kp-ink)' }}>
                      {(selectedDayTopic.sub_topics || []).length} items
                    </span>
                  </div>
                  {plan.exam_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--kp-secondary)' }}>Exam date</span>
                      <span style={{ fontWeight: 600, color: 'var(--kp-ink)' }}>
                        {formatSafeDate(plan.exam_date)}
                      </span>
                    </div>
                  )}
                </section>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuizOrchestratorModal
        opened={quizOpened}
        onClose={() => setQuizOpened(false)}
        planTopicId={selectedDayTopic?.id}
      />

      <RegeneratePlanModal
        opened={regenerateModalOpened}
        onClose={() => setRegenerateModalOpened(false)}
        plan={plan}
      />

      {shareModalOpened && (
        <div
          onClick={() => setShareModalOpened(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Share plan"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3500,
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
              maxWidth: '440px',
              borderRadius: '20px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              color: 'var(--kp-ink)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                }}
              >
                Share plan
              </h2>
              <button
                type="button"
                onClick={() => setShareModalOpened(false)}
                aria-label="Close share dialog"
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
              Anyone with this link can view a read-only copy of this study plan.
            </p>

            <input
              type="text"
              readOnly
              value={shareableLink}
              onClick={(e) => e.currentTarget.select()}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 12px',
                borderRadius: '12px',
                border: '1px solid var(--kp-border)',
                backgroundColor: 'var(--kp-raised)',
                color: 'var(--kp-ink)',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
              }}
            />

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="kp-tactile"
              style={{
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: copiedShareLink ? 'var(--kp-mint)' : 'var(--kp-primary)',
                color: copiedShareLink ? 'var(--kp-success-ink)' : 'var(--kp-on-primary)',
                fontSize: '14px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                cursor: 'pointer',
              }}
            >
              {copiedShareLink ? <IconCheck size={16} /> : <IconCopy size={16} />}
              <span>{copiedShareLink ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>
      )}
    </KalPadShell>
  );
}
