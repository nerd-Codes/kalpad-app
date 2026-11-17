// src/app/guest-plan/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconFlame,
  IconPlayerPlay,
  IconRefresh,
  IconTargetArrow,
  IconTool,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { addDays, format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useGuest } from '@/context/GuestContext';
import { useKalPadTheme } from '@/context/KalPadThemeContext';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import { WeekDatePickerDialog } from '@/components/dashboard/WeekDatePickerDialog';
import { wittyFacts } from '@/lib/newplanFacts';
import { generatePlanBYOK } from '@/lib/byok/pipelines/planGenerator';
import { SubTopicMathText } from '@/components/common/SubTopicMathText';
import classes from '@/components/newplan/NewPlan.module.css';

const PLAN_MODES = [
  {
    value: 'default',
    label: 'Balanced',
    description: 'Steady progress with room to review',
    icon: IconTargetArrow,
  },
  {
    value: 'revision',
    label: 'Revision',
    description: 'Recall and practice come first',
    icon: IconRefresh,
  },
  {
    value: 'hardcore',
    label: 'In-depth',
    description: 'Build a thorough topic foundation',
    icon: IconFlame,
  },
  {
    value: 'sprint',
    label: 'Sprint',
    description: 'Make the most of a short timeline',
    icon: IconBolt,
  },
  {
    value: 'skill',
    label: 'Applied',
    description: 'Learn through practical problems',
    icon: IconTool,
  },
];

const STEP_LABELS = ['Mode', 'Details', 'Timing', 'Plan'];

function localIsoDate(offsetDays = 0) {
  const d = addDays(new Date(), offsetDays);
  return format(d, 'yyyy-MM-dd');
}

function DayCard({ day }) {
  return (
    <div
      style={{
        borderRadius: '18px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              borderRadius: '8px',
              backgroundColor: 'var(--kp-apricot)',
              color: 'var(--kp-accent-ink)',
              padding: '3px 8px',
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            DAY {day.day}
          </span>
          {day.date && (
            <span style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>{day.date}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {day.day_difficulty && (
            <span
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--kp-butter)',
                color: 'var(--kp-ink)',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {day.day_difficulty}
            </span>
          )}
          <span
            style={{
              borderRadius: '8px',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-secondary)',
              padding: '3px 8px',
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconClock size={11} />
            <span>{day.study_hours}h</span>
          </span>
        </div>
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
          lineHeight: 1.35,
        }}
      >
        {day.topic_name}
      </h3>

      {day.day_summary && (
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
          {day.day_summary}
        </p>
      )}

      {Array.isArray(day.sub_topics) && day.sub_topics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {day.sub_topics.map((sub, si) => (
            <div
              key={si}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--kp-canvas)',
                border: '1px solid var(--kp-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--kp-ink)', lineHeight: 1.45 }}>
                <SubTopicMathText text={sub.text} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {sub.type && (
                  <span
                    style={{
                      borderRadius: '6px',
                      backgroundColor: 'var(--kp-raised)',
                      color: 'var(--kp-secondary)',
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {sub.type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuestPlanPage() {
  const router = useRouter();
  const { saveGuestArtifact } = useGuest();
  const { resolvedTheme, setThemeMode } = useKalPadTheme();

  const minDateStr = useMemo(() => localIsoDate(1), []);
  const maxDateStr = useMemo(() => localIsoDate(7), []);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formError, setFormError] = useState('');

  const [examName, setExamName] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [examDate, setExamDate] = useState(maxDateStr);
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
  const [planMode, setPlanMode] = useState('default');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentFact, setCurrentFact] = useState(wittyFacts[0]);

  const outputTopRef = useRef(null);

  useEffect(() => {
    if (!isGenerating) return undefined;
    const id = setInterval(() => {
      setCurrentFact(wittyFacts[Math.floor(Math.random() * wittyFacts.length)]);
    }, 4000);
    return () => clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    if (currentStep === 3 && outputTopRef.current) {
      const t = setTimeout(() => {
        outputTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  const goNext = () => {
    setFormError('');
    if (currentStep === 1) {
      if (!examName.trim()) {
        setFormError('Please enter your exam or subject name.');
        return;
      }
      if (!syllabus.trim()) {
        setFormError('Please add your syllabus topics.');
        return;
      }
    }
    if (currentStep === 2 && !examDate) {
      setFormError('Please choose your target exam date.');
      return;
    }
    setDirection(1);
    setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    setFormError('');
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  };

  const handleEdit = () => {
    setDirection(-1);
    setCurrentStep(0);
    setPlan([]);
    setStrategy(null);
    setError('');
    setDetailsOpen(false);
  };

  const handleGuestGeneration = async () => {
    setError('');
    setPlan([]);
    setStrategy(null);
    setGenerationContext(null);
    setIsGenerating(true);

    try {
      const diffMs = Math.abs(new Date(examDate) - new Date());
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 8) {
        throw new Error('Guest previews cover up to 7 days. Create a free account for longer plans.');
      }

      await generatePlanBYOK({
        examName,
        syllabus,
        examDate,
        studyHoursPerDay,
        planMode,
        isGuest: true,
        onEvent: (msg) => {
          if (msg.type === 'strategy') {
            setStrategy(msg.data);
            setGenerationContext(JSON.stringify(msg.data));
          } else if (msg.type === 'plan_topic') {
            setPlan((p) => [...p, msg.data]);
          } else if (msg.type === 'error') {
            throw new Error(msg.data?.message || 'Generation failed.');
          }
        },
      });
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setError('Connect your ChatGPT account in the opened panel to preview custom plans via BYOK.');
      } else {
        setError(err?.message || 'Generation failed.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndAdvance = () => {
    if (!examDate) {
      setFormError('Please select a target date within the next 7 days.');
      return;
    }
    setDirection(1);
    setCurrentStep(3);
    handleGuestGeneration();
  };

  const handleSaveAndSignup = () => {
    saveGuestArtifact({
      examName,
      examDate,
      syllabus,
      plan: plan.filter(Boolean),
      generationContext,
      generatedNotes: [],
    });
    router.push('/sign-up?intent=guest_sync');
  };

  const progressValue = Math.round(((currentStep + 1) / STEP_LABELS.length) * 100);

  return (
    <div
      className="kp-app-shell"
      style={{
        minHeight: '100vh',
        padding: '24px 18px 64px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Top Utility Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <Link
            href="/"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '999px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-surface)',
              color: 'var(--kp-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <IconArrowLeft size={15} />
            <span>Home</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                borderRadius: '999px',
                backgroundColor: 'var(--kp-mint)',
                color: 'var(--kp-success-ink)',
                border: '1px solid var(--kp-border)',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Guest preview
            </span>
            <button
              type="button"
              onClick={() => setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '999px',
                border: '1px solid var(--kp-border)',
                backgroundColor: 'var(--kp-surface)',
                color: 'var(--kp-ink)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        <header>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: 'clamp(1.65rem, 4vw, 2.2rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--kp-ink)',
            }}
          >
            Try KalPad in 7 days.
          </h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--kp-secondary)' }}>
            Build an instant 1-week study path without signing in first.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {STEP_LABELS.map((label, idx) => (
              <div
                key={label}
                style={{
                  fontSize: '11px',
                  fontWeight: idx === currentStep ? 700 : 500,
                  color: idx <= currentStep ? 'var(--kp-ink)' : 'var(--kp-muted)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <KalPadProgress value={progressValue} height={5} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction * 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -14 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {currentStep === 0 && (
              <section
                className={classes.journeyCard}
                style={{ backgroundColor: 'var(--kp-surface)' }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Choose your approach
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Pick a study style that fits the week ahead.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {PLAN_MODES.map((mode) => {
                    const selected = planMode === mode.value;
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setPlanMode(mode.value)}
                        className="kp-tactile"
                        style={{
                          textAlign: 'left',
                          padding: '13px',
                          borderRadius: '16px',
                          backgroundColor: selected ? 'var(--kp-apricot)' : 'var(--kp-canvas)',
                          border: selected
                            ? '1.5px solid var(--kp-orange)'
                            : '1px solid var(--kp-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <Icon
                            size={16}
                            color={selected ? 'var(--kp-accent-ink)' : 'var(--kp-ink)'}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                            {mode.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
                          {mode.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section
                className={classes.journeyCard}
                style={{ backgroundColor: 'var(--kp-surface)' }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    What are you preparing for?
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Add the exam or subject and paste the topics you want to cover this week.
                  </p>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
                    Exam or subject
                  </span>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g. Calculus II Midterm"
                    className={classes.textField}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
                    Syllabus or topics
                  </span>
                  <textarea
                    rows={6}
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    placeholder={'Integration by parts\nSeries convergence tests\nTaylor approximations'}
                    className={classes.textArea}
                  />
                </label>
              </section>
            )}

            {currentStep === 2 && (
              <section
                className={classes.journeyCard}
                style={{ backgroundColor: 'var(--kp-surface)' }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Target date &amp; daily hours
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Guest previews cover up to 7 days from tomorrow.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="kp-tactile"
                  style={{
                    width: '100%',
                    minHeight: '56px',
                    borderRadius: '18px',
                    backgroundColor: 'var(--kp-butter)',
                    border: '1px solid var(--kp-border)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <IconCalendar size={19} color="var(--kp-accent-ink)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                      {examDate ? format(parseISO(examDate), 'EEE, d MMM yyyy') : 'Choose date'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--kp-secondary)' }}>
                      Allowed window: {minDateStr} to {maxDateStr}
                    </div>
                  </div>
                  <IconArrowRight size={17} color="var(--kp-secondary)" />
                </button>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--kp-ink)' }}>
                      Daily study hours
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--kp-accent-ink)',
                      }}
                    >
                      {studyHoursPerDay} h / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={studyHoursPerDay}
                    onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                    className={classes.kpRange}
                  />
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <div ref={outputTopRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {isGenerating && !strategy && (
                  <section
                    className={classes.journeyCard}
                    style={{ backgroundColor: 'var(--kp-surface)' }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                      Writing your 1-week plan...
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}>{currentFact}</div>
                  </section>
                )}

                {strategy && (
                  <section
                    className={classes.journeyCard}
                    style={{ backgroundColor: 'var(--kp-surface)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>The approach</h2>
                      <span
                        style={{
                          borderRadius: '20px',
                          backgroundColor: 'var(--kp-mint)',
                          color: 'var(--kp-success-ink)',
                          padding: '5px 10px',
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {strategy.estimated_coverage ?? 0}% coverage
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                      {strategy.overall_approach}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((o) => !o)}
                      style={{
                        alignSelf: 'flex-start',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--kp-accent-ink)',
                        cursor: 'pointer',
                      }}
                    >
                      <IconChevronDown
                        size={15}
                        style={{
                          transform: detailsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 160ms ease',
                        }}
                      />
                      <span>{detailsOpen ? 'Hide focus areas' : 'Show focus areas'}</span>
                    </button>

                    {detailsOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {strategy.emphasized_topics?.map((t, i) => (
                          <div key={i} style={{ fontSize: '12px', color: 'var(--kp-ink)' }}>
                            <IconCheck size={13} color="var(--kp-success-ink)" style={{ marginRight: '6px' }} />
                            {typeof t === 'string' ? t : t.topic}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {plan.filter(Boolean).map((day, idx) => (
                  <DayCard key={`${day.day}-${idx}`} day={day} />
                ))}

                {error && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--kp-error-subtle)',
                      color: 'var(--kp-error-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <IconX size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {!isGenerating && plan.length > 0 && (
                  <section
                    style={{
                      borderRadius: '20px',
                      backgroundColor: 'var(--kp-mint)',
                      border: '1px solid var(--kp-border)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                        Save this plan to your study desk
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--kp-secondary)' }}>
                        Create a free account to keep your plan, check off tasks daily, and generate notes.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleEdit}
                        style={{
                          height: '46px',
                          padding: '0 16px',
                          borderRadius: '14px',
                          border: '1px solid var(--kp-border)',
                          backgroundColor: 'var(--kp-surface)',
                          color: 'var(--kp-ink)',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <IconArrowLeft size={15} />
                        <span>Edit details</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndSignup}
                        className="kp-tactile"
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          height: '46px',
                          padding: '0 20px',
                          borderRadius: '14px',
                          border: 'none',
                          backgroundColor: 'var(--kp-primary)',
                          color: 'var(--kp-on-primary)',
                          fontSize: '14px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <IconUserPlus size={17} />
                        <span>Save &amp; sign up free</span>
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {currentStep < 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--kp-error-subtle)',
                  color: 'var(--kp-error-ink)',
                  fontSize: '13px',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    height: '48px',
                    padding: '0 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--kp-border)',
                    backgroundColor: 'var(--kp-surface)',
                    color: 'var(--kp-ink)',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <IconArrowLeft size={16} />
                  <span>Back</span>
                </button>
              ) : (
                <span />
              )}

              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="kp-tactile"
                  style={{
                    height: '50px',
                    padding: '0 22px',
                    borderRadius: '18px',
                    border: 'none',
                    backgroundColor: 'var(--kp-primary)',
                    color: 'var(--kp-on-primary)',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <span>Continue</span>
                  <IconArrowRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateAndAdvance}
                  className="kp-tactile"
                  style={{
                    height: '50px',
                    padding: '0 22px',
                    borderRadius: '18px',
                    border: 'none',
                    backgroundColor: 'var(--kp-primary)',
                    color: 'var(--kp-on-primary)',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <IconPlayerPlay size={17} />
                  <span>Generate preview plan</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <WeekDatePickerDialog
        opened={showDatePicker}
        initialDate={examDate ? parseISO(examDate) : addDays(new Date(), 5)}
        title="Choose exam date (1-7 days)"
        confirmLabel="Use date"
        onDismiss={() => setShowDatePicker(false)}
        onConfirm={(selected) => {
          const picked = format(selected, 'yyyy-MM-dd');
          const clamped = picked < minDateStr ? minDateStr : picked > maxDateStr ? maxDateStr : picked;
          setExamDate(clamped);
          setShowDatePicker(false);
        }}
      />
    </div>
  );
}
