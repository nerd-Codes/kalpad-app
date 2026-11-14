// src/components/RegeneratePlanModal.jsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconCheck,
  IconInfoCircle,
  IconListDetails,
  IconTargetArrow,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AnimatePresence, motion } from 'framer-motion';
import { wittyFacts } from '@/lib/newplanFacts';
import { useLoading } from '@/context/LoadingContext';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { regeneratePlanBYOK } from '@/lib/byok/pipelines/planGenerator';

function useTypingEffect(text = '', speed = 2) {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    let i = 0;
    setDisplayedText('');
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i += 1;
      if (i >= text.length) clearInterval(intervalId);
    }, speed);
    return () => clearInterval(intervalId);
  }, [text, speed]);
  return displayedText;
}

const DayCard = React.memo(function DayCard({ item }) {
  return (
    <div
      style={{
        borderRadius: '16px',
        backgroundColor: 'var(--kp-canvas)',
        border: '1px solid var(--kp-border)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--kp-ink)',
          }}
        >
          Day {item.day} · {item.topic_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.study_hours && (
            <span
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--kp-raised)',
                padding: '3px 8px',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--kp-secondary)',
              }}
            >
              {item.study_hours}h
            </span>
          )}
          {item.day_difficulty && (
            <span
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--kp-butter)',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--kp-ink)',
              }}
            >
              {item.day_difficulty}
            </span>
          )}
        </div>
      </div>

      {item.day_summary && (
        <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--kp-secondary)' }}>
          {item.day_summary}
        </div>
      )}

      {Array.isArray(item.sub_topics) && item.sub_topics.length > 0 && (
        <ul style={{ margin: '2px 0 0 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {item.sub_topics.map((sub, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'var(--kp-ink)', lineHeight: 1.45 }}>
              {sub.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function RegeneratePlanModal({ opened, onClose, plan }) {
  const router = useRouter();
  const { setIsLoading } = useLoading();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const [error, setError] = useState('');
  const [userFeedback, setUserFeedback] = useState('');

  const [strategy, setStrategy] = useState(null);
  const [regeneratedPlan, setRegeneratedPlan] = useState([]);

  const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
  const [openedDetails, setOpenedDetails] = useState(false);
  const typedApproach = useTypingEffect(strategy?.overall_approach);
  const planContainerRef = useRef(null);

  useEffect(() => {
    if (!isGenerating || strategy) return undefined;
    const factInterval = setInterval(() => {
      setCurrentFact(wittyFacts[Math.floor(Math.random() * wittyFacts.length)]);
    }, 4000);
    return () => clearInterval(factInterval);
  }, [isGenerating, strategy]);

  useEffect(() => {
    if (opened) return undefined;
    const t = setTimeout(() => {
      setIsGenerating(false);
      setIsGenerationComplete(false);
      setIsAccepting(false);
      setError('');
      setUserFeedback('');
      setStrategy(null);
      setRegeneratedPlan([]);
      setOpenedDetails(false);
    }, 240);
    return () => clearTimeout(t);
  }, [opened]);

  useEffect(() => {
    if (planContainerRef.current) {
      const t = setTimeout(() => {
        if (planContainerRef.current) {
          planContainerRef.current.scrollTo({
            top: planContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [regeneratedPlan.length, isGenerating]);

  const handleRegenerate = async () => {
    if (!plan?.id) return;
    setIsGenerating(true);
    setIsGenerationComplete(false);
    setError('');
    setStrategy(null);
    setRegeneratedPlan([]);

    try {
      await regeneratePlanBYOK({
        planId: plan.id,
        userFeedback,
        userDeclaredHours: plan.user_declared_hours || 4,
        onEvent: (message) => {
          if (message.type === 'strategy') {
            setStrategy(message.data);
          } else if (message.type === 'plan_topic') {
            setRegeneratedPlan((p) => [...p, message.data]);
          } else if (message.type === 'error') {
            throw new Error(message.data?.message || 'Could not regenerate study plan.');
          }
        },
      });
      setIsGenerationComplete(true);
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setError('Connect your ChatGPT account in the opened panel to regenerate your study plan.');
      } else {
        setError(err?.message || 'Could not regenerate study plan.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAndSave = async () => {
    setIsAccepting(true);
    setError('');

    try {
      const response = await fetch('/api/save-regenerated-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_plan_id: plan.id,
          new_plan_topics: regeneratedPlan,
          new_strategy: strategy,
          exam_name: plan.exam_name,
          exam_date: plan.exam_date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save the new plan.');
      }

      const { new_plan_id } = await response.json();

      notifications.show({
        title: 'Plan updated',
        message: 'Your refined study plan is ready.',
        color: 'teal',
      });

      setIsLoading(true);
      router.replace(`/plan/${new_plan_id}`);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  if (!opened) return null;

  const isActionInProgress = isGenerating || isAccepting;

  return (
    <div
      onClick={() => {
        if (!isActionInProgress) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Refine plan"
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
          maxWidth: '640px',
          maxHeight: '88vh',
          borderRadius: '20px',
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border-strong)',
          color: 'var(--kp-ink)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--kp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            AI study advisor
          </h2>
          <button
            type="button"
            disabled={isActionInProgress}
            onClick={onClose}
            aria-label="Close refine plan dialog"
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
              cursor: isActionInProgress ? 'not-allowed' : 'pointer',
              opacity: isActionInProgress ? 0.5 : 1,
            }}
          >
            <IconX size={16} stroke={1.8} />
          </button>
        </div>

        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {!isGenerating && !strategy && (
            <>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                  Adjust your study pace or focus
                </div>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'var(--kp-secondary)',
                  }}
                >
                  Fallen behind or struggling with a topic? Tell KalPad and rebuild a balanced plan.
                </p>
              </div>

              <textarea
                rows={4}
                placeholder="Example: Increase focus on Electrostatics and reduce low-yield topics."
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-canvas)',
                  color: 'var(--kp-ink)',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </>
          )}

          {(isGenerating || strategy) && (
            <>
              <div
                style={{
                  borderRadius: '18px',
                  backgroundColor: 'var(--kp-canvas)',
                  border: '1px solid var(--kp-border)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                  {strategy ? 'Updated strategy' : 'Analyzing progress...'}
                </div>

                {strategy ? (
                  <>
                    {strategy.estimated_coverage && (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--kp-success-ink)',
                          }}
                        >
                          <span>COVERAGE</span>
                          <span style={{ fontFamily: 'var(--font-kp-mono)' }}>
                            {strategy.estimated_coverage}%
                          </span>
                        </div>
                        <KalPadProgress
                          value={strategy.estimated_coverage}
                          color="var(--kp-success-ink)"
                          height={6}
                        />
                      </div>
                    )}

                    <div style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                      {typedApproach || strategy.overall_approach}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenedDetails((prev) => !prev)}
                      style={{
                        alignSelf: 'flex-start',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--kp-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <IconListDetails size={15} />
                      <span>{openedDetails ? 'Hide analysis' : 'Show detailed analysis'}</span>
                    </button>

                    {openedDetails && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {strategy.emphasized_topics?.map((item, idx) => (
                          <div
                            key={`emp-${idx}`}
                            style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--kp-ink)' }}
                          >
                            <IconTargetArrow size={15} color="var(--kp-success-ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                              <strong>{item.topic}:</strong> {item.justification}
                            </span>
                          </div>
                        ))}
                        {strategy.deprioritized_topics?.map((item, idx) => (
                          <div
                            key={`dep-${idx}`}
                            style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--kp-secondary)' }}
                          >
                            <IconInfoCircle size={15} color="var(--kp-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                              <strong>{item.topic}:</strong> {item.justification}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFact}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}
                    >
                      {currentFact}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {strategy && (
                <div
                  ref={planContainerRef}
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {regeneratedPlan.map((item, idx) => (
                    <DayCard key={idx} item={item} />
                  ))}
                  {isGenerating && (
                    <div style={{ fontSize: '12px', color: 'var(--kp-secondary)', padding: '6px' }}>
                      Scheduling next study day...
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: 'var(--kp-error-subtle)',
                color: 'var(--kp-error-ink)',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--kp-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          {!isGenerating && !strategy ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '44px',
                  padding: '0 16px',
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
                onClick={handleRegenerate}
                className="kp-tactile"
                style={{
                  height: '44px',
                  padding: '0 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'var(--kp-primary)',
                  color: 'var(--kp-on-primary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Regenerate &amp; optimize
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!isGenerationComplete || isAccepting}
                onClick={onClose}
                style={{
                  height: '44px',
                  padding: '0 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !isGenerationComplete || isAccepting ? 'not-allowed' : 'pointer',
                  opacity: !isGenerationComplete || isAccepting ? 0.55 : 1,
                }}
              >
                {!isGenerationComplete ? 'Working...' : 'Discard'}
              </button>
              <button
                type="button"
                disabled={!isGenerationComplete || isAccepting}
                onClick={handleAcceptAndSave}
                className="kp-tactile"
                style={{
                  height: '44px',
                  padding: '0 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor:
                    isGenerationComplete && !isAccepting ? 'var(--kp-primary)' : 'var(--kp-raised)',
                  color:
                    isGenerationComplete && !isAccepting
                      ? 'var(--kp-on-primary)'
                      : 'var(--kp-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isGenerationComplete && !isAccepting ? 'pointer' : 'not-allowed',
                }}
              >
                <IconCheck size={16} />
                <span>{isAccepting ? 'Saving...' : 'Accept & save plan'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
