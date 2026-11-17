// src/components/dashboard/TodayAgenda.jsx
"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { format, isToday, parseISO } from 'date-fns';
import {
  IconAlarm,
  IconArrowRight,
  IconCheck,
  IconListDetails,
  IconLock,
} from '@tabler/icons-react';
import { SubTopicMathText } from '@/components/common/SubTopicMathText';
import classes from './Dashboard.module.css';

const CHECKBOX_PASTEL_FILLS = [
  'var(--kp-raised)',
  'var(--kp-sky)',
  'var(--kp-periwinkle)',
  'var(--kp-apricot)',
];

function findExistingNote(topic, subTopicText, index) {
  const normalized = (subTopicText || '').trim().toLowerCase();
  const v2 = (topic.new_notes || []).find(
    (n) => (n.sub_topic_text || '').trim().toLowerCase() === normalized
  );
  if (v2) return v2;
  if (index === 0 && topic.generated_notes) {
    return {
      notes_markdown: topic.generated_notes,
      sub_topic_text: subTopicText,
    };
  }
  return null;
}

function TopicCard({
  task,
  userTier = 'free',
  generatingFor,
  onOpenPlan,
  onToggleSubTopic,
  onOpenOrForgeNote,
  onScheduleReminder,
}) {
  const { planId, planName, topic } = task;
  const subTopics = topic.sub_topics || [];
  const topicDate = topic.date ? parseISO(topic.date) : null;
  const isLockedForNewNote = userTier === 'free' && topicDate && !isToday(topicDate);

  return (
    <article className={classes.topicCardSurface}>
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenPlan(planId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPlan(planId);
            }
          }}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '16px',
              lineHeight: '21px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {topic.topic_name}
          </h3>
          <div
            style={{
              marginTop: '4px',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '11px',
              color: 'var(--kp-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {planName}  ·  Day {topic.day}
          </div>
        </div>

        <button
          type="button"
          className={classes.iconBtn44}
          aria-label="Set study reminders"
          title="Set study reminders"
          onClick={(e) => {
            e.stopPropagation();
            onScheduleReminder?.(task);
          }}
          style={{ color: 'var(--kp-secondary)' }}
        >
          <IconAlarm size={19} stroke={1.8} />
        </button>

        <button
          type="button"
          className={classes.iconBtn44}
          aria-label={`Open ${topic.topic_name}`}
          title="Open plan"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPlan(planId);
          }}
          style={{ color: 'var(--kp-ink)' }}
        >
          <IconArrowRight size={18} stroke={1.8} />
        </button>
      </div>

      {/* Checklist Rows */}
      {subTopics.length > 0 && (
        <>
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--kp-border)',
              margin: '10px 0',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {subTopics.map((subTopic, itemIndex) => {
              const completed = Boolean(subTopic.completed);
              const existingNote = findExistingNote(topic, subTopic.text, itemIndex);
              const isGenerating =
                generatingFor?.topicId === topic.id &&
                generatingFor?.subTopicText === subTopic.text;
              const lockedNote = !existingNote && isLockedForNewNote;

              return (
                <div key={`${itemIndex}-${subTopic.text}`} className={classes.checklistRow}>
                  <button
                    type="button"
                    aria-label={
                      completed
                        ? `Mark ${subTopic.text} incomplete`
                        : `Mark ${subTopic.text} complete`
                    }
                    aria-pressed={completed}
                    onClick={() => onToggleSubTopic(topic.id, subTopic.text, !completed)}
                    style={{
                      appearance: 'none',
                      border: 'none',
                      background: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      minWidth: 0,
                      padding: '4px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: '44px',
                        height: '44px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <motion.span
                        animate={completed ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          width: '25px',
                          height: '25px',
                          borderRadius: '20px',
                          backgroundColor: completed
                            ? 'var(--kp-neon-mint)'
                            : CHECKBOX_PASTEL_FILLS[itemIndex % CHECKBOX_PASTEL_FILLS.length],
                          border: '1px solid var(--kp-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 160ms var(--kp-ease-enter)',
                        }}
                      >
                        {completed && (
                          <motion.span
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            style={{ display: 'inline-flex' }}
                          >
                            <IconCheck size={14} stroke={2.4} color="#111317" />
                          </motion.span>
                        )}
                      </motion.span>
                    </span>

                    <span
                      style={{
                        flex: 1,
                        paddingLeft: '6px',
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '13px',
                        lineHeight: '18px',
                        fontWeight: 500,
                        color: completed ? 'var(--kp-secondary)' : 'var(--kp-ink)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      <SubTopicMathText text={subTopic.text} completed={completed} />
                    </span>
                  </button>

                  <button
                    type="button"
                    className={classes.iconBtn44}
                    disabled={isGenerating}
                    aria-label={
                      existingNote
                        ? `Open study note for ${subTopic.text}`
                        : lockedNote
                          ? `Unlock notes for ${subTopic.text}`
                          : `Create study note for ${subTopic.text}`
                    }
                    title={
                      existingNote
                        ? 'Open study note'
                        : lockedNote
                          ? 'Upgrade to generate notes for other days'
                          : 'Generate study note'
                    }
                    onClick={() =>
                      onOpenOrForgeNote(task, subTopic, existingNote, lockedNote)
                    }
                    style={{
                      color: existingNote
                        ? 'var(--kp-success-ink)'
                        : lockedNote
                          ? 'var(--kp-accent-ink)'
                          : 'var(--kp-secondary)',
                    }}
                  >
                    {isGenerating ? (
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '999px',
                          border: '2px solid var(--kp-border-strong)',
                          borderTopColor: 'var(--kp-ink)',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                    ) : lockedNote ? (
                      <IconLock size={17} stroke={1.8} />
                    ) : (
                      <IconListDetails size={18} stroke={1.8} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}

export function TodayAgenda({
  selectedDate,
  tasks = [],
  userTier = 'free',
  generatingFor = null,
  onOpenPlan,
  onToggleSubTopic,
  onOpenOrForgeNote,
  onScheduleReminder,
}) {
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const remainingSteps = tasks.reduce(
    (sum, task) => sum + (task.topic.sub_topics || []).filter((s) => !s.completed).length,
    0
  );

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              lineHeight: 1.25,
            }}
          >
            {isToday(selectedDate) ? 'The rest of today' : 'Your day'}
          </h2>
          <p
            style={{
              margin: '3px 0 0 0',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '12px',
              color: 'var(--kp-secondary)',
            }}
          >
            A short list, made from your plan.
          </p>
        </div>

        {tasks.length > 0 && (
          <div
            style={{
              borderRadius: '20px',
              backgroundColor: 'var(--kp-mint)',
              border: '1px solid var(--kp-border)',
              padding: '7px 10px',
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {remainingSteps === 1 ? '1 step left' : `${remainingSteps} steps left`}
          </div>
        )}
      </div>

      {/* Animated Date Agenda Content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={dateKey}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.19, ease: [0.2, 0, 0, 1] }}
        >
          {tasks.length === 0 ? (
            <div
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-mint)',
                border: '1px solid var(--kp-border)',
                padding: '19px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--kp-ink)',
                }}
              >
                <IconCheck size={19} stroke={1.9} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-kp-sans)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--kp-ink)',
                  }}
                >
                  Nothing scheduled here
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    fontFamily: 'var(--font-kp-sans)',
                    fontSize: '12px',
                    color: 'var(--kp-secondary)',
                  }}
                >
                  Enjoy the space or choose another day.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {tasks.map((task) => (
                <TopicCard
                  key={task.topic.id}
                  task={task}
                  userTier={userTier}
                  generatingFor={generatingFor}
                  onOpenPlan={onOpenPlan}
                  onToggleSubTopic={onToggleSubTopic}
                  onOpenOrForgeNote={onOpenOrForgeNote}
                  onScheduleReminder={onScheduleReminder}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
