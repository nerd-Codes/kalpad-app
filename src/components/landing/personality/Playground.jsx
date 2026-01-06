"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Grid, Box, Badge, Group } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTerminal2, IconChevronRight, IconCheck, IconCpu } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 

// --- SCENARIO DATA ---
const SCENARIOS = [
    {
        id: 'upsc',
        color: '#fb923c', // Orange (High Stakes)
        label: 'MODE: CIVIL SERVICES',
        input: 'UPSC Prelims 2025. Weak in History & Economics.',
        logs: [
            { text: 'Analyzing syllabus density: GS Paper I & CSAT...', delay: 500 },
            { text: 'Triaging subjects: Prioritizing Modern History & Macroeconomics.', delay: 1400 },
            { text: 'Integrating Current Affairs: Last 18 months buffer...', delay: 2200 },
            { text: '>> GENERATED: "The 6-Month IAS Combat Strategy"', delay: 3000, highlight: true }
        ]
    },
    {
        id: 'skill-dev',
        color: '#818cf8', // Indigo (Tech)
        label: 'MODE: SKILL BUILDER',
        input: 'Learn Python for Data Science by building a stock predictor.',
        logs: [
            { text: 'Deconstructing goal: Pandas, NumPy, Scikit-Learn...', delay: 500 },
            { text: 'Discarding theory: Focusing on project-based milestones.', delay: 1200 },
            { text: 'Curating resources: Documentation > 3-hour videos...', delay: 2000 },
            { text: '>> GENERATED: "Zero to Hero: Project Roadmap"', delay: 2800, highlight: true }
        ]
    },
    {
        id: 'interview',
        color: '#f472b6', // Pink (Career)
        label: 'MODE: INTERVIEW PREP',
        input: 'Google L4 Frontend Interview next week. Need system design prep.',
        logs: [
            { text: 'Scanning role requirements...', delay: 500 },
            { text: 'Prioritizing: Scalability patterns & LeetCode Hards.', delay: 1200 },
            { text: 'Scheduling mock interviews: Daily at 8 PM...', delay: 2000 },
            { text: '>> GENERATED: "7-Day FAANG Crunch Plan"', delay: 2800, highlight: true }
        ]
    },
    {
        id: 'thesis',
        color: '#34d399', // Emerald (Academic)
        label: 'MODE: THESIS DEFENSE',
        input: 'Write a 50-page thesis on Quantum Computing by May 1st.',
        logs: [
            { text: 'Calculating velocity: 500 words/day required.', delay: 500 },
            { text: 'Structuring architecture: Lit Review -> Methodology -> Results.', delay: 1400 },
            { text: 'Allocating buffer for citations & formatting...', delay: 2200 },
            { text: '>> GENERATED: "Dissertation Delivery Timeline"', delay: 3000, highlight: true }
        ]
    },
    {
        id: 'hackathon',
        color: '#22d3ee', // Cyan (Speed)
        label: 'MODE: HACKATHON',
        input: 'Build a Fintech MVP in 48 hours with Next.js.',
        logs: [
            { text: 'Analyzing constraints: 48h hard limit...', delay: 500 },
            { text: 'Identifying critical path: Auth -> Database -> Stripe.', delay: 1200 },
            { text: 'Eliminating low-priority features (UI Polish)...', delay: 2000 },
            { text: '>> GENERATED: "The 48-Hour Sprint Roadmap"', delay: 2800, highlight: true }
        ]
    }
];

// --- SUB-COMPONENT: TERMINAL LINE ---
function TerminalLine({ text, color, highlight }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-mono text-sm md:text-base"
            style={{ 
                color: highlight ? color : 'rgba(255,255,255,0.6)', 
                fontWeight: highlight ? 700 : 400,
                marginTop: highlight ? '2px' : '4px',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            {highlight && <IconCheck size={14} />}
            {text}
        </motion.div>
    );
}

export function Playground() {
    const [index, setIndex] = useState(0);
    const activeScenario = SCENARIOS[index];

    // Cycle through scenarios
    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % SCENARIOS.length);
        }, 5000); // 5 seconds per scenario
        return () => clearInterval(timer);
    }, []);

    return (
        <Box py={{ base: 80, md: 120 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                <Grid gutter={60} align="center">
                    
                    {/* --- LEFT: NARRATIVE --- */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="xl">
                            <Box>
                                <Badge 
                                    variant="outline" color="gray" size="lg" mb="md"
                                    styles={{ root: { borderColor: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'var(--font-lexend)' } }}
                                >
                                    REAL WORLD PROTOCOLS
                                </Badge>
                                <Title 
                                    order={2} 
                                    className="apple-text-gradient"
                                    style={{ 
                                        fontFamily: 'var(--font-lexend)', 
                                        fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', 
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em'
                                    }}
                                >
                                    Exams are the trailer. <br/>
                                    <span style={{ color: 'white' }}>This is the real game.</span>
                                </Title>
                            </Box>
                            
                            <Text size="xl" c="dimmed" lh={1.6}>
                                KalPad doesn't just help you pass. It helps you build. 
                                Whether it's a 48-hour hackathon, a high-stakes interview, or a freelance deadline, 
                                our planning engine adapts to the chaos of the real world.
                            </Text>
                        </Stack>
                    </Grid.Col>

                    {/* --- RIGHT: THE TERMINAL --- */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <GlassCard 
                            p={0}
                            style={{ 
                                height: '400px',
                                backgroundColor: '#0d0d0f', // Near black terminal bg
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 30px 60px -10px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            {/* Window Header */}
                            <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <Group justify="space-between">
                                    <Group gap={6}>
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </Group>
                                    <Group gap={6} style={{ opacity: 0.5 }}>
                                        <IconTerminal2 size={14} />
                                        <Text size="xs" ff="monospace">kalpad_engine_v2.0</Text>
                                    </Group>
                                </Group>
                            </Box>

                            {/* Terminal Body */}
                            <Box p="xl" style={{ flex: 2, fontFamily: 'monospace' }} minheight="50rem" overflow="hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeScenario.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Group gap="xs" mb="lg">
                                            <Badge 
                                                variant="dot" 
                                                color={activeScenario.color} 
                                                size="sm" 
                                                style={{ backgroundColor: 'transparent', color: activeScenario.color }}
                                            >
                                                {activeScenario.label}
                                            </Badge>
                                        </Group>

                                        {/* User Input Line */}
                                        <Group gap="xs" mb="md" align="flex-start">
                                            <IconChevronRight size={18} color={activeScenario.color} style={{ marginTop: 2 }} />
                                            <Text c="white" size="sm" style={{ fontFamily: 'monospace' }}>
                                                {activeScenario.input}
                                                <motion.span 
                                                    animate={{ opacity: [0, 1, 0] }} 
                                                    transition={{ duration: 0.8, repeat: Infinity }}
                                                    style={{ display: 'inline-block', width: '10px', height: '1.2em', backgroundColor: activeScenario.color, marginLeft: '8px', verticalAlign: 'text-bottom' }}
                                                />
                                            </Text>
                                        </Group>

                                        {/* System Logs */}
                                        <Stack gap="xs">
                                            {activeScenario.logs.map((log, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: log.delay / 1000 }} // Convert ms to s
                                                >
                                                    <TerminalLine 
                                                        text={log.text} 
                                                        highlight={log.highlight} 
                                                        color={activeScenario.color} 
                                                    />
                                                </motion.div>
                                            ))}
                                        </Stack>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>
                        </GlassCard>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
}