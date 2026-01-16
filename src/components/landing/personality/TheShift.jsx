"use client";

import { Container, Title, Text, SimpleGrid, Stack, Box, Group, Badge, ThemeIcon, Button } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconMessageChatbot, IconCards, IconFileText, IconBrain, IconArrowRight, IconBolt, IconInfinity, IconBrandAndroid, IconDeviceMobile } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 
import { Interactive } from '@/components/Interactive';

// --- VISUAL CONSTANTS ---
const NEON_PURPLE = '#BF5AF2';
const CHAOS_RED = '#FF3B30';

// --- COMPONENT: THE GRAVEYARD (The Old Way) ---
function FragmentedTools() {
    const tools = [
        { icon: IconMessageChatbot, label: "Dumb Chatbots", desc: "No Context. Hallucinates.", delay: 0 },
        { icon: IconCards, label: "Manual Flashcards", desc: "Data Entry is not studying.", delay: 1 },
        { icon: IconFileText, label: "Static PDFs", desc: "Dead text. Zero interactivity.", delay: 2 },
        { icon: IconBrain, label: "Random Quizzes", desc: "Irrelevant trivia.", delay: 3 },
    ];

    return (
        <SimpleGrid cols={2} spacing="md">
            {tools.map((tool, i) => (
                <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0.4, 0.8, 0.4],
                        x: [0, 2, -2, 0] // Subtle "Glitch" shake
                    }}
                    transition={{ 
                        duration: 3 + i, 
                        repeat: Infinity, 
                        ease: "linear" 
                    }}
                >
                    <GlassCard p="md" style={{ border: '1px solid rgba(255, 59, 48, 0.2)', background: 'rgba(255, 59, 48, 0.05)' }}>
                        <Stack gap="xs" align="center" ta="center">
                            <IconBolt size={20} color={CHAOS_RED} style={{ opacity: 0.5 }} />
                            <Text size="xs" fw={700} c="red.3" tt="uppercase">{tool.label}</Text>
                            <Text size="10px" c="dimmed" lh={1.2}>{tool.desc}</Text>
                        </Stack>
                    </GlassCard>
                </motion.div>
            ))}
        </SimpleGrid>
    );
}

// --- COMPONENT: THE MONOLITH (The KalPad Way) ---
function UnifiedCore() {
    return (
        <motion.div
            initial={{ scale: 0.95 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            style={{ height: '100%' }}
        >
            <GlassCard 
                p="xl" 
                h="100%"
                style={{ 
                    // Massive, thick glass aesthetic
                    background: 'rgba(20, 20, 25, 0.8)',
                    border: `1px solid ${NEON_PURPLE}`,
                    boxShadow: `0 0 60px -20px ${NEON_PURPLE}40`,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden'
                }}
            >
                {/* Background Reactor Core */}
                <div style={{ position: 'absolute', top: '-50%', right: '-50%', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(191,90,242,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

                <Stack gap="xl" style={{ position: 'relative', zIndex: 10 }}>
                    <Group justify="space-between" align="start">
                        <Badge variant="gradient" gradient={{ from: '#BF5AF2', to: '#5E5CE6' }} size="xl" radius="sm">
                            THE SINGULARITY
                        </Badge>
                        <IconInfinity size={40} color="white" />
                    </Group>

                    <Box>
                        <Title order={3} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '2.5rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                            One Brain. <br/>
                            <span className="apple-text-gradient">Infinite Memory.</span>
                        </Title>
                    </Box>

                    <Stack gap="sm">
                        <Text size="lg" c="gray.3">
                            Stop stitching your degree together. We unified the Strategist, the Professor, and the Examines into one OS.
                        </Text>
                        
                        {/* THE BOLD CALLOUT */}
                        <Box mt="md" p="md" style={{ border: '1px solid rgba(52, 199, 89, 0.3)', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.05)' }}>
                            <Group>
                                <ThemeIcon color="green" variant="light" size="lg" radius="md"><IconBrandAndroid size={20}/></ThemeIcon>
                                <Box>
                                    <Text size="xs" c="green.4" fw={700} tt="uppercase">SYSTEM UPDATE</Text>
                                    <Text size="sm" c="white" fw={600}>Native Android App is LIVE.</Text>
                                </Box>
                            </Group>
                        </Box>
                    </Stack>
                </Stack>
            </GlassCard>
        </motion.div>
    );
}

export function TheShift() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                <Stack align="center" ta="center" gap="md" mb={80}>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(3rem, 6vw, 4.5rem)', // BIGGER
                            letterSpacing: '-0.04em',
                            color: 'white',
                            lineHeight: 1
                        }}
                    >
                        Delete your <br/>
                        <span style={{ color: '#FF3B30' }}>other apps.</span>
                    </Title>
                    <Text c="dimmed" size="xl" maw={600}>
                        The era of switching between 5 different "dumb" tools is over.
                    </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} verticalSpacing={60} style={{ alignItems: 'center' }}>
                    
                    {/* LEFT: THE PROBLEM */}
                    <Box style={{ position: 'relative' }}>
                        <Text size="xs" fw={700} c="red.4" tt="uppercase" ta="center" mb="lg" style={{ letterSpacing: '0.2em' }}>
                            // THE CURRENT MESS
                        </Text>
                        <FragmentedTools />
                        
                        {/* VS BADGE (Absolute Center) */}
                        <Box 
                            visibleFrom="md" 
                            style={{ 
                                position: 'absolute', top: '50%', right: '-50px', transform: 'translateY(-50%)', zIndex: 20,
                                background: '#000', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%'
                            }}
                        >
                            <Text fw={900} size="sm" c="dimmed">VS</Text>
                        </Box>
                    </Box>

                    {/* RIGHT: THE SOLUTION */}
                    <Box>
                        <Text size="xs" fw={700} c="#BF5AF2" tt="uppercase" ta="center" mb="lg" style={{ letterSpacing: '0.2em' }}>
                            // THE KALPAD ENGINE
                        </Text>
                        <UnifiedCore />
                    </Box>
                </SimpleGrid>

                {/* THE "JUST STARTED" FOOTER */}
                <Stack align="center" mt={100}>
                    <Text fw={700} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                        And we are just getting started
                    </Text>
                    <Box style={{ height: '40px', width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2))' }} />
                </Stack>

            </Container>
        </Box>
    );
}