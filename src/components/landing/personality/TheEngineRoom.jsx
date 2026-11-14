// src/components/landing/personality/TheEngineRoom.jsx
"use client";

import { useState } from 'react';
import { Container, Title, Text, Box, Group, Stack, Badge, Grid, Slider } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBrain, IconTargetArrow, IconVideo, IconChartLine, IconX, IconCheck, IconSearch, IconCircleX, IconCircleCheck } from '@tabler/icons-react';

// --- INTERACTIVE MOCKUP: THE TRIAGE SIMULATOR ---
const SYLLABUS_DATA = [
    { id: 1, topic: "Kinematics & Newton's Laws", hours: 10, roi: "Core priority" },
    { id: 2, topic: "Work, Energy & Power", hours: 8, roi: "Core priority" },
    { id: 3, topic: "Thermodynamics", hours: 12, roi: "Core priority" },
    { id: 4, topic: "Rotational Motion", hours: 15, roi: "Secondary" }, // High effort, lower yield
    { id: 5, topic: "Properties of Matter", hours: 5, roi: "Supplementary" },
];

export function TriageSimulator() {
    const [hoursAvailable, setHoursAvailable] = useState(35);

    let cumulativeHours = 0;
    const evaluatedSyllabus = SYLLABUS_DATA.map(item => {
        cumulativeHours += item.hours;
        const isTriaged = cumulativeHours > hoursAvailable;
        return { ...item, isTriaged };
    });

    const triagedCount = evaluatedSyllabus.filter(i => i.isTriaged).length;
    const totalHours = 50;
    const coveragePercent = Math.min(100, Math.round((hoursAvailable / totalHours) * 100));

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box mb="md">
                <Group justify="space-between" align="center" mb="xs">
                    <Text size="xs" fw={500} c="#85858b">
                        Study time preview
                    </Text>
                    <Badge
                        variant="outline"
                        size="xs"
                        radius="sm"
                        style={{
                            borderColor: triagedCount > 0 ? 'rgba(229, 72, 77, 0.3)' : 'rgba(76, 195, 138, 0.3)',
                            color: triagedCount > 0 ? '#e5484d' : '#4cc38a',
                            backgroundColor: triagedCount > 0 ? 'rgba(229, 72, 77, 0.08)' : 'rgba(76, 195, 138, 0.08)'
                        }}
                    >
                        {triagedCount > 0 ? `${triagedCount} topics triaged` : 'Full coverage'}
                    </Badge>
                </Group>

                <Group justify="space-between" align="baseline" mb="xs">
                    <Group gap="xs">
                        <Text size="sm" c="#ededed" fw={500}>
                            Available study budget:
                        </Text>
                        <Text size="sm" c="#D97706" fw={600} className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                            {hoursAvailable} hours
                        </Text>
                    </Group>
                    <Text size="xs" c="#a1a1a6" className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                        {coveragePercent}% core coverage
                    </Text>
                </Group>

                {/* Clean Slider with solid amber thumb */}
                <Slider
                    value={hoursAvailable}
                    onChange={setHoursAvailable}
                    min={10}
                    max={50}
                    step={5}
                    marks={[
                        { value: 10, label: '10h' },
                        { value: 25, label: '25h' },
                        { value: 35, label: '35h' },
                        { value: 50, label: '50h' }
                    ]}
                    styles={{
                        root: { paddingBottom: 16 },
                        track: { backgroundColor: 'rgba(237, 237, 237, 0.08)', height: 6 },
                        bar: { backgroundColor: '#D97706' },
                        thumb: {
                            borderWidth: 2,
                            borderColor: '#19191b',
                            backgroundColor: '#D97706',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)'
                        },
                        mark: { borderColor: 'rgba(237, 237, 237, 0.2)' },
                        markLabel: { fontSize: 10, color: '#85858b', marginTop: 6 }
                    }}
                />

                <Text size="xs" c="#85858b" mt={4}>
                    Drag slider to preview syllabus triage when revision hours are constrained
                </Text>
            </Box>

            <Stack gap={6} style={{ flex: 1, marginTop: 4 }}>
                <AnimatePresence mode="popLayout">
                    {evaluatedSyllabus.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{
                                opacity: item.isTriaged ? 0.45 : 1,
                                backgroundColor: item.isTriaged ? 'rgba(229, 72, 77, 0.04)' : 'rgba(237, 237, 237, 0.03)',
                                borderColor: item.isTriaged ? 'rgba(229, 72, 77, 0.15)' : 'rgba(237, 237, 237, 0.08)'
                            }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="sm" wrap="nowrap">
                                    {item.isTriaged ? (
                                        <IconX size={15} color="#e5484d" style={{ flexShrink: 0 }} />
                                    ) : (
                                        <IconCheck size={15} color="#4cc38a" style={{ flexShrink: 0 }} />
                                    )}
                                    <Text
                                        size="xs"
                                        c={item.isTriaged ? '#85858b' : '#ededed'}
                                        fw={500}
                                        style={{
                                            textDecoration: item.isTriaged ? 'line-through' : 'none'
                                        }}
                                    >
                                        {item.topic}
                                    </Text>
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                    <Text size="xs" c="#85858b" className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                                        {item.hours}h
                                    </Text>
                                    {!item.isTriaged ? (
                                        <Badge
                                            size="xs"
                                            radius="sm"
                                            variant="outline"
                                            style={{
                                                borderColor: 'rgba(237, 237, 237, 0.08)',
                                                color: '#a1a1a6',
                                                backgroundColor: 'rgba(237, 237, 237, 0.02)'
                                            }}
                                        >
                                            {item.roi}
                                        </Badge>
                                    ) : (
                                        <Badge
                                            size="xs"
                                            radius="sm"
                                            variant="outline"
                                            style={{
                                                borderColor: 'rgba(229, 72, 77, 0.2)',
                                                color: '#e5484d',
                                                backgroundColor: 'rgba(229, 72, 77, 0.06)'
                                            }}
                                        >
                                            Deprioritized
                                        </Badge>
                                    )}
                                </Group>
                            </Group>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </Stack>
        </Box>
    );
}

// --- SUB-COMPONENT: SCIENTIFIC DIAGRAM ILLUSTRATOR ---
function IllustratorMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Group justify="space-between" mb="xs">
                <Text size="10px" ff="monospace" c="#85858b">kalpad-illustrator · blackbody_radiation.svg</Text>
                <Badge
                    variant="outline"
                    size="xs"
                    radius="sm"
                    style={{
                        borderColor: 'rgba(237, 237, 237, 0.08)',
                        color: '#a1a1a6',
                        backgroundColor: 'rgba(237, 237, 237, 0.02)'
                    }}
                >
                    Rendered
                </Badge>
            </Group>

            {/* Clean textbook diagram palette: neutral grid, single amber curve */}
            <Box p="sm" style={{ backgroundColor: '#0f0f10', borderRadius: '10px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                <Text size="xs" fw={500} c="#ededed" mb="xs" ta="center">
                    Black Body Radiation Spectrum
                </Text>

                <svg width="100%" height="110" viewBox="0 0 300 110" style={{ overflow: 'visible' }}>
                    {/* Neutral Grid Lines */}
                    <line x1="30" y1="20" x2="280" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                    <line x1="30" y1="55" x2="280" y2="55" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

                    {/* Neutral Axes */}
                    <line x1="30" y1="10" x2="30" y2="90" stroke="rgba(237, 237, 237, 0.25)" strokeWidth="1" />
                    <line x1="30" y1="90" x2="285" y2="90" stroke="rgba(237, 237, 237, 0.25)" strokeWidth="1" />
                    <text x="8" y="50" fill="#85858b" fontSize="8" transform="rotate(-90 10 50)">Intensity</text>
                    <text x="135" y="104" fill="#85858b" fontSize="8">Wavelength (nm)</text>

                    {/* Classical Rayleigh-Jeans Curve (dashed neutral line) */}
                    <path
                        d="M 280 88 Q 100 82 40 15"
                        stroke="rgba(237, 237, 237, 0.3)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        fill="none"
                    />
                    <text x="45" y="16" fill="#85858b" fontSize="8">Classical limit</text>

                    {/* Planck Spectral Distribution Curve (Single Warm Amber #D97706) */}
                    <path
                        d="M 30 90 Q 45 5 100 45 T 280 85"
                        stroke="#D97706"
                        strokeWidth="2"
                        fill="none"
                    />

                    {/* Highlight peak point */}
                    <circle cx="62" cy="18" r="3" fill="#ededed" />
                    <text x="70" y="20" fill="#D97706" fontSize="8" fontWeight="500">Peak (5000K)</text>
                </svg>
            </Box>
        </Box>
    );
}

// --- SUB-COMPONENT: ACTIVE RECALL PRACTICE QUIZ ---
function QuizMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <Stack gap="xs">
                <Text size="xs" c="#ededed" fw={500} lh={1.4}>
                    Why did the Ultraviolet Catastrophe occur in classical physics?
                </Text>

                {/* Wrong Answer Chosen */}
                <Box p="8px 12px" style={{ background: 'rgba(229, 72, 77, 0.08)', border: '1px solid rgba(229, 72, 77, 0.25)', borderRadius: '6px' }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="xs" c="#ededed">It assumed energy levels in atoms were quantized.</Text>
                        <IconCircleX size={14} color="#e5484d" style={{ flexShrink: 0 }} />
                    </Group>
                </Box>

                {/* Correct Answer */}
                <Box p="8px 12px" style={{ background: 'rgba(237, 237, 237, 0.02)', border: '1px solid rgba(237, 237, 237, 0.06)', borderRadius: '6px', opacity: 0.7 }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="xs" c="#a1a1a6">It assumed the energy of oscillators was continuous.</Text>
                        <IconCircleCheck size={14} color="#85858b" style={{ flexShrink: 0 }} />
                    </Group>
                </Box>

                {/* Explanation Feedback */}
                <Box p="10px 12px" style={{ background: '#141415', borderRadius: '8px', border: '1px solid rgba(237, 237, 237, 0.08)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#4cc38a' }} />
                    <Text size="10px" fw={500} c="#4cc38a" mb={2}>
                        Conceptual explanation
                    </Text>
                    <Text size="xs" c="#a1a1a6" lh={1.5}>
                        Classical mechanics failed because it assumed <span style={{ color: '#ededed' }}>continuous</span> energy. Max Planck resolved the contradiction by establishing that energy is <span style={{ color: '#ededed' }}>quantized</span> ($E=h\nu$).
                    </Text>
                </Box>
            </Stack>
        </Box>
    );
}

// --- SUB-COMPONENT: LECTURE SCOUT ---
function ScoutMockup() {
    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '190px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Group justify="center" mb="sm" gap="xs">
                <IconSearch size={14} color="#85858b" />
                <Text size="xs" c="#85858b">
                    Lecture Scout verified
                </Text>
            </Group>

            <Stack gap={8}>
                {/* Rejected Long Video */}
                <Box p="10px 12px" style={{ backgroundColor: 'rgba(237, 237, 237, 0.02)', borderRadius: '6px', border: '1px solid rgba(237, 237, 237, 0.04)', opacity: 0.4 }}>
                    <Group wrap="nowrap" justify="space-between">
                        <Group wrap="nowrap" gap="xs">
                            <Box w={40} h={26} style={{ backgroundColor: '#232325', borderRadius: '4px' }} />
                            <Box>
                                <Text size="xs" c="#85858b" lh={1.2}>Coaching Livestream: Unit 3</Text>
                                <Text size="10px" c="#85858b">Unedited recording</Text>
                            </Box>
                        </Group>
                        <Badge size="xs" radius="sm" variant="outline" style={{ borderColor: 'rgba(229, 72, 77, 0.2)', color: '#e5484d' }}>
                            2h 40m
                        </Badge>
                    </Group>
                </Box>

                {/* Accepted Curated Video */}
                <Box
                    p="10px 12px"
                    style={{
                        backgroundColor: '#141415',
                        borderRadius: '8px',
                        border: '1px solid rgba(237, 237, 237, 0.08)',
                        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)'
                    }}
                >
                    <Group wrap="nowrap" justify="space-between">
                        <Group wrap="nowrap" gap="xs">
                            <Box w={40} h={26} style={{ backgroundColor: '#D97706', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconVideo size={14} color="#0f0f10" />
                            </Box>
                            <Box>
                                <Text size="xs" c="#ededed" fw={500} lh={1.2}>MIT 8.01: Work &amp; Energy</Text>
                                <Text size="10px" c="#a1a1a6">High-yield conceptual breakdown</Text>
                            </Box>
                        </Group>
                        <Badge size="xs" radius="sm" variant="filled" style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                            14m
                        </Badge>
                    </Group>
                </Box>
            </Stack>
        </Box>
    );
}

export function TheEngineRoom() {
    return (
        <Box
            py={{ base: 64, md: 96 }}
            style={{
                position: 'relative',
                backgroundColor: 'transparent'
            }}
        >
            <Container size="xl">
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="sm" mb={48}>
                    <Badge
                        variant="outline"
                        size="sm"
                        radius="sm"
                        style={{
                            borderColor: 'rgba(237, 237, 237, 0.08)',
                            color: '#a1a1a6',
                            backgroundColor: 'rgba(237, 237, 237, 0.02)'
                        }}
                    >
                        What KalPad does
                    </Badge>
                    <Title
                        order={2}
                        style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            color: '#ededed',
                            letterSpacing: '-0.02em',
                            maxWidth: '720px'
                        }}
                    >
                        Syllabus triage that adapts to your time
                    </Title>
                    <Text size="sm" c="#a1a1a6" maw={620} lh={1.6}>
                        KalPad analyzes topic weightage, prerequisites, and remaining exam days to keep your study plan realistic without panic.
                    </Text>
                </Stack>

                {/* --- THE BENTO GRID --- */}
                <Grid gutter={20}>
                    {/* BENTO 1: THE STRATEGIST (Takes 8 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 8 }}>
                        <Box
                            p={{ base: 'md', md: 'xl' }}
                            style={{
                                height: '100%',
                                backgroundColor: '#19191b',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px'
                            }}
                        >
                            <Grid gutter="lg" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, md: 5 }}>
                                    <Stack h="100%" justify="center" gap="md">
                                        <Group gap="xs">
                                            <IconTargetArrow size={18} color="#D97706" />
                                            <Text size="xs" fw={500} c="#D97706">
                                                Interactive Triage Engine
                                            </Text>
                                        </Group>
                                        <Title
                                            order={3}
                                            c="#ededed"
                                            style={{
                                                fontFamily: 'var(--font-inter)',
                                                fontSize: '1.4rem',
                                                fontWeight: 500,
                                                letterSpacing: '-0.02em',
                                                lineHeight: 1.25
                                            }}
                                        >
                                            Smart Plan Builder
                                        </Title>
                                        <Text c="#a1a1a6" size="sm" lh={1.6}>
                                            When exam hours are constrained, KalPad does not compress an impossible schedule. It prioritizes high-yield core chapters first and triages lower-priority topics so you walk into the exam with solid coverage.
                                        </Text>
                                    </Stack>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 7 }}>
                                    <Box
                                        style={{
                                            backgroundColor: '#141415',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            border: '1px solid rgba(237, 237, 237, 0.08)',
                                            height: '100%'
                                        }}
                                    >
                                        <TriageSimulator />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </Box>
                    </Grid.Col>

                    {/* BENTO 2: THE ILLUSTRATOR (Takes 4 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 4 }}>
                        <Box
                            p="xl"
                            style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                backgroundColor: '#19191b',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px'
                            }}
                        >
                            <Box style={{ flex: 1, marginBottom: '16px' }}>
                                <IllustratorMockup />
                            </Box>
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <IconChartLine size={16} color="#85858b" />
                                    <Text fw={500} c="#ededed" size="sm">
                                        Clear notes &amp; diagrams
                                    </Text>
                                </Group>
                                <Text size="xs" c="#a1a1a6" lh={1.5}>
                                    KalPad generates structured revision sheets and clean formula diagrams so hard concepts become intuitive.
                                </Text>
                            </Stack>
                        </Box>
                    </Grid.Col>

                    {/* BENTO 3: THE SCOUT (Takes 6 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Box
                            p="xl"
                            style={{
                                height: '100%',
                                backgroundColor: '#19191b',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px'
                            }}
                        >
                            <Grid gutter="lg" align="center" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Stack gap="xs">
                                        <Group gap="xs">
                                            <IconVideo size={16} color="#85858b" />
                                            <Title order={4} c="#ededed" fw={500} size="sm">
                                                The Lecture Scout
                                            </Title>
                                        </Group>
                                        <Text size="xs" c="#a1a1a6" lh={1.6}>
                                            KalPad scans lecture transcripts and course channels to find concise 10–15 minute topic breakdowns instead of unedited multi-hour streams.
                                        </Text>
                                    </Stack>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Box style={{ backgroundColor: '#141415', borderRadius: '10px', padding: '14px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                                        <ScoutMockup />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </Box>
                    </Grid.Col>

                    {/* BENTO 4: ACTIVE RECALL (Takes 6 columns on desktop) */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Box
                            p="xl"
                            style={{
                                height: '100%',
                                backgroundColor: '#19191b',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px'
                            }}
                        >
                            <Grid gutter="lg" align="center" style={{ height: '100%' }}>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Stack gap="xs">
                                        <Group gap="xs">
                                            <IconBrain size={16} color="#85858b" />
                                            <Title order={4} c="#ededed" fw={500} size="sm">
                                                Active Recall Practice
                                            </Title>
                                        </Group>
                                        <Text size="xs" c="#a1a1a6" lh={1.6}>
                                            When you miss an active recall question, KalPad explains why the wrong intuition failed and automatically schedules a spaced repetition review.
                                        </Text>
                                    </Stack>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                    <Box style={{ backgroundColor: '#141415', borderRadius: '10px', padding: '14px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                                        <QuizMockup />
                                    </Box>
                                </Grid.Col>
                            </Grid>
                        </Box>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
}
