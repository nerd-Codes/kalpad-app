// src/app/new-plan/page.js
"use client";

import { useState, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';
import {
    Container, Title, Text, TextInput, Textarea, Button, Paper, Group,
    FileInput, Checkbox, Alert, Badge, Loader, Stack,
    ThemeIcon, Slider, Box, Collapse, Skeleton, Divider,
} from '@mantine/core';
import {
    IconCalendar, IconBooks, IconPdf, IconTargetArrow, IconX,
    IconListDetails, IconInfoCircle, IconRotateClockwise, IconBolt,
    IconSwords, IconTools, IconBrain, IconCheck, IconLock,
    IconArrowRight, IconArrowLeft, IconEdit, IconDeviceFloppy,
    IconClock, IconAdjustments, IconPlayerPlay, IconFlask,
} from '@tabler/icons-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { SavePlanNudge } from '@/components/SavePlanNudge';
import nudgeClasses from '@/components/SavePlanNudge.module.css';


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_STRATEGY = {
    estimated_coverage: 87,
    overall_approach: "This is a simulated strategy. The AI has determined that focusing on 'Quantum Mechanics' and 'Thermodynamics' yields the highest ROI. We are condensing the 'History of Physics' module to save 12 hours.",
    emphasized_topics: [{ topic: "Quantum Wave Functions" }, { topic: "Laws of Thermodynamics" }, { topic: "Circuit Analysis" }],
    skipped_topics: [{ topic: "Introductory History" }, { topic: "Obscure Citations" }],
};

const SAMPLE_PLAN = Array.from({ length: 7 }).map((_, i) => ({
    day: i + 1,
    date: new Date(new Date().setDate(new Date().getDate() + i + 1)).toISOString().split('T')[0],
    topic_name: i % 2 === 0 ? "Core Concepts: Mechanics (3h)" : "Advanced Application: Fluids (4h)",
    study_hours: 4 + (i % 3),
    importance: 8,
    day_difficulty: i === 2 ? "Hard" : i === 5 ? "Intense" : "Medium",
    day_summary: "Today we focus on deriving the core equations and solving at least 5 practice problems from the main textbook.",
    sub_topics: [
        { text: "(1h) Read Chapter 4: Newton's Laws — focus on the three laws with real-world examples.", type: "Concept", difficulty: "Easy", completed: false },
        { text: "(1.5h) Solve Practice Set A (Q1-10) from the standard problem bank.", type: "Practice", difficulty: "Medium", completed: false },
        { text: "(30 min) GOLDEN QUESTION: Derive the work-energy theorem from Newton's second law.", type: "Challenge", difficulty: "Hard", completed: false },
    ],
}));

const PLAN_MODES = [
    {
        value: 'default',
        label: 'Balanced',
        tagline: 'Maximize score, not stress.',
        description: "Intelligently skips low-ROI topics and calibrates depth where it matters. KalPad acts like your smart senior — telling you exactly what's actually worth your time.",
        icon: IconTargetArrow,
        color: 'teal',
    },
    {
        value: 'revision',
        label: 'Revision',
        tagline: 'Lock in what you already know.',
        description: "Assumes you've already studied. Rapidly touches every topic to refresh recall and patch gaps — designed specifically for the final stretch before exam day.",
        icon: IconRotateClockwise,
        color: 'blue',
    },
    {
        value: 'hardcore',
        label: 'Hardcore',
        tagline: '100% coverage, zero compromise.',
        description: "No topic skipped, no depth cut. Builds from first principles to complete mastery. Expect demanding daily hours. This mode is not for the faint-hearted.",
        icon: IconSwords,
        color: 'red',
    },
    {
        value: 'sprint',
        label: 'Sprint',
        tagline: 'Max score per hour of study.',
        description: "Ruthless triage — master the golden 20% that yields 80% of marks. Sacrifices breadth for extreme depth on what actually matters. Built for time pressure.",
        icon: IconBolt,
        color: 'yellow',
    },
    {
        value: 'skill',
        label: 'Skill Build',
        tagline: 'Build real things, not notes.',
        description: "Project-first approach for skills and portfolios. You'll create tangible outputs from day one — less passive theory, more doing and building.",
        icon: IconTools,
        color: 'grape',
    },
];

const STEP_META = [
    { label: 'Mode',       hint: 'How should KalPad approach this?' },
    { label: 'Info',       hint: 'What are you preparing for?' },
    { label: 'Timing',     hint: 'Deadline and daily hours' },
    { label: 'Customize',  hint: 'Any special instructions?' },
    { label: 'Plan',       hint: 'Your generated study plan' },
];

const INSTRUCTION_CHIPS = [
    'Keep weekends free',
    "I'm weak at calculus",
    'No back-to-back hard days',
    'Prioritize numericals',
    'Skip optional topics',
    'Make Week 2 lighter',
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
// SECTION 3 — PURE HELPERS
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
            {/* Mobile: progress bar + step label */}
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

            {/* Desktop: numbered circles with connectors */}
            <Group visibleFrom="sm" justify="center" gap={0} align="flex-start">
                {STEP_META.map((step, i) => (
                    <Fragment key={step.label}>
                        {i > 0 && (
                            <Box
                                style={{
                                    flex: 1, maxWidth: 64, height: 2, marginTop: 15,
                                    backgroundColor: i <= current
                                        ? 'var(--mantine-color-violet-5)'
                                        : 'rgba(255,255,255,0.08)',
                                    transition: 'background-color 0.4s ease',
                                }}
                            />
                        )}
                        <Box style={{ textAlign: 'center', minWidth: 52 }}>
                            <motion.div
                                animate={{
                                    scale: i === current ? 1.15 : 1,
                                    backgroundColor:
                                        i < current
                                            ? '#12b886'
                                            : i === current
                                            ? 'var(--mantine-color-violet-6)'
                                            : 'rgba(255,255,255,0.06)',
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
                                size="xs"
                                mt={6}
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
        <Paper p="lg" radius="lg" mb="sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
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

// ── Day Card (Fully Expanded) ────────────────────────────────────────────────
function DayCard({ day }) {
    const { color, border } = getDiffConfig(day.day_difficulty);
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
        >
            <Paper
                p="lg"
                radius="lg"
                mb="sm"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderLeft: `4px solid ${border}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                }}
            >
                {/* Row 1: Day number + Date + Difficulty + Hours */}
                <Group justify="space-between" mb={10} wrap="wrap" gap="xs">
                    <Group gap={8} align="center">
                        {/* Day pill — prominent anchor */}
                        <Box style={{
                            background: 'rgba(139,92,246,0.18)',
                            border: '1px solid rgba(139,92,246,0.35)',
                            borderRadius: 6,
                            padding: '2px 10px',
                        }}>
                            <Text size="xs" fw={800} c="violet.3" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Day {day.day}
                            </Text>
                        </Box>
                        {day.date && (
                            <Text size="sm" c="dimmed" fw={500}>{day.date}</Text>
                        )}
                    </Group>
                    <Group gap={6}>
                        {/* FIX 2: difficulty badge — filled variant with real color, never faint */}
                        <Badge size="sm" variant="filled" color={color} fw={700}>
                            {day.day_difficulty}
                        </Badge>
                        <Badge
                            size="sm"
                            variant="light"
                            color="gray"
                            leftSection={<IconClock size={10} />}
                            fw={600}
                        >
                            {day.study_hours}h
                        </Badge>
                    </Group>
                </Group>

                {/* Row 2: Topic Name — the biggest, most visible element */}
                <Text
                    fw={800}
                    size="md"
                    mb={6}
                    style={{ lineHeight: 1.35, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.95)' }}
                >
                    {day.topic_name}
                </Text>

                {/* Row 3: Day Summary — clear but secondary */}
                {day.day_summary && (
                    <Text size="sm" c="dimmed" mb={14} style={{ lineHeight: 1.7, fontStyle: 'italic' }}>
                        {day.day_summary}
                    </Text>
                )}

                {/* Row 4: Sub-Topics — full expansion, clear typography */}
                {day.sub_topics?.length > 0 && (
                    <Stack gap={6}>
                        {day.sub_topics.map((sub, si) => (
                            <Box
                                key={si}
                                p={12}
                                style={{
                                    borderRadius: 8,
                                    backgroundColor: sub.type === 'Challenge'
                                        ? 'rgba(247,37,133,0.08)'
                                        : 'rgba(255,255,255,0.04)',
                                    border: sub.type === 'Challenge'
                                        ? '1px solid rgba(247,37,133,0.25)'
                                        : '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                {/* Sub-topic text — readable size */}
                                <Text size="sm" style={{ lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                                    {sub.text}
                                </Text>
                                <Group gap={5} mt={7}>
                                    {sub.type && (
                                        <Badge
                                            size="xs"
                                            variant="light"
                                            color={getTypeColor(sub.type)}
                                            fw={600}
                                            style={{ textTransform: 'capitalize' }}
                                        >
                                            {sub.type}
                                        </Badge>
                                    )}
                                    {/* FIX 2: difficulty always visible — filled, colored, no opacity hack */}
                                    {sub.difficulty && (
                                        <Badge
                                            size="xs"
                                            variant="filled"
                                            color={
                                                sub.difficulty === 'Hard'   ? 'orange' :
                                                sub.difficulty === 'Medium' ? 'yellow' : 'green'
                                            }
                                            fw={700}
                                        >
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

export default function NewPlanPage() {
    const router = useRouter();
    const planEndRef     = useRef(null);
    const outputTopRef   = useRef(null);

    // ── Wizard Navigation ──
    const [currentStep,   setCurrentStep]   = useState(0);
    const [direction,     setDirection]     = useState(1);
    const [formError,     setFormError]     = useState('');

    // ── Form State ──
    const [session,             setSession]             = useState(null);
    const [examName,            setExamName]            = useState('');
    const [syllabus,            setSyllabus]            = useState('');
    const [examDate,            setExamDate]            = useState('');
    const [studyHoursPerDay,    setStudyHoursPerDay]    = useState(4);
    const [planMode,            setPlanMode]            = useState('default');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [useDocuments,        setUseDocuments]        = useState(false);

    // ── File Processing ──
    const [studyMaterialFile, setStudyMaterialFile] = useState(null);
    const [isProcessing,      setIsProcessing]      = useState(false);
    const [processingState,   setProcessingState]   = useState({ step: 'idle', message: '' });
    const [pageImageUrls,     setPageImageUrls]      = useState([]);
    const [pdfOpen, { toggle: togglePdf }]           = useDisclosure(false);

    // ── Plan Generation ──
    const [isGenerating,      setIsGenerating]      = useState(false);
    const [plan,              setPlan]              = useState([]);
    const [strategy,          setStrategy]          = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error,             setError]             = useState('');

    // ── Save State ──
    const [isSaving,    setIsSaving]    = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError,   setSaveError]   = useState('');

    // ── UI State ──
    const [currentFact,  setCurrentFact]  = useState(wittyFacts[0]);
    const [showSaveNudge, setShowSaveNudge] = useState(false);
    const [highlightSave, setHighlightSave] = useState(false);
    const typedApproach = useTypingEffect(strategy?.overall_approach);
    const [detailsOpen, { toggle: toggleDetails, close: closeDetails }] = useDisclosure(false);

    // ── Gate State ──
    const [isCreationBlocked, setIsCreationBlocked] = useState(false);
    const [userTier,          setUserTier]          = useState('free');

    const { profile, isPaused, resumeTour, endTour } = useOnboarding();


    // ─── EFFECTS ─────────────────────────────────────────────────────────────

    // Auth + free-tier gate
    useEffect(() => {
        const checkGate = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setSession(session);
            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('tier')
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .maybeSingle();
            const tier = sub?.tier || 'free';
            setUserTier(tier);
            if (tier === 'free') {
                const today = new Date().toISOString().split('T')[0];
                const { count } = await supabase
                    .from('study_plans')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('is_active', true)
                    .gte('exam_date', today);
                if (count >= 1) setIsCreationBlocked(true);
            }
        };
        checkGate();
    }, []);

    // Onboarding nudge
    useEffect(() => {
        if (!isGenerating && plan.length > 0 && profile && !profile.has_completed_onboarding) {
            setShowSaveNudge(true);
        }
    }, [isGenerating, plan, profile]);

    // Cycling witty facts during generation
    useEffect(() => {
        let id = null;
        if (isGenerating) {
            id = setInterval(() => {
                setCurrentFact(wittyFacts[Math.floor(Math.random() * wittyFacts.length)]);
            }, 4000);
        }
        return () => { if (id) clearInterval(id); };
    }, [isGenerating]);

    // Auto-scroll to new days as they stream in
    useEffect(() => {
        if (isGenerating && planEndRef.current) {
            planEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [plan.length, isGenerating]);

    // Scroll to top of output when plan step mounts
    useEffect(() => {
        if (currentStep === 4 && outputTopRef.current) {
            setTimeout(() => outputTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        }
    }, [currentStep]);


    // ─── HELPERS ─────────────────────────────────────────────────────────────

    const sanitizeText = (text) => {
        if (!text) return '';
        return text
            .replace(/\u0000/g, '')
            .replace(/([^\ud800-\udbff])([\udc00-\udfff])/g, '$1?')
            .replace(/([\ud800-\udbff])([^\udc00-\udfff])/g, '$1?');
    };

    const chunkText = (text, size, overlap) => {
        const chunks = [];
        if (!text) return chunks;
        let i = 0;
        while (i < text.length) {
            chunks.push(text.substring(i, i + size));
            i += size - overlap;
        }
        return chunks;
    };

    const resizeImage = (blob, maxWidth = 768) => new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = maxWidth;
            canvas.height = img.height * (maxWidth / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas to Blob failed')), 'image/jpeg', 0.8);
        };
        img.onerror = reject;
    });


    // ─── NAVIGATION ──────────────────────────────────────────────────────────

    const goNext = () => {
        setFormError('');
        if (currentStep === 1) {
            if (!examName.trim())  { setFormError('Please enter the exam or goal name.'); return; }
            if (!syllabus.trim())  { setFormError('Please enter the syllabus or topic list.'); return; }
        }
        if (currentStep === 2) {
            if (!examDate) { setFormError('Please set your exam or deadline date.'); return; }
        }
        setDirection(1);
        setCurrentStep(s => s + 1);
    };

    const goBack = () => {
        setFormError('');
        setDirection(-1);
        setCurrentStep(s => s - 1);
    };

    // Edit button: return to step 0, preserve form data, clear output
    const handleEdit = () => {
        setDirection(-1);
        setCurrentStep(0);
        setPlan([]);
        setStrategy(null);
        setError('');
        setSaveError('');
        setSaveSuccess(false);
        setHighlightSave(false);
        setShowSaveNudge(false);
        closeDetails();
    };


    // ─── FILE PROCESSING ─────────────────────────────────────────────────────

    const handleFileChange = (file) => {
        setStudyMaterialFile(file);
        setProcessingState({ step: 'selected', message: file ? `${file.name} selected.` : '' });
    };

    const handleProcessFile = async () => {
        if (!studyMaterialFile || !session) return;
        setIsProcessing(true);
        setError('');
        try {
            setProcessingState({ step: 'checking', message: `Checking '${studyMaterialFile.name}'...` });
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            const buffer = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload  = e => res(e.target.result);
                reader.onerror = rej;
                reader.readAsArrayBuffer(studyMaterialFile);
            });
            const pdfDoc   = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            const pageCount = pdfDoc.numPages;
            const checkRes  = await fetch('/api/check-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: studyMaterialFile.name, page_count: pageCount }),
            });
            if (!checkRes.ok) throw new Error((await checkRes.json()).error || 'Pre-check failed');
            const { status } = await checkRes.json();
            let textChunks = [], imageUrls = [], fullText = '';
            setProcessingState({ step: 'parsing_text', message: `Parsing ${pageCount} pages...` });
            for (let i = 1; i <= pageCount; i++) {
                setProcessingState(p => ({ ...p, message: `Parsing page ${i}/${pageCount}...` }));
                await new Promise(r => setTimeout(r, 5));
                const page    = await pdfDoc.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(x => x.str).join(' ') + '\n\n';
            }
            textChunks = chunkText(sanitizeText(fullText), 1000, 200);
            if (status === 'exists') {
                setProcessingState(p => ({ ...p, step: 'fetching_urls', message: 'Fetching existing images...' }));
                const { data: imgs, error: fetchErr } = await supabase
                    .from('documents').select('image_url, page_number')
                    .eq('user_id', session.user.id).eq('file_name', studyMaterialFile.name)
                    .eq('content_type', 'image_page').order('page_number');
                if (fetchErr) throw new Error(`Couldn't fetch image URLs: ${fetchErr.message}`);
                imageUrls = imgs.map(img => img.image_url);
                setPageImageUrls(imageUrls);
            } else {
                setProcessingState(p => ({ ...p, step: 'parsing_images', message: 'Rendering pages...' }));
                const blobs = [];
                for (let i = 1; i <= pageCount; i++) {
                    setProcessingState(p => ({ ...p, message: `Rendering page ${i}/${pageCount}...` }));
                    await new Promise(r => setTimeout(r, 5));
                    const page = await pdfDoc.getPage(i);
                    const vp   = page.getViewport({ scale: 1.5 });
                    const cv   = document.createElement('canvas');
                    cv.height  = vp.height; cv.width = vp.width;
                    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
                    blobs.push(await resizeImage(await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9))));
                }
                setProcessingState(p => ({ ...p, step: 'uploading_images', message: 'Uploading images...' }));
                for (const [idx, blob] of blobs.entries()) {
                    const path = `${session.user.id}/${studyMaterialFile.name}/page_${idx + 1}_${Date.now()}.jpeg`;
                    const { error: upErr } = await supabase.storage.from('study-materials').upload(path, blob, { contentType: 'image/jpeg' });
                    if (upErr) throw upErr;
                    imageUrls.push(supabase.storage.from('study-materials').getPublicUrl(path).data.publicUrl);
                    setProcessingState(p => ({ ...p, message: `Uploading ${idx + 1}/${blobs.length}...` }));
                    await new Promise(r => setTimeout(r, 5));
                }
                setPageImageUrls(imageUrls);
            }
            setProcessingState(p => ({ ...p, step: 'indexing', message: 'Indexing content...' }));
            const ingestRes = await fetch('/api/ingest-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text_chunks: textChunks, page_image_urls: imageUrls, file_name: studyMaterialFile.name }),
            });
            if (!ingestRes.ok) throw new Error((await ingestRes.json()).error || 'Ingest failed');
            const result = await ingestRes.json();
            setProcessingState({ step: 'done', message: `✅ ${result.message}` });
        } catch (err) {
            setProcessingState({ step: 'error', message: `Error: ${err.message}` });
            setError(`File processing failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };


    // ─── PLAN GENERATION ─────────────────────────────────────────────────────

    // Core streaming handler — accepts the pre-merged syllabus string
    const handlePlanGeneration = async (fullSyllabus) => {
        setError('');
        setPlan([]);
        setStrategy(null);
        setGenerationContext(null);
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examName,
                    syllabus: fullSyllabus,
                    examDate,
                    useDocuments,
                    studyHoursPerDay,
                    planMode,
                }),
            });
            if (!response.body) throw new Error('Stream failed');
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
                    } catch (e) { console.error(e); }
                }
            }
        } catch (err) { setError(err.message); }
        finally {
            setIsGenerating(false);
            if (isPaused) resumeTour();
            if (plan.length > 0) setHighlightSave(true);
        }
    };

    // Called by the Generate button on step 3
    const handleGenerateAndAdvance = () => {
        window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));
        const fullSyllabus = specialInstructions.trim()
            ? `${syllabus}\n\n--- SPECIAL INSTRUCTIONS ---\n${specialInstructions}`
            : syllabus;
        setDirection(1);
        setCurrentStep(4);
        handlePlanGeneration(fullSyllabus);
    };

    // Simulation (kept for dev / demo)
    const handleSimulation = () => {
        setDirection(1);
        setCurrentStep(4);
        setIsGenerating(true);
        setStrategy(null);
        setPlan([]);
        setExamName('Simulation: Quantum Mechanics');
        const next = new Date(); next.setDate(next.getDate() + 7);
        setExamDate(next.toISOString().split('T')[0]);
        setSyllabus('1. Wave Functions\n2. Schrodinger Equation\n3. Thermodynamics Laws');
        setTimeout(() => {
            setStrategy(SAMPLE_STRATEGY);
            setGenerationContext(JSON.stringify(SAMPLE_STRATEGY));
            let n = 0;
            const id = setInterval(() => {
                if (n >= SAMPLE_PLAN.length) { clearInterval(id); setIsGenerating(false); setHighlightSave(true); }
                else { setPlan(p => [...p, SAMPLE_PLAN[n]]); n++; }
            }, 400);
        }, 1000);
    };

    // Save plan
    const handleSavePlan = async () => {
        endTour();
        if (!plan || plan.length === 0) return;
        if (!examName || !examDate) { setSaveError('Exam Name and Date are required.'); return; }
        setIsSaving(true); setSaveError(''); setSaveSuccess(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Auth error');
            const response = await fetch('/api/save-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_name: examName,
                    exam_date: examDate,
                    plan_topics: plan.filter(Boolean),
                    generation_context: generationContext,
                    page_image_urls: pageImageUrls,
                    syllabus,
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            setSaveSuccess(true);
            router.push('/plans');
        } catch (err) { setSaveError(err.message); }
        finally { setIsSaving(false); }
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

    // Step 0 — Mode Selector
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
                                p="md"
                                radius="lg"
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
                                        size={46}
                                        radius="md"
                                        color={mode.color}
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
                            💡 Write full forms — "JEE (Joint Entrance Examination)" not just "JEE". The AI uses this to infer the exact context and marking pattern.
                        </Text>
                    </Box>
                    <Box>
                        <Textarea
                            label={isSkill ? 'Topics / Tech Stack' : 'Syllabus'}
                            placeholder={
                                isSkill
                                    ? 'List the skills, technologies, or concepts you want to cover — one per line...'
                                    : 'Paste your complete syllabus, topic list, or rough notes here.\nOne topic per line works great.\n\ne.g.\n1. Thermodynamics\n2. Fluid Mechanics\n3. Heat Transfer'
                            }
                            minRows={8}
                            autosize
                            required
                            value={syllabus}
                            onChange={e => setSyllabus(e.target.value)}
                            styles={inputStyles}
                            radius="md"
                            size="md"
                        />
                        <Text size="xs" c="dimmed" mt={6} ml={2}>
                            💡 More specific = smarter plan. Include unit names, sub-topics, and chapter numbers where possible.
                        </Text>
                    </Box>

                    {/* Optional PDF Upload */}
                    <Box>
                        <Button
                            variant="subtle"
                            size="xs"
                            color="gray"
                            leftSection={<IconPdf size={14} />}
                            onClick={togglePdf}
                            mb={pdfOpen ? 'sm' : 0}
                            p={0}
                        >
                            {pdfOpen ? 'Hide' : '＋ Attach'} study material PDF (optional)
                        </Button>
                        <Collapse in={pdfOpen}>
                            <Paper p="md" radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Group align="flex-end" gap="sm">
                                    <FileInput
                                        placeholder="Upload PDF"
                                        leftSection={<IconPdf size={16} />}
                                        value={studyMaterialFile}
                                        onChange={handleFileChange}
                                        accept=".pdf"
                                        style={{ flex: 1 }}
                                        styles={inputStyles}
                                    />
                                    <Button
                                        variant="light" color="teal" size="sm"
                                        onClick={handleProcessFile}
                                        loading={isProcessing}
                                        disabled={!studyMaterialFile || processingState.step === 'done'}
                                    >
                                        {processingState.step === 'done' ? <IconCheck size={16} /> : 'Process'}
                                    </Button>
                                </Group>
                                {processingState.message && (
                                    <Text size="xs" c={processingState.step === 'error' ? 'red' : 'dimmed'} mt="xs">
                                        {processingState.message}
                                    </Text>
                                )}
                                <Checkbox
                                    label="Use this document for RAG context"
                                    mt="sm"
                                    size="xs"
                                    checked={useDocuments}
                                    onChange={e => setUseDocuments(e.currentTarget.checked)}
                                    disabled={!studyMaterialFile}
                                />
                            </Paper>
                        </Collapse>
                    </Box>
                </Stack>
            </Box>
        );
    };

    // Step 2 — Timing
    const renderStep2 = () => (
        <Box maw={520} mx="auto">
            <Stack gap={4} mb="xl">
                <Title order={2} fw={700} style={{ letterSpacing: '-0.02em' }}>Set your timeline</Title>
                <Text c="dimmed" size="sm">
                    KalPad uses these to distribute the workload realistically. Be honest — an overloaded plan you won't follow is worse than a lighter one you will.
                </Text>
            </Stack>
            <Stack gap="xl">
                <TextInput
                    type="date"
                    label={planMode === 'skill' ? 'Project Deadline' : 'Exam Date'}
                    size="md" radius="md" required
                    value={examDate}
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
                        value={studyHoursPerDay}
                        onChange={setStudyHoursPerDay}
                        min={1} max={12} step={1}
                        color="violet"
                        size="lg"
                        thumbSize={26}
                        marks={[
                            { value: 2,  label: 'Casual'  },
                            { value: 5,  label: 'Focused' },
                            { value: 8,  label: 'Intense' },
                            { value: 11, label: 'Monk'    },
                        ]}
                        styles={{ markLabel: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 } }}
                    />
                    <Text size="xs" c="dimmed" mt="xl">
                        💡 KalPad will let you know if your hours are insufficient for the selected mode — especially in Hardcore.
                    </Text>
                </Box>
            </Stack>
        </Box>
    );

    // Step 3 — Special Instructions
    const renderStep3 = () => (
        <Box maw={560} mx="auto">
            <Stack gap={4} mb="xl">
                <Title order={2} fw={700} style={{ letterSpacing: '-0.02em' }}>Any special instructions?</Title>
                <Text c="dimmed" size="sm">
                    Optional but powerful. Tell KalPad how to customize your plan. These get merged with your syllabus so the AI can act on them intelligently.
                </Text>
            </Stack>
            <Box>
                <Textarea
                    placeholder={"Examples:\n• Keep Sundays completely free\n• I'm weak at integration — give it extra time\n• Make Week 2 lighter, I have college tests\n• Skip all history sections\n• Day 5 should be revision only\n• Prioritize numerical problems over theory"}
                    minRows={8}
                    value={specialInstructions}
                    onChange={e => setSpecialInstructions(e.target.value)}
                    styles={inputStyles}
                    radius="md"
                    size="md"
                />
                {/* Quick suggestion chips */}
                <Group gap={6} mt={12} wrap="wrap">
                    {INSTRUCTION_CHIPS.map(chip => (
                        <Badge
                            key={chip}
                            variant="outline"
                            color="gray"
                            size="sm"
                            style={{ cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s' }}
                            onClick={() => setSpecialInstructions(p => p ? `${p}\n${chip}` : chip)}
                        >
                            + {chip}
                        </Badge>
                    ))}
                </Group>
                <Text size="xs" c="dimmed" mt={8}>
                    Tap a suggestion to add it. Leave blank to let KalPad decide everything on its own.
                </Text>
            </Box>
        </Box>
    );

    // Step 4 — Output
    const renderStep4 = () => (
        <Box>
            <div ref={outputTopRef} />

            {/* Summary bar */}
            <Group
                justify="space-between"
                mb="xl"
                pb="md"
                wrap="wrap"
                gap="md"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
                <Box>
                    <Title order={3} fw={700} style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {examName || 'Your Study Plan'}
                    </Title>
                    <Group gap="xs" mt={4} wrap="wrap">
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
                            variant="default"
                            size="sm"
                            radius="md"
                            leftSection={<IconEdit size={15} />}
                            onClick={handleEdit}
                        >
                            Edit
                        </Button>
                        <Button
                            id="save-plan-button"
                            variant="filled"
                            color="teal"
                            size="sm"
                            radius="md"
                            leftSection={<IconDeviceFloppy size={15} />}
                            onClick={handleSavePlan}
                            loading={isSaving}
                            disabled={saveSuccess}
                            className={`${showSaveNudge ? nudgeClasses.glowEffect : ''} ${highlightSave ? nudgeClasses.pulseEffect : ''}`}
                        >
                            {saveSuccess ? 'Saved ✓' : 'Save Plan'}
                        </Button>
                    </Group>
                )}
            </Group>

            {/* ── Strategy Section ── */}
            {!strategy && isGenerating ? (
                // FIX 3+4: Loading state — centered, witty facts in prominent GlassCard banner
                <>
                    <StrategySkeleton />
                    {/* Witty fact banner — prominent, centered, styled */}
                    <GlassCard
                        p="xl"
                        mb="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                            border: '1px solid rgba(139,92,246,0.25)',
                            textAlign: 'center',
                        }}
                    >
                        {/* FIX 3: Loader in a proper centered flex container */}
                        <Box
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 20,
                            }}
                        >
                            <Loader size="lg" color="violet" type="dots" />
                            <Box>
                                <Text size="xs" fw={700} c="violet.3" tt="uppercase" mb={10} style={{ letterSpacing: '0.12em' }}>
                                    Did you know?
                                </Text>
                                {/* FIX 4: Bigger, bolder, more legible fact text */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentFact}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35 }}
                                    >
                                        <Text
                                            size="md"
                                            fw={500}
                                            maw={460}
                                            mx="auto"
                                            style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.82)' }}
                                        >
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
                                variant="subtle"
                                size="xs"
                                color="gray"
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
                                <Text component="span" c="dimmed" fw={400}> · {plan.length} {plan.length === 1 ? 'day' : 'days'}</Text>
                            )}
                        </Text>
                        {isGenerating && <Loader size="xs" color="violet" type="dots" />}
                    </Group>
                    <Stack gap={0}>
                        {plan.filter(Boolean).map((day, i) => (
                            <DayCard key={`${day.day}-${i}`} day={day} />
                        ))}
                        {/* Skeleton placeholders while streaming */}
                        {isGenerating && (
                            <>
                                <DaySkeleton />
                                <DaySkeleton />
                            </>
                        )}
                    </Stack>
                </Box>
            )}

            {/* Auto-scroll anchor */}
            <div ref={planEndRef} style={{ height: 1 }} />

            {/* ── Post-Generation Actions ── */}
            {!isGenerating && plan.length > 0 && (
                <Box
                    mt="xl"
                    pt="xl"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {showSaveNudge && <Box mb="lg"><SavePlanNudge /></Box>}
                    {saveError && (
                        <Alert color="red" title="Save Error" icon={<IconX size={14} />} mb="lg" radius="md">
                            {saveError}
                        </Alert>
                    )}
                    <Group gap="md" justify="center" wrap="wrap">
                        <Button
                            variant="default"
                            size="lg"
                            radius="xl"
                            leftSection={<IconEdit size={18} />}
                            onClick={handleEdit}
                            style={{ minWidth: 160 }}
                        >
                            Edit Parameters
                        </Button>
                        <Interactive>
                            <ShimmerButton
                                id="save-plan-button-bottom"
                                size="lg"
                                radius="xl"
                                color="#12b886"
                                onClick={handleSavePlan}
                                loading={isSaving}
                                disabled={saveSuccess}
                                style={{ minWidth: 160, fontWeight: 600, letterSpacing: '0.02em' }}
                            >
                                <Group gap="xs">
                                    <IconDeviceFloppy size={20} />
                                    <span>{saveSuccess ? 'Plan Saved!' : 'Save Plan'}</span>
                                </Group>
                            </ShimmerButton>
                        </Interactive>
                    </Group>
                </Box>
            )}

            {/* Error */}
            {error && (
                <Alert color="red" title="Generation Error" icon={<IconX size={14} />} mt="lg" radius="md">
                    {error}
                </Alert>
            )}
        </Box>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:  return renderStep0();
            case 1:  return renderStep1();
            case 2:  return renderStep2();
            case 3:  return renderStep3();
            case 4:  return renderStep4();
            default: return null;
        }
    };


    // ─── ROOT RENDER ─────────────────────────────────────────────────────────

    return (
        <AppLayout session={session}>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <Container size="lg" pt="xl" pb="xl" className="no-scrollbar">

                {/* Free-tier blocked alert */}
                {isCreationBlocked && currentStep < 4 && (
                    <Alert
                        variant="light"
                        color="orange"
                        title="Free Tier Limit Reached"
                        icon={<IconLock size={16} />}
                        mb="xl"
                        radius="md"
                        styles={{ root: { backgroundColor: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)' } }}
                    >
                        <Text size="sm">
                            You have an active plan in progress. Free tier allows{' '}
                            <strong>1 active future plan</strong> at a time.
                        </Text>
                        <Group mt="xs">
                            <Button variant="white" color="orange" size="xs" component="a" href="/plans">
                                Manage Plans
                            </Button>
                            <Button
                                variant="filled"
                                color="orange"
                                size="xs"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                            >
                                Upgrade to Pro
                            </Button>
                        </Group>
                    </Alert>
                )}

                {/* Page title */}
                <Box mb="xl">
                    <Title
                        order={1}
                        className="apple-text-gradient"
                        style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.03em' }}
                    >
                        Create New Plan
                    </Title>
                    <Text c="dimmed" size="md" mt={4}>Architect your path to victory.</Text>
                </Box>

                {/* Step indicator — full dots on form steps, thin bar on output */}
                {currentStep < 4 ? (
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

                {/* FIX 5: Step card with animated transitions — wrapped in GlassCard for all steps */}
                <Box style={{ position: 'relative', minHeight: currentStep < 4 ? 360 : 'auto' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={cardVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            {currentStep < 4 ? (
                                <GlassCard p={{ base: 'lg', sm: 'xl' }} style={{ minHeight: 320 }}>
                                    {renderCurrentStep()}
                                </GlassCard>
                            ) : (
                                // Step 4 output: two nested GlassCards (header + body)
                                <GlassCard p={{ base: 'md', sm: 'xl' }}>
                                    {renderCurrentStep()}
                                </GlassCard>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Box>

                {/* Navigation — shown only on form steps 0-3 */}
                {currentStep < 4 && (
                    <Box maw={620} mx="auto" mt="xl">
                        {formError && (
                            <Alert color="red" size="sm" mb="md" radius="md" icon={<IconX size={14} />} p="sm">
                                {formError}
                            </Alert>
                        )}
                        <Group justify={currentStep === 0 ? 'flex-end' : 'space-between'}>
                            {currentStep > 0 && (
                                <Button
                                    variant="subtle"
                                    color="gray"
                                    size="md"
                                    radius="xl"
                                    leftSection={<IconArrowLeft size={16} />}
                                    onClick={goBack}
                                >
                                    Back
                                </Button>
                            )}

                            {currentStep < 3 ? (
                                <Button
                                    size="md"
                                    color="violet"
                                    radius="xl"
                                    rightSection={<IconArrowRight size={16} />}
                                    onClick={goNext}
                                    style={{ minWidth: 120 }}
                                >
                                    Next
                                </Button>
                            ) : (
                                // Step 3: Generate Plan CTA
                                <Interactive>
                                    <ShimmerButton
                                        id="generate-plan-button"
                                        size="md"
                                        radius="xl"
                                        color="#3300eb"
                                        disabled={isCreationBlocked}
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