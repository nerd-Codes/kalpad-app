// src/components/landing/personality/ThePledge.jsx
"use client";

import { Container, Title, Text, Box, Group, Stack, Badge, SimpleGrid, Divider } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCheck, IconArrowRight, IconServer } from '@tabler/icons-react';
import Link from 'next/link';

// --- DATA: THE FREE TOOLKIT ---
const FREE_ARSENAL = [
    { label: "Smart syllabus timetable", value: "Included" },
    { label: "High-yield topic prioritization", value: "Included" },
    { label: "Distilled chapter study notes", value: "Daily credits" },
    { label: "Active recall quiz diagnostics", value: "Daily credits" },
    { label: "Curated topic lecture scout", value: "Included" },
    { label: "Mobile timetable access", value: "Included" },
];

export function ThePledge() {
    return (
        <Box 
            py={{ base: 64, md: 96 }} 
            style={{ 
                position: 'relative', 
                backgroundColor: 'transparent', 
                borderTop: '1px solid rgba(237, 237, 237, 0.08)' 
            }}
        >
            <Container size="xl">
                
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
                        Student pledge
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
                            maxWidth: '780px'
                        }}
                    >
                        No fake productivity streaks. No generic advice. Just an honest plan to cover your syllabus.
                    </Title>
                    <Text 
                        size="md" 
                        c="#a1a1a6" 
                        maw={620} 
                        lh={1.6}
                    >
                        KalPad provides full syllabus study planning for every student, free to start with zero barriers.
                    </Text>
                </Stack>

                {/* --- THE MANIFESTO CARD --- */}
                <Box maw={860} mx="auto" mb={{ base: 48, md: 64 }}>
                    <Box 
                        p={{ base: 24, md: 48 }}
                        style={{ 
                            backgroundColor: '#19191b',
                            border: '1px solid rgba(237, 237, 237, 0.08)',
                            borderRadius: '12px',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                            position: 'relative'
                        }}
                    >
                        <Stack gap="xl">
                            {/* The Core Message */}
                            <Text 
                                size="lg" 
                                c="#ededed" 
                                lh={1.6} 
                                fw={400} 
                                ta="center" 
                                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                            >
                                We don't gatekeep good study tools. The free tier gives you a complete syllabus planning engine.
                            </Text>

                            <Divider color="rgba(237, 237, 237, 0.08)" label="What you get" labelPosition="center" />

                            {/* The Spec Sheet */}
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {FREE_ARSENAL.map((item, i) => (
                                    <Group 
                                        key={i} 
                                        justify="space-between" 
                                        style={{ 
                                            padding: '10px 0', 
                                            borderBottom: '1px solid rgba(237, 237, 237, 0.06)' 
                                        }}
                                    >
                                        <Group gap="xs">
                                            <IconCheck size={16} color="#4cc38a" stroke={1.5} />
                                            <Text size="sm" c="#ededed">{item.label}</Text>
                                        </Group>
                                        <Badge 
                                            size="xs" 
                                            radius="sm" 
                                            variant="filled" 
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                                                color: '#a1a1a6',
                                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                                fontWeight: 500
                                            }}
                                        >
                                            {item.value}
                                        </Badge>
                                    </Group>
                                ))}
                            </SimpleGrid>

                            {/* The Transparency Footnote */}
                            <Box 
                                p="md" 
                                style={{ 
                                    backgroundColor: '#232325', 
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(237, 237, 237, 0.08)' 
                                }}
                            >
                                <Group align="flex-start" wrap="nowrap" gap="sm">
                                    <IconServer size={16} color="#85858b" style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <Stack gap={4}>
                                        <Text size="xs" fw={500} c="#ededed">Transparency note</Text>
                                        <Text size="xs" c="#a1a1a6" lh={1.5}>
                                            We only charge for unlimited plans because high-volume AI generation requires GPU infrastructure.
                                            The free daily credits are generous enough to thoroughly test and build your full syllabus schedule.
                                        </Text>
                                    </Stack>
                                </Group>
                            </Box>

                            {/* The Cost */}
                            <Group justify="center" gap="xl" mt="xs">
                                <Stack gap={2} align="center">
                                    <Text size="xs" c="#85858b" fw={500}>Financial cost</Text>
                                    <Text 
                                        size="1.75rem" 
                                        fw={500} 
                                        c="#ededed" 
                                        style={{ 
                                            fontFamily: 'var(--font-lexend), monospace', 
                                            lineHeight: 1, 
                                            fontVariantNumeric: 'tabular-nums' 
                                        }}
                                    >
                                        Rs 0
                                    </Text>
                                </Stack>
                                <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(237, 237, 237, 0.08)' }} />
                                <Stack gap={2} align="center">
                                    <Text size="xs" c="#85858b" fw={500}>Student investment</Text>
                                    <Text 
                                        size="1.75rem" 
                                        fw={500} 
                                        c="#4cc38a" 
                                        style={{ 
                                            fontFamily: 'var(--font-lexend), monospace', 
                                            lineHeight: 1 
                                        }}
                                    >
                                        Focus
                                    </Text>
                                </Stack>
                            </Group>

                        </Stack>
                    </Box>
                </Box>

                {/* --- FINAL EXIT: ZERO FRICTION LAUNCH --- */}
                <Box style={{ textAlign: 'center' }}>
                    <Stack align="center" gap="md">
                        <Title 
                            order={2} 
                            style={{ 
                                fontFamily: 'var(--font-inter), sans-serif', 
                                fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
                                fontWeight: 500,
                                color: '#ededed'
                            }}
                        >
                            Start studying with an honest plan
                        </Title>
                        
                        <Link href="/guest-plan" style={{ textDecoration: 'none' }}>
                            <motion.button
                                whileHover={{ backgroundColor: '#B45309' }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    backgroundColor: '#D97706',
                                    color: '#0f0f10',
                                    border: 'none',
                                    borderRadius: '8px',
                                    height: '48px',
                                    padding: '0 24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    boxShadow: 'none',
                                    outline: 'none'
                                }}
                            >
                                <span>Try guest mode · No signup required, ready in 10 seconds</span>
                                <IconArrowRight size={16} stroke={2} />
                            </motion.button>
                        </Link>

                        <Text size="xs" c="#85858b">
                            No credit card required. Generate your first syllabus schedule in 10 seconds.
                        </Text>
                    </Stack>
                </Box>

            </Container>
        </Box>
    );
}
