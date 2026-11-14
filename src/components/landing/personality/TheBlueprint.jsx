// src/components/landing/personality/TheBlueprint.jsx
"use client";

import { Container, Title, Text, Box, Stack, Badge, Group, ThemeIcon, SimpleGrid, RingProgress } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconGitBranch, IconTarget, IconRefresh, IconArrowDown, IconCheck } from '@tabler/icons-react';

const FEATURES = [
    {
        id: "01",
        title: "Prerequisite Check",
        subtitle: "Foundation and prerequisite ordering",
        icon: IconGitBranch,
        desc: "Advanced chapters only make sense after core fundamentals are secured.",
        detail: "KalPad maps your syllabus dependency tree and schedules foundation topics first so you never encounter conceptual roadblocks during late-night revision.",
        visual: (
            <Box p="md" style={{ backgroundColor: '#232325', borderRadius: '8px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                <Group justify="space-between" mb="xs">
                    <Badge variant="filled" size="xs" radius="sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#a1a1a6', fontWeight: 500 }}>
                        Study order
                    </Badge>
                    <IconGitBranch size={14} color="#85858b" />
                </Group>
                <Stack gap="xs" align="center">
                    <Box style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(237, 237, 237, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)', width: '100%', textAlign: 'center' }}>
                        <Text size="11px" c="#85858b">Target module: Advanced Differential Equations</Text>
                    </Box>
                    <IconArrowDown size={14} color="#85858b" />
                    <Box style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.3)', backgroundColor: 'rgba(217, 119, 6, 0.08)', width: '100%', textAlign: 'center' }}>
                        <Text size="11px" c="#D97706" fw={500}>Required foundation: Limits, Continuity & Series</Text>
                    </Box>
                </Stack>
            </Box>
        )
    },
    {
        id: "02",
        title: "Important Question Practice",
        subtitle: "Practice repeated exam questions",
        icon: IconTarget,
        desc: "Every exam follows recurring question patterns. High-yield problems shouldn't be a mystery.",
        detail: "KalPad analyzes past year papers to flag high-yield questions with verified repetition history, integrating targeted problem-solving into your daily schedule.",
        visual: (
            <Box p="md" style={{ backgroundColor: '#232325', borderRadius: '8px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                <Group justify="space-between" mb="xs">
                    <Badge size="xs" radius="sm" style={{ backgroundColor: 'rgba(217, 119, 6, 0.14)', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.25)', fontWeight: 500 }}>
                        High yield
                    </Badge>
                    <IconTarget size={14} color="#D97706" />
                </Group>
                <Text size="12px" c="#ededed" lh={1.4} fw={400} mb="xs">
                    "Derive the expression for electric field on the equatorial line of an electric dipole."
                </Text>
                <Group gap="xs" mt="xs">
                    <Badge variant="outline" size="xs" radius="sm" style={{ borderColor: 'rgba(237, 237, 237, 0.1)', color: '#a1a1a6', fontFamily: 'var(--font-lexend), monospace', fontVariantNumeric: 'tabular-nums' }}>
                        2018
                    </Badge>
                    <Badge variant="outline" size="xs" radius="sm" style={{ borderColor: 'rgba(237, 237, 237, 0.1)', color: '#a1a1a6', fontFamily: 'var(--font-lexend), monospace', fontVariantNumeric: 'tabular-nums' }}>
                        2020
                    </Badge>
                    <Badge variant="outline" size="xs" radius="sm" style={{ borderColor: 'rgba(237, 237, 237, 0.1)', color: '#a1a1a6', fontFamily: 'var(--font-lexend), monospace', fontVariantNumeric: 'tabular-nums' }}>
                        2022
                    </Badge>
                    <Badge variant="outline" size="xs" radius="sm" style={{ borderColor: 'rgba(217, 119, 6, 0.3)', color: '#D97706', fontFamily: 'var(--font-lexend), monospace', fontVariantNumeric: 'tabular-nums' }}>
                        2024
                    </Badge>
                </Group>
            </Box>
        )
    },
    {
        id: "03",
        title: "Weak Topics Tracker",
        subtitle: "Active recall and diagnostic reviews",
        icon: IconRefresh,
        desc: "A rigid calendar doesn't know where you struggled yesterday. KalPad adapts dynamically.",
        detail: "When active recall quizzes detect low retention on a chapter, KalPad schedules focused diagnostic revision sessions until your recall confidence is verified.",
        visual: (
            <Box p="md" style={{ backgroundColor: '#232325', borderRadius: '8px', border: '1px solid rgba(237, 237, 237, 0.08)' }}>
                <Group justify="space-between" align="center">
                    <Stack gap={2}>
                        <Text size="11px" c="#85858b" fw={500}>Retention score</Text>
                        <Text size="lg" c="#ededed" fw={500} style={{ fontFamily: 'var(--font-lexend), monospace', fontVariantNumeric: 'tabular-nums' }}>
                            64%
                        </Text>
                    </Stack>
                    <RingProgress 
                        size={48} 
                        thickness={4} 
                        roundCaps
                        sections={[{ value: 64, color: '#D97706' }]}
                        label={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconRefresh size={14} color="#85858b" />
                            </div>
                        }
                    />
                </Group>
                <Text size="11px" c="#a1a1a6" mt="xs" lh={1.4}>
                    +2 revision sessions scheduled for Wave Optics
                </Text>
            </Box>
        )
    }
];

export function TheBlueprint() {
    return (
        <Box py={{ base: 64, md: 96 }} style={{ position: 'relative', backgroundColor: 'transparent' }}>
            <Container size="lg">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={{ base: 48, md: 64 }}>
                    <Badge 
                        variant="filled" 
                        size="md" 
                        radius="sm"
                        style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                            border: '1px solid rgba(237, 237, 237, 0.08)',
                            color: '#a1a1a6',
                            fontWeight: 500
                        }}
                    >
                        Study blueprint
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-inter), sans-serif', 
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', 
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                            fontWeight: 500,
                            color: '#ededed',
                            maxWidth: '720px'
                        }}
                    >
                        A methodical way to study when time is short
                    </Title>
                    <Text 
                        size="md" 
                        c="#a1a1a6" 
                        maw={620} 
                        lh={1.6}
                    >
                        Three targeted capabilities designed to maximize retention and exam confidence before test day.
                    </Text>
                </Stack>

                {/* --- THE FEATURE STACK --- */}
                <Box style={{ position: 'relative' }}>
                    <Stack gap={{ base: 32, md: 40 }}>
                        {FEATURES.map((feat, index) => (
                            <Box 
                                key={feat.id} 
                                p={{ base: 20, md: 28 }}
                                style={{ 
                                    backgroundColor: '#19191b',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(237, 237, 237, 0.08)',
                                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                                }}
                            >
                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 40 }} style={{ alignItems: 'center' }}>
                                    
                                    {/* CONTENT SIDE */}
                                    <Box style={{ order: index % 2 === 0 ? 1 : 2 }}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            <Group gap="xs" mb="xs">
                                                <ThemeIcon 
                                                    variant="light" 
                                                    size={32} 
                                                    radius="sm" 
                                                    style={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                                                        color: '#a1a1a6',
                                                        border: '1px solid rgba(237, 237, 237, 0.08)'
                                                    }}
                                                >
                                                    <feat.icon size={16} stroke={1.5} />
                                                </ThemeIcon>
                                                <Text size="xs" fw={500} c="#85858b">
                                                    {feat.subtitle}
                                                </Text>
                                            </Group>
                                            <Title order={3} c="#ededed" mb="xs" style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3 }}>
                                                {feat.title}
                                            </Title>
                                            <Text size="sm" c="#ededed" lh={1.5} mb="sm" fw={400}>
                                                {feat.desc}
                                            </Text>
                                            <Text size="xs" c="#a1a1a6" lh={1.6}>
                                                {feat.detail}
                                            </Text>
                                        </motion.div>
                                    </Box>

                                    {/* VISUAL SIDE */}
                                    <Box style={{ order: index % 2 === 0 ? 2 : 1 }}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            {feat.visual}
                                        </motion.div>
                                    </Box>

                                </SimpleGrid>
                            </Box>
                        ))}
                    </Stack>
                </Box>

            </Container>
        </Box>
    );
}
