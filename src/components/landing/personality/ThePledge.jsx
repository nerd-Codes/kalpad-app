"use client";

import { Container, Title, Text, SimpleGrid, Stack, Box, Group, Badge, ThemeIcon, List } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCurrencyDollarOff, IconLockOpen, IconCheck, IconTrophy, IconInfinity, IconBrain } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 

// --- VISUAL CONSTANTS ---
const NEON_GREEN = '#34C759';
const ACCENT_GOLD = '#FFD700';

export function ThePledge() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                
                <Stack align="center" ta="center" gap="md" mb={80}>
                    <Badge 
                        variant="outline" color="green" size="lg" radius="sm"
                        style={{ borderColor: 'rgba(52, 199, 89, 0.4)', color: NEON_GREEN, letterSpacing: '0.1em' }}
                    >
                        DEMOCRATIZING SUCCESS
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                            color: 'white'
                        }}
                    >
                        Your bank account doesn't <br/> take the exam. <span className="apple-text-gradient">You do.</span>
                    </Title>
                </Stack>

                <GlassCard 
                    p={{ base: 'xl', md: 60 }}
                    style={{ 
                        background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(52, 199, 89, 0.05) 100%)',
                        border: '1px solid rgba(52, 199, 89, 0.2)',
                        boxShadow: '0 0 80px -20px rgba(52, 199, 89, 0.1)'
                    }}
                >
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} verticalSpacing={40}>
                        
                        {/* LEFT: THE PHILOSOPHY */}
                        <Stack justify="center" gap="xl">
                            <Box>
                                <Text size="xl" fw={600} c="white" mb="sm">
                                    We don't gatekeep grades.
                                </Text>
                                <Text size="lg" c="dimmed" lh={1.6}>
                                    Most tools lock the "good stuff" behind a credit card. We don't. 
                                    The Free Tier isn't a trial. It is a complete weapon.
                                </Text>
                            </Box>

                            <Box p="lg" style={{ borderLeft: `3px solid ${NEON_GREEN}`, background: 'rgba(255,255,255,0.03)' }}>
                                <Text size="md" c="white" style={{ fontFamily: 'var(--font-lexend)' }}>
                                    "If you have the discipline to finish one mission before starting the next, you will never pay us a cent. And you will still ace the exam."
                                </Text>
                            </Box>

                            <Group gap="xs" style={{ opacity: 0.8 }}>
                                <IconCurrencyDollarOff size={20} color={NEON_GREEN} />
                                <Text size="sm" c="green.4" fw={700} tt="uppercase">No Credit Card Required</Text>
                            </Group>
                        </Stack>

                        {/* RIGHT: THE SPECS (Comparison) */}
                        <Stack gap="md">
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                FREE TIER CAPABILITIES
                            </Text>

                            {/* Spec 1 */}
                            <Box p="md" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <ThemeIcon color="green" variant="light" radius="xl"><IconCheck size={14}/></ThemeIcon>
                                        <Text size="sm" fw={600} c="white">The Strategist Plan</Text>
                                    </Group>
                                    <Badge color="gray" variant="outline">1 Active Slot</Badge>
                                </Group>
                            </Box>

                            {/* Spec 2 */}
                            <Box p="md" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <ThemeIcon color="green" variant="light" radius="xl"><IconBrain size={14}/></ThemeIcon>
                                        <Text size="sm" fw={600} c="white">Full Intelligence</Text>
                                    </Group>
                                    <Badge color="green" variant="light">UNLOCKED</Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mt="xs" ml={38}>
                                    Includes AI Notes, Golden Questions, and Hidden Prerequisite Analysis.
                                </Text>
                            </Box>

                            {/* Spec 3 */}
                            <Box p="md" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <ThemeIcon color="green" variant="light" radius="xl"><IconTrophy size={14}/></ThemeIcon>
                                        <Text size="sm" fw={600} c="white">Exam Success</Text>
                                    </Group>
                                    <Badge color="green" variant="light">100% POSSIBLE</Badge>
                                </Group>
                            </Box>

                            {/* The "Cost" */}
                            <Group justify="space-between" px="xs">
                                <Text size="sm" c="dimmed">Real Cost</Text>
                                <Text size="lg" fw={800} c="brandGreen" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Discipline</Text>
                            </Group>

                        </Stack>

                    </SimpleGrid>
                </GlassCard>
            </Container>
        </Box>
    );
}