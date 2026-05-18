// src/components/landing/personality/TheEngineRoom.jsx
"use client";

import { useState } from 'react';
import { Container, Title, Text, Box, Group, Stack, Badge, Grid, Slider, ThemeIcon } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBrain, IconTargetArrow, IconVideo, IconChartLine, IconX, IconCheck, IconSearch, IconSparkles, IconCircleX, IconCircleCheck } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#BF5AF2',
    textTransform: 'lowercase'
};

// --- INTERACTIVE MOCKUP: THE TRIAGE SIMULATOR ---
const SYLLABUS_DATA = [
    { id: 1, topic: "Kinematics & Newton's Laws", hours: 10, roi: "High" },
    { id: 2, topic: "Work, Energy & Power", hours: 8, roi: "High" },
    { id: 3, topic: "Thermodynamics", hours: 12, roi: "Medium" },
    { id: 4, topic: "Rotational Motion", hours: 15, roi: "Low" }, // High effort, low yield
    { id: 5, topic: "Properties of Matter", hours: 5, roi: "Low" },
];

function TriageSimulator() {
    const [hoursAvailable, setHoursAvailable] = useState(50);

    let cumulativeHours = 0;
    const evaluatedSyllabus = SYLLABUS_DATA.map(item => {
        cumulativeHours += item.hours;
        const isTriaged = cumulativeHours > hoursAvailable;
        return { ...item, isTriaged };
    });

    const triagedCount = evaluatedSyllabus.filter(i => i.isTriaged).length;

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Injecting CSS for the Slider Pulse */}
            <style>{`
                @keyframes pulse-thumb {
                    0% { box-shadow: 0 0 0 0 rgba(191, 90, 242, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(191, 90, 242, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(191, 90, 242, 0); }
                }
            `}</style>

            <Box mb="xl">
                <Group justify="space-between" align="flex-end" mb="md">
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Study Time Preview</Text>
                    <Badge color={triagedCount > 0 ? "red" : "green"} variant="light" size="sm">
                        {triagedCount > 0 ? "PRIORITIZED" : "ALL CLEAR"}
                    </Badge>
                </Group>
                
                <Group justify="space-between" align="center" mb="xs">
                    <Text size="sm" c="white" fw={600}>Hours Left Before Exam: {hoursAvailable}h</Text>
                    {/* The Kinetic Affordance */}
                    <motion.div
                        animate={{ x: [-3, 3, -3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Text size="xs" fw={700} c="#BF5AF2" style={{ letterSpacing: '0.05em' }}>
                            Drag to try
                        </Text>
                    </motion.div>
                </Group>

                {/* Custom Styled & Pulsing Slider */}
                <Slider
                    value={hoursAvailable}
                    onChange={setHoursAvailable}
                    min={10} max={50} step={5}
                    marks={[{ value: 10 }, { value: 25 }, { value: 50 }]}
                    styles={{
                        track: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
                        bar: { backgroundColor: '#BF5AF2' },
                        thumb: { 
                            borderWidth: 2, borderColor: '#fff', backgroundColor: '#BF5AF2', 
                            width: 24, height: 24, 
                            animation: 'pulse-thumb 2s infinite' // The Glow Pulse
                        },
                        mark: { borderColor: 'rgba(255,255,255,0.3)' }
                    }}
                />
            </Box>

            <Stack gap="sm" style={{ flex: 1, marginTop: '10px' }}>
                <AnimatePresence mode="popLayout">
                    {evaluatedSyllabus.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ 
                                opacity: item.isTriaged ? 0.4 : 1,
                                scale: item.isTriaged ? 0.98 : 1,
                                backgroundColor: item.isTriaged ? 'rgba(255, 59, 48, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                                borderColor: item.isTriaged ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 255, 255, 0.05)'
                            }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            style={{ 
                                padding: '12px 16px', borderRadius: '12px', 
                                border: '1px solid',
                                position: 'relative', overflow: 'hidden'
                            }}
                        >
                            {/* Strikethrough line for triaged items */}
                            {item.isTriaged && (
                                <motion.div 
                                    initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.3 }}
                                    style={{ position: 'absolute', top: '50%', left: 0, height: '1.5px', backgroundColor: '#FF3B30', zIndex: 10 }} 
                                />
                            )}
                            
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="sm" wrap="nowrap">
                                    {item.isTriaged ? <IconX size={16} color="#FF3B30" /> : <IconCheck size={16} color="#34C759" />}
                                    <Text size="sm" c="white" fw={500} style={{ textDecoration: item.isTriaged ? 'line-through' : 'none' }}>
                                        {item.topic}
                                    </Text>
                                </Group>
                                <Group gap="xs">
                                    <Text size="xs" c="dimmed">{item.hours}h</Text>
                                    {!item.isTriaged && <Badge size="xs" color="gray" variant="outline" style={{ border: 'none', backgroundColor: 'rgba(255,255,255,0.05)' }}>{item.roi} priority</Badge>}
                                    {item.isTriaged && <Badge size="xs" color="red" variant="filled">Skipped</Badge>}
                                </Group>
                            </Group>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </Stack>
        </Box>
    );
}

// --- ANIMATION MOCKUP: THE SCIENTIFIC ILLUSTRATOR ---
function IllustratorMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Group justify="space-between" mb="xs">
                <Text size="10px" ff="monospace" c="dimmed">```kalpad-illustrator --engine=matplotlib</Text>
                <Badge variant="dot" color="violet" size="xs" style={{ backgroundColor: 'rgba(191, 90, 242, 0.1)', border: 'none' }}>RENDERED</Badge>
            </Group>
            
            {/* The SVG Black Body Radiation Graph */}
            <Box p="sm" style={{ backgroundColor: '#0A0A0C', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Text size="xs" fw={700} c="white" mb="sm" ta="center" style={{ fontFamily: 'var(--font-lexend)' }}>
                    Black Body Radiation
                </Text>
                
                <svg width="100%" height="120" viewBox="0 0 300 120" style={{ overflow: 'visible' }}>
                    {/* Grid Lines */}
                    <line x1="30" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="30" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Axes */}
                    <line x1="30" y1="10" x2="30" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <line x1="30" y1="100" x2="290" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <text x="5" y="55" fill="#888" fontSize="8" transform="rotate(-90 10 55)">Intensity</text>
                    <text x="140" y="115" fill="#888" fontSize="8">Wavelength</text>

                    {/* Classical Curve (Rayleigh-Jeans) - Shoots to infinity */}
                    <motion.path 
                        d="M 280 98 Q 100 90 40 10" 
                        stroke="#FF3B30" strokeWidth="2" strokeDasharray="4 4" fill="none"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        viewport={{ once: true }}
                    />
                    <text x="45" y="15" fill="#FF3B30" fontSize="8" fontWeight="bold">Classical</text>

                    {/* Planck Curve 1 (T=5000K) */}
                    <motion.path 
                        d="M 30 100 Q 50 20 120 70 T 280 95" 
                        stroke="#FF9500" strokeWidth="2" fill="none"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                        viewport={{ once: true }}
                    />
                    
                    {/* Planck Curve 2 (T=6000K) - Peaks higher and to the left */}
                    <motion.path 
                        d="M 30 100 Q 45 -10 100 50 T 280 90" 
                        stroke="#BF5AF2" strokeWidth="2" fill="none"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
                        viewport={{ once: true }}
                    />
                    
                    {/* Highlight Point (Peak of 6000K) */}
                    <motion.circle 
                        cx="62" cy="18" r="3" fill="#FFF"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ delay: 2.2, type: "spring" }}
                        viewport={{ once: true }}
                    />
                </svg>
            </Box>
        </Box>
    );
}

// --- ANIMATION MOCKUP: ACTIVE RECALL V2 ---
function QuizMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <Stack gap="sm">
                <Text size="sm" c="white" fw={600} lh={1.4} style={{ fontFamily: 'var(--font-inter)' }}>
                    Why did the Ultraviolet Catastrophe occur in classical physics?
                </Text>
                
                {/* Wrong Answer Chosen */}
                <Box p="10px 12px" style={{ background: 'rgba(255, 59, 48, 0.1)', border: `1px solid rgba(255, 59, 48, 0.4)`, borderRadius: '8px' }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="xs" c="white">It assumed energy levels in atoms were quantized.</Text>
                        <IconCircleX size={16} color="#FF3B30" style={{ flexShrink: 0 }} />
                    </Group>
                </Box>

                {/* Correct Answer */}
                <Box p="10px 12px" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: '8px', opacity: 0.6 }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="xs" c="dimmed">It assumed the energy of oscillators was continuous.</Text>
                        <IconCircleCheck size={16} color="gray" style={{ flexShrink: 0 }} />
                    </Group>
                </Box>

                {/* AI Intervention Feedback */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
                >
                    <Box mt="xs" p="sm" style={{ background: '#111113', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.2)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#34C759' }} />
                        <Text size="10px" fw={700} c="#34C759" mb={4} tt="uppercase" style={{ letterSpacing: '0.05em' }}>Why This Was Wrong</Text>
                        <Text size="xs" c="gray.3" lh={1.5}>
                            You reversed the logic. Classical mechanics (Rayleigh-Jeans) failed because it assumed <span style={{ color: '#fff', fontWeight: 600 }}>continuous</span> energy. It was Max Planck who fixed it by proving energy is <span style={{ color: '#fff', fontWeight: 600 }}>quantized</span> ($E=hv$).
                        </Text>
                    </Box>
                </motion.div>
            </Stack>
        </Box>
    );
}

// --- ANIMATION MOCKUP: LECTURE SCOUT ---
function ScoutMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Group justify="center" mb="lg">
                <IconSearch size={18} color="#FF9500" className="animate-pulse" />
                <Text size="xs" ff="monospace" c="orange.4" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Checking Lectures...</Text>
            </Group>
            
            <Stack gap="sm">
                {/* Rejected Video */}
                <Box p="sm" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', opacity: 0.3 }}>
                    <Group wrap="nowrap">
                        <Box w={60} h={40} style={{ backgroundColor: '#2C2C2E', borderRadius: '4px' }} />
                        <Box style={{ flex: 1 }}>
                            <Box w="80%" h={8} mb={6} style={{ backgroundColor: '#3A3A3C', borderRadius: '4px' }} />
                            <Box w="30%" h={6} style={{ backgroundColor: '#2C2C2E', borderRadius: '4px' }} />
                        </Box>
                        <Badge size="xs" color="red" variant="dot">2h 40m</Badge>
                    </Group>
                </Box>

                {/* Accepted Video */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, borderColor: 'rgba(255,255,255,0.05)' }}
                    whileInView={{ scale: 1, opacity: 1, borderColor: 'rgba(255, 149, 0, 0.4)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    style={{ backgroundColor: 'rgba(255, 149, 0, 0.05)', borderRadius: '12px', border: '1px solid', padding: '12px', boxShadow: '0 10px 20px -10px rgba(255, 149, 0, 0.1)' }}
                >
                    <Group wrap="nowrap">
                        <Box w={60} h={40} style={{ backgroundColor: '#FF9500', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconVideo size={16} color="black" />
                        </Box>
                        <Box style={{ flex: 1 }}>
                            <Text size="sm" c="white" fw={600} lh={1.2}>MIT 8.01: Work & Energy</Text>
                            <Text size="10px" c="orange.4" mt={4} fw={500}>Best short explanation</Text>
                        </Box>
                        <Badge size="xs" color="orange" variant="filled">14m</Badge>
                    </Group>
                </motion.div>
            </Stack>
        </Box>
    );
}


export function TheEngineRoom() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10, backgroundColor: '#050505' }}>
            <Container size="xl">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={80}>
                    <Badge 
                        variant="filled" 
                        size="md" 
                        radius="xl"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.1em', padding: '12px 16px' }}
                    >
                        WHAT KALPAD DOES
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
                            letterSpacing: '-0.04em',
                            lineHeight: 1.1,
                            color: 'white',
                            maxWidth: '900px'
                        }}
                    >
                        Not just a timetable.<br/>
                        <span style={serifItalic}>A calmer way to study.</span>
                    </Title>
                </Stack>

                {/* --- THE BENTO GRID --- */}
                <Grid gutter={{ base: "xl", md: "lg", xl: "xl" }}>
                    
                    {/* BENTO 1: THE STRATEGIST (Takes 8 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 8 }}>
                        <GlassCard 
                            p={{ base: 'xl', md: 40 }} 
                            style={{ 
                                height: '100%',
                                background: 'linear-gradient(145deg, rgba(28,28,30,0.8) 0%, rgba(15,15,18,0.9) 100%)',
                                border: '1px solid rgba(191, 90, 242, 0.2)',
                                boxShadow: '0 20px 60px -20px rgba(191, 90, 242, 0.1)'
                            }}
                        >
                            <Grid gutter="xl" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Stack h="100%" justify="center">
                                        <ThemeIcon size="xl" radius="md" color="violet" variant="light" style={{ backgroundColor: 'rgba(191, 90, 242, 0.1)' }}>
                                            <IconTargetArrow size={24} color="#BF5AF2" />
                                        </ThemeIcon>
                                        <Title order={3} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '2rem', letterSpacing: '-0.03em' }}>
                                            Smart Plan Builder
                                        </Title>
                                        <Text c="gray.4" size="lg" lh={1.6} style={{ fontFamily: 'var(--font-inter)' }}>
                                            When time runs out, KalPad does not cram everything in. It keeps the important topics first and moves low-priority work out of the way.
                                        </Text>
                                    </Stack>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Box style={{ background: '#0A0A0C', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                                        <TriageSimulator />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </GlassCard>
                    </Grid.Col>

                    {/* BENTO 2: THE ILLUSTRATOR (Takes 4 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 4 }}>
                        <GlassCard 
                            p="xl" 
                            style={{ 
                                height: '100%', display: 'flex', flexDirection: 'column',
                                backgroundColor: 'rgba(28,28,30,0.5)', border: '1px solid rgba(255,255,255,0.05)' 
                            }}
                        >
                            <Box style={{ flex: 1, marginBottom: '20px' }}>
                                <IllustratorMockup />
                            </Box>
                            <Stack gap="xs">
                                <Group gap="xs"><IconChartLine size={18} color="#BF5AF2"/><Text fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '1.2rem', letterSpacing: '-0.02em' }}><span style={serifItalic}>Clear</span> Notes & Diagrams</Text></Group>
                                <Text size="sm" c="dimmed" lh={1.5} style={{ fontFamily: 'var(--font-inter)' }}>KalPad turns hard topics into readable notes and useful visuals so the idea clicks faster.</Text>
                            </Stack>
                        </GlassCard>
                    </Grid.Col>

                    {/* BENTO 3: THE SCOUT (Takes 6 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <GlassCard 
                            p="xl" 
                            style={{ 
                                height: '100%',
                                backgroundColor: 'rgba(28,28,30,0.5)', border: '1px solid rgba(255, 149, 0, 0.2)',
                                boxShadow: 'inset 0 0 40px rgba(255, 149, 0, 0.05)'
                            }}
                        >
                            <Grid gutter="xl" align="center" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Stack gap="xs">
                                        <Group gap="xs"><IconVideo size={20} color="#FF9500"/><Title order={4} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>The Lecture Scout</Title></Group>
                                        <Text size="sm" c="dimmed" lh={1.6} style={{ fontFamily: 'var(--font-inter)' }}>KalPad checks YouTube lecture transcripts and finds a short, useful explanation so you do not waste 2 hours searching.</Text>
                                    </Stack>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Box style={{ background: '#0A0A0C', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <ScoutMockup />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </GlassCard>
                    </Grid.Col>

                    {/* BENTO 4: ACTIVE RECALL (Takes 6 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <GlassCard 
                            p="xl" 
                            style={{ 
                                height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                backgroundColor: 'rgba(28,28,30,0.5)', border: '1px solid rgba(52, 199, 89, 0.2)',
                                backgroundImage: 'radial-gradient(circle at top right, rgba(52, 199, 89, 0.05) 0%, transparent 50%)'
                            }}
                        >
                            <Grid gutter="xl" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Box mb="xl">
                                        <Group gap="xs" mb="sm"><IconBrain size={20} color="#34C759"/><Title order={4} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Practice That Learns</Title></Group>
                                        <Text size="sm" c="dimmed" lh={1.6} style={{ fontFamily: 'var(--font-inter)' }}>If you miss a question, KalPad explains the mistake and brings that topic back for revision.</Text>
                                    </Box>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Box style={{ background: '#0A0A0C', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                                        <QuizMockup />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </GlassCard>
                    </Grid.Col>

                </Grid>
            </Container>
        </Box>
    );
}
