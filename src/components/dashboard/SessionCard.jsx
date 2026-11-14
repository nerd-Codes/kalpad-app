// src/components/dashboard/SessionCard.jsx
"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { IconArrowRight, IconCheck, IconPlus, IconTargetArrow } from '@tabler/icons-react';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';

export function LoadingSessionCard() {
  return (
    <section
      aria-busy="true"
      style={{
        width: '100%',
        borderRadius: '20px',
        backgroundColor: 'var(--kp-butter)',
        border: '1px solid var(--kp-border)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-kp-sans)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
          lineHeight: 1.28,
        }}
      >
        Finding your next step…
      </div>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '999px',
          border: '2px solid var(--kp-border-strong)',
          borderTopColor: 'var(--kp-ink)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

export function EmptyStudyState({ onCreatePlan }) {
  return (
    <section
      style={{
        width: '100%',
        borderRadius: '20px',
        backgroundColor: 'var(--kp-periwinkle)',
        border: '1px solid var(--kp-border)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '47px',
          height: '47px',
          borderRadius: '20px',
          backgroundColor: 'var(--kp-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--kp-ink)',
        }}
      >
        <IconPlus size={21} stroke={1.8} />
      </div>

      <h2
        style={{
          margin: '22px 0 0 0',
          fontFamily: 'var(--font-kp-mono)',
          fontSize: '24px',
          lineHeight: '30px',
          letterSpacing: '-0.5px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
        }}
      >
        Make the first step small.
      </h2>

      <p
        style={{
          margin: '9px 0 0 0',
          fontFamily: 'var(--font-kp-sans)',
          fontSize: '14px',
          lineHeight: '21px',
          color: 'var(--kp-secondary)',
        }}
      >
        Add a syllabus and KalPad will help shape it into a plan you can start today.
      </p>

      <button
        type="button"
        onClick={onCreatePlan}
        disabled={!onCreatePlan}
        className="kp-tactile"
        style={{
          marginTop: '20px',
          width: '100%',
          minHeight: '52px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: 'var(--kp-primary)',
          color: 'var(--kp-on-primary)',
          fontFamily: 'var(--font-kp-sans)',
          fontSize: '14px',
          fontWeight: 700,
          cursor: onCreatePlan ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span>Create a study plan</span>
        <IconArrowRight size={17} stroke={1.8} />
      </button>
    </section>
  );
}

function SessionSteps({ subTopics = [], maxItems = 2 }) {
  const steps = subTopics.slice(0, maxItems);

  if (steps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <IconTargetArrow size={18} stroke={1.8} color="var(--kp-secondary)" />
        <span
          style={{
            fontFamily: 'var(--font-kp-sans)',
            fontSize: '13px',
            color: 'var(--kp-secondary)',
          }}
        >
          Follow today’s topic in your plan
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
      {steps.map((step, index) => (
        <div
          key={`${index}-${step.text}`}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <span
            style={{
              width: '25px',
              height: '25px',
              borderRadius: '20px',
              backgroundColor: step.completed ? 'var(--kp-primary)' : 'var(--kp-raised)',
              color: step.completed ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {step.completed ? <IconCheck size={13} stroke={2.2} /> : index + 1}
          </span>

          <span
            style={{
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '13px',
              lineHeight: '18px',
              fontWeight: 600,
              color: step.completed ? 'var(--kp-secondary)' : 'var(--kp-ink)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {step.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SessionCard({
  topic,
  task,
  examName = '',
  date,
  today = false,
  onContinue,
  onCreatePlan,
}) {
  const cardColor = today || !date ? 'var(--kp-butter)' : 'var(--kp-periwinkle)';
  const title = topic ? topic.topic_name : 'A little space to reset.';
  const subTopics = topic?.sub_topics || [];
  const unfinished = subTopics.filter((t) => !t.completed).length;
  const complete = subTopics.length > 0 && unfinished === 0;
  const progress =
    subTopics.length > 0 ? subTopics.filter((t) => t.completed).length / subTopics.length : 0;

  let subtitle = '';
  if (topic) {
    if (complete) {
      subtitle = `${examName ? `${examName}  ·  ` : ''}All ${subTopics.length} steps complete`;
    } else {
      const parts = [examName, topic.day_summary].filter((v) => v && v.trim().length > 0);
      subtitle = parts.length > 0 ? parts.join('  ·  ') : 'A step from your study plan';
    }
  } else {
    subtitle = !task
      ? 'Your plan is ready whenever you are. Take a breath, then choose a small next step.'
      : 'There’s nothing scheduled on this date. Your next planned topic will be here when it’s time.';
  }

  let ctaLabel = 'View your study plan';
  if (complete) ctaLabel = 'Open your plan';
  else if (topic && today) ctaLabel = 'Open today’s plan';
  else if (topic) ctaLabel = 'View upcoming topic';
  else if (onCreatePlan) ctaLabel = 'Create a study plan';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        borderRadius: '20px',
        backgroundColor: cardColor,
        border: '1px solid var(--kp-border)',
        padding: '20px 22px 22px 22px',
        transition: 'background-color 220ms var(--kp-ease-enter)',
      }}
    >
      <div style={{ paddingTop: '10px', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={title}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '22px',
              lineHeight: '28px',
              letterSpacing: '-0.25px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            {title}
          </motion.h2>
        </AnimatePresence>
      </div>

      <p
        style={{
          margin: `${topic ? 7 : 10}px 0 0 0`,
          fontFamily: 'var(--font-kp-sans)',
          fontSize: topic ? '13px' : '14px',
          lineHeight: topic ? '19px' : '21px',
          color: 'var(--kp-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {subtitle}
      </p>

      {topic && (
        <>
          <div style={{ marginTop: '22px' }}>
            <SessionSteps subTopics={subTopics} maxItems={2} />
          </div>

          {subTopics.length > 0 && (
            <div style={{ marginTop: '18px' }}>
              <KalPadProgress
                progress={progress}
                height={5}
                fillColor={complete ? 'var(--kp-success-ink)' : 'var(--kp-primary)'}
                trackColor="var(--kp-raised)"
                ariaLabel="Session progress"
              />
              <div
                style={{
                  marginTop: '8px',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--kp-secondary)',
                }}
              >
                {complete
                  ? `All ${subTopics.length} steps complete`
                  : `${unfinished} small ${unfinished === 1 ? 'step' : 'steps'} to go`}
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          if (!topic) onCreatePlan?.();
          else onContinue?.();
        }}
        disabled={!topic && !onCreatePlan}
        className="kp-tactile"
        style={{
          marginTop: '20px',
          width: '100%',
          minHeight: '52px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: 'var(--kp-primary)',
          color: 'var(--kp-on-primary)',
          fontFamily: 'var(--font-kp-sans)',
          fontSize: '14px',
          fontWeight: 700,
          cursor: topic || onCreatePlan ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '9px',
        }}
      >
        <span>{ctaLabel}</span>
        <IconArrowRight size={17} stroke={1.8} />
      </button>
    </motion.section>
  );
}
