// src/components/landing/personality/TheGodMode.jsx
"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, Box, Group, Stack, Badge, Grid, ThemeIcon } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconRotateClockwise, IconAlertCircle, IconCheck, IconPlayerPlayFilled, IconWand, IconActivityHeartbeat } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#BF5AF2',
    textTransform: 'lowercase'
};

// --- ORGANIC DOODLE: THE HEURISTIC CIRCLE ---
function OrganicCircle({ delay }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay }}
            style={{ position: 'absolute', top: '-15px', left: '-20px', right: '-20px', bottom: '-15px', zIndex: 10, pointerEvents: 'none' }}
        >
            <svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <motion.path 
                    d="M 10 30 Q 50 5 100 10 T 190 30 Q 150 55 100 50 T 10 30" 
                    stroke="#34C759" strokeWidth="2" strokeDasharray="6 4" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay }}
                />
            </svg>
        </motion.div>
    );
}

// --- ANIMATED MOCKUP: THE RECOVERY ENGINE ---
function RecoveryEngineMockup() {
    const [phase, setPhase] = useState(0); // 0: Failed Day, 1: AI Intervening, 2: Restructured

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase((p) => (p + 1) % 3);
        }, 4000); // 4 seconds per phase for readability
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
                
                {/* PHASE 0: THE FAILURE (Anxiety) */}
                {phase === 0 && (
                    <motion.div
                        key="phase0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                        transition={{ duration: 0.4 }}
                    >
                        <Stack gap="sm">
                            <Text size="xs" fw={700} c="red.4" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Yesterday • Missed</Text>
                            <GlassCard p="md" style={{ border: '1px solid rgba(255, 59, 48, 0.4)', background: 'rgba(255, 59, 48, 0.05)', position: 'relative', overflow: 'hidden' }}>
                                {/* Warning Strip */}
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#FF3B30' }} />
                                
                                <Group justify="space-between" mb="xs">
                                    <Title order={4} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>Day 14: Electromagnetism</Title>
                                    <Badge color="red" variant="filled">0/4 Tasks</Badge>
                                </Group>
                                <Text size="sm" c="dimmed" mb="md">You missed 6 hours of scheduled deep work. Study debt accumulating.</Text>
                                
                                <Box p="sm" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconAlertCircle size={16} color="#FF3B30" />
                                            <Text size="sm" fw={600} c="white">Timeline Compromised</Text>
                                        </Group>
                                        <Badge variant="outline" color="red" style={{ cursor: 'pointer', boxShadow: '0 0 10px rgba(255,59,48,0.2)' }} className="animate-pulse">
                                            REGENERATE PLAN
                                        </Badge>
                                    </Group>
                                </Box>
                            </GlassCard>
                        </Stack>
                    </motion.div>
                )}

                {/* PHASE 1: THE INTERVENTION (Analysis) */}
                {phase === 1 && (
                    <motion.div
                        key="phase1"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Box style={{ position: 'relative', width: '100%' }}>
                            <GlassCard p="xl" style={{ border: '1px solid rgba(191, 90, 242, 0.5)', background: '#111113', textAlign: 'center', boxShadow: '0 0 40px rgba(191, 90, 242, 0.2)' }}>
                                <IconWand size={32} color="#BF5AF2" className="animate-spin-slow" style={{ animationDuration: '3s' }} />
                                <Title order={4} c="white" mt="md" mb="sm" style={{ fontFamily: 'var(--font-lexend)' }}>Constitutional AI Active</Title>
                                
                                <Stack gap="xs" align="center">
                                    <Text size="xs" ff="monospace" c="dimmed">Analyzing study debt: 6h</Text>
                                    <Group gap="xs" style={{ position: 'relative' }}>
                                        <Text size="xs" ff="monospace" c="white" fw={600}>Calculating X vs. Y Heuristic...</Text>
                                    
                                    </Group>
                                    <Text size="xs" ff="monospace" c="dimmed">Pace adjusted from 6h/day to 4.5h/day</Text>
                                    <Text size="xs" ff="monospace" c="violet.4">Rebuilding timeline geometry...</Text>
                                </Stack>
                            </GlassCard>
                            
                            
                        </Box>
                    </motion.div>
                )}

                {/* PHASE 2: THE SAVE (Relief & Clarity) */}
                {phase === 2 && (
                    <motion.div
                        key="phase2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, filter: 'blur(5px)' }}
                        transition={{ type: "spring", stiffness: 120, damping: 15 }}
                    >
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Text size="xs" fw={700} c="green.4" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Timeline Restored</Text>
                                <Badge color="green" variant="light" leftSection={<IconActivityHeartbeat size={12}/>}>REALISTIC PACE</Badge>
                            </Group>

                            {/* Split Day 14a */}
                            <GlassCard p="sm" style={{ border: '1px solid rgba(52, 199, 89, 0.3)', background: 'rgba(52, 199, 89, 0.05)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#34C759' }} />
                                <Group justify="space-between" mb="xs">
                                    <Title order={5} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>Today: Electromagnetism (Part 1)</Title>
                                </Group>
                                <Text size="xs" c="dimmed">AI Note: We split yesterday's load. Just focus on Biot-Savart Law today. 3 hours max.</Text>
                            </GlassCard>

                            {/* Link Arrow */}
                            <Box style={{ display: 'flex', justifyContent: 'center', opacity: 0.5, margin: '-4px 0' }}>
                                <IconRotateClockwise size={16} color="gray" />
                            </Box>

                            {/* Split Day 14b */}
                            <GlassCard p="sm" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden', opacity: 0.8 }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'gray' }} />
                                <Group justify="space-between" mb="xs">
                                    <Title order={5} c="gray.4" style={{ fontFamily: 'var(--font-lexend)' }}>Tomorrow: Electromagnetism (Part 2)</Title>
                                </Group>
                                <Text size="xs" c="dimmed">Ampere's Law & Solenoids pushed here. Low-ROI chapter 16 amputated to make room.</Text>
                            </GlassCard>
                        </Stack>
                    </motion.div>
                )}

            </AnimatePresence>
        </Box>
    );
}


export function TheGodMode() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10, backgroundColor: '#050505' }}>
            
            {/* Ambient Lighting */}
            <div style={{
                position: 'absolute', top: '50%', right: '0%',
                width: '60vw', height: '60vw', transform: 'translateY(-50%)',
                background: 'radial-gradient(circle, rgba(52, 199, 89, 0.05) 0%, transparent 60%)',
                filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none'
            }} />

            <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
                <Grid gutter={{ base: 60, lg: 100 }} align="center">
                    
                    {/* --- LEFT: EDITORIAL COPY --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Stack gap="xl">
                            <Badge 
                                variant="outline" 
                                color="gray" 
                                size="md" 
                                radius="xl"
                                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#86868B', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', letterSpacing: '0.1em' }}
                                leftSection={<IconRotateClockwise size={12} color="#34C759" />}
                            >
                                THE REGENERATION ENGINE
                            </Badge>

                            <Title 
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: 'clamp(3rem, 5vw, 4.5rem)', 
                                    fontWeight: 800, 
                                    lineHeight: 1.05,
                                    letterSpacing: '-0.04em',
                                    color: '#F5F5F7',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Fall behind.<br/>
                                <span style={{ ...serifItalic, textShadow: '0 5px 20px rgba(191, 90, 242, 0.3)' }}>
                                    We'll catch you.
                                </span>
                            </Title>

                            <Text size="lg" c="gray.4" lh={1.7} style={{ fontFamily: 'var(--font-inter)' }}>
                                Standard study planners are built for perfect students. They break the moment you skip a day. KalPad is built for reality.
                            </Text>

                            {/* The Heuristic Explanation */}
                            <Box p="lg" style={{ borderLeft: '3px solid #BF5AF2', background: 'linear-gradient(90deg, rgba(191, 90, 242, 0.05) 0%, transparent 100%)' }}>
                                <Group gap="sm" mb="xs">
                                    <ThemeIcon variant="light" color="violet" size="sm" radius="xl"><IconActivityHeartbeat size={14}/></ThemeIcon>
                                    <Text size="sm" fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>The "X vs. Y" Heuristic</Text>
                                </Group>
                                <Text size="sm" c="dimmed" lh={1.6}>
                                    When you hit "Regenerate", the AI analyzes your failed tasks. It calculates your *actual* study velocity vs your *planned* velocity, and dynamically rebuilds a mathematically realistic timeline. 
                                    <br/><br/>
                                    <span style={{ color: 'white', fontWeight: 600 }}>No guilt trips. Just a new, flawless path to victory.</span>
                                </Text>
                            </Box>
                        </Stack>
                    </Grid.Col>

                    {/* --- RIGHT: THE CINEMATIC MOCKUP --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <GlassCard 
                            p={{ base: 'xl', md: 50 }} 
                            style={{ 
                                height: '100%',
                                background: 'linear-gradient(145deg, rgba(28,28,30,0.8) 0%, rgba(15,15,18,0.9) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)'
                            }}
                        >
                            <RecoveryEngineMockup />
                        </GlassCard>
                    </Grid.Col>

                </Grid>
            </Container>
        </Box>
    );
}