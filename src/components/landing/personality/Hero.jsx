// src/components/landing/personality/Hero.jsx
"use client";

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconArrowRight,
  IconCheck,
  IconSparkles,
  IconAlertCircle,
  IconRefresh,
  IconBook2,
  IconScissors,
  IconTarget,
} from '@tabler/icons-react';
import { useGuest } from '@/context/GuestContext';
import { generatePlanBYOK } from '@/lib/byok/pipelines/planGenerator';
import {
  heroStagger,
  heroRise,
  MOTION_CURVES,
  MOTION_DURATIONS,
} from '../home/motionTokens';
import styles from '../home/LandingHome.module.css';

const PRESET_SCENARIOS = [
  {
    id: 'evs',
    pillLabel: 'EVS Internal · 4d',
    examName: 'EVS & Environmental Studies Internal',
    tag: 'Tonight at 11 PM',
    daysLeft: 4,
    defaultHours: 2.5,
    syllabus:
      'Unit 1: Multidisciplinary nature of environmental studies, renewable vs non-renewable resources.\nUnit 2: Ecosystems — energy flow, food webs, ecological pyramids, biogeochemical cycles.\nUnit 3: Biodiversity conservation, India hotspots, endangered species, IUCN categories.\nUnit 4: Air, water, thermal & nuclear pollution case studies, Solid Waste & Disaster Management.',
    baseFocus: ['Ecological Pyramids & Energy Flow', 'Biodiversity Hotspots & Conservation'],
    cutAtLowHours: 'Long textbook case-study history lists (trimmed to 4 landmark rulings)',
    cutAtHighHours: 'Redundant ministerial committee dates outside MCQs',
    day1Topic: 'Ecosystem Energy Flow & Ecological Pyramids',
    tasks: [
      {
        id: 'evs-1',
        duration: '40m',
        title: 'Draw Lindeman 10% energy flow + 3 pyramid inversions from memory',
        type: 'Recall + Sketch',
      },
      {
        id: 'evs-2',
        duration: '35m',
        title: 'Compress Biodiversity Hotspots (Western Ghats, Himalaya, Indo-Burma)',
        type: 'Exam Pattern',
      },
      {
        id: 'evs-3',
        duration: '25m',
        title: 'Solve 6 quick past-paper short answers without peeking at notes',
        type: 'Active Recall',
      },
    ],
    buildFullPlan: (hours, addDays) => [
      {
        day: 1,
        date: addDays(0),
        topic_name: `Ecosystems & Energy Flow (${hours}h)`,
        study_hours: hours,
        importance: 9,
        day_difficulty: 'Medium',
        day_summary: 'Lock down core diagrams and high-weight definitions first.',
        sub_topics: [
          {
            text: '(45 min) Ecological Pyramids (number, biomass, energy) — sketch upright vs inverted cases with exact aquatic biomass exception.',
            completed: false,
            difficulty: 'Medium',
            type: 'Concept & Sketch',
          },
          {
            text: '(45 min) Biogeochemical Cycles (Carbon, Nitrogen fixation steps) — map bacterial names onto a single flowchart.',
            completed: false,
            difficulty: 'Medium',
            type: 'Diagram',
          },
          {
            text: '(30 min) Active recall check: write 4-mark answers for food web stability without notes.',
            completed: false,
            difficulty: 'Easy',
            type: 'Recall',
          },
        ],
      },
      {
        day: 2,
        date: addDays(1),
        topic_name: `Biodiversity & India Hotspots (${hours}h)`,
        study_hours: hours,
        importance: 10,
        day_difficulty: 'Medium',
        day_summary: 'Master in-situ vs ex-situ conservation and high-frequency MCQ lists.',
        sub_topics: [
          {
            text: '(50 min) Four Indian Biodiversity Hotspots + endemic species table + IUCN Red List categories.',
            completed: false,
            difficulty: 'Medium',
            type: 'High-Yield',
          },
          {
            text: '(40 min) In-situ vs Ex-situ conservation comparison table + Project Tiger & Biosphere Reserves.',
            completed: false,
            difficulty: 'Easy',
            type: 'Comparison',
          },
        ],
      },
      {
        day: 3,
        date: addDays(2),
        topic_name: `Pollution & Solid Waste Rules (${hours}h)`,
        study_hours: hours,
        importance: 8,
        day_difficulty: 'Easy',
        day_summary: 'Distill 50-page policy PDFs into crisp cause-effect-control tables.',
        sub_topics: [
          {
            text: '(55 min) Air (SO2, NOx, AQI), Water (BOD/COD formulas), and e-Waste 3R control mechanisms.',
            completed: false,
            difficulty: 'Medium',
            type: 'Synthesis',
          },
          {
            text: '(35 min) Indian Environmental Acts (Wildlife 1972, EPA 1986) — build timeline flash prompts.',
            completed: false,
            difficulty: 'Easy',
            type: 'Memory Hook',
          },
        ],
      },
      {
        day: 4,
        date: addDays(3),
        topic_name: `Rapid Recall & Past Paper Sweep (${hours}h)`,
        study_hours: hours,
        importance: 6,
        day_difficulty: 'Easy',
        day_summary: 'Simulated 2-hour sprint and weak-spot patch before exam morning.',
        sub_topics: [
          {
            text: '(60 min) Timed past-paper simulation covering Units 1–4 short and long questions.',
            completed: false,
            difficulty: 'Medium',
            type: 'Mock Test',
          },
        ],
      },
    ],
  },
  {
    id: 'semi',
    pillLabel: 'Semiconductor Physics · 6d',
    examName: 'Semiconductor Physics & PN Devices',
    tag: 'B.Sc / ECE Core',
    daysLeft: 6,
    defaultHours: 3.5,
    syllabus:
      'Unit 1: Crystal lattices, Kronig-Penney model, E-k diagrams, effective mass, direct vs indirect bandgaps.\nUnit 2: Fermi-Dirac distribution, intrinsic/extrinsic carrier concentration, mass-action law, Hall effect.\nUnit 3: Continuity equation, drift-diffusion transport, Einstein relation, PN junction depletion width & I-V derivation, Zener/avalanche breakdown.',
    baseFocus: ['Fermi Level & Mass-Action Numericals', 'PN Junction Built-in Potential & Depletion'],
    cutAtLowHours: 'Full Kronig-Penney differential algebra proof (keep physical bandgap result)',
    cutAtHighHours: 'Obscure tertiary compound lattice constants',
    day1Topic: 'Band Theory, Effective Mass & Fermi Level',
    tasks: [
      {
        id: 'semi-1',
        duration: '60m',
        title: 'Derive Fermi-Dirac occupancy & intrinsic n_i = sqrt(N_c N_v)exp(-E_g/2kT)',
        type: 'Derivation',
      },
      {
        id: 'semi-2',
        duration: '55m',
        title: 'Solve 5 Hall-effect carrier concentration & mobility numericals',
        type: 'Numerical',
      },
      {
        id: 'semi-3',
        duration: '35m',
        title: 'Contrast direct (GaAs) vs indirect (Si) E-k diagrams on one page',
        type: 'Diagram',
      },
    ],
    buildFullPlan: (hours, addDays) => [
      {
        day: 1,
        date: addDays(0),
        topic_name: `Band Diagrams & Carrier Statistics (${hours}h)`,
        study_hours: hours,
        importance: 10,
        day_difficulty: 'Hard',
        day_summary: 'Build rock-solid Fermi level intuition so numericals click fast.',
        sub_topics: [
          {
            text: '(75 min) Effective mass tensor, E-k curvature intuition, and direct vs indirect bandgap recombination mechanisms.',
            completed: false,
            difficulty: 'Hard',
            type: 'Theory + Sketch',
          },
          {
            text: '(65 min) Intrinsic & extrinsic Fermi level shift with temperature + mass-action law np = n_i^2 numerical set.',
            completed: false,
            difficulty: 'Medium',
            type: 'Numerical Drill',
          },
        ],
      },
      {
        day: 2,
        date: addDays(1),
        topic_name: `Drift-Diffusion & Hall Effect (${hours}h)`,
        study_hours: hours,
        importance: 9,
        day_difficulty: 'Hard',
        day_summary: 'Link mobility, Einstein relation D/mu = kT/q, and Hall voltage sign.',
        sub_topics: [
          {
            text: '(80 min) Continuity equation boundary cases + Einstein relation derivation and unit sanity checks.',
            completed: false,
            difficulty: 'Hard',
            type: 'Derivation',
          },
          {
            text: '(50 min) Hall voltage measurement numericals: distinguish p-type vs n-type carrier concentration.',
            completed: false,
            difficulty: 'Medium',
            type: 'Problem Set',
          },
        ],
      },
      {
        day: 3,
        date: addDays(2),
        topic_name: `PN Junction Equilibrium & Width (${hours}h)`,
        study_hours: hours,
        importance: 10,
        day_difficulty: 'Hard',
        day_summary: 'Master Poisson integration across depletion region without sign mistakes.',
        sub_topics: [
          {
            text: '(90 min) Built-in potential V_bi, space-charge width W, peak electric field E_max, and depletion capacitance.',
            completed: false,
            difficulty: 'Hard',
            type: 'Core Derivation',
          },
        ],
      },
      {
        day: 4,
        date: addDays(3),
        topic_name: `Diode I-V & Breakdown Mechanisms (${hours}h)`,
        study_hours: hours,
        importance: 9,
        day_difficulty: 'Medium',
        day_summary: 'Compare Zener tunneling vs Avalanche multiplication side by side.',
        sub_topics: [
          {
            text: '(75 min) Shockley ideal diode equation derivation from minority-carrier boundary injection.',
            completed: false,
            difficulty: 'Hard',
            type: 'Derivation',
          },
          {
            text: '(45 min) Zener vs Avalanche breakdown temperature coefficient & doping threshold comparison.',
            completed: false,
            difficulty: 'Medium',
            type: 'Concept',
          },
        ],
      },
    ],
  },
  {
    id: 'os',
    pillLabel: 'OS & Deadlocks · 7d',
    examName: 'Operating Systems & Concurrency',
    tag: 'Internship + Midterm Week',
    daysLeft: 7,
    defaultHours: 4.0,
    syllabus:
      'Unit 1: Process states, PCB, context switching, CPU scheduling (FCFS, SJF, SRTF, RR, MLFQ).\nUnit 2: Critical section problem, mutex/semaphores, Producer-Consumer, Reader-Writer, Dining Philosophers, Banker’s deadlock avoidance.\nUnit 3: Paging, TLB effective access time, page replacement (FIFO, LRU, Optimal, Belady’s anomaly), thrashing.',
    baseFocus: ['Banker’s Algorithm & Semaphore Traces', 'TLB + Multi-Level Paging Numerics'],
    cutAtLowHours: 'Long POSIX kernel C boilerplate code (keep pseudocode invariants)',
    cutAtHighHours: 'Historical MS-DOS single-tasking memory tables',
    day1Topic: 'CPU Scheduling & Context Switch Gantt Traces',
    tasks: [
      {
        id: 'os-1',
        duration: '55m',
        title: 'Run SRTF + Round-Robin quantum=3 Gantt traces & compute turnaround time',
        type: 'Trace Drill',
      },
      {
        id: 'os-2',
        duration: '60m',
        title: 'Solve 2 Banker’s safety-sequence matrices & trap wait-for graph cycles',
        type: 'Exam Favourite',
      },
      {
        id: 'os-3',
        duration: '35m',
        title: 'Write semaphore invariances for Bounded Buffer from blank page',
        type: 'Active Recall',
      },
    ],
    buildFullPlan: (hours, addDays) => [
      {
        day: 1,
        date: addDays(0),
        topic_name: `Process States & Scheduling Numerics (${hours}h)`,
        study_hours: hours,
        importance: 9,
        day_difficulty: 'Medium',
        day_summary: 'Nail zero-error Gantt charts and turnaround formulas.',
        sub_topics: [
          {
            text: '(60 min) Process state transition diagram, PCB overhead, and convoy-effect mechanics.',
            completed: false,
            difficulty: 'Medium',
            type: 'Concept',
          },
          {
            text: '(80 min) Gantt drills for SRTF, Preemptive Priority, and Round-Robin with arrival gaps.',
            completed: false,
            difficulty: 'Medium',
            type: 'Numerical',
          },
        ],
      },
      {
        day: 2,
        date: addDays(1),
        topic_name: `Semaphores & Classic Synchronization (${hours}h)`,
        study_hours: hours,
        importance: 10,
        day_difficulty: 'Hard',
        day_summary: 'Spot deadlock order bugs in wait()/signal() inversions immediately.',
        sub_topics: [
          {
            text: '(90 min) Producer-Consumer, Readers-Writers (no starvation), and Dining Philosophers semaphore invariants.',
            completed: false,
            difficulty: 'Hard',
            type: 'Trace & Proof',
          },
        ],
      },
      {
        day: 3,
        date: addDays(2),
        topic_name: `Deadlock Prevention & Banker’s (${hours}h)`,
        study_hours: hours,
        importance: 9,
        day_difficulty: 'Medium',
        day_summary: 'Turn safety-check tables into an automatic 4-minute exam win.',
        sub_topics: [
          {
            text: '(85 min) Coffman 4 conditions + Need matrix Banker’s safety and resource-request edge cases.',
            completed: false,
            difficulty: 'Medium',
            type: 'Algorithm Drill',
          },
        ],
      },
      {
        day: 4,
        date: addDays(3),
        topic_name: `Paging, TLB & Page Replacement (${hours}h)`,
        study_hours: hours,
        importance: 10,
        day_difficulty: 'Hard',
        day_summary: 'Master multi-level page table sizing and TLB effective access time.',
        sub_topics: [
          {
            text: '(80 min) Virtual-to-physical bit splitting, TLB hit-ratio EAT formulas, and Belady anomaly demo.',
            completed: false,
            difficulty: 'Hard',
            type: 'Numerical',
          },
        ],
      },
    ],
  },
];

function formatFutureDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, daysOffset));
  return d.toISOString().split('T')[0];
}

export function Hero() {
  const router = useRouter();
  const { saveGuestArtifact } = useGuest();
  const customInputRef = useRef(null);

  const [sandboxMode, setSandboxMode] = useState('preset'); // 'preset' | 'custom'
  const [selectedPresetId, setSelectedPresetId] = useState('evs');
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [checkedTasks, setCheckedTasks] = useState({ 'evs-1': true });

  // Custom live-streaming state
  const [customExamName, setCustomExamName] = useState('');
  const [customDays, setCustomDays] = useState(5);
  const [customSyllabus, setCustomSyllabus] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [streamError, setStreamError] = useState(null);
  const [liveStrategy, setLiveStrategy] = useState(null);
  const [livePlanDays, setLivePlanDays] = useState([]);

  const activePreset = useMemo(
    () => PRESET_SCENARIOS.find((p) => p.id === selectedPresetId) || PRESET_SCENARIOS[0],
    [selectedPresetId]
  );

  // Dynamic ROI triage adapting instantaneously to slider movement
  const computedPresetStrategy = useMemo(() => {
    const totalHours = hoursPerDay * activePreset.daysLeft;
    const isTight = hoursPerDay <= 3.0;
    const coveragePct = isTight
      ? Math.min(82, Math.round(58 + totalHours * 1.4))
      : Math.min(96, Math.round(76 + totalHours * 0.9));

    return {
      estimated_coverage: coveragePct,
      recommended_study_hours_per_day: Math.min(6, Number((hoursPerDay + 0.5).toFixed(1))),
      overall_approach: isTight
        ? `At ${hoursPerDay}h/day across ${activePreset.daysLeft} days (${totalHours.toFixed(1)}h total), protect high-frequency diagrams & numericals first and ruthlessly shed narrative filler.`
        : `With ${hoursPerDay}h/day over ${activePreset.daysLeft} days (${totalHours.toFixed(1)}h total), pair core derivations early with timed past-paper recall on the final day.`,
      emphasized_topics: activePreset.baseFocus,
      sacrificeText: isTight ? activePreset.cutAtLowHours : activePreset.cutAtHighHours,
    };
  }, [activePreset, hoursPerDay]);

  const handleSelectPreset = (preset) => {
    setSandboxMode('preset');
    setSelectedPresetId(preset.id);
    setHoursPerDay(preset.defaultHours);
    setCheckedTasks({ [preset.tasks[0].id]: true });
  };

  const toggleCheckCoin = (taskId) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleFocusCustomMode = () => {
    setSandboxMode('custom');
    setStreamError(null);
    setTimeout(() => {
      customInputRef.current?.focus();
    }, 120);
  };

  const handleSavePresetToGuest = () => {
    const examDate = formatFutureDate(activePreset.daysLeft);
    const plan = activePreset.buildFullPlan(hoursPerDay, (offset) =>
      formatFutureDate(offset + 1)
    );
    const strategy = {
      estimated_coverage: computedPresetStrategy.estimated_coverage,
      recommended_study_hours_per_day: computedPresetStrategy.recommended_study_hours_per_day,
      emphasized_topics: computedPresetStrategy.emphasized_topics,
      deprioritized_topics: [],
      skipped_topics: [
        {
          topic: computedPresetStrategy.sacrificeText,
          justification: 'Low score return relative to hours available.',
        },
      ],
      overall_approach: computedPresetStrategy.overall_approach,
      user_request: '',
    };

    saveGuestArtifact({
      examName: activePreset.examName,
      examDate,
      syllabus: activePreset.syllabus,
      plan,
      strategy,
      generationContext: activePreset.id === 'evs' ? 'sprint' : 'default',
      generatedNotes: [],
    });
    router.push('/guest-plan');
  };

  const handleGenerateRealPlan = async (e) => {
    e.preventDefault();
    const trimmedSyllabus = customSyllabus.trim();
    if (trimmedSyllabus.length < 18) {
      setStreamError('Paste at least a few syllabus lines or topics so KalPad can weigh ROI.');
      return;
    }

    const title = customExamName.trim() || 'Upcoming Exam Quest';
    const examDate = formatFutureDate(customDays);

    setIsStreaming(true);
    setStreamError(null);
    setLiveStrategy(null);
    setLivePlanDays([]);
    setStreamStatus('Reading syllabus structure...');

    try {
      let parsedStrategy = null;
      const accumulatedDays = [];

      await generatePlanBYOK({
        examName: title,
        syllabus: trimmedSyllabus,
        examDate,
        studyHoursPerDay: hoursPerDay,
        planMode: hoursPerDay <= 3 ? 'sprint' : 'default',
        isGuest: true,
        onEvent: (msg) => {
          if (msg.type === 'status' && (msg.data?.message || msg.message)) {
            setStreamStatus(msg.data?.message || msg.message);
          } else if (msg.type === 'strategy' && msg.data) {
            parsedStrategy = msg.data;
            setLiveStrategy(msg.data);
            setStreamStatus('Strategy locked. Scheduling Day 1 tasks...');
          } else if (msg.type === 'plan_topic' && msg.data) {
            accumulatedDays.push(msg.data);
            setLivePlanDays([...accumulatedDays]);
          } else if (msg.type === 'error' && (msg.data?.message || msg.message)) {
            setStreamError(msg.data?.message || msg.message);
          }
        },
      });

      if (accumulatedDays.length > 0 && parsedStrategy) {
        saveGuestArtifact({
          examName: title,
          examDate,
          syllabus: trimmedSyllabus,
          plan: accumulatedDays,
          strategy: parsedStrategy,
          generationContext: hoursPerDay <= 3 ? 'sprint' : 'default',
          generatedNotes: [],
        });
        setStreamStatus('Battle plan ready on your desk.');
      }
    } catch (err) {
      if (err?.code === 'BYOK_NOT_CONNECTED' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-byok-chat'));
        setStreamError('Connect your ChatGPT account in the opened panel to generate a custom syllabus, or pick a preset above.');
      } else {
        setStreamError(err?.message || 'Generation interrupted. Please try again.');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Determine active Day 1 tasks (either preset or newly streamed Day 1)
  const displayDay1Tasks = useMemo(() => {
    if (sandboxMode === 'custom' && livePlanDays.length > 0) {
      const day1 = livePlanDays[0];
      return (day1.sub_topics || []).slice(0, 3).map((st, idx) => ({
        id: `live-d1-${idx}`,
        duration: `${Math.max(20, Math.round(((day1.study_hours || hoursPerDay) * 60) / Math.max(1, (day1.sub_topics || []).length)))}m`,
        title: st.text,
        type: st.type || 'Task',
      }));
    }
    return activePreset.tasks;
  }, [sandboxMode, livePlanDays, activePreset, hoursPerDay]);

  const completedCount = displayDay1Tasks.filter((t) => checkedTasks[t.id]).length;
  const completionPct = Math.round((completedCount / Math.max(1, displayDay1Tasks.length)) * 100);

  return (
    <section id="hero" className={styles.heroSection}>
      <div className={styles.heroGrid}>
        {/* LEFT COLUMN — MANIFESTO VOICE & DIRECT CTA */}
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}
        >
          <motion.div variants={heroRise}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '10px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--kp-secondary)',
                letterSpacing: '0.02em',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '4px',
                  backgroundColor: '#D97706',
                }}
              />
              Incubated at MHCIIE · Hansraj College, DU
            </div>
          </motion.div>

          <motion.h1 variants={heroRise} className={styles.heroTitle}>
            Stop planning to plan.{' '}
            <span className={styles.heroTitleMuted}>
              Turn &ldquo;Kal Padhunga&rdquo; into tonight&apos;s actual win.
            </span>
          </motion.h1>

          <motion.p variants={heroRise} className={styles.heroSubhead}>
            Built for students living two lives — building side-projects, internships, or GATE
            prep by day, facing a 50-page internal PDF at 11 PM. Give KalPad your syllabus and real
            hours; it locks in what matters, drops the rest without guilt, and hands you Day 1 on a
            calm desk.
          </motion.p>

          <motion.div
            variants={heroRise}
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', paddingTop: '4px' }}
          >
            <button
              type="button"
              onClick={handleFocusCustomMode}
              className={styles.heroPrimaryBtn}
              data-testid="hero-paste-syllabus-btn"
            >
              Try with your syllabus
              <IconArrowRight size={17} stroke={2.2} />
            </button>

            <Link href="/guest-plan" className={styles.heroSecondaryBtn} data-testid="hero-guest-link">
              Open free guest desk
            </Link>
          </motion.div>

          {/* Grounded metrics without fake claims */}
          <motion.div
            variants={heroRise}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--kp-border)',
              marginTop: '4px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                0 ads
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--kp-secondary)' }}>
                Zero streaks or bloat
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                7.5 → 8.5
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--kp-secondary)' }}>
                Founder DU test jump
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                &lt; 60 sec
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--kp-secondary)' }}>
                No signup required
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN — LIVE TRY-IT-RIGHT-HERE INTERACTIVE STUDY DESK */}
        <motion.div
          id="hero-sandbox"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATIONS.slow, ease: MOTION_CURVES.emphasized, delay: 0.1 }}
          className={styles.sandboxCard}
        >
          {/* Mode Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: '3px',
                borderRadius: '11px',
                backgroundColor: 'var(--kp-canvas)',
                border: '1px solid var(--kp-border)',
                gap: '4px',
              }}
            >
              {[
                { id: 'preset', label: 'Explore real presets' },
                { id: 'custom', label: 'Paste your syllabus' },
              ].map((tab) => {
                const active = sandboxMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSandboxMode(tab.id)}
                    style={{
                      position: 'relative',
                      appearance: 'none',
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 12px',
                      borderRadius: '9px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-kp-sans)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: active ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                      transition: 'color 150ms ease',
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="kp-sandbox-mode-pill"
                        transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.springSettle }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '9px',
                          backgroundColor: 'var(--kp-primary)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--kp-secondary)',
              }}
            >
              LIVE DESK SANDBOX
            </span>
          </div>

          <AnimatePresence mode="wait">
            {sandboxMode === 'preset' ? (
              <motion.div
                key="preset-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.standard }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Preset Scenario Pills */}
                <div className={styles.presetStrip} role="tablist" aria-label="Sample student exams">
                  {PRESET_SCENARIOS.map((preset) => {
                    const isSelected = preset.id === selectedPresetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => handleSelectPreset(preset)}
                        className={`${styles.presetPill} ${
                          isSelected ? styles.presetPillActive : ''
                        }`}
                      >
                        {preset.pillLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Concentric / Machined Daily Hours Slider (Ref 10) */}
                <div className={styles.controlStrip}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '170px' }}>
                    <label
                      htmlFor="hero-hours-slider"
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--kp-ink)',
                      }}
                    >
                      Honest hours you have today
                    </label>
                    <span style={{ fontSize: '11.5px', color: 'var(--kp-secondary)' }}>
                      Drag to see KalPad cut low-ROI noise live
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                      minWidth: '185px',
                    }}
                  >
                    <input
                      id="hero-hours-slider"
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.5"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                      className={styles.deskSlider}
                      aria-label="Daily study hours"
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--kp-ink)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: '58px',
                        textAlign: 'right',
                      }}
                    >
                      {hoursPerDay.toFixed(1)}h/d
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="custom-mode"
                onSubmit={handleGenerateRealPlan}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.standard }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customExamName}
                    onChange={(e) => setCustomExamName(e.target.value)}
                    placeholder="Subject or exam (e.g. Digital Electronics Internal)"
                    data-testid="sandbox-exam-input"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--kp-border-strong)',
                      backgroundColor: 'var(--kp-canvas)',
                      color: 'var(--kp-ink)',
                      fontFamily: 'var(--font-kp-sans)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[2, 4, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomDays(d)}
                        className={`${styles.presetPill} ${
                          customDays === d ? styles.presetPillActive : ''
                        }`}
                        style={{ padding: '7px 9px', fontFamily: 'var(--font-kp-mono)' }}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={customSyllabus}
                  onChange={(e) => setCustomSyllabus(e.target.value)}
                  placeholder="Paste rough chapters or syllabus lines from your college PDF..."
                  data-testid="sandbox-syllabus-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--kp-border-strong)',
                    backgroundColor: 'var(--kp-canvas)',
                    color: 'var(--kp-ink)',
                    fontFamily: 'var(--font-kp-sans)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '160px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--kp-secondary)',
                      }}
                    >
                      {hoursPerDay.toFixed(1)}h/d
                    </span>
                    <input
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.5"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                      className={styles.deskSlider}
                      aria-label="Custom study hours per day"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isStreaming}
                    className={styles.heroPrimaryBtn}
                    style={{ minHeight: '40px', padding: '0 16px', fontSize: '13.5px' }}
                    data-testid="sandbox-generate-btn"
                  >
                    {isStreaming ? (
                      <>
                        <IconRefresh size={15} />
                        Building battle plan...
                      </>
                    ) : (
                      <>
                        <IconSparkles size={15} />
                        Generate AI battle plan
                      </>
                    )}
                  </button>
                </div>

                {streamStatus && !streamError && (
                  <div
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11.5px',
                      color: 'var(--kp-success-ink)',
                      fontWeight: 600,
                    }}
                  >
                    {streamStatus}
                  </div>
                )}

                {streamError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--kp-apricot)',
                      color: 'var(--kp-accent-ink)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <IconAlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{streamError}</span>
                  </div>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {/* CONSTITUTIONAL STRATEGY -> INTERLOCKING JOINT -> DAY 1 DROPLINE QUEST */}
          <div className={styles.strategyToSprintWrap}>
            {/* Promise 1: Constitutional Strategy Card */}
            <div className={styles.strategyCard}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <IconTarget size={16} color="var(--kp-accent-ink)" />
                  <span
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: 'var(--kp-accent-ink)',
                    }}
                  >
                    CONSTITUTIONAL STRATEGY
                  </span>
                </div>

                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--kp-ink)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {sandboxMode === 'custom' && liveStrategy
                    ? `~${liveStrategy.estimated_coverage ?? 84}% yield target`
                    : `~${computedPresetStrategy.estimated_coverage}% exam ROI`}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  fontWeight: 600,
                  color: 'var(--kp-ink)',
                }}
              >
                {sandboxMode === 'custom' && liveStrategy
                  ? liveStrategy.overall_approach
                  : computedPresetStrategy.overall_approach}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: '8px',
                  paddingTop: '4px',
                }}
              >
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--kp-surface)',
                    border: '1px solid var(--kp-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--kp-success-ink)',
                      marginBottom: '2px',
                    }}
                  >
                    <IconBook2 size={13} />
                    The Focus
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-ink)', fontWeight: 600 }}>
                    {sandboxMode === 'custom' && liveStrategy?.emphasized_topics?.[0]
                      ? liveStrategy.emphasized_topics[0]
                      : computedPresetStrategy.emphasized_topics[0]}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--kp-surface)',
                    border: '1px solid var(--kp-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--kp-accent-ink)',
                      marginBottom: '2px',
                    }}
                  >
                    <IconScissors size={13} />
                    The Sacrifice
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-secondary)', fontWeight: 500 }}>
                    {sandboxMode === 'custom' && liveStrategy
                      ? liveStrategy.skipped_topics?.[0]?.topic ||
                        liveStrategy.deprioritized_topics?.[0]?.topic ||
                        'Low-weight proof minutiae safely trimmed'
                      : computedPresetStrategy.sacrificeText}
                  </div>
                </div>
              </div>
            </div>

            {/* Physical Interlocking Joint Node (Ref 4) */}
            <div className={styles.jointSeam} aria-hidden="true">
              <div className={styles.jointSpineLine} />
              <div className={styles.jointPill}>Locked in · Day 1 Quest</div>
            </div>

            {/* Day 1 Dropline Spine & Interactive Check-Coins (Ref 9 & Ref 11) */}
            <div className={styles.sprintCard}>
              <div className={styles.droplineRail} aria-hidden="true" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    {sandboxMode === 'custom' && livePlanDays.length > 0
                      ? livePlanDays[0].topic_name
                      : `Day 1 · ${activePreset.day1Topic}`}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--kp-secondary)' }}>
                    Tap a check-coin to mark tonight&apos;s step complete
                  </div>
                </div>

                <span
                  data-testid="hero-day1-progress"
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: completedCount === displayDay1Tasks.length ? 'var(--kp-success-ink)' : 'var(--kp-ink)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {completedCount}/{displayDay1Tasks.length} · {completionPct}%
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {displayDay1Tasks.map((task) => {
                  const isDone = !!checkedTasks[task.id];
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleCheckCoin(task.id)}
                      className={styles.checkCoinBtn}
                      aria-pressed={isDone}
                    >
                      <motion.span
                        className={styles.checkCoinCircle}
                        animate={{
                          backgroundColor: isDone ? '#176B45' : 'transparent',
                          borderColor: isDone ? '#176B45' : 'var(--kp-border-strong)',
                          scale: isDone ? [1, 1.15, 1] : 1,
                        }}
                        transition={{ duration: MOTION_DURATIONS.quick, ease: MOTION_CURVES.springSettle }}
                      >
                        {isDone && <IconCheck size={13} color="#FFFDF7" stroke={3} />}
                      </motion.span>

                      <span
                        style={{
                          flex: 1,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isDone ? 'var(--kp-secondary)' : 'var(--kp-ink)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          lineHeight: 1.38,
                        }}
                      >
                        {task.title}
                      </span>

                      <span
                        style={{
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--kp-secondary)',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {task.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Persistent Bottom Action: 1 Click Into Real Workspace */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '2px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--kp-secondary)', fontWeight: 500 }}>
              {sandboxMode === 'custom' && livePlanDays.length > 0
                ? 'Saved locally to your guest desk.'
                : 'Like this Day 1 setup? Take it into full AI notes right now.'}
            </span>

            {sandboxMode === 'custom' && livePlanDays.length > 0 ? (
              <Link
                href="/guest-plan"
                className={styles.heroPrimaryBtn}
                style={{ minHeight: '40px', padding: '0 16px', fontSize: '13px' }}
              >
                Open full desk &amp; AI notes
                <IconArrowRight size={15} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSavePresetToGuest}
                className={styles.heroPrimaryBtn}
                style={{ minHeight: '40px', padding: '0 16px', fontSize: '13px' }}
                data-testid="sandbox-launch-guest-btn"
              >
                Use this quest &amp; generate notes
                <IconArrowRight size={15} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
