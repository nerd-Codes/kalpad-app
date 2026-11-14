// src/app/dashboard/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay, parseISO } from 'date-fns';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import supabase from '@/lib/supabaseClient';
import { useLoading } from '@/context/LoadingContext';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import {
  EmptyStudyState,
  LoadingSessionCard,
  SessionCard,
} from '@/components/dashboard/SessionCard';
import { WeekRibbon } from '@/components/dashboard/WeekRibbon';
import { WeekDatePickerDialog } from '@/components/dashboard/WeekDatePickerDialog';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { CadenceSection } from '@/components/dashboard/CadenceSection';
import { FullscreenNoteViewer } from '@/components/FullscreenNoteViewer';
import { generateNoteBYOK } from '@/lib/byok/pipelines/notesGenerator';
import classes from '@/components/dashboard/Dashboard.module.css';

function computeStats(allPlans = []) {
  if (!allPlans || allPlans.length === 0) {
    return { plansCreated: 0, weeklyCompleted: 0, currentStreak: 0, completions: {} };
  }

  const completionsByDay = {};
  let weeklyCompleted = 0;
  const oneWeekAgo = new Date();
  oneWeekAgo.setHours(0, 0, 0, 0);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  allPlans.forEach((plan) => {
    (plan.plan_topics || []).forEach((topic) => {
      if (!topic.date || !Array.isArray(topic.sub_topics)) return;
      const completedCount = topic.sub_topics.filter((s) => s.completed).length;
      if (completedCount <= 0) return;

      const parsed = parseISO(topic.date);
      const dayKey = Number.isNaN(parsed.getTime()) ? topic.date : format(parsed, 'yyyy-MM-dd');
      completionsByDay[dayKey] = (completionsByDay[dayKey] || 0) + completedCount;
      if (!Number.isNaN(parsed.getTime()) && parsed >= oneWeekAgo) {
        weeklyCompleted += completedCount;
      }
    });
  });

  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (completionsByDay[format(cursor, 'yyyy-MM-dd')]) {
    currentStreak = 1;
    cursor.setDate(cursor.getDate() - 1);
    while (completionsByDay[format(cursor, 'yyyy-MM-dd')]) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return {
    plansCreated: allPlans.length,
    weeklyCompleted,
    currentStreak,
    completions: completionsByDay,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { setIsLoading } = useLoading();

  const [session, setSession] = useState(null);
  const [userTier, setUserTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [onlineTasks, setOnlineTasks] = useState(null);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [noteToView, setNoteToView] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      setSession(activeSession);

      if (!activeSession) {
        setPlans([]);
        setLoading(false);
        return;
      }

      const [plansRes, tierRes] = await Promise.all([
        supabase
          .from('study_plans')
          .select(
            `id, exam_name, exam_date, created_at, plan_topics ( id, day, date, topic_name, day_summary, sub_topics )`
          )
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', activeSession.user.id)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      if (plansRes.error) throw plansRes.error;
      setPlans(plansRes.data || []);
      if (tierRes.data?.tier) setUserTier(tierRes.data.tier);
    } catch (err) {
      setError(err?.message || 'Unable to load your study plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(
    async (targetDate, activeSession) => {
      if (!activeSession) {
        setOnlineTasks([]);
        setTimelineLoading(false);
        return;
      }

      setTimelineLoading(true);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      try {
        const res = await fetch(`/api/timeline?date=${dateStr}`);
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Could not load daily timeline.');
        }
        const payload = await res.json();
        const flattened = (payload.plans || []).flatMap((plan) =>
          (plan.plan_topics || []).map((topic) => ({
            planId: plan.id,
            planName: plan.exam_name,
            examDate: plan.exam_date,
            topic,
          }))
        );
        setOnlineTasks(flattened);
      } catch (err) {
        // Keep offline fallback from local plans if timeline call fails
        setOnlineTasks(null);
        setError((prev) => prev || err?.message || null);
      } finally {
        setTimelineLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchTimeline(selectedDate, session);
  }, [selectedDate, session, fetchTimeline]);

  const stats = useMemo(() => computeStats(plans), [plans]);

  const scheduledDates = useMemo(() => {
    const dates = new Set();
    plans.forEach((plan) => {
      (plan.plan_topics || []).forEach((t) => {
        if (t.date) dates.add(t.date.slice(0, 10));
      });
    });
    return dates;
  }, [plans]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const offlineTasks = useMemo(() => {
    const items = [];
    plans.forEach((plan) => {
      (plan.plan_topics || [])
        .filter((t) => (t.date || '').slice(0, 10) === selectedDateStr)
        .forEach((topic) => {
          items.push({
            planId: plan.id,
            planName: plan.exam_name,
            examDate: plan.exam_date,
            topic,
          });
        });
    });
    return items.sort((a, b) => (a.topic.day || 0) - (b.topic.day || 0));
  }, [plans, selectedDateStr]);

  const tasksToDisplay = onlineTasks !== null ? onlineTasks : offlineTasks;

  // Compute SessionCard focus topic (matching Android DashboardScreen.kt lines 159-166)
  const sessionTask = tasksToDisplay[0] || null;
  const sessionPlan =
    (sessionTask && plans.find((p) => p.id === sessionTask.planId)) || plans[0] || null;

  const nextTopic = useMemo(() => {
    if (sessionTask?.topic) return sessionTask.topic;
    if (!sessionPlan?.plan_topics) return null;
    const upcoming = sessionPlan.plan_topics
      .filter((t) => t.date && t.date.slice(0, 10) >= selectedDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] || null;
  }, [sessionTask, sessionPlan, selectedDateStr]);

  const nextTopicDate = nextTopic?.date ? parseISO(nextTopic.date) : null;
  const isSessionToday = Boolean(sessionTask && isSameDay(selectedDate, new Date()));

  const handleOpenPlan = (planId) => {
    if (!planId) return;
    setIsLoading(true);
    router.push(`/plan/${planId}`);
  };

  const handleCreatePlan = () => {
    setIsLoading(true);
    router.push('/new-plan');
  };

  const handleRefresh = () => {
    fetchPlans();
    fetchTimeline(selectedDate, session);
  };

  const handleToggleSubTopic = async (planTopicId, subTopicText, nextCompleted) => {
    let previousSubTopics = null;
    let updatedSubTopics = null;

    const applyToSubTopics = (list = []) =>
      list.map((s) => (s.text === subTopicText ? { ...s, completed: nextCompleted } : s));

    // Locate original array for safe rollback
    const sourceTopic =
      tasksToDisplay.find((t) => t.topic.id === planTopicId)?.topic ||
      plans.flatMap((p) => p.plan_topics || []).find((t) => t.id === planTopicId);

    if (!sourceTopic) return;
    previousSubTopics = sourceTopic.sub_topics || [];
    updatedSubTopics = applyToSubTopics(previousSubTopics);

    // Optimistic update across onlineTasks & plans
    setOnlineTasks((prev) =>
      prev
        ? prev.map((item) =>
            item.topic.id === planTopicId
              ? { ...item, topic: { ...item.topic, sub_topics: updatedSubTopics } }
              : item
          )
        : prev
    );
    setPlans((prev) =>
      prev.map((plan) => ({
        ...plan,
        plan_topics: (plan.plan_topics || []).map((t) =>
          t.id === planTopicId ? { ...t, sub_topics: updatedSubTopics } : t
        ),
      }))
    );

    const { error: updateError } = await supabase
      .from('plan_topics')
      .update({ sub_topics: updatedSubTopics })
      .eq('id', planTopicId);

    if (updateError) {
      // Restore previous state & surface recoverable error
      setOnlineTasks((prev) =>
        prev
          ? prev.map((item) =>
              item.topic.id === planTopicId
                ? { ...item, topic: { ...item.topic, sub_topics: previousSubTopics } }
                : item
            )
          : prev
      );
      setPlans((prev) =>
        prev.map((plan) => ({
          ...plan,
          plan_topics: (plan.plan_topics || []).map((t) =>
            t.id === planTopicId ? { ...t, sub_topics: previousSubTopics } : t
          ),
        }))
      );
      setError(updateError.message || 'Could not save progress. Restored previous state.');
    }
  };

  const handleOpenOrForgeNote = async (task, subTopic, existingNote, lockedNote) => {
    if (existingNote) {
      setNoteToView({
        ...existingNote,
        sub_topic: subTopic,
        day_topic: task.topic,
        exam_name: task.planName,
      });
      return;
    }

    if (lockedNote) {
      window.dispatchEvent(new CustomEvent('open-upgrade-modal'));
      return;
    }

    setGeneratingFor({ topicId: task.topic.id, subTopicText: subTopic.text });
    try {
      const payload = await generateNoteBYOK({
        planTopicId: task.topic.id,
        subTopicText: subTopic.text,
        examName: task.planName,
        dayTopic: task.topic.topic_name,
        isGuest: false,
      });

      const newNote = payload.note;
      setOnlineTasks((prev) =>
        prev
          ? prev.map((item) => {
              if (item.topic.id !== task.topic.id) return item;
              const existingNotes = item.topic.new_notes || [];
              const idx = existingNotes.findIndex(
                (n) => (n.sub_topic_text || '').trim().toLowerCase() === subTopic.text.trim().toLowerCase()
              );
              const nextNotes =
                idx >= 0
                  ? existingNotes.map((n, i) => (i === idx ? newNote : n))
                  : [...existingNotes, newNote];
              return { ...item, topic: { ...item.topic, new_notes: nextNotes } };
            })
          : prev
      );

      setNoteToView({
        ...newNote,
        sub_topic: subTopic,
        day_topic: task.topic,
        exam_name: task.planName,
      });
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setError('Connect your ChatGPT account in the opened panel to generate study notes.');
      } else {
        setError(err?.message || 'Unable to generate study note.');
      }
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleScheduleReminder = (task) => {
    if (
      typeof window !== 'undefined' &&
      window.Android &&
      typeof window.Android.setReminder === 'function'
    ) {
      window.Android.setReminder(
        JSON.stringify({
          planId: task.planId,
          planName: task.planName,
          topicId: task.topic.id,
          topicName: task.topic.topic_name,
          date: task.topic.date,
        })
      );
    }
    notifications.show({
      title: 'Study reminders scheduled',
      message: `${task.planName} · ${task.topic.topic_name}`,
      color: 'orange',
    });
  };

  const handleNoteUpdatedInViewer = (noteId, patch) => {
    if (!noteId) return;
    setNoteToView((curr) => (curr?.id === noteId ? { ...curr, ...patch } : curr));
    setOnlineTasks((prev) =>
      prev
        ? prev.map((item) => ({
            ...item,
            topic: {
              ...item.topic,
              new_notes: (item.topic.new_notes || []).map((n) =>
                n.id === noteId ? { ...n, ...patch } : n
              ),
            },
          }))
        : prev
    );
  };

  const showTopLoader = timelineLoading || (loading && plans.length === 0);

  return (
    <KalPadShell session={session} maxWidth="1320px">
      {showTopLoader && (
        <div className={classes.topLinearLoader} role="progressbar" aria-label="Loading dashboard">
          <div className={classes.topLinearBar} />
        </div>
      )}

      <div className={classes.pageWrap}>
        <div className={classes.stack}>
          {/* 1. Greeting + Animated Selected Date + Conditional Streak Pill */}
          <DashboardGreeting selectedDate={selectedDate} streak={stats.currentStreak} />

          {/* Error Banner with Try Again & Dismiss */}
          {error && (
            <div
              role="alert"
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-error-subtle)',
                border: '1px solid var(--kp-border)',
                padding: '11px 8px 11px 15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <IconAlertTriangle size={18} stroke={1.8} color="var(--kp-error-ink)" style={{ flexShrink: 0 }} />
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: 'var(--kp-ink)',
                }}
              >
                {error}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--kp-ink)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Try again
              </button>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
                className={classes.iconBtn44}
                style={{ color: 'var(--kp-secondary)' }}
              >
                <IconX size={17} stroke={1.8} />
              </button>
            </div>
          )}

          <div className={classes.bentoGrid}>
            {/* Area: Primary Focus Card */}
            <div className={classes.areaSession}>
              {loading && plans.length === 0 ? (
                <LoadingSessionCard />
              ) : plans.length === 0 ? (
                <EmptyStudyState onCreatePlan={handleCreatePlan} />
              ) : (
                <SessionCard
                  topic={nextTopic}
                  task={sessionTask}
                  examName={sessionTask?.planName || sessionPlan?.exam_name || ''}
                  date={nextTopicDate}
                  today={isSessionToday}
                  onContinue={() =>
                    handleOpenPlan(sessionTask?.planId || sessionPlan?.id)
                  }
                  onCreatePlan={handleCreatePlan}
                />
              )}
            </div>

            {/* Area: Seven-Day Week Ribbon + Date Picker */}
            <div className={classes.areaRibbon}>
              <WeekRibbon
                selectedDate={selectedDate}
                scheduledDates={scheduledDates}
                onOpenDatePicker={() => setShowDatePicker(true)}
                onPick={(d) => setSelectedDate(d)}
              />
            </div>

            {/* Areas: Daily Agenda + Progress Rhythm (shown when plans exist) */}
            {plans.length > 0 && (
              <>
                <div className={classes.areaAgenda}>
                  <TodayAgenda
                    selectedDate={selectedDate}
                    tasks={tasksToDisplay}
                    userTier={userTier}
                    generatingFor={generatingFor}
                    onOpenPlan={handleOpenPlan}
                    onToggleSubTopic={handleToggleSubTopic}
                    onOpenOrForgeNote={handleOpenOrForgeNote}
                    onScheduleReminder={handleScheduleReminder}
                  />
                </div>

                <div className={classes.areaCadence}>
                  <CadenceSection stats={stats} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Focused Light Surface Calendar Modal */}
      <WeekDatePickerDialog
        opened={showDatePicker}
        initialDate={selectedDate}
        scheduledDates={scheduledDates}
        onDismiss={() => setShowDatePicker(false)}
        onConfirm={(pickedDate) => {
          setShowDatePicker(false);
          setSelectedDate(pickedDate);
        }}
      />

      {/* Existing Study Note Viewer Modal */}
      {noteToView && (
        <FullscreenNoteViewer
          noteData={noteToView}
          onClose={() => setNoteToView(null)}
          onNoteUpdate={handleNoteUpdatedInViewer}
          onSubTopicNoteSwitch={(resolvedPayload) => {
            if (!resolvedPayload?.id) return;
            setOnlineTasks((prev) =>
              prev
                ? prev.map((item) => {
                    if (item.topic.id !== resolvedPayload.day_topic?.id) return item;
                    const existingNotes = item.topic.new_notes || [];
                    if (existingNotes.some((n) => n.id === resolvedPayload.id)) return item;
                    return {
                      ...item,
                      topic: { ...item.topic, new_notes: [...existingNotes, resolvedPayload] },
                    };
                  })
                : prev
            );
          }}
        />
      )}
    </KalPadShell>
  );
}
