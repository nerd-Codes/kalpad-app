// src/context/GenerationContext.jsx
"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { generatePlanBYOK_v2 } from '@/lib/byok/pipelines/planGeneratorV2';
import { generatePlanBYOK } from '@/lib/byok/pipelines/planGenerator';
import { generateNoteBYOK } from '@/lib/byok/pipelines/notesGenerator';
import { forgeCramSheetBYOK } from '@/lib/byok/pipelines/cramSheetForger';
import { saveGuestArtifactDirect } from '@/context/GuestContext';

const GenerationContext = createContext(null);

export function GenerationProvider({ children }) {
  // Active Study Plan generation job
  const [activePlanTask, setActivePlanTask] = useState(null);

  // Active Textbook Note generation jobs (Map keyed by note identifier)
  const [activeNoteTasks, setActiveNoteTasks] = useState([]);

  // Active Cram Sheet generation job
  const [activeCramTask, setActiveCramTask] = useState(null);

  // Backward compatibility flag for useLoading() callers
  const [legacyLoading, setLegacyLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Persistent Study Plan Generation Pipeline
  // ---------------------------------------------------------------------------
  const startPlanGeneration = useCallback(async ({
    examName,
    syllabus,
    examDate,
    studyHoursPerDay = 3,
    planMode = 'default',
    examFormat = 'theory',
    prepLevel = 'standard',
    priorityNote = '',
    isGuest = false,
    session = null,
    onPlanSaved = null,
  }) => {
    const taskId = `plan-${Date.now()}`;
    const cleanExamName = examName?.trim() || 'Upcoming Exam';

    const initialTask = {
      id: taskId,
      examName: cleanExamName,
      syllabus,
      examDate,
      studyHoursPerDay,
      planMode,
      examFormat,
      prepLevel,
      priorityNote,
      isGuest,
      status: 'generating',
      strategy: null,
      generatedTopics: [],
      progress: 5,
      statusMessage: 'Analyzing syllabus structure & ROI...',
      savedPlanId: null,
      error: null,
      startedAt: Date.now(),
    };

    setActivePlanTask(initialTask);

    try {
      let accumulatedStrategy = null;
      const accumulatedTopics = [];

      await generatePlanBYOK_v2({
        examName: cleanExamName,
        syllabus,
        examDate,
        studyHoursPerDay,
        planMode,
        examFormat,
        prepLevel,
        priorityNote,
        onEvent: (msg) => {
          if (msg.type === 'status') {
            const statusMsg = msg.data?.message || msg.message || 'Scheduling syllabus...';
            setActivePlanTask((curr) => curr ? { ...curr, statusMessage: statusMsg } : curr);
          } else if (msg.type === 'strategy' && msg.data) {
            accumulatedStrategy = msg.data;
            setActivePlanTask((curr) => curr ? {
              ...curr,
              strategy: msg.data,
              progress: 25,
              statusMessage: 'Strategy locked. Building daily study tasks...',
            } : curr);
          } else if (msg.type === 'plan_topic' && msg.data) {
            accumulatedTopics.push(msg.data);
            const approxProgress = Math.min(92, 25 + Math.round((accumulatedTopics.length * 70) / 10));
            setActivePlanTask((curr) => curr ? {
              ...curr,
              generatedTopics: [...accumulatedTopics],
              progress: approxProgress,
              statusMessage: `Scheduled Day ${msg.data.day || accumulatedTopics.length}: ${msg.data.topic_name || ''}`,
            } : curr);
          } else if (msg.type === 'error') {
            throw new Error(msg.data?.message || 'Plan generation interrupted.');
          }
        },
      });

      // Auto-save plan upon completion
      setActivePlanTask((curr) => curr ? {
        ...curr,
        status: 'saving',
        progress: 95,
        statusMessage: 'Saving your battle plan...',
      } : curr);

      let savedId = null;

      if (!isGuest && session) {
        const response = await fetch('/api/save-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_name: cleanExamName,
            exam_date: examDate,
            plan_topics: accumulatedTopics.filter(Boolean),
            generation_context: JSON.stringify(accumulatedStrategy || {}),
            syllabus,
          }),
        });
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          savedId = payload?.planId || payload?.plan?.id || null;
        }
      } else {
        saveGuestArtifactDirect({
          examName: cleanExamName,
          examDate,
          syllabus,
          plan: accumulatedTopics,
          strategy: accumulatedStrategy,
          generationContext: planMode,
          generatedNotes: [],
        });
        savedId = 'guest';
      }

      setActivePlanTask((curr) => curr ? {
        ...curr,
        status: 'completed',
        progress: 100,
        statusMessage: 'Study plan ready on your desk.',
        savedPlanId: savedId,
      } : curr);

      notifications.show({
        title: 'Study Plan Ready! 🎯',
        message: `${cleanExamName} has been planned and saved.`,
        color: 'teal',
        autoClose: 8000,
      });

      if (onPlanSaved) {
        onPlanSaved(savedId);
      }

      return { planId: savedId, strategy: accumulatedStrategy, topics: accumulatedTopics };
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      setActivePlanTask((curr) => curr ? {
        ...curr,
        status: 'error',
        error: err?.message || 'Plan generation interrupted.',
        statusMessage: 'Generation interrupted.',
      } : curr);
      throw err;
    }
  }, []);

  const clearCompletedPlan = useCallback(() => {
    setActivePlanTask(null);
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Persistent Textbook Note Generation Pipeline
  // ---------------------------------------------------------------------------
  const startNoteGeneration = useCallback(async ({
    planTopicId,
    subTopicText,
    examName,
    dayTopic,
    isGuest = false,
    onSuccess = null,
  }) => {
    const taskId = `${planTopicId || 0}-${subTopicText}`;

    // Avoid duplicate concurrent generation for the exact same subtopic
    setActiveNoteTasks((curr) => {
      const exists = curr.some((t) => t.id === taskId && t.status === 'generating');
      if (exists) return curr;
      return [
        ...curr.filter((t) => t.id !== taskId),
        {
          id: taskId,
          planTopicId,
          subTopicText,
          examName,
          dayTopic,
          isGuest,
          status: 'generating',
          stage: 'Exam Persona',
          progress: 15,
          statusMessage: `Drafting: ${subTopicText}`,
          note: null,
          error: null,
          startedAt: Date.now(),
        },
      ];
    });

    try {
      const result = await generateNoteBYOK({
        planTopicId,
        subTopicText,
        examName,
        dayTopic,
        isGuest,
        onStatus: (statusEvent) => {
          const stageName = statusEvent?.stage || 'Writing';
          const progressMap = {
            'Exam Persona': 25,
            'Pedagogical Outline': 55,
            'Textbook Authoring': 85,
          };
          const pct = progressMap[stageName] || 60;
          setActiveNoteTasks((curr) =>
            curr.map((t) =>
              t.id === taskId
                ? { ...t, stage: stageName, progress: pct, statusMessage: `${stageName}...` }
                : t
            )
          );
        },
      });

      const generatedNote = result?.note;

      setActiveNoteTasks((curr) =>
        curr.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'completed',
                progress: 100,
                statusMessage: 'Ready',
                note: generatedNote,
              }
            : t
        )
      );

      notifications.show({
        title: 'Note Ready! 📖',
        message: `${subTopicText} is ready to study.`,
        color: 'teal',
        autoClose: 5000,
      });

      if (onSuccess && generatedNote) {
        onSuccess(generatedNote);
      }

      // Auto dismiss from task list after 6 seconds
      setTimeout(() => {
        setActiveNoteTasks((curr) => curr.filter((t) => t.id !== taskId || t.status === 'generating'));
      }, 6000);

      return generatedNote;
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      setActiveNoteTasks((curr) =>
        curr.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'error',
                error: err?.message || 'Note authoring interrupted.',
                statusMessage: 'Interrupted',
              }
            : t
        )
      );
      throw err;
    }
  }, []);

  const dismissNoteTask = useCallback((taskId) => {
    setActiveNoteTasks((curr) => curr.filter((t) => t.id !== taskId));
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Persistent Cram Sheet Forging Pipeline
  // ---------------------------------------------------------------------------
  const startCramSheetGeneration = useCallback(async ({ planId, examName = 'Course' }) => {
    const taskId = `cram-${planId}`;
    setActiveCramTask({
      id: taskId,
      planId,
      examName,
      status: 'generating',
      progress: 20,
      statusMessage: 'Forging high-yield cram sheet...',
      cramSheetId: null,
      error: null,
    });

    try {
      let finalId = null;
      await forgeCramSheetBYOK({
        planId,
        onEvent: (msg) => {
          if (msg.type === 'status') {
            setActiveCramTask((curr) => curr ? {
              ...curr,
              statusMessage: msg.data?.title || 'Compressing course syllabus...',
              progress: Math.min(90, (curr.progress || 20) + 15),
            } : curr);
          } else if (msg.type === 'complete') {
            finalId = msg.data?.cramSheetId;
          } else if (msg.type === 'error') {
            throw new Error(msg.data?.message || 'Cram sheet forging failed.');
          }
        },
      });

      setActiveCramTask((curr) => curr ? {
        ...curr,
        status: 'completed',
        progress: 100,
        statusMessage: 'Cram sheet forged.',
        cramSheetId: finalId,
      } : curr);

      notifications.show({
        title: 'Cram Sheet Ready! ⚡',
        message: 'High-yield revision sheet compiled.',
        color: 'teal',
        autoClose: 6000,
      });

      setTimeout(() => {
        setActiveCramTask(null);
      }, 7000);

      return finalId;
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
      }
      setActiveCramTask((curr) => curr ? {
        ...curr,
        status: 'error',
        error: err?.message || 'Cram sheet forging interrupted.',
        statusMessage: 'Forging failed',
      } : curr);
      throw err;
    }
  }, []);

  // Legacy isGenerating computation (never triggers fullscreen overlay)
  const isAnyGenerating = Boolean(
    legacyLoading ||
    activePlanTask?.status === 'generating' ||
    activeNoteTasks.some((t) => t.status === 'generating') ||
    activeCramTask?.status === 'generating'
  );

  return (
    <GenerationContext.Provider
      value={{
        // Plan generation
        activePlanTask,
        startPlanGeneration,
        clearCompletedPlan,

        // Note generation
        activeNoteTasks,
        startNoteGeneration,
        dismissNoteTask,

        // Cram sheet generation
        activeCramTask,
        startCramSheetGeneration,

        // Legacy compatibility
        isLoading: isAnyGenerating,
        setIsLoading: setLegacyLoading,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return ctx;
}

// Backward compatible useLoading hook
export function useLoading() {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    return { isLoading: false, setIsLoading: () => {} };
  }
  return {
    isLoading: ctx.isLoading,
    setIsLoading: ctx.setIsLoading,
    activePlanTask: ctx.activePlanTask,
    activeNoteTasks: ctx.activeNoteTasks,
    startPlanGeneration: ctx.startPlanGeneration,
    startNoteGeneration: ctx.startNoteGeneration,
  };
}
