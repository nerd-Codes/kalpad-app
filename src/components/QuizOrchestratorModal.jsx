// src/components/QuizOrchestratorModal.jsx
"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconAlertTriangle,
  IconBolt,
  IconBrain,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPuzzle,
  IconRefresh,
  IconTarget,
  IconTrophy,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { QuizRichText } from '@/components/quiz/QuizRichText';
import { useUniformOptionHeight } from '@/hooks/useUniformOptionHeight';
import {
  evaluateQuizSubmissionBYOK,
  generateQuizBYOK,
} from '@/lib/byok/pipelines/quizEngine';

const MODES = [
  {
    id: 'Rapid Fire',
    label: 'Rapid Fire',
    desc: 'Speed & active recall',
    icon: IconBolt,
    tintBg: 'var(--kp-apricot)',
  },
  {
    id: 'Core Concepts',
    label: 'Core Concepts',
    desc: 'Deep understanding',
    icon: IconBrain,
    tintBg: 'var(--kp-butter)',
  },
  {
    id: 'Problem Solving',
    label: 'Simulation',
    desc: 'Applied problem scenarios',
    icon: IconPuzzle,
    tintBg: 'var(--kp-mint)',
  },
];

function SetupView({ onStart, onClose, errorMessage }) {
  const [questionCount, setQuestionCount] = useState(10);
  const [quizMode, setQuizMode] = useState('Core Concepts');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: 'var(--kp-error-subtle)',
                color: 'var(--kp-error-ink)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--kp-secondary)',
                marginBottom: '12px',
              }}
            >
              Practice mode
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '12px',
              }}
            >
              {MODES.map((mode) => {
                const isActive = quizMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setQuizMode(mode.id)}
                    className="kp-tactile"
                    style={{
                      textAlign: 'left',
                      padding: '18px',
                      borderRadius: '20px',
                      backgroundColor: isActive ? mode.tintBg : 'var(--kp-surface)',
                      border: isActive
                        ? '1.5px solid var(--kp-primary)'
                        : '1px solid var(--kp-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '14px',
                        backgroundColor: isActive ? 'var(--kp-primary)' : 'var(--kp-raised)',
                        color: isActive ? 'var(--kp-on-primary)' : 'var(--kp-ink)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} stroke={1.8} />
                    </span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                        {mode.label}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                        {mode.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--kp-secondary)',
                marginBottom: '12px',
              }}
            >
              Questions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[5, 10, 15].map((count) => {
                const active = questionCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className="kp-tactile"
                    style={{
                      height: '50px',
                      borderRadius: '16px',
                      backgroundColor: active ? 'var(--kp-ink)' : 'var(--kp-surface)',
                      color: active ? 'var(--kp-canvas)' : 'var(--kp-ink)',
                      border: active ? '1.5px solid var(--kp-orange)' : '1px solid var(--kp-border)',
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {count} Qs
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--kp-border)',
          backgroundColor: 'var(--kp-surface)',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '46px',
              padding: '0 18px',
              borderRadius: '14px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStart({ question_count: questionCount, quiz_mode: quizMode })}
            className="kp-tactile"
            style={{
              height: '46px',
              padding: '0 24px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: 'var(--kp-primary)',
              color: 'var(--kp-on-primary)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Start quiz
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingView({ title, message }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '999px',
          border: '3px solid var(--kp-raised)',
          borderTopColor: 'var(--kp-primary)',
          animation: 'kp-spin 0.85s linear infinite',
        }}
      />
      <div
        style={{
          fontFamily: 'var(--font-kp-mono)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--kp-secondary)', maxWidth: '420px' }}>
        {message}
      </div>
      <style>{`@keyframes kp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RunnerView({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = questions[currentIndex];
  const progressVal = Math.round(((currentIndex + 1) / questions.length) * 100);
  const { optionHeight, setOptionRef } = useUniformOptionHeight(currentQuestion?.options || []);

  const handleSelect = (option) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setDirection(1);
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      }, 360);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      const attempts = questions.map((q, index) => ({
        question_text: q.question_text,
        options: q.options,
        user_answer: answers[index] || null,
        correct_answer: q.correct_answer,
        is_correct: answers[index] === q.correct_answer,
      }));
      onComplete(attempts);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--kp-secondary)',
              }}
            >
              Question {currentIndex + 1} / {questions.length}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--kp-primary)',
              }}
            >
              {progressVal}%
            </span>
          </div>
          <KalPadProgress value={progressVal} height={6} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <QuizRichText
                content={currentQuestion.question_text}
                variant="question"
                style={{ fontSize: 'clamp(1.15rem, 2vw, 1.4rem)' }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                }}
              >
                {currentQuestion.options.map((option, i) => {
                  const isSelected = answers[currentIndex] === option;
                  return (
                    <div
                      key={i}
                      ref={setOptionRef(i)}
                      style={{ height: optionHeight ? `${optionHeight}px` : 'auto' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(option)}
                        className="kp-tactile"
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: optionHeight ? undefined : '82px',
                          padding: '16px',
                          borderRadius: '18px',
                          backgroundColor: isSelected ? 'var(--kp-apricot)' : 'var(--kp-surface)',
                          border: isSelected
                            ? '1.5px solid var(--kp-primary)'
                            : '1px solid var(--kp-border)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            border: isSelected
                              ? '6px solid var(--kp-primary)'
                              : '2px solid var(--kp-secondary)',
                            flexShrink: 0,
                            marginTop: '3px',
                            backgroundColor: 'var(--kp-surface)',
                          }}
                        />
                        <QuizRichText
                          content={option}
                          variant="option"
                          style={{ color: 'var(--kp-ink)', flex: 1 }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--kp-border)',
          backgroundColor: 'var(--kp-surface)',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            style={{
              height: '44px',
              padding: '0 14px',
              borderRadius: '12px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: currentIndex === 0 ? 'var(--kp-muted)' : 'var(--kp-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <IconChevronLeft size={16} />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!answers[currentIndex]}
            className="kp-tactile"
            style={{
              height: '46px',
              padding: '0 22px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: answers[currentIndex] ? 'var(--kp-primary)' : 'var(--kp-raised)',
              color: answers[currentIndex] ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: answers[currentIndex] ? 'pointer' : 'not-allowed',
            }}
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit quiz' : 'Next'}</span>
            {currentIndex === questions.length - 1 ? (
              <IconCheck size={16} />
            ) : (
              <IconChevronRight size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsView({ results, onRetake, onClose }) {
  const [expandedIdx, setExpandedIdx] = useState(0);
  const { score = 0, feedback_summary = '', full_results = [] } = results || {};
  const passed = score >= 50;
  const strokeColor =
    score >= 80
      ? 'var(--kp-success-ink)'
      : score >= 50
        ? 'var(--kp-primary)'
        : 'var(--kp-error-ink)';

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 20px' }}>
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              borderRadius: '20px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border)',
              padding: '22px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div style={{ position: 'relative', width: '154px', height: '154px', flexShrink: 0 }}>
              <svg width="154" height="154" viewBox="0 0 154 154">
                <circle
                  cx="77"
                  cy="77"
                  r={radius}
                  fill="none"
                  stroke="var(--kp-raised)"
                  strokeWidth="12"
                />
                <circle
                  cx="77"
                  cy="77"
                  r={radius}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 77 77)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '30px',
                    fontWeight: 700,
                    color: strokeColor,
                    lineHeight: 1,
                  }}
                >
                  {score}%
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--kp-secondary)',
                    marginTop: '4px',
                  }}
                >
                  ACCURACY
                </span>
              </div>
            </div>

            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: passed ? 'var(--kp-mint)' : 'var(--kp-butter)',
                    color: passed ? 'var(--kp-success-ink)' : 'var(--kp-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {passed ? <IconTrophy size={18} /> : <IconAlertTriangle size={18} />}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-ink)',
                  }}
                >
                  Performance summary
                </span>
              </div>
              <QuizRichText content={feedback_summary} variant="summary" />
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--kp-secondary)',
                marginBottom: '10px',
              }}
            >
              Question review
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {full_results.map((item, index) => {
                const isOpen = expandedIdx === index;
                return (
                  <div
                    key={index}
                    style={{
                      borderRadius: '18px',
                      backgroundColor: 'var(--kp-surface)',
                      border: '1px solid var(--kp-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(isOpen ? -1 : index)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'var(--kp-ink)',
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '999px',
                          backgroundColor: item.is_correct
                            ? 'var(--kp-mint)'
                            : 'var(--kp-error-subtle)',
                          color: item.is_correct
                            ? 'var(--kp-success-ink)'
                            : 'var(--kp-error-ink)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.is_correct ? <IconCheck size={14} /> : <IconX size={14} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <QuizRichText
                          content={item.question_text}
                          inline
                          truncate
                          style={{ fontSize: '14px', fontWeight: 600, color: 'var(--kp-ink)' }}
                        />
                      </div>
                      <IconChevronDown
                        size={17}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 160ms ease',
                          color: 'var(--kp-secondary)',
                          flexShrink: 0,
                        }}
                      />
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: '0 16px 16px',
                          borderTop: '1px solid var(--kp-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ paddingTop: '12px' }}>
                          <QuizRichText
                            content={item.question_text}
                            variant="question"
                            style={{ fontSize: '15px' }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '14px',
                              backgroundColor: item.is_correct
                                ? 'var(--kp-mint)'
                                : 'var(--kp-error-subtle)',
                              border: '1px solid var(--kp-border)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: item.is_correct
                                  ? 'var(--kp-success-ink)'
                                  : 'var(--kp-error-ink)',
                                marginBottom: '4px',
                              }}
                            >
                              YOUR ANSWER
                            </div>
                            <QuizRichText
                              content={item.user_answer || 'Skipped'}
                              variant="answer"
                            />
                          </div>
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '14px',
                              backgroundColor: 'var(--kp-mint)',
                              border: '1px solid var(--kp-border)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--kp-success-ink)',
                                marginBottom: '4px',
                              }}
                            >
                              CORRECT ANSWER
                            </div>
                            <QuizRichText content={item.correct_answer} variant="answer" />
                          </div>
                        </div>
                        {!item.is_correct && item.ai_explanation && (
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '14px',
                              backgroundColor: 'var(--kp-raised)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--kp-secondary)',
                                marginBottom: '4px',
                              }}
                            >
                              EXPLANATION
                            </div>
                            <QuizRichText content={item.ai_explanation} variant="explanation" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--kp-border)',
          backgroundColor: 'var(--kp-surface)',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '46px',
              padding: '0 18px',
              borderRadius: '14px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="kp-tactile"
            style={{
              height: '46px',
              padding: '0 22px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: 'var(--kp-primary)',
              color: 'var(--kp-on-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <IconRefresh size={16} />
            <span>Retake quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuizOrchestratorModal({ opened, onClose, planTopicId }) {
  const [state, setState] = useState('SETUP');
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!opened) {
      const timer = setTimeout(() => {
        setState('SETUP');
        setQuestions(null);
        setResults(null);
        setErrorMessage('');
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && state !== 'GENERATING' && state !== 'EVALUATING') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [opened, state, onClose]);

  if (!opened) return null;

  const handleStartGeneration = async (cfg) => {
    setConfig(cfg);
    setErrorMessage('');
    setState('GENERATING');
    try {
      const data = await generateQuizBYOK({
        planTopicId,
        questionCount: cfg?.question_count ?? cfg?.questionCount ?? 10,
        quizMode: cfg?.quiz_mode ?? cfg?.quizMode ?? 'Core Concepts',
      });
      setQuestions(data.questions || []);
      setState('RUNNER');
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setErrorMessage('Connect your ChatGPT account in the opened panel to generate a quiz.');
      } else {
        setErrorMessage(err?.message || 'Could not generate quiz right now.');
      }
      setState('SETUP');
    }
  };

  const handleEvaluation = async (attempts) => {
    setState('EVALUATING');
    try {
      const evaluated = await evaluateQuizSubmissionBYOK({
        planTopicId,
        attempts,
        quizMode: config?.quiz_mode ?? config?.quizMode,
      });
      setResults(evaluated);
      setState('RESULTS');
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setErrorMessage('Connect your ChatGPT account in the opened panel to evaluate answers.');
      } else {
        setErrorMessage(err?.message || 'Could not evaluate quiz answers.');
      }
      setState('SETUP');
    }
  };

  const handleRetake = () => {
    setState('SETUP');
    setQuestions(null);
    setResults(null);
    setErrorMessage('');
  };

  let headerTitle = 'Practice quiz';
  let HeaderIcon = IconBrain;
  let content = (
    <SetupView
      onStart={handleStartGeneration}
      onClose={onClose}
      errorMessage={errorMessage}
    />
  );

  if (state === 'GENERATING') {
    headerTitle = 'Preparing questions';
    content = (
      <LoadingView
        title="Writing your questions..."
        message="Building questions tailored to today's study topics."
      />
    );
  } else if (state === 'RUNNER') {
    headerTitle = 'Practice session';
    HeaderIcon = IconTarget;
    content = <RunnerView questions={questions || []} onComplete={handleEvaluation} />;
  } else if (state === 'EVALUATING') {
    headerTitle = 'Reviewing answers';
    content = (
      <LoadingView
        title="Checking your responses..."
        message="Putting together detailed explanations and feedback."
      />
    );
  } else if (state === 'RESULTS') {
    headerTitle = 'Quiz summary';
    HeaderIcon = IconChartBar;
    content = <ResultsView results={results} onRetake={handleRetake} onClose={onClose} />;
  }

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        backgroundColor: 'var(--kp-canvas)',
        color: 'var(--kp-ink)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-kp-sans)',
      }}
    >
      <header
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--kp-border)',
          backgroundColor: 'var(--kp-canvas)',
          padding: '12px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HeaderIcon size={20} stroke={1.9} color="var(--kp-primary)" />
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              {headerTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quiz"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={18} stroke={1.9} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
