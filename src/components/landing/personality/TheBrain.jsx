"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, SimpleGrid, Stack, Box, Badge, Group, ThemeIcon, Progress } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBrain, IconAlertTriangle, IconRefresh, IconArrowRight, IconCheck, IconLink } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- VISUAL ASSETS ---
const NEON_PURPLE = '#BF5AF2';
const NEON_RED = '#FF3B30';
const NEON_GREEN = '#34C759';

// --- MOCKUP 1: THE DEPENDENCY ENGINE (FLUID MERGE) ---
function DependencyMockup() {
    // 0: Idle List, 1: Focus/Dim, 2: Merge Movement, 3: Final Card Reveal
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const sequence = async () => {
            while (true) {
                setPhase(0); // Show List
                await new Promise(r => setTimeout(r, 2000));
                setPhase(1); // Focus relevant items
                await new Promise(r => setTimeout(r, 1500));
                setPhase(2); // Physical Merge
                await new Promise(r => setTimeout(r, 1200));
                setPhase(3); // Expand Result
                await new Promise(r => setTimeout(r, 4000));
            }
        };
        sequence();
    }, []);

    // Reusable List Item Component
    const ListItem = ({ text, isHighlighted, isSecondary }) => (
        <motion.div
            layout // Magic Framer Motion prop for smooth reordering
            initial={{ opacity: 1 }}
            animate={{ 
                opacity: phase >= 1 && !isHighlighted ? 0.2 : 1,
                y: phase === 2 && isSecondary ? 140 : 0, // Physical move down
                scale: phase === 2 && isSecondary ? 0.95 : 1
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            style={{ 
                padding: '16px', 
                borderRadius: '16px', 
                background: isHighlighted ? 'rgba(191, 90, 242, 0.1)' : 'rgba(255,255,255,0.03)', 
                border: isHighlighted ? '1px solid rgba(191, 90, 242, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '12px',
                zIndex: isHighlighted ? 10 : 0
            }}
        >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isHighlighted ? '#BF5AF2' : '#555' }} />
            <Text size="sm" fw={isHighlighted ? 600 : 400} c={isHighlighted ? 'white' : 'dimmed'}>
                {text}
            </Text>
        </motion.div>
    );

    return (
        <Box style={{ position: 'relative', height: '320px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px' }}>
            
            <AnimatePresence mode="wait">
                {phase < 3 ? (
                    <motion.div
                        key="list"
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        transition={{ duration: 0.4 }}
                    >
                        <Stack gap="sm">
                            {/* The "Hidden" Prerequisite */}
                            <ListItem text="Unit 1.2: Vector Calculus" isHighlighted isSecondary />
                            
                            {/* Noise */}
                            <ListItem text="Unit 2.0: Kinematics" />
                            <ListItem text="Unit 3.1: Work & Energy" />

                            {/* The Target Topic */}
                            <ListItem text="Unit 4.5: Fluid Dynamics" isHighlighted />
                        </Stack>
                    </motion.div>
                ) : (
                    /* THE RESULT CARD */
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 20 }}
                        style={{ width: '100%' }}
                    >
                        <GlassCard p="lg" style={{ borderLeft: `4px solid ${NEON_PURPLE}`, background: 'rgba(255,255,255,0.03)' }}>
                            <Group justify="space-between" mb="md">
                                <Badge color="violet" variant="light" size="lg">Smart Schedule: Day 4</Badge>
                                <IconLink size={18} color="#BF5AF2" style={{ opacity: 0.8 }} />
                            </Group>

                            <Text size="lg" fw={600} c="white" mb="xs">Fluid Dynamics Mastery</Text>
                            
                            <Stack gap={8}>
                                <Box p="sm" style={{ background: 'rgba(191, 90, 242, 0.1)', borderRadius: '10px', border: '1px solid rgba(191, 90, 242, 0.2)' }}>
                                    <Group gap="sm">
                                        <IconCheck size={14} color="#BF5AF2" />
                                        <Text size="sm" c="white" fw={500}>Prereq: Vector Calculus Refresh</Text>
                                    </Group>
                                </Box>
                                <Box p="sm" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <Group gap="sm">
                                        <IconArrowRight size={14} color="gray" />
                                        <Text size="sm" c="dimmed">Core: Bernoulli's Equation</Text>
                                    </Group>
                                </Box>
                            </Stack>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}

// --- MOCKUP 2: THE ADAPTIVE ENGINE ---
// --- MOCKUP 2: THE ADAPTIVE ENGINE ---
function AdaptiveMockup() {
    const [step, setStep] = useState(0); // 0: Fail, 1: Process, 2: New Plan

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 3);
        }, 3500); // Slightly longer to appreciate the animation
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ position: 'relative', height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
                
                {/* STEP 1: FAILURE (The Glitch) */}
                {step === 0 && (
                    <motion.div
                        key="fail"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1,
                            x: [0, -5, 5, -5, 5, 0] // Shake effect
                        }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                        style={{ width: '80%' }}
                    >
                        <GlassCard p="lg" style={{ border: `1px solid ${NEON_RED}`, background: 'rgba(255, 59, 48, 0.05)' }}>
                            <Group justify="space-between" mb="md">
                                <Group gap="xs">
                                    <IconAlertTriangle size={18} color={NEON_RED} />
                                    <Text size="sm" fw={700} c="red.4" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Critical Failure</Text>
                                </Group>
                                <Badge color="red" variant="filled" size="sm">42%</Badge>
                            </Group>
                            
                            <Text size="xl" fw={700} c="white" mb="xs">Rotational Dynamics</Text>
                            
                            <Box style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: '42%' }} 
                                    transition={{ duration: 1, ease: "circOut" }}
                                    style={{ height: '100%', background: NEON_RED }} 
                                />
                            </Box>
                            <Text size="xs" c="red.3" mt={6} ta="right">Pace: Lagging by 2 days</Text>
                        </GlassCard>
                    </motion.div>
                )}

                {/* STEP 2: PROCESSING (The Gyroscope) */}
                {step === 1 && (
                    <motion.div
                        key="process"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
                    >
                        {/* The AI Core */}
                        <Box style={{ width: 80, height: 80, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            
                            {/* Outer Ring (Counter-Clockwise) */}
                            <motion.div
                                style={{
                                    position: 'absolute', inset: 0,
                                    borderRadius: '50%',
                                    border: `2px dashed rgba(191, 90, 242, 0.3)`,
                                }}
                                animate={{ rotate: -360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Middle Arc (Clockwise Fast) */}
                            <motion.div
                                style={{
                                    position: 'absolute', inset: 10,
                                    borderRadius: '50%',
                                    borderTop: `3px solid ${NEON_PURPLE}`,
                                    borderRight: `3px solid transparent`, // Creates the gap
                                    borderBottom: `3px solid transparent`,
                                    borderLeft: `3px solid transparent`,
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Inner Brain (Breathing) */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <IconBrain size={32} color="white" />
                            </motion.div>
                        </Box>

                        <Text size="xs" className="apple-text-gradient" fw={700} tt="uppercase" style={{ letterSpacing: '0.2em' }}>
                            Recalibrating Strategy...
                        </Text>
                    </motion.div>
                )}

                {/* STEP 3: NEW PLAN (The Resolution) */}
                {step === 2 && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 40, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -40, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{ width: '80%' }}
                    >
                        <GlassCard p="lg" style={{ borderLeft: `4px solid ${NEON_GREEN}`, background: 'rgba(52, 199, 89, 0.05)' }}>
                            <Group mb="md" justify="space-between">
                                <Group gap="xs">
                                    <ThemeIcon size="sm" color="green" radius="xl" variant="light"><IconRefresh size={12} /></ThemeIcon>
                                    <Text size="xs" fw={700} c="green.4" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Plan Updated</Text>
                                </Group>
                                <Text size="xs" c="dimmed">Confidence: 98%</Text>
                            </Group>
                            
                            <Text size="md" fw={600} c="white" mb="sm">Day 12: Recovery Protocol</Text>
                            
                            <Stack gap={8}>
                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: 0.2 }}
                                >
                                    <Badge 
                                        variant="outline" color="green" size="lg" fullWidth 
                                        leftSection={<IconCheck size={14}/>}
                                        styles={{ root: { justifyContent: 'flex-start', paddingLeft: 12, height: 32 } }}
                                    >
                                        Rotational Basics (Added)
                                    </Badge>
                                </motion.div>

                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: 0.4 }}
                                >
                                    <Badge 
                                        variant="filled" color="dark" size="lg" fullWidth 
                                        rightSection={<IconArrowRight size={14}/>}
                                        styles={{ root: { justifyContent: 'space-between', paddingLeft: 12, height: 32, background: 'rgba(255,255,255,0.1)', color: '#888' } }}
                                    >
                                        Fluid Dynamics (Pushed {'->'} Day 13)
                                    </Badge>
                                </motion.div>
                            </Stack>
                        </GlassCard>
                    </motion.div>
                )}

            </AnimatePresence>
        </Box>
    );
}


export function TheBrain() {
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
                        style={{ backgroundColor: 'rgba(191, 90, 242, 0.1)', color: '#BF5AF2', letterSpacing: '0.1em', border: '1px solid rgba(191, 90, 242, 0.2)' }}
                        leftSection={<IconBrain size={14} />}
                    >
                        CORE INTELLIGENCE
                    </Badge>
                    <Title 
                        order={2} 
                        className="apple-text-gradient"
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                            maxWidth: '900px'
                        }}
                    >
                        KalPad reads the syllabus.<br/>Then it reads between the lines.
                    </Title>
                    <Text c="dimmed" size="xl" maw={600} lh={1.6}>
                        Other "AI planners" just turn your syllabus into a checklist. KalPad acts like a seasoned professor who knows exactly where you'll get stuck.
                    </Text>
                </Stack>

                {/* --- TWO COLUMN FEATURE SHOWCASE --- */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
                    
                    {/* COLUMN 1: PREREQUISITES */}
                    <GlassCard 
                        p="xl" 
                        style={{ 
                            background: 'linear-gradient(180deg, rgba(20,20,25,0.6) 0%, rgba(20,20,25,0.4) 100%)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <Stack gap="xl">
                            <Box style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <DependencyMockup />
                            </Box>
                            <Box>
                                <Group gap="xs" mb="sm">
                                    <ThemeIcon variant="light" color="grape" size="md" radius="md"><IconLink size={18}/></ThemeIcon>
                                    <Text fw={700} c="white" size="lg">It Finds the Traps</Text>
                                </Group>
                                <Text c="dimmed" lh={1.6}>
                                    Our AI knows you can't truly understand "Chapter 5" without revising that one obscure concept from "Chapter 2". It identifies these hidden dependencies and schedules them first, preventing the "mid-study wall."
                                </Text>
                            </Box>
                        </Stack>
                    </GlassCard>

                    {/* COLUMN 2: ADAPTIVE PACING */}
                    <GlassCard 
                        p="xl"
                        style={{ 
                            background: 'linear-gradient(180deg, rgba(20,20,25,0.6) 0%, rgba(20,20,25,0.4) 100%)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <Stack gap="xl">
                            <Box style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <AdaptiveMockup />
                            </Box>
                            <Box>
                                <Group gap="xs" mb="sm">
                                    <ThemeIcon variant="light" color="cyan" size="md" radius="md"><IconRefresh size={18}/></ThemeIcon>
                                    <Text fw={700} c="white" size="lg">It Learns How You Learn</Text>
                                </Group>
                                <Text c="dimmed" lh={1.6}>
                                    Fell behind? KalPad doesn't just reschedule dates. It analyzes your quiz scores, identifies your weak spots, and builds a new, realistic recovery plan that prioritizes the topics you're actually struggling with.
                                </Text>
                            </Box>
                        </Stack>
                    </GlassCard>

                </SimpleGrid>
            </Container>
        </Box>
    );
}