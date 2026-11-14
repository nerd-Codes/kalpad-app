// src/components/landing/home/ComparisonAndPromises.jsx
"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconLayoutGrid,
  IconMessageOff,
  IconCompass,
  IconScissors,
  IconBook2,
  IconRefresh,
  IconCheck,
  IconHighlight,
  IconAlertTriangle,
} from '@tabler/icons-react';
import {
  sectionReveal,
  MOTION_CURVES,
  MOTION_DURATIONS,
} from './motionTokens';
import styles from './LandingHome.module.css';

const PROMISES = [
  {
    id: 'clarity',
    code: 'PROMISE 01',
    title: 'Clarity over Clutter',
    subtitle: 'ROI triage + conscious sacrifice',
    tintVar: 'var(--kp-butter)',
  },
  {
    id: 'efficiency',
    code: 'PROMISE 02',
    title: 'Unified Textbook Notes',
    subtitle: 'PDFs + prof diagrams in one calm page',
    tintVar: 'var(--kp-mint)',
  },
  {
    id: 'consistency',
    code: 'PROMISE 03',
    title: 'Win Today. Zero Guilt.',
    subtitle: 'Adaptive pacing when life happens',
    tintVar: 'var(--kp-apricot)',
  },
];

const TRIAGE_TOPICS = [
  { id: 't1', name: 'PN Junction Depletion & V_bi', roi: '84% PYQ weight', minHours: 1.5, unit: 'Unit 3' },
  { id: 't2', name: 'Fermi Level & Mass-Action Law', roi: '78% PYQ weight', minHours: 1.5, unit: 'Unit 2' },
  { id: 't3', name: 'Hall Effect Numericals', roi: '64% PYQ weight', minHours: 2.5, unit: 'Unit 2' },
  { id: 't4', name: 'Diode Current Derivation', roi: '52% PYQ weight', minHours: 3.5, unit: 'Unit 3' },
  { id: 't5', name: 'Kronig-Penney Algebra Proof', roi: '14% PYQ weight', minHours: 5.0, unit: 'Unit 1' },
  { id: 't6', name: 'Historical Crystal Tables', roi: '6% PYQ weight', minHours: 5.5, unit: 'Unit 1' },
];

const INITIAL_WEEK = [
  { day: 'Mon', topic: 'Band Theory & Fermi', mins: '90m', status: 'done' },
  { day: 'Tue', topic: 'Mass-Action + Hall', mins: '95m', status: 'todo' },
  { day: 'Wed', topic: 'PN Equilibrium Width', mins: '105m', status: 'todo' },
  { day: 'Thu', topic: 'Shockley I-V & Zener', mins: '70m', status: 'todo' },
  { day: 'Fri', topic: 'Timed PYQ Recall', mins: '60m', status: 'todo' },
];

export function ComparisonAndPromises() {
  const [activePromise, setActivePromise] = useState('clarity');

  // Promise 1 state: live slider
  const [triageHours, setTriageHours] = useState(3.0);

  // Promise 2 state: slide view + highlight toggle
  const [noteMode, setNoteMode] = useState('unified'); // 'raw' | 'unified'
  const [highlightedLine, setHighlightedLine] = useState(true);

  // Promise 3 state: missed days simulation + recovery
  const [weekSimState, setWeekSimState] = useState('normal'); // 'normal' | 'missed' | 'adapted'

  const { masterList, sacrificeList, projectedRoi } = useMemo(() => {
    const master = TRIAGE_TOPICS.filter((t) => triageHours >= t.minHours);
    const sacrifice = TRIAGE_TOPICS.filter((t) => triageHours < t.minHours);
    const roi = Math.min(95, Math.round(52 + master.length * 7.2));
    return { masterList: master, sacrificeList: sacrifice, projectedRoi: roi };
  }, [triageHours]);

  const simulatedWeek = useMemo(() => {
    if (weekSimState === 'missed') {
      return INITIAL_WEEK.map((item) => {
        if (item.day === 'Tue' || item.day === 'Wed') {
          return { ...item, status: 'missed' };
        }
        return item;
      });
    }
    if (weekSimState === 'adapted') {
      return [
        { day: 'Mon', topic: 'Band Theory & Fermi', mins: '90m', status: 'done' },
        { day: 'Tue', topic: 'Hackathon / College Day (Guilt-free pause)', mins: '0m', status: 'paused' },
        { day: 'Wed', topic: 'Rest & Catch-up buffer cleared', mins: '0m', status: 'paused' },
        { day: 'Thu', topic: 'Merged Core: Hall + PN Equilibrium Width', mins: '130m', status: 'boosted' },
        { day: 'Fri', topic: 'Zener Traps + 35m Timed PYQ Sweep', mins: '110m', status: 'boosted' },
      ];
    }
    return INITIAL_WEEK;
  }, [weekSimState]);

  return (
    <>
      {/* SECTION 2: THE PROBLEM — SMART STUDENTS, DUMB TOOLS */}
      <section
        id="how-it-works"
        style={{ scrollMarginTop: '68px', borderTop: '1px solid var(--kp-border)' }}
      >
        <div className={styles.sectionWrap}>
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            style={{ maxWidth: '720px', marginBottom: '32px' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#D97706',
                marginBottom: '10px',
              }}
            >
              01 / WHY EXISTING TOOLS FAIL AT 11 PM
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.55rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                fontWeight: 800,
                color: 'var(--kp-ink)',
              }}
            >
              Smart students. Dumb tools.
            </h2>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '16px',
                lineHeight: 1.6,
                color: 'var(--kp-secondary)',
              }}
            >
              Every college senior tells you to just make a schedule. Nobody admits how much
              cognitive fatigue hits when your calendar breaks by Day 2.
            </p>
          </motion.div>

          <div className={styles.threeColBento}>
            {/* Notion / Todoist */}
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              style={{
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--kp-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconLayoutGrid size={20} color="var(--kp-secondary)" />
              </div>
              <div style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                Notion &amp; Todoist
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--kp-secondary)',
                }}
              >
                The Blank Canvas Trap
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                You spend two hours styling Notion databases before reading a single theorem. Miss
                one deadline and overdue red badges pile up until you close the tab.
              </p>
            </motion.div>

            {/* ChatGPT / Gemini */}
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              style={{
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--kp-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconMessageOff size={20} color="var(--kp-secondary)" />
              </div>
              <div style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                ChatGPT &amp; Generic AI
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--kp-secondary)',
                }}
              >
                Amnesia + Text Walls
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                Every chat starts from zero. It generates optimistic 14-hour schedules with zero
                regard for exam weightage, skipped days, or your prof&apos;s circuit diagrams.
              </p>
            </motion.div>

            {/* KalPad Contrast Card (Ref 5 high-contrast card) */}
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              style={{
                backgroundColor: 'var(--kp-butter)',
                border: '1.5px solid var(--kp-primary)',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--kp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCompass size={20} color="var(--kp-on-primary)" />
              </div>
              <div style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                KalPad Study OS
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--kp-accent-ink)',
                }}
              >
                Brutal Honesty + Daily Quests
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'var(--kp-ink)', fontWeight: 500 }}>
                Ingests your syllabus &amp; PDFs, splits high-ROI units from safe sacrifices, turns
                today into clickable check-coins, and writes notes + tutor help inside the same desk.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE THREE PROMISES — INTERACTIVE WORKBENCH */}
      <section
        id="features"
        style={{ scrollMarginTop: '68px', borderTop: '1px solid var(--kp-border)' }}
      >
        <div className={styles.sectionWrap}>
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            style={{ maxWidth: '760px', marginBottom: '26px' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#D97706',
                marginBottom: '10px',
              }}
            >
              02 / THE THREE PROMISES OF KALPAD
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.55rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                fontWeight: 800,
                color: 'var(--kp-ink)',
              }}
            >
              Experience each promise right here.
            </h2>
          </motion.div>

          {/* Capsule/Rounded Tab Selector with layoutId */}
          <div className={styles.promiseTabBar} role="tablist" aria-label="Three promises of KalPad">
            {PROMISES.map((item) => {
              const isSelected = activePromise === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActivePromise(item.id)}
                  className={`${styles.promiseTabBtn} ${
                    isSelected ? styles.promiseTabBtnActive : ''
                  }`}
                  data-testid={`promise-tab-${item.id}`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="kp-promise-tab"
                      transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.springSettle }}
                      className={styles.promiseTabHighlight}
                    />
                  )}
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isSelected ? 'var(--kp-accent-ink)' : 'var(--kp-secondary)',
                    }}
                  >
                    {item.code}
                  </span>
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '15.5px',
                      fontWeight: 800,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '12.5px',
                      color: 'var(--kp-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {item.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Stage */}
          <div
            style={{
              marginTop: '18px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              borderRadius: '24px',
              padding: '22px',
            }}
          >
            <AnimatePresence mode="wait">
              {activePromise === 'clarity' && (
                <motion.div
                  key="clarity-stage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.standard }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                >
                  <div className={styles.controlStrip}>
                    <div style={{ maxWidth: '460px' }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                        Hours-to-ROI Triage Simulator
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}>
                        Slide down to crunch-week reality ({triageHours.toFixed(1)}h/day). Watch KalPad
                        keep high-weightage derivations and move filler out.
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        minWidth: '230px',
                        flex: '0 1 320px',
                      }}
                    >
                      <input
                        type="range"
                        min="1.5"
                        max="6.0"
                        step="0.5"
                        value={triageHours}
                        onChange={(e) => setTriageHours(parseFloat(e.target.value))}
                        className={styles.deskSlider}
                        aria-label="Promise 1 hours per day slider"
                        data-testid="promise-triage-slider"
                      />
                      <div style={{ textAlign: 'right', minWidth: '92px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'var(--kp-ink)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {triageHours.toFixed(1)}h/day
                        </div>
                        <div
                          data-testid="promise-roi-pct"
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: 'var(--kp-success-ink)',
                          }}
                        >
                          ~{projectedRoi}% exam ROI
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.twoColSplit}>
                    <div
                      style={{
                        backgroundColor: 'var(--kp-mint)',
                        borderRadius: '18px',
                        padding: '16px',
                        border: '1px solid var(--kp-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '9px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: 'var(--kp-success-ink)',
                          }}
                        >
                          <IconBook2 size={16} />
                          The Focus ({masterList.length} Locked In)
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '11px',
                            color: 'var(--kp-secondary)',
                          }}
                        >
                          HIGH YIELD
                        </span>
                      </div>

                      {masterList.map((t) => (
                        <motion.div
                          key={t.id}
                          layout
                          transition={{ duration: MOTION_DURATIONS.standard, ease: MOTION_CURVES.springSettle }}
                          style={{
                            backgroundColor: 'var(--kp-surface)',
                            borderRadius: '11px',
                            padding: '10px 12px',
                            border: '1px solid var(--kp-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                            {t.name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-kp-mono)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--kp-success-ink)',
                              flexShrink: 0,
                            }}
                          >
                            {t.roi}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div
                      style={{
                        backgroundColor: 'var(--kp-canvas)',
                        borderRadius: '18px',
                        padding: '16px',
                        border: '1px solid var(--kp-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '9px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: 'var(--kp-accent-ink)',
                          }}
                        >
                          <IconScissors size={16} />
                          The Sacrifice ({sacrificeList.length} Paused Safely)
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '11px',
                            color: 'var(--kp-secondary)',
                          }}
                        >
                          LOW RETURN
                        </span>
                      </div>

                      {sacrificeList.length === 0 ? (
                        <div
                          style={{
                            padding: '18px 12px',
                            fontSize: '13px',
                            color: 'var(--kp-secondary)',
                            lineHeight: 1.5,
                          }}
                        >
                          At {triageHours.toFixed(1)}h/day, you have full syllabus runway — nothing
                          needs to be dropped. Slide below 5.0h to watch KalPad cut low-yield proof
                          filler first.
                        </div>
                      ) : (
                        sacrificeList.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            transition={{
                              duration: MOTION_DURATIONS.standard,
                              ease: MOTION_CURVES.springSettle,
                            }}
                            style={{
                              backgroundColor: 'var(--kp-surface)',
                              borderRadius: '11px',
                              padding: '10px 12px',
                              border: '1px dashed var(--kp-border-strong)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: 'var(--kp-secondary)',
                              }}
                            >
                              {t.name}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-kp-mono)',
                                fontSize: '11px',
                                color: 'var(--kp-accent-ink)',
                                flexShrink: 0,
                              }}
                            >
                              {t.roi}
                            </span>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activePromise === 'efficiency' && (
                <motion.div
                  key="efficiency-stage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.standard }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                        Personal Unified Textbook + Slide Visuals
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}>
                        Stop alt-tabbing between 6 prof PDFs and YouTube. Toggle between messy raw
                        slides and KalPad&apos;s grounded note view.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setNoteMode('raw')}
                        className={`${styles.presetPill} ${
                          noteMode === 'raw' ? styles.presetPillActive : ''
                        }`}
                      >
                        Raw Prof Slide
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteMode('unified')}
                        className={`${styles.presetPill} ${
                          noteMode === 'unified' ? styles.presetPillActive : ''
                        }`}
                      >
                        KalPad Textbook Note
                      </button>
                    </div>
                  </div>

                  {noteMode === 'raw' ? (
                    <div
                      style={{
                        backgroundColor: 'var(--kp-canvas)',
                        border: '1px solid var(--kp-border)',
                        borderRadius: '16px',
                        padding: '18px',
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '12.5px',
                        lineHeight: 1.7,
                        color: 'var(--kp-secondary)',
                      }}
                    >
                      Slide 37/52 (EC-302_Lecture_09_final_v2.pdf): Poisson eq dE/dx = rho/eps.
                      Under depletion approx Na on p side, Nd on n side... [blurred circuit crop]
                      see textbook ch 5.3 for boundary integral &amp; built-in voltage formula...
                    </div>
                  ) : (
                    <div className={styles.twoColSplit}>
                      <div
                        style={{
                          backgroundColor: 'var(--kp-canvas)',
                          borderRadius: '16px',
                          padding: '18px',
                          border: '1px solid var(--kp-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#D97706',
                          }}
                        >
                          UNIFIED EXPLANATION · GROUNDED TO LECTURE SLIDE 37
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                          Built-in Barrier Potential (V_bi) without Memorizing Signs
                        </div>
                        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--kp-secondary)' }}>
                          Think of V_bi as the electrical hill formed once majority holes and electrons
                          diffuse across the metallurgical junction and leave uncovered ions behind.
                        </p>
                        <button
                          type="button"
                          onClick={() => setHighlightedLine((prev) => !prev)}
                          style={{
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--kp-border)',
                            backgroundColor: highlightedLine ? 'var(--kp-butter)' : 'var(--kp-surface)',
                            color: 'var(--kp-ink)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <IconHighlight size={16} color="#D97706" />
                          <span>
                            Exam Trap: Most students plug n_i at 273 K instead of 300 K (n_i = 1.5 x
                            10^10 cm^-3 for Si). Click to toggle highlight.
                          </span>
                        </button>
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--kp-sky)',
                          borderRadius: '16px',
                          padding: '18px',
                          border: '1px solid var(--kp-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--kp-ink)',
                          }}
                        >
                          FORMULA &amp; SIDEBAR TUTOR READY
                        </div>
                        <div
                          style={{
                            backgroundColor: 'var(--kp-surface)',
                            borderRadius: '12px',
                            padding: '14px',
                            fontFamily: 'var(--font-kp-mono)',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: 'var(--kp-ink)',
                            textAlign: 'center',
                          }}
                        >
                          V_bi = (kT / q) · ln( (N_A · N_D) / n_i² )
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--kp-ink)', fontWeight: 500 }}>
                          Highlight any paragraph while reading to save it or ask the Inline Sidebar
                          Tutor — your scroll position never resets.
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activePromise === 'consistency' && (
                <motion.div
                  key="consistency-stage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.standard }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                        Guilt-Free Pace Recovery
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}>
                        Hackathon ran late or lab viva killed two evenings? No red overdue guilt —
                        watch KalPad compress &amp; recover calmly.
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setWeekSimState('missed')}
                        className={styles.presetPill}
                        data-testid="promise-miss-days-btn"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <IconAlertTriangle size={14} color="#D97706" />
                          Simulate: Missed Tue &amp; Wed
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setWeekSimState((prev) => (prev === 'adapted' ? 'normal' : 'adapted'))
                        }
                        className={styles.heroPrimaryBtn}
                        style={{ minHeight: '36px', padding: '0 14px', fontSize: '12.5px' }}
                        data-testid="promise-adapt-btn"
                      >
                        <IconRefresh size={14} />
                        {weekSimState === 'adapted' ? 'Reset week' : 'Adapt plan cleanly'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {simulatedWeek.map((slot) => {
                      const isDone = slot.status === 'done';
                      const isMissed = slot.status === 'missed';
                      const isPaused = slot.status === 'paused';
                      const isBoosted = slot.status === 'boosted';

                      return (
                        <motion.div
                          key={slot.day}
                          layout
                          transition={{ duration: MOTION_DURATIONS.standard, ease: MOTION_CURVES.springSettle }}
                          style={{
                            borderRadius: '14px',
                            padding: '11px 14px',
                            border: '1px solid var(--kp-border)',
                            backgroundColor: isBoosted
                              ? 'var(--kp-butter)'
                              : isMissed
                              ? 'var(--kp-apricot)'
                              : 'var(--kp-canvas)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '8px',
                                backgroundColor: isDone
                                  ? '#176B45'
                                  : isBoosted
                                  ? 'var(--kp-primary)'
                                  : 'var(--kp-surface)',
                                border: '1px solid var(--kp-border-strong)',
                                color: isDone || isBoosted ? '#FFFDF7' : 'var(--kp-secondary)',
                                fontFamily: 'var(--font-kp-mono)',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isDone ? <IconCheck size={13} stroke={3} /> : slot.day[0]}
                            </span>
                            <div>
                              <div
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  color: isPaused ? 'var(--kp-secondary)' : 'var(--kp-ink)',
                                }}
                              >
                                {slot.day} · {slot.topic}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--kp-secondary)' }}>
                                {isMissed && 'Missed — press "Adapt plan cleanly" to redistribute core topics'}
                                {isPaused && 'Restored without overdue red alerts'}
                                {isBoosted && 'Rebalanced to protect exam readiness by Friday'}
                                {isDone && 'Completed & synced to mastery'}
                                {slot.status === 'todo' && 'Scheduled cleanly'}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              fontFamily: 'var(--font-kp-mono)',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: isBoosted ? 'var(--kp-accent-ink)' : 'var(--kp-secondary)',
                            }}
                          >
                            {slot.mins}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
