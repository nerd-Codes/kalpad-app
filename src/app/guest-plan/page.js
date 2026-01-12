// src/app/guest-plan/page.js
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { wittyFacts } from '@/lib/newplanFacts';
import { TimelineDayCard } from '@/components/TimelineDayCard';
import { useGuest } from '@/context/GuestContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

import { 
    Container, Title, Text, TextInput, Textarea, Stack, Grid, 
    Button, Paper, Group, Alert, Loader, Badge, Slider, Box, 
    ThemeIcon, ScrollArea, Collapse 
} from '@mantine/core';
import { 
    IconCalendar, IconBooks, IconTargetArrow, IconX, IconListDetails,
    IconRotateClockwise, IconBolt, IconSwords, IconTools, IconBrain, IconRocket
} from '@tabler/icons-react';

import { SavePlanNudge } from '@/components/SavePlanNudge';
import nudgeClasses from '@/components/SavePlanNudge.module.css'; 

// --- 1. MODES (Shared Config) ---
const PLAN_MODES = [
    { value: 'default', label: 'Balanced', description: 'Smart focus.', icon: IconTargetArrow, color: 'teal' },
    { value: 'revision', label: 'Revision', description: 'Rapid review.', icon: IconRotateClockwise, color: 'blue' },
    { value: 'hardcore', label: 'Hardcore', description: '100% coverage.', icon: IconSwords, color: 'red' },
    { value: 'sprint', label: 'Sprint', description: 'Max velocity.', icon: IconBolt, color: 'yellow' },
    { value: 'skill', label: 'Skill Build', description: 'Project-based.', icon: IconTools, color: 'grape' }
];

// --- 2. HELPERS ---
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

const getDayDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
        case 'easy': return 'green';
        case 'medium': return 'yellow';
        case 'hard': return 'orange';
        case 'intense': return 'red';
        default: return 'gray';
    }
};

// --- 3. MAIN COMPONENT ---
export default function GuestPlanPage() {
    const router = useRouter();
    const { saveGuestArtifact } = useGuest();
    
    // --- UI REFS & STATE ---
    const strategyReportRef = useRef(null);
    const planContainerRef = useRef(null);
    const planScrollDivRef = useRef(null);
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(false);

    // --- FORM STATE ---
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
    const [planMode, setPlanMode] = useState('default');
    
    // --- GENERATION STATE ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [plan, setPlan] = useState([]); 
    const [strategy, setStrategy] = useState(null);
    const [generationContext, setGenerationContext] = useState(null);
    const [error, setError] = useState('');
    const [currentFact, setCurrentFact] = useState(wittyFacts[0]);
    const [highlightSave, setHighlightSave] = useState(false);
    
    const typedApproach = useTypingEffect(strategy?.overall_approach);

    // --- EFFECTS ---

    // Cycling Facts
    useEffect(() => {
        let factInterval = null;
        if (isGenerating) {
            factInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * wittyFacts.length);
                setCurrentFact(wittyFacts[randomIndex]);
            }, 4000);
        } else { if (factInterval) clearInterval(factInterval); }
        return () => { if (factInterval) clearInterval(factInterval); };
    }, [isGenerating]);

    // Auto-scroll to results (Mobile friendly)
    useEffect(() => {
        if ((isGenerating || strategy) && strategyReportRef.current) {
            // Scroll logic optimized for mobile linear flow
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    strategyReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 200);
            }
        }
    }, [isGenerating, strategy]);

    // Auto-scroll plan list as items arrive
    useEffect(() => {
        if (isGenerating && planScrollDivRef.current) {
            const scrollDiv = planScrollDivRef.current;
            scrollDiv.scrollTop = scrollDiv.scrollHeight;
        }
    }, [plan.length, isGenerating]);

    useEffect(() => {
        if (!isGenerating && plan.length > 0) setHighlightSave(true);
    }, [isGenerating, plan]);

    // --- HANDLERS ---

    const handleGuestGeneration = async (e) => {
        e.preventDefault();
        setError(''); setPlan([]); setStrategy(null); setGenerationContext(null); setIsGenerating(true);

        try {
            // Client-side date check
            const selectedDate = new Date(examDate);
            const diffTime = Math.abs(selectedDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays > 8) throw new Error("Guest plans are limited to 1 week. Please sign up for longer plans.");

            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-is-guest': 'true' 
                },
                body: JSON.stringify({ 
                    examName, syllabus, examDate, 
                    useDocuments: false, studyHoursPerDay, planMode 
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
            setError(`Error: ${err.message}`);
        } finally { 
            setIsGenerating(false); 
        }
    };

    const handleSaveAndSignup = () => {
        saveGuestArtifact({
            examName, examDate, syllabus, plan: plan.filter(Boolean),
            generationContext, generatedNotes: [] 
        });
        router.push('/sign-up?intent=guest_sync');
    };

    // --- RENDER ---
    return (
        <AppLayout isGuest={true}>
            {/* Global Styles for Scrollbar Hiding */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <Container size="xl" pt="md" px="md" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
                
                {/* HEADER */}
                <Box mb="xl">
                    <Group align="center" gap="xs">
                        <Title order={1} className="apple-text-gradient" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>
                            Try KalPad
                        </Title>
                        <Badge size="lg" color="brandGreen" variant="filled">Guest Mode</Badge>
                    </Group>
                    <Text c="dimmed" size="lg" mt={4}>Generate a 1-week strategy instantly.</Text>
                </Box>

                {/* GRID LAYOUT (Responsive: Linear on Mobile, Split on Desktop) */}
                <Grid gutter={{ base: 0, lg: 40 }}>
                    
                    {/* --- LEFT COLUMN: INPUTS --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }} mb={{ base: 40, lg: 0 }} >
                         <form onSubmit={handleGuestGeneration}>
                            <Stack gap="xl">
                                
                                {/* MODULE 1: OBJECTIVE */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>01. The Objective</Text>
                                    <GlassCard p="lg">
                                        <Stack gap="lg">
                                            <TextInput 
                                                label="Mission Name" placeholder="e.g. Physics Midterm" 
                                                size="md" radius="md" required 
                                                value={examName} onChange={(e) => setExamName(e.target.value)}
                                                leftSection={<IconBooks size={18} />}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                            <TextInput 
                                                type="date" label="Deadline (Max 7 Days)" 
                                                size="md" radius="md" required 
                                                value={examDate} onChange={(e) => setExamDate(e.target.value)}
                                                leftSection={<IconCalendar size={18} />}
                                                min={minDateStr} max={maxDateStr}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                        </Stack>
                                    </GlassCard>
                                </Stack>

                                {/* MODULE 2: STRATEGY */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>02. Strategy</Text>
                                    <GlassCard p="lg">
                                        <Stack gap="xl">
                                            <Box>
                                                <Group justify="space-between" mb="xs">
                                                    <Text size="sm" fw={500}>Intensity Level</Text>
                                                    <Badge variant="filled" color="violet">{studyHoursPerDay} Hours / Day</Badge>
                                                </Group>
                                                <Slider 
                                                    value={studyHoursPerDay} onChange={setStudyHoursPerDay}
                                                    min={1} max={12} step={1}
                                                    color="violet" size="lg" thumbSize={24}
                                                    marks={[{ value: 2, label: 'Casual' }, { value: 6, label: 'Focused' }, { value: 10, label: 'Monk' }]}
                                                    styles={{ markLabel: { fontSize: '0.7rem', color: 'gray' } }}
                                                />
                                            </Box>
                                            
                                            <Textarea 
                                                label="Intel (Syllabus)" 
                                                placeholder="Paste your syllabus topics here..." 
                                                minRows={6} autosize required 
                                                value={syllabus} onChange={(e) => setSyllabus(e.target.value)}
                                                styles={{ input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                            />
                                        </Stack>
                                    </GlassCard>
                                </Stack>

                                {/* MODULE 3: TACTICS (Scrollable Carousel) */}
                                <Stack gap="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>03. Tactics</Text>
                                    <Box py="md" style={{ width: '100%', overflow: 'hidden' }}>
                                        <ScrollArea type="never">
                                            <Group wrap="nowrap" gap="md" px="xs">
                                                {PLAN_MODES.map((mode) => {
                                                    const isActive = planMode === mode.value;
                                                    return (
                                                        <Interactive key={mode.value} onClick={() => setPlanMode(mode.value)}>
                                                            <GlassCard p="md" style={{ 
                                                                    minWidth: '160px', height: '140px',
                                                                    backgroundColor: isActive ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                    border: isActive ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.05)',
                                                                    cursor: 'pointer'
                                                                }}>
                                                                <Stack h="100%" justify="space-between">
                                                                    <ThemeIcon variant="light" size="lg" radius="md" color={mode.color}><mode.icon size={20} /></ThemeIcon>
                                                                    <Box>
                                                                        <Text size="sm" fw={700} c={isActive ? 'white' : 'dimmed'}>{mode.label}</Text>
                                                                        <Text size="xs" c="dimmed" lineClamp={2} mt={2}>{mode.description}</Text>
                                                                    </Box>
                                                                </Stack>
                                                            </GlassCard>
                                                        </Interactive>
                                                    );
                                                })}
                                            </Group>
                                        </ScrollArea>
                                    </Box>
                                </Stack>

                                {/* ACTION */}
                                <Group justify="flex-end" mt="xl">
                                    <Interactive style={{ width: '100%' }}>
                                        <Button 
                                            type="submit" 
                                            size="xl" 
                                            loading={isGenerating} 
                                            radius="xl"
                                            style={{ 
                                                width: '100%',
                                                background: 'linear-gradient(135deg, #BF5AF2 0%, #5E5CE6 100%)',
                                                boxShadow: '0 10px 25px -5px rgba(191, 90, 242, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                                                border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: 600
                                            }}
                                            rightSection={!isGenerating && <IconRocket size={22} />}
                                        >
                                            Launch Instant Plan
                                        </Button>
                                    </Interactive>
                                </Group>
                            </Stack>
                         </form>
                    </Grid.Col>

                    {/* --- RIGHT COLUMN: SYSTEM OUTPUT --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Stack gap="md" style={{ position: 'sticky', top: 20 }}>
                            <div ref={strategyReportRef} /> 
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>System Output</Text>
                            
                            {!strategy ? (
                                <GlassCard p="xl" style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderStyle: 'dashed' }}>
                                    {isGenerating ? (
                                        <Stack align="center" gap="lg">
                                            <Loader size="lg" color="violet" type="dots" />
                                            <AnimatePresence mode="wait">
                                                <motion.div key={currentFact} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                    <Text c="dimmed" ta="center" maw={300}>{currentFact}</Text>
                                                </motion.div>
                                            </AnimatePresence>
                                        </Stack>
                                    ) : (
                                        <Stack align="center" gap="xs">
                                            <IconBrain size={48} color="rgb(119, 119, 119)" />
                                            <Text c="dimmed" fw={500}>Ready to Architect</Text>
                                            <Text c="dimmed" size="sm">Fill the modules to begin.</Text>
                                        </Stack>
                                    )}
                                </GlassCard>
                            ) : (
                                <>
                                    {/* STRATEGY REPORT */}
                                    <GlassCard p="lg" style={{ borderLeft: '4px solid #BF5AF2' }}>
                                        <Stack gap="md">
                                            <Group justify="space-between">
                                                <Title order={3}>Strategic Analysis</Title>
                                                <Badge size="lg" variant="dot" color="teal">{strategy.estimated_coverage}% Coverage</Badge>
                                            </Group>
                                            <Text style={{ lineHeight: 1.6 }}>{typedApproach}</Text>
                                            <Button variant="subtle" size="xs" color="gray" leftSection={<IconListDetails size={16}/>} onClick={toggleDetails}>
                                                {detailsOpened ? 'Hide Analysis' : 'View Breakdown'}
                                            </Button>
                                            <Collapse in={detailsOpened}>
                                                <Stack gap="xs">
                                                    <Text size="xs" fw={700} c="brandGreen">PRIORITY TARGETS</Text>
                                                    {strategy.emphasized_topics?.map((t, i) => <Text key={i} size="sm">• {t.topic}</Text>)}
                                                </Stack>
                                            </Collapse>
                                        </Stack>
                                    </GlassCard>

                                    {/* GENERATED PLAN SCROLL */}
                                    <GlassCard p={0} ref={planContainerRef} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
                                        <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <Group justify="space-between">
                                                <Title order={4}>Blueprint</Title>
                                                {!isGenerating && (
                                                    <Group className={`${highlightSave ? nudgeClasses.pulseEffect : ''}`}>
                                                        {highlightSave && <SavePlanNudge />}
                                                        <Button onClick={handleSaveAndSignup} color="brandGreen" size="xs">
                                                            Save & Unlock Full Features
                                                        </Button>
                                                    </Group>
                                                )}
                                            </Group>
                                        </Box>
                                        <Box ref={planScrollDivRef} className="no-scrollbar" p="md" style={{ overflowY: 'auto', flex: 1 }}>
                                            <Stack gap="sm">
                                                {plan.filter(Boolean).map((day, i) => (
                                                    <TimelineDayCard 
                                                        key={i} 
                                                        dayTopic={day}
                                                        plan={{ exam_name: examName, exam_date: examDate }} 
                                                        isGuestMode={true} 
                                                        viewMode="plan"
                                                        onUpdate={() => {}} 
                                                    />
                                                ))}
                                                {isGenerating && <Group justify="center" p="xl"><Loader size="sm" color="gray" /></Group>}
                                            </Stack>
                                        </Box>
                                    </GlassCard>
                                </>
                            )}
                        </Stack>
                    </Grid.Col>
                </Grid>

                {error && <Alert color="red" title="Generation Interrupted" mt="xl" icon={<IconX size={16}/>}>{error}</Alert>}
            </Container>
        </AppLayout>
    );
}