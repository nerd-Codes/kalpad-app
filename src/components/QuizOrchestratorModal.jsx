"use client";

import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Group, Button, Text, Title, Box, ThemeIcon, Loader, ScrollArea, Progress, Radio, UnstyledButton, RingProgress, Center, Accordion, Badge, Paper } from '@mantine/core';
import { IconBolt, IconBrain, IconPuzzle, IconRocket, IconTarget, IconChevronLeft, IconChevronRight, IconCheck, IconChartBar, IconTrophy, IconAlertTriangle, IconRefresh, IconX } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@mantine/hooks';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';

// --- VISUAL CONSTANTS ---
const MODES = [
    { id: 'Rapid Fire', label: 'Rapid Fire', desc: 'Speed & Recall', icon: IconBolt, color: '#FF9500' },
    { id: 'Core Concepts', label: 'Core Concepts', desc: 'Deep Understanding', icon: IconBrain, color: '#BF5AF2' },
    { id: 'Problem Solving', label: 'Simulation', desc: 'Applied Scenarios', icon: IconPuzzle, color: '#34C759' },
];

const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '85vh'
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0, zIndex: 10 },
    body: { padding: '0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

// --- SUB-COMPONENT 1: SETUP VIEW ---
function SetupView({ onStart, onClose }) {
    const [questionCount, setQuestionCount] = useState(10);
    const [quizMode, setQuizMode] = useState('Core Concepts');
    const isMobile = useMediaQuery('(max-width: 48em)');

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ScrollArea style={{ flex: 1 }} p={isMobile ? 'md' : '32px'}>
                <Stack gap="xl">
                    <Stack gap="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Select Protocol</Text>
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            {MODES.map((mode) => {
                                const isActive = quizMode === mode.id;
                                return (
                                    <Interactive key={mode.id} onClick={() => setQuizMode(mode.id)} className="h-full">
                                        <GlassCard 
                                            p="md" h="100%"
                                            style={{ 
                                                backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: isActive ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer', transition: 'all 0.2s ease',
                                                boxShadow: isActive ? `0 0 20px ${mode.color}20` : 'none',
                                                minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                            }}
                                        >
                                            <Group wrap="nowrap" align={isMobile ? "center" : "flex-start"}>
                                                <ThemeIcon size={isMobile ? 36 : 40} radius="xl" variant="light" color={isActive ? mode.color : 'gray'} style={{ backgroundColor: isActive ? `${mode.color}20` : 'rgba(255,255,255,0.05)' }}>
                                                    <mode.icon size={isMobile ? 20 : 22} />
                                                </ThemeIcon>
                                                <Box style={{ flex: 1 }}>
                                                    <Text size="sm" fw={700} c="white">{mode.label}</Text>
                                                    <Text size="xs" c="dimmed" lh={1.3} mt={2}>{mode.desc}</Text>
                                                </Box>
                                            </Group>
                                        </GlassCard>
                                    </Interactive>
                                );
                            })}
                        </SimpleGrid>
                    </Stack>

                    <Stack gap="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Intensity</Text>
                        <Group grow>
                            {[5, 10, 15].map(count => (
                                <Interactive key={count} onClick={() => setQuestionCount(count)}>
                                    <Box py={14} style={{ textAlign: 'center', borderRadius: '12px', border: questionCount === count ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.1)', backgroundColor: questionCount === count ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)', color: questionCount === count ? 'white' : 'gray', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                        {count} Qs
                                    </Box>
                                </Interactive>
                            ))}
                        </Group>
                    </Stack>
                </Stack>
            </ScrollArea>
            <Box p={isMobile ? 'md' : '32px'} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} radius="xl" style={{ border: 'none', backgroundColor: 'transparent' }}>Abort</Button>
                    <ShimmerButton 
                        // --- FIX: Pass an OBJECT, not separate arguments ---
                        onClick={() => onStart({ question_count: questionCount, quiz_mode: quizMode })} 
                        size={isMobile ? "md" : "lg"} 
                        radius="xl" 
                        style={{ padding: '0 32px', background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', width: isMobile ? '100%' : 'auto' }}
                    >
                        Start Simulation
                    </ShimmerButton>
                </Group>
            </Box>
        </Box>
    );
}

// --- SUB-COMPONENT 2: LOADING VIEW ---
function LoadingView({ message }) {
    return (
        <Stack align="center" justify="center" h="100%" gap="xl" p="xl">
            <div style={{ position: 'relative' }}>
                <Loader size={60} color="violet" />
                <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', inset: -30, background: 'radial-gradient(circle, rgba(191,90,242,0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }} />
            </div>
            <Stack gap={4} align="center">
                <Title order={3} className="apple-text-gradient" ta="center">Processing...</Title>
                <Text c="dimmed" size="sm" ta="center">{message}</Text>
            </Stack>
        </Stack>
    );
}

// --- SUB-COMPONENT 3: RUNNER VIEW (Auto-Advance) ---
function RunnerView({ questions, onComplete, onAbort }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [direction, setDirection] = useState(1);
    const isMobile = useMediaQuery('(max-width: 48em)');

    const currentQuestion = questions[currentIndex];
    const progressVal = ((currentIndex + 1) / questions.length) * 100;

    const handleSelect = (option) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: option }));
        // AUTO-ADVANCE LOGIC
        if (currentIndex < questions.length - 1) {
            setTimeout(() => {
                setDirection(1);
                setCurrentIndex(prev => prev + 1);
            }, 400); // Small delay for visual feedback
        } else {
            // If last question, just stay there so user can manually submit
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        } else {
            // Prepare submission
            const attempts = questions.map((q, index) => ({
                question_text: q.question_text,
                options: q.options,
                user_answer: answers[index] || null,
                correct_answer: q.correct_answer,
                is_correct: answers[index] === q.correct_answer
            }));
            onComplete(attempts);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const variants = {
        enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0, scale: 0.98 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0, scale: 0.98 })
    };

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* HUD */}
            <Box p={isMobile ? 'md' : '32px'} pb={0}>
                <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Objective {currentIndex + 1} / {questions.length}</Text>
                    <Text size="xs" fw={700} c="#BF5AF2">{Math.round(progressVal)}%</Text>
                </Group>
                <Progress value={progressVal} color="#BF5AF2" size="sm" radius="xl" styles={{ root: { backgroundColor: 'rgba(255,255,255,0.1)' } }} />
            </Box>

            {/* Question Area */}
            <ScrollArea style={{ flex: 1 }}>
                <Box p={isMobile ? 'md' : '32px'}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div key={currentIndex} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                            <Stack gap="xl">
                                <Title order={3} style={{ fontFamily: 'var(--font-lexend)', fontWeight: 500, lineHeight: 1.4, fontSize: isMobile ? '1.25rem' : '1.5rem' }}>{currentQuestion.question_text}</Title>
                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                    {currentQuestion.options.map((option, i) => {
                                        const isSelected = answers[currentIndex] === option;
                                        return (
                                            <Interactive key={i} onClick={() => handleSelect(option)} className="h-full">
                                                <GlassCard p="md" h="100%" style={{ backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.03)', border: isSelected ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '16px', minHeight: '70px' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? '7px solid #BF5AF2' : '2px solid rgba(255,255,255,0.3)', backgroundColor: 'transparent', transition: 'all 0.2s ease', flexShrink: 0 }} />
                                                    <Text size="md" c={isSelected ? 'white' : 'dimmed'} fw={isSelected ? 600 : 400} style={{ lineHeight: 1.4 }}>{option}</Text>
                                                </GlassCard>
                                            </Interactive>
                                        );
                                    })}
                                </SimpleGrid>
                            </Stack>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </ScrollArea>

            {/* Controls */}
            <Box p={isMobile ? 'md' : '32px'} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Group justify="space-between">
                    <Button variant="subtle" color="gray" radius="xl" onClick={handleBack} disabled={currentIndex === 0} leftSection={<IconChevronLeft size={18} />} styles={{ root: { paddingLeft: 8 } }}>Back</Button>
                    <ShimmerButton onClick={handleNext} disabled={!answers[currentIndex]} size={isMobile ? "md" : "lg"} radius="xl" style={{ paddingRight: 24, paddingLeft: 24, width: isMobile ? 'auto' : undefined }}>
                        <Group gap="xs">
                            <span>{currentIndex === questions.length - 1 ? 'Submit Mission' : 'Next'}</span>
                            {currentIndex === questions.length - 1 ? <IconCheck size={18} /> : <IconChevronRight size={18} />}
                        </Group>
                    </ShimmerButton>
                </Group>
            </Box>
        </Box>
    );
}

// --- SUB-COMPONENT 4: RESULTS VIEW ---
function ResultsView({ results, onRetake, onClose }) {
    const { score, feedback_summary, full_results } = results;
    const passed = score >= 50;
    const isMobile = useMediaQuery('(max-width: 48em)');

    let color = score >= 80 ? '#34C759' : score >= 50 ? '#FF9500' : '#FF3B30';
    
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ScrollArea h="5vh" style={{ flex: 1 }}>
                <Stack gap="xl" p={isMobile ? 'md' : '32px'}>
                    <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="lg">
                        <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', position: 'relative' }}>
                             <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: 'blur(30px)', zIndex: 0 }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <RingProgress sections={[{ value: score, color: color }, { value: 100 - score, color: 'rgba(255,255,255,0.1)' }]} size={200} thickness={16} roundCaps label={<Center><Stack align="center" gap={0}><Text c={color} fw={800} style={{ fontSize: '3rem', fontFamily: 'var(--font-lexend)', lineHeight: 0.9 }}>{score}%</Text><Text size="xs" c="dimmed" fw={700} tt="uppercase">Accuracy</Text></Stack></Center>} />
                            </div>
                        </Box>
                        <GlassCard p="lg" style={{ borderLeft: `4px solid ${color}`, backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Group align="flex-start" wrap="nowrap" mb="sm">
                                <ThemeIcon size="lg" radius="md" variant="light" color={passed ? 'green' : 'orange'}>{passed ? <IconTrophy size={20} /> : <IconAlertTriangle size={20} />}</ThemeIcon>
                                <Text size="sm" fw={700} c="white" tt="uppercase" style={{ marginTop: 4 }}>Performance Analysis</Text>
                            </Group>
                            <Text size="sm" c="dimmed" lh={1.6}>{feedback_summary}</Text>
                        </GlassCard>
                    </SimpleGrid>
                    <Stack gap="md">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" pl={4}>Tactical Breakdown</Text>
                        <Accordion variant="separated" radius="lg" styles={{ item: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }, control: { color: 'white' }, content: { padding: '16px' } }}>
                            {full_results.map((item, index) => (
                                <Accordion.Item value={String(index)} key={index}>
                                    <Accordion.Control icon={<ThemeIcon color={item.is_correct ? 'green' : 'red'} variant="light" radius="xl" size="sm">{item.is_correct ? <IconCheck size={14} /> : <IconX size={14} />}</ThemeIcon>}>
                                        <Text size="sm" fw={500} lineClamp={1}>{item.question_text}</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            <Text size="md" fw={600} style={{ fontFamily: 'var(--font-lexend)' }}>{item.question_text}</Text>
                                            <Group grow align="flex-start">
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }}><Text size="10px" c="red.3" fw={700} mb={4}>YOUR ANSWER</Text><Text size="sm" c="white">{item.user_answer || "Skipped"}</Text></Paper>
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.2)' }}><Text size="10px" c="green.3" fw={700} mb={4}>CORRECT ANSWER</Text><Text size="sm" c="white">{item.correct_answer}</Text></Paper>
                                            </Group>
                                            {!item.is_correct && <Box p="md" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}><Text size="10px" fw={700} c="dimmed" mb={4}>EXPLANATION</Text><Text size="sm" c="white" lh={1.5}>{item.ai_explanation}</Text></Box>}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Stack>
                </Stack>
            </ScrollArea>
            <Box p={isMobile ? 'md' : '32px'} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} radius="xl" style={{ border: 'none', backgroundColor: 'transparent' }}>Dismiss</Button>
                    <ShimmerButton onClick={onRetake} leftSection={<IconRefresh size={18} />} radius="xl" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}>Retake Quiz</ShimmerButton>
                </Group>
            </Box>
        </Box>
    );
}

// --- THE ORCHESTRATOR (MAIN COMPONENT) ---
export function QuizOrchestratorModal({ opened, onClose, planTopicId }) {
    const [state, setState] = useState('SETUP'); // SETUP | GENERATING | RUNNER | EVALUATING | RESULTS
    const [config, setConfig] = useState(null);
    const [questions, setQuestions] = useState(null);
    const [results, setResults] = useState(null);
    const isMobile = useMediaQuery('(max-width: 48em)');

    // Reset state when opened
    if (!opened && state !== 'SETUP') {
        setTimeout(() => setState('SETUP'), 300);
    }

    const handleStartGeneration = async (cfg) => {
        setConfig(cfg);
        setState('GENERATING');
        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: planTopicId, ...cfg }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();
            setQuestions(data.questions);
            setState('RUNNER');
        } catch (err) {
            console.error(err);
            // Optionally handle error state
            onClose(); 
        }
    };

    const handleEvaluation = async (attempts) => {
        setState('EVALUATING');
        try {
             const response = await fetch('/api/evaluate-quiz-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: planTopicId, attempts, quiz_mode: config.quiz_mode }),
            });
             if (!response.ok) throw new Error((await response.json()).error);
             setResults(await response.json());
             setState('RESULTS');
        } catch (err) {
             console.error(err);
             onClose();
        }
    };

    const handleRetake = () => {
        setState('SETUP');
        setQuestions(null);
        setResults(null);
    };

    // --- RENDER ROUTER ---
    let content;
    let title = "Quiz";
    let icon = <IconRocket size={20} color="#BF5AF2" />;

    switch(state) {
        case 'SETUP':
            content = <SetupView onStart={handleStartGeneration} onClose={onClose} />;
            title = "Initialize Training";
            break;
        case 'GENERATING':
            content = <LoadingView message="The AI is generating your combat scenario." />;
            title = "Forging Mission";
            break;
        case 'RUNNER':
            content = <RunnerView questions={questions} onComplete={handleEvaluation} onAbort={onClose} />;
            title = "Live Combat";
            icon = <IconTarget size={20} color="#BF5AF2" />;
            break;
        case 'EVALUATING':
            content = <LoadingView message="Analyzing performance metrics..." />;
            title = "Processing Data";
            break;
        case 'RESULTS':
            content = <ResultsView results={results} onRetake={handleRetake} onClose={onClose} />;
            title = "Mission Debrief";
            icon = <IconChartBar size={20} color="#BF5AF2" />;
            break;
    }

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Group gap="xs">{icon}<Text inherit>{title}</Text></Group>}
            centered 
            size="lg"
            fullScreen={state === 'RUNNER' || isMobile} // Immersive mode during quiz
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            transitionProps={{ transition: 'zoom', duration: 200 }}
            zIndex={7000}
        >
            <scrollArea style={{ height: '70vh' }}>
            {content}
            </scrollArea>
        </Modal>
    );
}