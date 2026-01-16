"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, SimpleGrid, Stack, Box, Badge, Group, ThemeIcon, Button, Paper } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconChartBar, IconBulb, IconBook, IconCircleX, IconCircleCheck, IconSparkles, IconAnalyze } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- VISUAL CONSTANTS ---
const NEON_PURPLE = '#BF5AF2';
const NEON_BLUE = '#5E5CE6';
const NEON_GREEN = '#34C759';
const NEON_RED = '#FF3B30';

// --- MOCKUP 1: THE PROFESSOR (Live Graph Gen) ---
function NoteGenMockup() {
    const [step, setStep] = useState(0); // 0: Typing, 1: Graph Expand, 2: Hold

    useEffect(() => {
        const interval = setInterval(() => setStep(p => (p + 1) % 3), 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ height: '240px', position: 'relative', overflow: 'hidden', padding: '20px' }}>
            <Stack gap="xs">
                {/* Simulated Text Lines */}
                <motion.div initial={{ width: '0%' }} animate={{ width: '80%' }} transition={{ duration: 1 }} style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
                <motion.div initial={{ width: '0%' }} animate={{ width: '90%' }} transition={{ duration: 1, delay: 0.2 }} style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
                <motion.div initial={{ width: '0%' }} animate={{ width: '40%' }} transition={{ duration: 0.5, delay: 0.4 }} style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
            </Stack>

            <AnimatePresence>
                {step >= 1 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        style={{ marginTop: '20px', overflow: 'hidden' }}
                    >
                        <GlassCard p="sm" style={{ background: 'rgba(30,30,35,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Group justify="space-between" align="flex-end" h={100} gap="xs">
                                {[40, 70, 50, 90, 60].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 0.2 + (i * 0.1), type: "spring" }}
                                        style={{ 
                                            flex: 1, 
                                            background: i === 3 ? NEON_PURPLE : 'rgba(255,255,255,0.1)', 
                                            borderRadius: '4px 4px 0 0' 
                                        }}
                                    />
                                ))}
                            </Group>
                            <Group mt="xs" gap="xs">
                                <IconChartBar size={12} color="gray" />
                                <Text size="xs" c="dimmed" fw={700}>FIG 1.2: MARKET TRENDS</Text>
                            </Group>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}

// --- MOCKUP 2: THE DOUBT SOLVER (Context Lens) ---
function DoubtSolverMockup() {
    const [step, setStep] = useState(0); // 0: Read, 1: Highlight, 2: Popover, 3: Analogy

    useEffect(() => {
        const interval = setInterval(() => setStep(p => (p + 1) % 4), 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ height: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <AnimatePresence mode="wait">
                {step < 3 ? (
                    <motion.div 
                        key="text"
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Text size="lg" fw={500} c="white" lh={1.6} ta="center">
                            The rate of change of flux is directly proportional to <br/>
                            <motion.span 
                                animate={{ 
                                    backgroundColor: step >= 1 ? 'rgba(191, 90, 242, 0.3)' : 'transparent',
                                    color: step >= 1 ? '#fff' : 'inherit'
                                }}
                                style={{ borderRadius: '4px', padding: '2px 4px', position: 'relative' }}
                            >
                                induced EMF magnitude.
                                {/* THE POPOVER */}
                                {step === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                        animate={{ opacity: 1, y: -50, scale: 1 }}
                                        style={{ 
                                            position: 'absolute', top: 0, left: '50%', x: '-50%',
                                            background: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '99px',
                                            padding: '8px 12px', display: 'flex', gap: '8px', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <IconBook size={16} color="gray" />
                                        <IconBulb size={16} color={NEON_PURPLE} />
                                    </motion.div>
                                )}
                            </motion.span>
                        </Text>
                    </motion.div>
                ) : (
                    /* THE ANALOGY CARD */
                    <motion.div
                        key="card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ width: '100%' }}
                    >
                        <GlassCard p="md" style={{ borderLeft: `4px solid ${NEON_PURPLE}` }}>
                            <Group mb="xs">
                                <IconSparkles size={16} color={NEON_PURPLE} />
                                <Text size="xs" fw={700} c="#BF5AF2" tt="uppercase">Analogy</Text>
                            </Group>
                            <Text size="sm" c="white" lh={1.5}>
                                Think of it like a water pump. The faster you push the handle (flux change), the higher the water pressure (EMF) shoots out.
                            </Text>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}

// --- MOCKUP 3: THE EXAMINER (Smart Quiz) ---
function QuizMockup() {
    const [step, setStep] = useState(0); // 0: Wrong Answer, 1: Feedback

    useEffect(() => {
        const interval = setInterval(() => setStep(p => (p + 1) % 2), 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ height: '240px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
            <Stack gap="sm">
                <Text size="sm" fw={600} c="white">What is the derivative of sin(x)?</Text>
                
                {/* Option: Wrong */}
                <Paper p="sm" radius="md" style={{ background: 'rgba(255, 59, 48, 0.15)', border: `1px solid ${NEON_RED}` }}>
                    <Group justify="space-between">
                        <Text size="sm" c="white">cos(x) + C</Text>
                        <IconCircleX size={18} color={NEON_RED} />
                    </Group>
                </Paper>

                {/* Option: Correct (Dimmed) */}
                <Paper p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, opacity: 0.5 }}>
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">cos(x)</Text>
                        <IconCircleCheck size={18} color="gray" />
                    </Group>
                </Paper>

                {/* AI Feedback - Slides Down */}
                <AnimatePresence>
                    {step === 1 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <Box mt="sm" p="sm" style={{ background: 'rgba(30,30,35,0.8)', borderRadius: '8px', borderLeft: `3px solid ${NEON_GREEN}` }}>
                                <Text size="xs" fw={700} c="green.4" mb={4}>AI FEEDBACK</Text>
                                <Text size="xs" c="dimmed" lh={1.4}>
                                    Close! But derivatives don't add a constant (+C). That's for integration.
                                </Text>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>
        </Box>
    );
}

export function TheToolkit() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={80}>
                    <Badge 
                        variant="filled" 
                        color="dark" 
                        size="lg" 
                        radius="sm"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', letterSpacing: '0.1em' }}
                    >
                        COMPLETE ARSENAL
                    </Badge>
                    <Title 
                        order={2} 
                        className="apple-text-gradient"
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1
                        }}
                    >
                        Your Personal, On-Demand <br/> Academic Arsenal.
                    </Title>
                </Stack>

                {/* --- 3-COLUMN GRID --- */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
                    
                    {/* COL 1 */}
                    <GlassCard p="lg" style={{ background: 'rgba(20,20,25,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack gap="lg" h="100%">
                            <NoteGenMockup />
                            <Box>
                                <Title order={4} c="white" mb="xs">Notes That Actually Teach</Title>
                                <Text c="dimmed" size="sm" lh={1.6}>
                                    Get textbook-quality notes generated from your own material, complete with auto-generated graphs and flowcharts that make complex concepts click instantly.
                                </Text>
                            </Box>
                        </Stack>
                    </GlassCard>

                    {/* COL 2 */}
                    <GlassCard p="lg" style={{ background: 'rgba(20,20,25,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack gap="lg" h="100%">
                            <DoubtSolverMockup />
                            <Box>
                                <Title order={4} c="white" mb="xs">Never Get Stuck Again</Title>
                                <Text c="dimmed" size="sm" lh={1.6}>
                                    Stuck on a sentence? Just highlight it. Our context-aware AI will give you a simple explanation or a real-world analogy without you ever leaving the page.
                                </Text>
                            </Box>
                        </Stack>
                    </GlassCard>

                    {/* COL 3 */}
                    <GlassCard p="lg" style={{ background: 'rgba(20,20,25,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack gap="lg" h="100%">
                            <QuizMockup />
                            <Box>
                                <Title order={4} c="white" mb="xs">Quizzes That Build Brains</Title>
                                <Text c="dimmed" size="sm" lh={1.6}>
                                    Our "Smart Quiz" engine isn't just for testing. It's an active recall tool that explains *why* you were wrong, ensuring you never make the same mistake twice.
                                </Text>
                            </Box>
                        </Stack>
                    </GlassCard>

                </SimpleGrid>
            </Container>
        </Box>
    );
}