// src/components/kalpad/GenerationDock.jsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconBolt,
  IconBrain,
  IconCheck,
  IconChevronRight,
  IconSparkles,
  IconX,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useGeneration } from '@/context/GenerationContext';

export function GenerationDock() {
  const {
    activePlanTask,
    clearCompletedPlan,
    activeNoteTasks,
    dismissNoteTask,
    activeCramTask,
  } = useGeneration();

  // Find priority item to show in compact dock
  const primaryTask = useMemo(() => {
    if (activePlanTask && (activePlanTask.status === 'generating' || activePlanTask.status === 'saving' || activePlanTask.status === 'completed')) {
      return {
        type: 'plan',
        title: `Study Plan: ${activePlanTask.examName}`,
        subtitle: activePlanTask.statusMessage,
        progress: activePlanTask.progress,
        isCompleted: activePlanTask.status === 'completed',
        isError: activePlanTask.status === 'error',
        viewUrl: activePlanTask.savedPlanId && activePlanTask.savedPlanId !== 'guest' ? `/plan/${activePlanTask.savedPlanId}` : (activePlanTask.savedPlanId === 'guest' ? '/guest-plan' : null),
        onDismiss: clearCompletedPlan,
      };
    }

    const runningNote = activeNoteTasks.find((t) => t.status === 'generating') || activeNoteTasks[0];
    if (runningNote) {
      return {
        type: 'note',
        title: `Note: ${runningNote.subTopicText}`,
        subtitle: runningNote.statusMessage,
        progress: runningNote.progress,
        isCompleted: runningNote.status === 'completed',
        isError: runningNote.status === 'error',
        viewUrl: null,
        onDismiss: () => dismissNoteTask(runningNote.id),
      };
    }

    if (activeCramTask) {
      return {
        type: 'cram',
        title: `Cram Sheet: ${activeCramTask.examName || 'Course'}`,
        subtitle: activeCramTask.statusMessage,
        progress: activeCramTask.progress,
        isCompleted: activeCramTask.status === 'completed',
        isError: activeCramTask.status === 'error',
        viewUrl: activeCramTask.cramSheetId ? `/cram-sheet/${activeCramTask.cramSheetId}` : null,
        onDismiss: null,
      };
    }

    return null;
  }, [activePlanTask, clearCompletedPlan, activeNoteTasks, dismissNoteTask, activeCramTask]);

  if (!primaryTask) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 8500,
        pointerEvents: 'none', // Critical: entire overlay passes clicks through
        maxWidth: '380px',
        width: 'calc(100vw - 32px)',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={primaryTask.title + primaryTask.progress}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            pointerEvents: 'auto', // Card itself captures interaction
            backgroundColor: 'var(--kp-surface, #ffffff)',
            border: primaryTask.isCompleted ? '1.5px solid #10b981' : '1px solid var(--kp-border, #e5e7eb)',
            borderRadius: '16px',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
            padding: '12px 14px',
            backdropFilter: 'blur(8px)',
            color: 'var(--kp-ink, #111827)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '10px',
                  backgroundColor: primaryTask.isCompleted ? '#dcfce7' : (primaryTask.isError ? '#fee2e2' : 'var(--kp-butter, #fef3c7)'),
                  color: primaryTask.isCompleted ? '#059669' : (primaryTask.isError ? '#dc2626' : '#d97706'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {primaryTask.isCompleted ? (
                  <IconCheck size={17} stroke={2.4} />
                ) : primaryTask.isError ? (
                  <IconAlertTriangle size={17} />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IconBrain size={17} />
                  </motion.div>
                )}
              </div>

              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--kp-ink, #111827)',
                  }}
                >
                  {primaryTask.title}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: primaryTask.isCompleted ? '#059669' : 'var(--kp-secondary, #6b7280)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {primaryTask.subtitle}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {primaryTask.viewUrl && (
                <Link
                  href={primaryTask.viewUrl}
                  onClick={primaryTask.onDismiss}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  View <IconChevronRight size={13} />
                </Link>
              )}

              {primaryTask.onDismiss && (
                <button
                  type="button"
                  onClick={primaryTask.onDismiss}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--kp-secondary, #9ca3af)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Dismiss"
                >
                  <IconX size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Micro Progress Bar */}
          {!primaryTask.isCompleted && !primaryTask.isError && (
            <div
              style={{
                width: '100%',
                height: '3.5px',
                backgroundColor: 'var(--kp-border, #e5e7eb)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, primaryTask.progress || 0)}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  backgroundColor: '#D97706',
                  borderRadius: '2px',
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
