"use client";

import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Group, Button, Text, Title, Box, ThemeIcon, Loader, ScrollArea, Progress, RingProgress, Center, Accordion, Paper } from '@mantine/core';
import { IconBolt, IconBrain, IconPuzzle, IconRocket, IconTarget, IconChevronLeft, IconChevronRight, IconCheck, IconChartBar, IconTrophy, IconAlertTriangle, IconRefresh, IconX } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@mantine/hooks';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';
import { QuizRichText } from '@/components/quiz/QuizRichText';
import { useUniformOptionHeight } from '@/hooks/useUniformOptionHeight';

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
        borderRadius: 0,
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100vh',
        maxHeight: '100vh'
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0, zIndex: 10 },
    body: { padding: '0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 },
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

    const currentQuestion = questions[currentIndex];
    const progressVal = ((currentIndex + 1) / questions.length) * 100;
    const { optionHeight, setOptionRef } = useUniformOptionHeight(currentQuestion.options);

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
            <Box p={{ base: 'md', md: '32px' }} pb={0}>
                <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Objective {currentIndex + 1} / {questions.length}</Text>
                    <Text size="xs" fw={700} c="#BF5AF2">{Math.round(progressVal)}%</Text>
                </Group>
                <Progress value={progressVal} color="#BF5AF2" size="sm" radius="xl" styles={{ root: { backgroundColor: 'rgba(255,255,255,0.1)' } }} />
            </Box>

            {/* Question Area */}
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                <Box p={{ base: 'md', md: '32px' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div key={currentIndex} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                            <Stack gap="xl">
                                <QuizRichText
                                    content={currentQuestion.question_text}
                                    variant="question"
                                    style={{ fontSize: 'clamp(1.25rem, 2vw, 1.55rem)' }}
                                />
                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                    {currentQuestion.options.map((option, i) => {
                                        const isSelected = answers[currentIndex] === option;
                                        return (
                                            <Box key={i} ref={setOptionRef(i)} style={{ height: optionHeight ? `${optionHeight}px` : 'auto', width: '100%' }}>
                                                <Interactive onClick={() => handleSelect(option)} className="h-full" fullWidth>
                                                    <GlassCard
                                                        p="md"
                                                        h="100%"
                                                        style={{
                                                            backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            border: isSelected ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.08)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '16px',
                                                            height: '100%',
                                                            width: '100%',
                                                            minHeight: optionHeight ? undefined : '88px',
                                                        }}
                                                    >
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? '7px solid #BF5AF2' : '2px solid rgba(255,255,255,0.3)', backgroundColor: 'transparent', transition: 'all 0.2s ease', flexShrink: 0, marginTop: '2px' }} />
                                                        <QuizRichText content={option} variant="option" style={{ color: isSelected ? '#FFFFFF' : '#A1A1AA', flex: 1 }} />
                                                    </GlassCard>
                                                </Interactive>
                                            </Box>
                                        );
                                    })}
                                </SimpleGrid>
                            </Stack>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </ScrollArea>

            {/* Controls */}
            <Box p={{ base: 'md', md: '32px' }} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Group justify="space-between">
                    <Button variant="subtle" color="gray" radius="xl" onClick={handleBack} disabled={currentIndex === 0} leftSection={<IconChevronLeft size={18} />} styles={{ root: { paddingLeft: 8 } }}>Back</Button>
                    <ShimmerButton onClick={handleNext} disabled={!answers[currentIndex]} size="lg" radius="xl" style={{ paddingRight: 24, paddingLeft: 24 }}>
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

    let color = score >= 80 ? '#34C759' : score >= 50 ? '#FF9500' : '#FF3B30';
    const scoreFontSize = score === 100 ? '2.65rem' : '3rem';
    
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <ScrollArea
                h="calc(100vh - 168px)"
                type="auto"
            >
                <Stack gap="xl" p={{ base: 'md', md: '32px' }}>
                    <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="lg">
                        <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', position: 'relative' }}>
                             <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: 'blur(30px)', zIndex: 0 }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <RingProgress sections={[{ value: score, color: color }, { value: 100 - score, color: 'rgba(255,255,255,0.1)' }]} size={200} thickness={16} roundCaps label={<Center><Stack align="center" gap={0}><Text c={color} fw={800} style={{ fontSize: scoreFontSize, fontFamily: 'var(--font-lexend)', lineHeight: 0.9 }}>{score}%</Text><Text size="xs" c="dimmed" fw={700} tt="uppercase">Accuracy</Text></Stack></Center>} />
                            </div>
                        </Box>
                        <GlassCard p="lg" style={{ borderLeft: `4px solid ${color}`, backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Group align="flex-start" wrap="nowrap" mb="sm">
                                <ThemeIcon size="lg" radius="md" variant="light" color={passed ? 'green' : 'orange'}>{passed ? <IconTrophy size={20} /> : <IconAlertTriangle size={20} />}</ThemeIcon>
                                <Text size="sm" fw={700} c="white" tt="uppercase" style={{ marginTop: 4 }}>Performance Analysis</Text>
                            </Group>
                            <QuizRichText content={feedback_summary} variant="summary" />
                        </GlassCard>
                    </SimpleGrid>
                    <Stack gap="md">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" pl={4}>Tactical Breakdown</Text>
                        <Accordion variant="separated" radius="lg" styles={{ item: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }, control: { color: 'white' }, content: { padding: '16px' } }}>
                            {full_results.map((item, index) => (
                                <Accordion.Item value={String(index)} key={index}>
                                    <Accordion.Control icon={<ThemeIcon color={item.is_correct ? 'green' : 'red'} variant="light" radius="xl" size="sm">{item.is_correct ? <IconCheck size={14} /> : <IconX size={14} />}</ThemeIcon>}>
                                        <QuizRichText content={item.question_text} inline truncate style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF' }} />
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            <QuizRichText content={item.question_text} variant="question" style={{ fontSize: '1.1rem' }} />
                                            <Group grow align="flex-start">
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }}><Text size="10px" c="red.3" fw={700} mb={4}>YOUR ANSWER</Text><QuizRichText content={item.user_answer || 'Skipped'} variant="answer" /></Paper>
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.2)' }}><Text size="10px" c="green.3" fw={700} mb={4}>CORRECT ANSWER</Text><QuizRichText content={item.correct_answer} variant="answer" /></Paper>
                                            </Group>
                                            {!item.is_correct && <Box p="md" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}><Text size="10px" fw={700} c="dimmed" mb={4}>EXPLANATION</Text><QuizRichText content={item.ai_explanation} variant="explanation" /></Box>}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Stack>
                </Stack>
            </ScrollArea>
            <Box p={{ base: 'md', md: '32px' }} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
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
            fullScreen
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            transitionProps={{ transition: 'zoom', duration: 200 }}
            zIndex={7000}
        >
            {content}
        </Modal>
    );
}
