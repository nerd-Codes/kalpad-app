// src/app/guest-plan/page.js
"use client";

import { useState, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { useGuest } from '@/context/GuestContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

import {
    Container, Title, Text, TextInput, Textarea, Button, Paper, Group,
    Alert, Badge, Loader, Stack, ThemeIcon, Slider, Box, Collapse, Skeleton,
} from '@mantine/core';
import {
    IconCalendar, IconTargetArrow, IconX, IconListDetails,
    IconRotateClockwise, IconBolt, IconSwords, IconTools, IconCheck,
    IconArrowRight, IconArrowLeft, IconClock, IconPlayerPlay,
    IconUserPlus, IconLock, IconInfoCircle,
} from '@tabler/icons-react';

import { SavePlanNudge } from '@/components/SavePlanNudge';
import nudgeClasses from '@/components/SavePlanNudge.module.css';


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_MODES = [
    {
        value: 'default',
        label: 'Balanced',
        tagline: 'Maximize score, not stress.',
        description: "Intelligently skips low-ROI topics and calibrates depth where it matters. KalPad acts like your smart senior — telling you exactly what's worth your time.",
        icon: IconTargetArrow,
        color: 'teal',
    },
    {
        value: 'revision',
        label: 'Revision',
        tagline: 'Lock in what you already know.',
        description: "Assumes you've already studied. Rapidly touches every topic to refresh recall and patch gaps — for the final stretch before exam day.",
        icon: IconRotateClockwise,
        color: 'blue',
    },
    {
        value: 'hardcore',
        label: 'Hardcore',
        tagline: '100% coverage, zero compromise.',
        description: "No topic skipped, no depth cut. Builds from first principles to complete mastery. Demanding daily hours — not for the faint-hearted.",
        icon: IconSwords,
        color: 'red',
    },
    {
        value: 'sprint',
        label: 'Sprint',
        tagline: 'Max score per hour of study.',
        description: "Ruthless triage — master the golden 20% that yields 80% of marks. Sacrifices breadth for extreme depth. Built for time pressure.",
        icon: IconBolt,
        color: 'yellow',
    },
    {
        value: 'skill',
        label: 'Skill Build',
        tagline: 'Build real things, not notes.',
        description: "Project-first approach for skills and portfolios. Tangible outputs from day one — less passive theory, more doing and building.",
        icon: IconTools,
        color: 'grape',
    },
];

// Guest: 3 form steps + 1 output step (no PDF, no special instructions — quick demo flow)
const STEP_META = [
    { label: 'Mode',   hint: 'How should KalPad approach this?' },
    { label: 'Info',   hint: 'What are you preparing for?' },
    { label: 'Timing', hint: 'Deadline and daily hours' },
    { label: 'Plan',   hint: 'Your generated study plan' },
];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const cardVariants = {
    enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0, scale: 0.985 }),
    center: {
        x: 0, opacity: 1, scale: 1,
        transition: { type: 'spring', stiffness: 380, damping: 32 },
    },
    exit: (dir) => ({
        x: dir > 0 ? -40 : 40, opacity: 0, scale: 0.985,
        transition: { duration: 0.14 },
    }),
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const useTypingEffect = (text = '', speed = 8) => {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        if (!text) { setDisplayed(''); return; }
        let i = 0; setDisplayed('');
        const id = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return displayed;
};

const getDiffConfig = (diff) => {
    switch (diff?.toLowerCase()) {
        case 'easy':    return { color: 'green',  border: '#2dce89' };
        case 'medium':  return { color: 'yellow', border: '#f4c30d' };
        case 'hard':    return { color: 'orange', border: '#ff6b35' };
        case 'intense': return { color: 'red',    border: '#f72585' };
        default:        return { color: 'gray',   border: 'rgba(255,255,255,0.15)' };
    }
};

const getTypeColor = (type) => ({
    Concept: 'blue', Problem: 'orange', Practice: 'teal',
    Challenge: 'red', Review: 'gray', Recall: 'cyan',
    Formula: 'green', Summary: 'violet', Derivation: 'indigo',
    Proof: 'pink', Build: 'grape', Code: 'lime',
    Project: 'yellow', Configure: 'orange',
})[type] || 'gray';


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Step Progress Indicator ──────────────────────────────────────────────────
function StepIndicator({ current }) {
    return (
        <Box mb="xl">
            {/* Mobile: progress bar */}
            <Box hiddenFrom="sm">
                <Group justify="space-between" mb={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                        Step {current + 1} of {STEP_META.length}
                    </Text>
                    <Text size="xs" c="violet.4" fw={600}>{STEP_META[current]?.label}</Text>
                </Group>
                <Box style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                        style={{ height: '100%', borderRadius: 2, backgroundColor: 'var(--mantine-color-violet-5)' }}
                        animate={{ width: `${((current + 1) / STEP_META.length) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
                    />
                </Box>
            </Box>

            {/* Desktop: numbered circles */}
            <Group visibleFrom="sm" justify="center" gap={0} align="flex-start">
                {STEP_META.map((step, i) => (
                    <Fragment key={step.label}>
                        {i > 0 && (
                            <Box style={{
                                flex: 1, maxWidth: 64, height: 2, marginTop: 15,
                                backgroundColor: i <= current
                                    ? 'var(--mantine-color-violet-5)'
                                    : 'rgba(255,255,255,0.08)',
                                transition: 'background-color 0.4s ease',
                            }} />
                        )}
                        <Box style={{ textAlign: 'center', minWidth: 52 }}>
                            <motion.div
                                animate={{
                                    scale: i === current ? 1.15 : 1,
                                    backgroundColor:
                                        i < current  ? '#12b886' :
                                        i === current ? 'var(--mantine-color-violet-6)' :
                                                        'rgba(255,255,255,0.06)',
                                    boxShadow: i === current
                                        ? '0 0 0 3px rgba(139,92,246,0.3)'
                                        : '0 0 0 0px transparent',
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto',
                                }}
                            >
                                {i < current
                                    ? <IconCheck size={14} color="white" strokeWidth={3} />
                                    : <Text size="xs" fw={700} c="white">{i + 1}</Text>
                                }
                            </motion.div>
                            <Text
                                size="xs" mt={6}
                                fw={i === current ? 600 : 400}
                                c={i === current ? 'white' : 'dimmed'}
                                style={{ transition: 'color 0.3s' }}
                            >
                                {step.label}
                            </Text>
                        </Box>
                    </Fragment>
                ))}
            </Group>
        </Box>
    );
}

// ── Skeleton: Strategy Card ──────────────────────────────────────────────────
function StrategySkeleton() {
    return (
        <GlassCard p="lg" mb="lg">
            <Stack gap="md">
                <Group justify="space-between">
                    <Skeleton height={14} width={120} radius="xl" />
                    <Skeleton height={22} width={110} radius="xl" />
                </Group>
                <Skeleton height={13} />
                <Skeleton height={13} />
                <Skeleton height={13} width="78%" />
                <Skeleton height={13} width="52%" />
                <Skeleton height={26} width={130} radius="md" />
            </Stack>
        </GlassCard>
    );
}

// ── Skeleton: Day Card ───────────────────────────────────────────────────────
function DaySkeleton() {
    return (
        <Paper p="lg" radius="lg" mb="sm" style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
        }}>
            <Group justify="space-between" mb={10}>
                <Group gap="xs">
                    <Skeleton height={20} width={52} radius="sm" />
                    <Skeleton height={14} width={80} radius="xl" />
                </Group>
                <Group gap="xs">
                    <Skeleton height={18} width={52} radius="xl" />
                    <Skeleton height={18} width={36} radius="xl" />
                </Group>
            </Group>
            <Skeleton height={17} width="65%" mb={8} />
            <Skeleton height={11} mb={3} />
            <Skeleton height={11} width="80%" mb={14} />
            <Stack gap={4}>
                <Skeleton height={36} radius={6} />
                <Skeleton height={36} radius={6} />
                <Skeleton height={36} width="88%" radius={6} />
            </Stack>
        </Paper>
    );
}

// ── Day Card ─────────────────────────────────────────────────────────────────
function DayCard({ day }) {
    const { color, border } = getDiffConfig(day.day_difficulty);
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
        >
            <Paper
                p="lg" radius="lg" mb="sm"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderLeft: `4px solid ${border}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                }}
            >
                {/* Row 1: Day + Date + Difficulty + Hours */}
                <Group justify="space-between" mb={10} wrap="wrap" gap="xs">
                    <Group gap={8} align="center">
                        <Box style={{
                            background: 'rgba(139,92,246,0.18)',
                            border: '1px solid rgba(139,92,246,0.35)',
                            borderRadius: 6, padding: '2px 10px',
                        }}>
                            <Text size="xs" fw={800} c="violet.3" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Day {day.day}
                            </Text>
                        </Box>
                        {day.date && <Text size="sm" c="dimmed" fw={500}>{day.date}</Text>}
                    </Group>
                    <Group gap={6}>
                        <Badge size="sm" variant="filled" color={color} fw={700}>{day.day_difficulty}</Badge>
                        <Badge size="sm" variant="light" color="gray" leftSection={<IconClock size={10} />} fw={600}>
                            {day.study_hours}h
                        </Badge>
                    </Group>
                </Group>

                {/* Row 2: Topic Name */}
                <Text fw={800} size="md" mb={6} style={{
                    lineHeight: 1.35, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.95)',
                }}>
                    {day.topic_name}
                </Text>

                {/* Row 3: Summary */}
                {day.day_summary && (
                    <Text size="sm" c="dimmed" mb={14} style={{ lineHeight: 1.7, fontStyle: 'italic' }}>
                        {day.day_summary}
                    </Text>
                )}

                {/* Row 4: Sub-topics */}
                {day.sub_topics?.length > 0 && (
                    <Stack gap={6}>
                        {day.sub_topics.map((sub, si) => (
                            <Box
                                key={si} p={12}
                                style={{
                                    borderRadius: 8,
                                    backgroundColor: sub.type === 'Challenge'
                                        ? 'rgba(247,37,133,0.08)' : 'rgba(255,255,255,0.04)',
                                    border: sub.type === 'Challenge'
                                        ? '1px solid rgba(247,37,133,0.25)' : '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <Text size="sm" style={{ lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                                    {sub.text}
                                </Text>
                                <Group gap={5} mt={7}>
                                    {sub.type && (
                                        <Badge size="xs" variant="light" color={getTypeColor(sub.type)} fw={600}
                                            style={{ textTransform: 'capitalize' }}>
                                            {sub.type}
                                        </Badge>
                                    )}
                                    {sub.difficulty && (
                                        <Badge size="xs" variant="filled" fw={700} color={
                                            sub.difficulty === 'Hard'   ? 'orange' :
                                            sub.difficulty === 'Medium' ? 'yellow' : 'green'
                                        }>
                                            {sub.difficulty}
                                        </Badge>
                                    )}
                                </Group>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Paper>
        </motion.div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function GuestPlanPage() {
    const router = useRouter();
    const { saveGuestArtifact } = useGuest();

    // Date constraints — guests capped at 7 days
    const today      = new Date();
    const minDateStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const maxDateObj = new Date(today); maxDateObj.setDate(today.getDate() + 7);
    const maxDateStr = maxDateObj.toISOString().split('T')[0];

    // ── Wizard navigation ──
    const [currentStep, setCurrentStep] = useState(0);
    const [direction,   setDirection]   = useState(1);
    const [formError,   setFormError]   = useState('');

    // ── Form state ──
    const [examName,         setExamName]         = useState('');
    const [syllabus,         setSyllabus]         = useState('');
    const [examDate,         setExamDate]         = useState(maxDateStr);
    const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
    const [planMode,         setPlanMode]         = useState('default');

    // ── Generation state ──
    const [isGenerating,      setIsGenerating]      = useState(false);
    const [plan,              setPlan]              = useState([]);
    const [strategy,          setStrategy]          = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error,             setError]             = useState('');

    // ── UI state ──
    const [currentFact,  setCurrentFact]  = useState(wittyFacts[0]);
    const [highlightSave, setHighlightSave] = useState(false);
    const typedApproach = useTypingEffect(strategy?.overall_approach);
    const [detailsOpen, { toggle: toggleDetails, close: closeDetails }] = useDisclosure(false);

    const planEndRef   = useRef(null);
    const outputTopRef = useRef(null);


    // ─── EFFECTS ─────────────────────────────────────────────────────────────

    useEffect(() => {
        let id = null;
        if (isGenerating) {
            id = setInterval(() => {
                setCurrentFact(wittyFacts[Math.floor(Math.random() * wittyFacts.length)]);
            }, 4000);
        }
        return () => { if (id) clearInterval(id); };
    }, [isGenerating]);

    useEffect(() => {
        if (!isGenerating && plan.length > 0) setHighlightSave(true);
    }, [isGenerating, plan]);

    useEffect(() => {
        if (isGenerating && planEndRef.current) {
            planEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [plan.length, isGenerating]);

    useEffect(() => {
        if (currentStep === 3 && outputTopRef.current) {
            setTimeout(() => outputTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        }
    }, [currentStep]);


    // ─── NAVIGATION ──────────────────────────────────────────────────────────

    const goNext = () => {
        setFormError('');
        if (currentStep === 1) {
            if (!examName.trim()) { setFormError('Please enter the exam or goal name.'); return; }
            if (!syllabus.trim()) { setFormError('Please enter the syllabus or topic list.'); return; }
        }
        if (currentStep === 2) {
            if (!examDate) { setFormError('Please set your exam date.'); return; }
        }
        setDirection(1);
        setCurrentStep(s => s + 1);
    };

    const goBack = () => {
        setFormError('');
        setDirection(-1);
        setCurrentStep(s => s - 1);
    };

    const handleEdit = () => {
        setDirection(-1);
        setCurrentStep(0);
        setPlan([]);
        setStrategy(null);
        setError('');
        setHighlightSave(false);
        closeDetails();
    };


    // ─── GENERATION ──────────────────────────────────────────────────────────

    const handleGenerateAndAdvance = () => {
        setDirection(1);
        setCurrentStep(3);
        handleGuestGeneration();
    };

    const handleGuestGeneration = async () => {
        setError(''); setPlan([]); setStrategy(null); setGenerationContext(null); setIsGenerating(true);
        try {
            // Client-side date cap guard
            const diffDays = Math.ceil(Math.abs(new Date(examDate) - today) / (1000 * 60 * 60 * 24));
            if (diffDays > 8) throw new Error('Guest plans are limited to 1 week. Please sign up for longer plans.');

            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-is-guest': 'true' },
                body: JSON.stringify({ examName, syllabus, examDate, useDocuments: false, studyHoursPerDay, planMode }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Generation failed.');
            if (!response.body) throw new Error('Streaming response not available.');

            const reader  = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n---\n');
                buffer = parts.pop() || '';
                for (const part of parts) {
                    if (!part.trim()) continue;
                    try {
                        const msg = JSON.parse(part);
                        if (msg.type === 'strategy') {
                            setStrategy(msg.data);
                            setGenerationContext(JSON.stringify(msg.data));
                        } else if (msg.type === 'plan_topic') {
                            setPlan(p => [...p, msg.data]);
                            await new Promise(r => setTimeout(r, 50));
                        } else if (msg.type === 'error') {
                            throw new Error(msg.data.message);
                        }
                    } catch (e) { console.error('Stream parse error:', e); }
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAndSignup = () => {
        saveGuestArtifact({
            examName, examDate, syllabus,
            plan: plan.filter(Boolean),
            generationContext,
            generatedNotes: [],
        });
        router.push('/sign-up?intent=guest_sync');
    };


    // ─── SHARED INPUT STYLE ───────────────────────────────────────────────────

    const inputStyles = {
        input: {
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
        },
    };


    // ─── STEP RENDERERS ───────────────────────────────────────────────────────

    // Step 0 — Mode
    const renderStep0 = () => (
        <Box maw={620} mx="auto">
            <Stack gap={4} mb="xl">
                <Title order={2} fw={700} style={{ letterSpacing: '-0.02em' }}>Choose your approach</Title>
                <Text c="dimmed" size="sm">
                    Each mode has a completely different strategy. Pick the one that matches your situation.
                </Text>
            </Stack>
            <Stack gap="md">
                {PLAN_MODES.map((mode) => {
                    const isActive = planMode === mode.value;
                    return (
                        <Interactive key={mode.value} onClick={() => setPlanMode(mode.value)}>
                            <Paper
                                p="md" radius="lg"
                                style={{
                                    backgroundColor: isActive ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.025)',
                                    border: isActive ? '1px solid rgba(139,92,246,0.45)' : '1px solid rgba(255,255,255,0.07)',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, background-color 0.2s',
                                }}
                            >
                                <Group gap="md" align="flex-start" wrap="nowrap">
                                    <ThemeIcon
                                        variant={isActive ? 'filled' : 'light'}
                                        size={46} radius="md" color={mode.color}
                                        style={{ flexShrink: 0, marginTop: 2 }}
                                    >
                                        <mode.icon size={22} />
                                    </ThemeIcon>
                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                        <Group gap="sm" mb={3} wrap="wrap">
                                            <Text fw={700} size="sm">{mode.label}</Text>
                                            <Text size="xs" c={isActive ? 'violet.3' : 'dimmed'} fw={500}>
                                                {mode.tagline}
                                            </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            {mode.description}
                                        </Text>
                                    </Box>
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.5, opacity: 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                                style={{ flexShrink: 0 }}
                                            >
                                                <ThemeIcon variant="filled" size={24} radius="xl" color="violet">
                                                    <IconCheck size={13} strokeWidth={3} />
                                                </ThemeIcon>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Group>
                            </Paper>
                        </Interactive>
                    );
                })}
            </Stack>
        </Box>
    );

    // Step 1 — Exam Info + Syllabus
    const renderStep1 = () => {
        const isSkill = planMode === 'skill';
        return (
            <Box maw={620} mx="auto">
                <Stack gap={4} mb="xl">
                    <Title order={2} fw={700} style={{ letterSpacing: '-0.02em' }}>
                        {isSkill ? 'What are you building?' : 'What are you preparing for?'}
                    </Title>
                    <Text c="dimmed" size="sm">
                        Write the <strong style={{ color: 'rgba(255,255,255,0.75)' }}>full name</strong> of your exam — it gives KalPad better context than abbreviations.
                    </Text>
                </Stack>
                <Stack gap="xl">
                    <Box>
                        <TextInput
                            label={isSkill ? 'Project / Skill Goal' : 'Exam Name'}
                            placeholder={
                                isSkill
                                    ? 'e.g. Build a Full-Stack Web App with React and Node.js'
                                    : 'e.g. GATE (Graduate Aptitude Test in Engineering)'
                            }
                            size="md" radius="md" required
                            value={examName}
                            onChange={e => setExamName(e.target.value)}
                            leftSection={<IconTargetArrow size={18} />}
                            styles={inputStyles}
                        />
                        <Text size="xs" c="dimmed" mt={6} ml={2}>
                            💡 Write full forms — "JEE (Joint Entrance Examination)" not just "JEE". The AI uses this to infer the exact exam pattern.
                        </Text>
                    </Box>
                    <Box>
                        <Textarea
                            label={isSkill ? 'Topics / Tech Stack' : 'Syllabus'}
                            placeholder={
                                isSkill
                                    ? 'List the skills, technologies, or concepts you want to cover — one per line...'
                                    : 'Paste your syllabus, topic list, or rough notes here.\nOne topic per line works great.\n\ne.g.\n1. Thermodynamics\n2. Fluid Mechanics\n3. Heat Transfer'
                            }
                            minRows={8} autosize required
                            value={syllabus}
                            onChange={e => setSyllabus(e.target.value)}
                            styles={inputStyles}
                            radius="md" size="md"
                        />
                        <Text size="xs" c="dimmed" mt={6} ml={2}>
                            💡 More specific = smarter plan. Include unit names and chapter numbers where possible.
                        </Text>
                    </Box>
                </Stack>
            </Box>
        );
    };

    // Step 2 — Timing (with 7-day cap banner)
    const renderStep2 = () => (
        <Box maw={520} mx="auto">
            <Stack gap={4} mb="xl">
                <Title order={2} fw={700} style={{ letterSpacing: '-0.02em' }}>Set your timeline</Title>
                <Text c="dimmed" size="sm">
                    KalPad uses these to distribute the workload realistically across your days.
                </Text>
            </Stack>

            {/* Guest cap notice */}
            <Alert
                variant="light" color="violet" radius="md" mb="xl"
                icon={<IconLock size={16} />}
                styles={{ root: { backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' } }}
            >
                <Text size="sm">
                    <strong>Guest plans are limited to 7 days.</strong> Sign up for free to generate full multi-week plans with no limits.
                </Text>
                <Button
                    variant="light" color="violet" size="xs" mt="xs"
                    leftSection={<IconUserPlus size={13} />}
                    component="a" href="/sign-up"
                >
                    Create Free Account
                </Button>
            </Alert>

            <Stack gap="xl">
                <TextInput
                    type="date"
                    label={planMode === 'skill' ? 'Project Deadline (Max 7 days)' : 'Exam Date (Max 7 days)'}
                    size="md" radius="md" required
                    value={examDate}
                    min={minDateStr}
                    max={maxDateStr}
                    onChange={e => setExamDate(e.target.value)}
                    leftSection={<IconCalendar size={18} />}
                    styles={inputStyles}
                />
                <Box>
                    <Group justify="space-between" mb="sm">
                        <Text size="sm" fw={600}>Daily Study Hours</Text>
                        <Badge size="lg" variant="filled" color="violet" radius="sm" fw={700}>
                            {studyHoursPerDay}h / day
                        </Badge>
                    </Group>
                    <Slider
                        value={studyHoursPerDay} onChange={setStudyHoursPerDay}
                        min={1} max={12} step={1}
                        color="violet" size="lg" thumbSize={26}
                        marks={[
                            { value: 2,  label: 'Casual'  },
                            { value: 5,  label: 'Focused' },
                            { value: 8,  label: 'Intense' },
                            { value: 11, label: 'Monk'    },
                        ]}
                        styles={{ markLabel: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 } }}
                    />
                    <Text size="xs" c="dimmed" mt="xl">
                        💡 KalPad will let you know if your hours are too low for the selected mode.
                    </Text>
                </Box>
            </Stack>
        </Box>
    );

    // Step 3 — Output
    const renderStep3 = () => (
        <Box>
            <div ref={outputTopRef} />

            {/* Summary bar */}
            <Group
                justify="space-between" mb="xl" pb="md" wrap="wrap" gap="md"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
                <Box>
                    <Title order={3} fw={700} style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {examName || 'Your Study Plan'}
                    </Title>
                    <Group gap="xs" mt={4} wrap="wrap">
                        <Badge size="xs" variant="filled" color="green" fw={600}>Guest Mode</Badge>
                        <Badge size="xs" variant="light" color={PLAN_MODES.find(m => m.value === planMode)?.color || 'violet'}>
                            {PLAN_MODES.find(m => m.value === planMode)?.label}
                        </Badge>
                        {studyHoursPerDay && (
                            <Badge size="xs" variant="outline" color="gray" leftSection={<IconClock size={9} />}>
                                {studyHoursPerDay}h/day
                            </Badge>
                        )}
                        {examDate && (
                            <Badge size="xs" variant="outline" color="gray" leftSection={<IconCalendar size={9} />}>
                                {examDate}
                            </Badge>
                        )}
                    </Group>
                </Box>
                {!isGenerating && plan.length > 0 && (
                    <Group gap="sm">
                        <Button
                            variant="default" size="sm" radius="md"
                            leftSection={<IconArrowLeft size={15} />}
                            onClick={handleEdit}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="filled" color="teal" size="sm" radius="md"
                            leftSection={<IconUserPlus size={15} />}
                            onClick={handleSaveAndSignup}
                            className={highlightSave ? nudgeClasses.pulseEffect : ''}
                        >
                            Save & Sign Up
                        </Button>
                    </Group>
                )}
            </Group>

            {/* ── Strategy ── */}
            {!strategy && isGenerating ? (
                <>
                    <StrategySkeleton />
                    <GlassCard
                        p="xl" mb="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                            border: '1px solid rgba(139,92,246,0.25)',
                            textAlign: 'center',
                        }}
                    >
                        <Box style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 20,
                        }}>
                            <Loader size="lg" color="violet" type="dots" />
                            <Box>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentFact}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35 }}
                                    >
                                        <Text size="md" fw={500} maw={460} mx="auto"
                                            style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.82)' }}>
                                            {currentFact}
                                        </Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>
                            <Text size="xs" c="dimmed">KalPad is thinking hard. This usually takes 20–60 seconds.</Text>
                        </Box>
                    </GlassCard>
                </>
            ) : strategy ? (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <GlassCard p="lg" mb="xl" style={{ borderLeft: '4px solid #BF5AF2' }}>
                        <Stack gap="md">
                            <Group justify="space-between" wrap="wrap" gap="xs">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                    Strategic Analysis
                                </Text>
                                <Badge size="md" variant="dot" color="teal">
                                    {strategy.estimated_coverage}% Coverage
                                </Badge>
                            </Group>
                            <Text size="sm" style={{ lineHeight: 1.75 }}>{typedApproach}</Text>
                            <Button
                                variant="subtle" size="xs" color="gray"
                                leftSection={<IconListDetails size={14} />}
                                onClick={toggleDetails}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {detailsOpen ? 'Hide Breakdown' : 'View Breakdown'}
                            </Button>
                            <Collapse in={detailsOpen}>
                                <Stack gap="xs" pt={4}>
                                    {strategy.emphasized_topics?.length > 0 && (
                                        <Box>
                                            <Text size="xs" fw={700} c="teal.4" tt="uppercase" mb={6} style={{ letterSpacing: '0.08em' }}>
                                                Priority Targets
                                            </Text>
                                            <Stack gap={2}>
                                                {strategy.emphasized_topics.map((t, i) => (
                                                    <Text key={i} size="sm">• {t.topic}</Text>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                    {strategy.skipped_topics?.length > 0 && (
                                        <Box mt="xs">
                                            <Text size="xs" fw={700} c="orange.4" tt="uppercase" mb={6} style={{ letterSpacing: '0.08em' }}>
                                                Omitted (Low ROI)
                                            </Text>
                                            <Stack gap={2}>
                                                {strategy.skipped_topics.map((t, i) => (
                                                    <Text key={i} size="sm" c="dimmed">• {t.topic}</Text>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                    {strategy.deprioritized_topics?.length > 0 && (
                                        <Box mt="xs">
                                            <Text size="xs" fw={700} c="yellow.5" tt="uppercase" mb={6} style={{ letterSpacing: '0.08em' }}>
                                                Condensed (Quick Coverage)
                                            </Text>
                                            <Stack gap={2}>
                                                {strategy.deprioritized_topics.map((t, i) => (
                                                    <Text key={i} size="sm" c="dimmed">• {t.topic}</Text>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            </Collapse>
                        </Stack>
                    </GlassCard>
                </motion.div>
            ) : null}

            {/* ── Day-by-Day Plan ── */}
            {strategy && (
                <Box>
                    <Group justify="space-between" mb="md" align="center">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                            Day-by-Day Plan
                            {plan.length > 0 && (
                                <Text component="span" c="dimmed" fw={400}>
                                    {' · '}{plan.length} {plan.length === 1 ? 'day' : 'days'}
                                </Text>
                            )}
                        </Text>
                        {isGenerating && <Loader size="xs" color="violet" type="dots" />}
                    </Group>
                    <Stack gap={0}>
                        {plan.filter(Boolean).map((day, i) => (
                            <DayCard key={`${day.day}-${i}`} day={day} />
                        ))}
                        {isGenerating && <><DaySkeleton /><DaySkeleton /></>}
                    </Stack>
                </Box>
            )}

            <div ref={planEndRef} style={{ height: 1 }} />

            {/* ── Post-generation CTA ── */}
            {!isGenerating && plan.length > 0 && (
                <Box mt="xl" pt="xl" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>

                    {/* Upsell banner */}
                    <GlassCard
                        p="lg" mb="xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(18,184,134,0.1) 0%, rgba(99,102,241,0.08) 100%)',
                            border: '1px solid rgba(18,184,134,0.2)',
                        }}
                    >
                        <Group justify="space-between" wrap="wrap" gap="md">
                            <Box>
                                <Text fw={700} size="sm" mb={4}>Want the full experience?</Text>
                                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                                    Free account unlocks multi-week plans, progress tracking,
                                    PDF upload, special instructions, and plan history.
                                </Text>
                            </Box>
                            <Button
                                variant="filled" color="teal" radius="xl" size="md"
                                leftSection={<IconUserPlus size={17} />}
                                onClick={handleSaveAndSignup}
                            >
                                Save Plan & Sign Up Free
                            </Button>
                        </Group>
                    </GlassCard>

                    <Group gap="md" justify="center" wrap="wrap">
                        <Button
                            variant="default" size="lg" radius="xl"
                            leftSection={<IconArrowLeft size={18} />}
                            onClick={handleEdit}
                            style={{ minWidth: 160 }}
                        >
                            Edit Parameters
                        </Button>
                        <Interactive>
                            <ShimmerButton
                                size="lg" radius="xl" color="#12b886"
                                onClick={handleSaveAndSignup}
                                style={{ minWidth: 200, fontWeight: 600, letterSpacing: '0.02em' }}
                            >
                                <Group gap="xs">
                                    <IconUserPlus size={20} />
                                    <span>Save & Sign Up Free</span>
                                </Group>
                            </ShimmerButton>
                        </Interactive>
                    </Group>
                </Box>
            )}

            {error && (
                <Alert color="red" title="Generation Error" icon={<IconX size={14} />} mt="lg" radius="md">
                    {error}
                </Alert>
            )}
        </Box>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0: return renderStep0();
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            default: return null;
        }
    };


    // ─── ROOT RENDER ─────────────────────────────────────────────────────────

    return (
        <AppLayout isGuest={true}>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <Container size="lg" pt="xl" pb="xl" className="no-scrollbar">

                {/* Header */}
                <Box mb="xl">
                    <Group align="center" gap="sm" wrap="wrap">
                        <Title
                            order={1}
                            className="apple-text-gradient"
                            style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.03em' }}
                        >
                            Try KalPad
                        </Title>
                        <Badge size="lg" color="teal" variant="filled" fw={700}>Guest Mode</Badge>
                    </Group>
                    <Text c="dimmed" size="md" mt={4}>Generate a 1-week strategy instantly — no account needed.</Text>
                </Box>

                {/* Step indicator — dots on form steps, progress bar on output */}
                {currentStep < 3 ? (
                    <StepIndicator current={currentStep} />
                ) : (
                    <Box mb="xl" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                            style={{ height: '100%', backgroundColor: '#12b886', borderRadius: 2 }}
                            initial={{ width: '80%' }}
                            animate={{ width: !isGenerating ? '100%' : '80%' }}
                            transition={{ duration: 0.6 }}
                        />
                    </Box>
                )}

                {/* Step card */}
                <Box style={{ position: 'relative', minHeight: currentStep < 3 ? 360 : 'auto' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={cardVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            {currentStep < 3 ? (
                                <GlassCard p={{ base: 'lg', sm: 'xl' }} style={{ minHeight: 320 }}>
                                    {renderCurrentStep()}
                                </GlassCard>
                            ) : (
                                <GlassCard p={{ base: 'md', sm: 'xl' }}>
                                    {renderCurrentStep()}
                                </GlassCard>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Box>

                {/* Navigation (form steps only) */}
                {currentStep < 3 && (
                    <Box maw={620} mx="auto" mt="xl">
                        {formError && (
                            <Alert color="red" size="sm" mb="md" radius="md" icon={<IconX size={14} />} p="sm">
                                {formError}
                            </Alert>
                        )}
                        <Group justify={currentStep === 0 ? 'flex-end' : 'space-between'}>
                            {currentStep > 0 && (
                                <Button
                                    variant="subtle" color="gray" size="md" radius="xl"
                                    leftSection={<IconArrowLeft size={16} />}
                                    onClick={goBack}
                                >
                                    Back
                                </Button>
                            )}
                            {currentStep < 2 ? (
                                <Button
                                    size="md" color="violet" radius="xl"
                                    rightSection={<IconArrowRight size={16} />}
                                    onClick={goNext}
                                    style={{ minWidth: 120 }}
                                >
                                    Next
                                </Button>
                            ) : (
                                <Interactive>
                                    <ShimmerButton
                                        size="md" radius="xl" color="#3300eb"
                                        onClick={handleGenerateAndAdvance}
                                        style={{ fontWeight: 600, letterSpacing: '0.02em', minWidth: 160 }}
                                    >
                                        <Group gap="xs">
                                            <IconPlayerPlay size={18} />
                                            <span>Generate Plan</span>
                                        </Group>
                                    </ShimmerButton>
                                </Interactive>
                            )}
                        </Group>
                    </Box>
                )}

            </Container>
        </AppLayout>
    );
}