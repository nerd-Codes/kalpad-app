// src/components/landing/personality/TheGodMode.jsx
"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, Box, Group, Stack, Badge, Grid } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconRotateClockwise, IconAlertCircle, IconCheck, IconActivityHeartbeat, IconCalendar } from '@tabler/icons-react';

// --- SUB-COMPONENT: ANIMATED RECOVERY ENGINE SIMULATOR ---
function RecoveryEngineMockup() {
    const [phase, setPhase] = useState(0); // 0: Missed Debt, 1: Recalculating, 2: Restructured Realistic Pace

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase((p) => (p + 1) % 3);
        }, 4000); // 4 seconds per phase for calm legibility
        return () => clearInterval(interval);
    }, []);

    return (
        <Box style={{ position: 'relative', height: '100%', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
                {/* PHASE 0: MISSED SESSION (STUDY DEBT DETECTED) */}
                {phase === 0 && (
                    <motion.div
                        key="phase0"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Stack gap="xs">
                            <Group justify="space-between" align="center">
                                <Text size="xs" fw={500} c="#85858b">
                                    Yesterday: missed study session
                                </Text>
                                <Badge
                                    size="xs"
                                    radius="sm"
                                    variant="outline"
                                    style={{
                                        borderColor: 'rgba(229, 72, 77, 0.3)',
                                        color: '#e5484d',
                                        backgroundColor: 'rgba(229, 72, 77, 0.08)'
                                    }}
                                >
                                    3h study debt
                                </Badge>
                            </Group>

                            <Box
                                p="md"
                                style={{
                                    backgroundColor: '#19191b',
                                    border: '1px solid rgba(229, 72, 77, 0.25)',
                                    borderRadius: '10px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#e5484d' }} />

                                <Group justify="space-between" mb="xs">
                                    <Text size="sm" c="#ededed" fw={500}>
                                        Day 14: Electromagnetism &amp; Field Theory
                                    </Text>
                                    <Badge size="xs" radius="sm" variant="filled" style={{ backgroundColor: 'rgba(229, 72, 77, 0.15)', color: '#e5484d' }}>
                                        0/4 tasks complete
                                    </Badge>
                                </Group>
                                <Text size="xs" c="#a1a1a6" mb="md" lh={1.5}>
                                    Missed 3 hours yesterday. KalPad automatically recalibrates your pace across remaining days without piling on guilt.
                                </Text>

                                <Box
                                    p="sm"
                                    style={{
                                        backgroundColor: 'rgba(237, 237, 237, 0.03)',
                                        border: '1px solid rgba(237, 237, 237, 0.08)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="xs" wrap="nowrap">
                                            <IconAlertCircle size={15} color="#e5484d" style={{ flexShrink: 0 }} />
                                            <Text size="xs" fw={500} c="#ededed">
                                                Study debt detected: 3.0h
                                            </Text>
                                        </Group>
                                        <Badge
                                            variant="outline"
                                            size="xs"
                                            radius="sm"
                                            style={{
                                                borderColor: 'rgba(237, 237, 237, 0.15)',
                                                color: '#ededed',
                                                backgroundColor: '#232325'
                                            }}
                                        >
                                            Rebalance pace
                                        </Badge>
                                    </Group>
                                </Box>
                            </Box>
                        </Stack>
                    </motion.div>
                )}

                {/* PHASE 1: RECALCULATING PACE ACROSS REMAINING DAYS */}
                {phase === 1 && (
                    <motion.div
                        key="phase1"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Box
                            p="xl"
                            style={{
                                backgroundColor: '#19191b',
                                border: '1px solid rgba(237, 237, 237, 0.08)',
                                borderRadius: '10px',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                textAlign: 'center'
                            }}
                        >
                            <Box style={{ display: 'inline-flex', padding: '10px', borderRadius: '8px', backgroundColor: '#232325', marginBottom: '12px' }}>
                                <IconRotateClockwise size={20} color="#D97706" />
                            </Box>

                            <Title order={4} c="#ededed" fw={500} size="sm" mb="xs">
                                Recalculating daily schedule
                            </Title>

                            <Stack gap={6} align="center">
                                <Text size="xs" c="#85858b" style={{ fontFamily: 'var(--font-lexend), monospace' }} className="tabular-nums">
                                    Analyzing study debt: 3.0h
                                </Text>
                                <Text size="xs" c="#a1a1a6">
                                    Evaluating 12 remaining days before exam
                                </Text>
                                <Box
                                    px="sm"
                                    py={4}
                                    style={{
                                        backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                        border: '1px solid rgba(217, 119, 6, 0.2)',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <Text size="xs" c="#D97706" fw={500} className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                                        Missed 3 hours yesterday → redistributed +25 min/day over next 7 days → exam target maintained
                                    </Text>
                                </Box>
                                <Text size="xs" c="#85858b">
                                    Rebuilding daily quotas without schedule collapse
                                </Text>
                            </Stack>
                        </Box>
                    </motion.div>
                )}

                {/* PHASE 2: RESTORED REALISTIC PACE */}
                {phase === 2 && (
                    <motion.div
                        key="phase2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Stack gap="xs">
                            <Group justify="space-between" align="center">
                                <Text size="xs" fw={500} c="#4cc38a">
                                    Plan updated: realistic pace restored
                                </Text>
                                <Badge
                                    size="xs"
                                    radius="sm"
                                    variant="outline"
                                    style={{
                                        borderColor: 'rgba(76, 195, 138, 0.3)',
                                        color: '#4cc38a',
                                        backgroundColor: 'rgba(76, 195, 138, 0.08)'
                                    }}
                                    leftSection={<IconCheck size={12} />}
                                >
                                    Target maintained
                                </Badge>
                            </Group>

                            {/* Split Today's Load */}
                            <Box
                                p="sm"
                                style={{
                                    backgroundColor: '#19191b',
                                    border: '1px solid rgba(76, 195, 138, 0.25)',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#4cc38a' }} />
                                <Group justify="space-between" mb={2}>
                                    <Text size="xs" fw={500} c="#ededed">
                                        Today: Electromagnetism (Part 1)
                                    </Text>
                                    <Text size="xs" c="#85858b" className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                                        2.5h quota
                                    </Text>
                                </Group>
                                <Text size="xs" c="#a1a1a6">
                                    Biot-Savart Law &amp; Magnetic Flux. Study debt split across the week so today stays manageable.
                                </Text>
                            </Box>

                            {/* Quiet connector */}
                            <Box style={{ display: 'flex', justifyContent: 'center', opacity: 0.5, margin: '-2px 0' }}>
                                <IconRotateClockwise size={14} color="#85858b" />
                            </Box>

                            {/* Tomorrow's Load */}
                            <Box
                                p="sm"
                                style={{
                                    backgroundColor: '#19191b',
                                    border: '1px solid rgba(237, 237, 237, 0.08)',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: 'rgba(237, 237, 237, 0.2)' }} />
                                <Group justify="space-between" mb={2}>
                                    <Text size="xs" fw={500} c="#a1a1a6">
                                        Tomorrow: Electromagnetism (Part 2)
                                    </Text>
                                    <Text size="xs" c="#85858b" className="tabular-nums" style={{ fontFamily: 'var(--font-lexend), monospace' }}>
                                        2.5h quota
                                    </Text>
                                </Group>
                                <Text size="xs" c="#85858b">
                                    Ampere&apos;s Law &amp; Solenoid practice problems. +25 min redistribution applied smoothly.
                                </Text>
                            </Box>
                        </Stack>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}

export function TheGodMode() {
    return (
        <Box
            py={{ base: 64, md: 96 }}
            style={{
                position: 'relative',
                backgroundColor: 'transparent'
            }}
        >
            <Container size="xl">
                <Grid gutter={{ base: 40, lg: 60 }} align="center">
                    {/* --- LEFT: EDITORIAL COPY --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Stack gap="md">
                            <Group gap="xs">
                                <Badge
                                    variant="outline"
                                    size="sm"
                                    radius="sm"
                                    style={{
                                        borderColor: 'rgba(237, 237, 237, 0.08)',
                                        color: '#a1a1a6',
                                        backgroundColor: 'rgba(237, 237, 237, 0.02)'
                                    }}
                                    leftSection={<IconRotateClockwise size={12} color="#D97706" />}
                                >
                                    When you fall behind
                                </Badge>
                            </Group>

                            <Title
                                order={2}
                                style={{
                                    fontFamily: 'var(--font-inter)',
                                    fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
                                    fontWeight: 500,
                                    lineHeight: 1.2,
                                    color: '#ededed',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                Fall behind? KalPad rebuilds your schedule without guilt
                            </Title>

                            <Text size="sm" c="#a1a1a6" lh={1.7}>
                                Traditional timetables break down the moment an unexpected event or illness derails a single afternoon. When you fall behind, KalPad automatically recalculates your remaining workload and spreads the study debt across the remaining calendar days realistically.
                            </Text>

                            {/* Coded recovery callout card */}
                            <Box
                                p="md"
                                style={{
                                    backgroundColor: '#19191b',
                                    border: '1px solid rgba(237, 237, 237, 0.08)',
                                    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
                                    borderRadius: '10px'
                                }}
                            >
                                <Group gap="xs" mb="xs">
                                    <IconActivityHeartbeat size={16} color="#D97706" />
                                    <Text size="xs" fw={500} c="#ededed">
                                        Pace Recovery Engine
                                    </Text>
                                </Group>
                                <Text size="xs" c="#a1a1a6" lh={1.6}>
                                    Missed 3 hours yesterday → redistributed +25 min/day over next 7 days → exam target maintained.
                                </Text>
                                <Text size="xs" c="#85858b" mt={4}>
                                    No cramming impossible 14-hour days. Just an updated, achievable plan that keeps your target intact without guilt.
                                </Text>
                            </Box>
                        </Stack>
                    </Grid.Col>

                    {/* --- RIGHT: THE CINEMATIC MOCKUP --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
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
                            <RecoveryEngineMockup />
                        </Box>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
}
