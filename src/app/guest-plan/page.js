// src/app/guest-plan/page.js
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { TimelineDayCard } from '@/components/TimelineDayCard';
import { useGuest } from '@/context/GuestContext';
import { PlanModeModal } from '@/components/PlanModeModal'; // --- NEW IMPORT ---
import { 
    Container, Title, Text, TextInput, Textarea, Stack, Grid, NumberInput, 
    Button, Paper, Group, Alert, Loader, Badge 
} from '@mantine/core';
import { 
    IconCalendar, IconBooks, IconClock, IconRocket, IconLock, IconSettings, IconInfoCircle 
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

// --- SAMPLE DATA FOR FALLBACK (TESTING ONLY) ---
const FALLBACK_STRATEGY = {
    estimated_coverage: 85,
    overall_approach: "⚠️ GENERATION FAILED (TEST MODE ACTIVE). This is a sample strategy loaded because the API encountered an error. We will focus on high-yield topics to maximize your score in the limited time available.",
    emphasized_topics: [{ topic: "Sample Core Concept", justification: "High exam weightage" }],
    deprioritized_topics: [{ topic: "Niche Theory", justification: "Low ROI" }],
    skipped_topics: []
};

const FALLBACK_PLAN = [
    {
        day: 1,
        date: new Date().toISOString().split('T')[0],
        topic_name: "Day 1: The Foundations (Sample)",
        study_hours: 4,
        importance: 10,
        day_difficulty: "Medium",
        day_summary: "This is a generated sample day to allow testing of the Guest Flow UI.",
        sub_topics: [
            { text: "Understand the basic definitions", type: "Concept", difficulty: "Easy", completed: false },
            { text: "Solve 3 fundamental problems", type: "Practice", difficulty: "Medium", completed: false },
            { text: "Review previous year questions", type: "Review", difficulty: "Hard", completed: false }
        ]
    }
];

// Helper for the "AI Typing" effect
const useTypingEffect = (text = '', speed = 1) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        if (!text) { setDisplayedText(''); return; }
        let i = 0; setDisplayedText('');
        const intervalId = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1)); i++;
            if (i >= text.length) clearInterval(intervalId);
        }, speed);
        return () => clearInterval(intervalId);
    }, [text, speed]);
    return displayedText;
};

export default function GuestPlanPage() {
    const router = useRouter();
    const { saveGuestArtifact } = useGuest();
    
    // --- STATE MANAGEMENT ---
    const [examName, setExamName] = useState('');
    const [syllabus, setSyllabus] = useState('');
    
    // Date Logic: Default to 7 days from today
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const maxDateStr = nextWeek.toISOString().split('T')[0];
    const minDateStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]; // Tomorrow
    
    const [examDate, setExamDate] = useState(maxDateStr);
    const [studyHoursPerDay, setStudyHoursPerDay] = useState(4);
    
    // --- NEW: Plan Mode State ---
    const [planMode, setPlanMode] = useState('default');
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [plan, setPlan] = useState([]); 
    const [strategy, setStrategy] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error, setError] = useState('');
    const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
    
    // UI Refs
    const strategyReportRef = useRef(null);
    const planContainerRef = useRef(null);
    const planScrollDivRef = useRef(null);
    
    const typedApproach = useTypingEffect(strategy?.overall_approach);

    // --- EFFECTS ---

    // 1. Cycling Facts during loading
    useEffect(() => {
        let factInterval = null;
        if (isGenerating) {
            factInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * wittyFacts.length);
                setCurrentFact(wittyFacts[randomIndex]);
            }, 4000);
        } else {
            if (factInterval) clearInterval(factInterval);
        }
        return () => { if (factInterval) clearInterval(factInterval); };
    }, [isGenerating]);

    // 2. Auto-scroll to Strategy
    useEffect(() => {
        if (strategy && strategyReportRef.current) {
            setTimeout(() => {
                strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [strategy]);

    // 3. Auto-scroll to Plan Start
    useEffect(() => {
        if (plan.length === 1 && planContainerRef.current) {
            setTimeout(() => {
                planContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [plan.length]);

    // 4. Auto-scroll Plan Container as items stream in
    useEffect(() => {
        if (isGenerating && planScrollDivRef.current) {
            const scrollDiv = planScrollDivRef.current;
            scrollDiv.scrollTop = scrollDiv.scrollHeight;
        }
    }, [plan.length, isGenerating]);

    // --- HANDLERS ---

    const handleGuestGeneration = async (e) => {
        e.preventDefault();
        setError(''); 
        setPlan([]); 
        setStrategy(null); 
        setGenerationContext(null); 
        setIsGenerating(true);

        try {
            // Validate Date (Max 7 days for guests)
            const selectedDate = new Date(examDate);
            const diffTime = Math.abs(selectedDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays > 8) { 
                 throw new Error("Guest plans are limited to 1 week. Please sign up for longer plans.");
            }

            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-is-guest': 'true' // CRITICAL: Header to bypass Supabase session check
                },
                body: JSON.stringify({ 
                    examName, 
                    syllabus, 
                    examDate, 
                    useDocuments: false, // Guests cannot use RAG
                    studyHoursPerDay, 
                    planMode: planMode // --- NEW: Pass the selected mode ---
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Generation failed.");
            }
            
            if (!response.body) throw new Error("Streaming response not available.");
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n---\n');
                buffer = parts.pop() || ''; 
                
                for (const part of parts) {
                    if (part.trim() === '') continue;
                    try {
                        const message = JSON.parse(part);
                        if (message.type === 'strategy') { 
                            setStrategy(message.data); 
                            setGenerationContext(JSON.stringify(message.data)); 
                        } else if (message.type === 'plan_topic') {
                            setPlan(p => [...p, message.data]);
                            await new Promise(res => setTimeout(res, 50)); 
                        } else if (message.type === 'error') { 
                            throw new Error(message.data.message); 
                        }
                    } catch (e) { console.error("Stream parse error:", e); }
                }
            }
        } catch (err) { 
            console.error("Guest Generation Error:", err);
            
            // --- FALLBACK PROTOCOL (TESTING MODE) ---
            // If an error occurs, populate with sample data so the flow can be tested.
            setError(`Error: ${err.message}. Loading SAMPLE PLAN for testing...`);
            
            setTimeout(() => {
                setStrategy(FALLBACK_STRATEGY);
                setGenerationContext(JSON.stringify(FALLBACK_STRATEGY));
                setPlan(FALLBACK_PLAN);
            }, 1000);

        } finally { 
            setIsGenerating(false); 
        }
    };

    const handleSaveAndSignup = () => {
        // 1. Serialize state to Context (which saves to LocalStorage)
        saveGuestArtifact({
            examName,
            examDate,
            syllabus,
            plan,
            generationContext,
            generatedNotes: [] 
        });
        
        // 2. Redirect to Sign Up with intent flag
        router.push('/sign-up?intent=guest_sync');
    };

    // --- RENDER ---

    return (
        <AppLayout isGuest={true}>
            <Container size="lg" py="xl">
                
                {/* Header Section */}
                <Stack gap="xs" mb="xl">
                    <Group>
                         <Title order={1} className="font-hand">Try KalPad Free</Title>
                         <Badge size="lg" color="brandGreen" variant="filled">Guest Mode</Badge>
                    </Group>
                    <Text c="dimmed" size="lg">
                        Generate a customized 1-week study plan instantly. No account required.
                    </Text>
                </Stack>

                {/* FORM SECTION (Hidden after generation starts) */}
                {!strategy && (
                    <GlassCard>
                         <form onSubmit={handleGuestGeneration}>
                            <Stack gap="xl">
                                <Grid gutter="lg">
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                         <TextInput
                                            label="Exam or Project Name"
                                            placeholder="e.g. Physics Midterm, Hackathon"
                                            leftSection={<IconBooks size={18} />}
                                            value={examName}
                                            onChange={(e) => setExamName(e.target.value)}
                                            required
                                            size="md"
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Grid>
                                             <Grid.Col span={6}>
                                                <TextInput
                                                    type="date"
                                                    label="Deadline (Max 7 Days)"
                                                    leftSection={<IconCalendar size={18} />}
                                                    value={examDate}
                                                    onChange={(e) => setExamDate(e.target.value)}
                                                    required
                                                    min={minDateStr}
                                                    max={maxDateStr}
                                                    size="md"
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={6}>
                                                <NumberInput
                                                    label="Study Hours/Day"
                                                    leftSection={<IconClock size={18} />}
                                                    value={studyHoursPerDay}
                                                    onChange={setStudyHoursPerDay}
                                                    min={1}
                                                    max={12}
                                                    required
                                                    size="md"
                                                />
                                            </Grid.Col>
                                        </Grid>
                                    </Grid.Col>
                                </Grid>

                                <Textarea
                                    label="Syllabus or Topic List"
                                    description="Paste your chapters, topics, or rough notes here."
                                    placeholder="Chapter 1: Kinematics..."
                                    value={syllabus}
                                    onChange={(e) => setSyllabus(e.target.value)}
                                    required
                                    minRows={6}
                                    autosize
                                    size="md"
                                />

                                {/* --- NEW: Plan Mode Selector --- */}
                                <Group justify="flex-start">
                                    <Button
                                        leftSection={<IconSettings size={16} />}
                                        variant="subtle"
                                        onClick={openModal}
                                    >
                                        Advanced Settings (Mode: {planMode.charAt(0).toUpperCase() + planMode.slice(1)})
                                    </Button>
                                </Group>
                                <PlanModeModal
                                    opened={modalOpened}
                                    close={closeModal}
                                    currentMode={planMode}
                                    onSelectMode={(mode) => {
                                        setPlanMode(mode);
                                        closeModal(); 
                                    }}
                                />

                                <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                                    Guest plans are limited to 1 week and text-only generation. 
                                    Sign up to upload PDFs and generate long-term plans.
                                </Alert>

                                <Group justify="flex-end">
                                    <ShimmerButton type="submit" size="lg" loading={isGenerating}>
                                        Generate Instant Plan
                                    </ShimmerButton>
                                </Group>
                            </Stack>
                         </form>
                    </GlassCard>
                )}

                {/* --- ERROR ALERT (Visible even if fallback loads) --- */}
                {error && (
                    <Alert color="orange" title="Generation Interrupted" mt="xl" icon={<IconLock size={16}/>} withCloseButton onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {/* RESULTS SECTION */}
                <Stack gap="xl" mt="xl">
                    
                    {/* 1. STRATEGY REPORT */}
                    {(isGenerating || strategy) && (
                        <GlassCard ref={strategyReportRef}>
                            <Title order={3}>AI Strategy Report</Title>
                            {strategy ? (
                                <Stack gap="md" mt="md">
                                     <Paper withBorder p="sm" radius="md" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
                                        <Text size="sm" fw={700} c="brandGreen" tt="uppercase">Estimated Coverage: {strategy.estimated_coverage}%</Text>
                                    </Paper>
                                    <Text size="lg" style={{ lineHeight: 1.6 }}>{typedApproach}</Text>
                                    <Group gap="xs">
                                        {strategy.emphasized_topics?.map((t, i) => (
                                            <Badge key={i} color="brandGreen" variant="light">{t.topic}</Badge>
                                        ))}
                                    </Group>
                                </Stack>
                            ) : (
                                <Paper p="md" mt="md" withBorder style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                                   <Group>
                                        <Loader size="sm" color="white" />
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentFact}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Text size="sm" c="dimmed">{currentFact}</Text>
                                            </motion.div>
                                        </AnimatePresence>
                                    </Group>
                                </Paper>
                            )}
                        </GlassCard>
                    )}

                    {/* 2. THE PLAN */}
                    {strategy && (isGenerating || plan.length > 0) && (
                        <GlassCard ref={planContainerRef}>
                            <Stack gap="lg">
                                <Group justify="space-between" align="center">
                                    <Title order={2}>Your 1-Week Sprint</Title>
                                    
                                    {/* SAVE CTA - Only appears when generation stops */}
                                    {!isGenerating && (
                                        <Button 
                                            leftSection={<IconRocket size={20} />}
                                            size="lg"
                                            color="brandGreen"
                                            onClick={handleSaveAndSignup}
                                            className="shimmer-effect"
                                            style={{
                                                boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)',
                                                border: '1px solid #4ade80'
                                            }}
                                        >
                                            Save & Unlock Full Features
                                        </Button>
                                    )}
                                </Group>
                                
                                <div ref={planScrollDivRef} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {plan.map((item, index) => (
                                        <TimelineDayCard 
                                            key={index} 
                                            dayTopic={item}
                                            plan={{ exam_name: examName, exam_date: examDate }} 
                                            isGuestMode={true} 
                                            viewMode="plan"
                                            onUpdate={() => {}} 
                                        />
                                    ))}
                                    
                                    {isGenerating && (
                                        <Paper p="lg" withBorder style={{ opacity: 0.5 }}>
                                            <Stack>
                                                <Group justify="space-between">
                                                    <Loader size="sm" />
                                                    <Badge color="gray">Planning...</Badge>
                                                </Group>
                                                <Text size="sm" c="dimmed">The AI is structuring your next day...</Text>
                                            </Stack>
                                        </Paper>
                                    )}
                                </div>
                            </Stack>
                        </GlassCard>
                    )}
                </Stack>
            </Container>
        </AppLayout>
    );
}