// src/components/landing/personality/ThePledge.jsx
"use client";

import { Container, Title, Text, Box, Group, Stack, Badge, Button, ThemeIcon, SimpleGrid, Divider } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCheck, IconShieldCheck, IconBolt, IconArrowRight, IconInfinity, IconHeartHandshake, IconServer } from '@tabler/icons-react';
import Link from 'next/link';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#34C759', 
    textTransform: 'lowercase'
};

// --- DATA: THE FREE TOOLKIT ---
const FREE_ARSENAL = [
    { label: "Smart study plan", value: "ACTIVE" },
    { label: "Important topic priority", value: "ACTIVE" },
    { label: "AI notes and diagrams", value: "DAILY CREDITS" },
    { label: "Active recall practice", value: "DAILY CREDITS" },
    { label: "Useful YouTube lectures", value: "STANDARD ACCESS" },
    { label: "Mobile app access", value: "UNRESTRICTED" },
];

export function ThePledge() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10, backgroundColor: '#05050500', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
            <Container size="xl">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="lg" mb={80}>
                    <Badge 
                        variant="outline" color="green" size="md" radius="xl"
                        style={{ borderColor: 'rgba(52, 199, 89, 0.4)', color: '#34C759', letterSpacing: '0.1em', backgroundColor: 'rgba(52, 199, 89, 0.05)' }}
                        leftSection={<IconHeartHandshake size={14}/>}
                    >
                        FREE TO START
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                            color: 'white',
                            maxWidth: '900px'
                        }}
                    >
                        Your bank account doesn't <br/> take the exam. <span style={serifItalic}>You do.</span>
                    </Title>
                </Stack>

                {/* --- THE MANIFESTO CARD --- */}
                <Box maw={900} mx="auto" mb={100}>
                    <GlassCard 
                        p={{ base: 'xl', md: 60 }}
                        style={{ 
                            background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(52, 199, 89, 0.03) 100%)',
                            border: '1px solid rgba(52, 199, 89, 0.2)',
                            boxShadow: '0 0 100px -20px rgba(52, 199, 89, 0.1)',
                            position: 'relative', overflow: 'hidden'
                        }}
                    >
                        {/* Background Texture */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#34C759 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.05, pointerEvents: 'none' }} />

                        <Stack gap="xl">
                            {/* The Core Message */}
                            <Text size="xl" c="white" lh={1.6} fw={400} ta="center" style={{ fontFamily: 'var(--font-lexend)' }}>
                                We don't gatekeep good study tools. The Free Tier isn't a "trial." <br/>
                                <span style={{ color: '#34C759' }}>It is a complete study toolkit.</span>
                            </Text>

                            <Divider color="rgba(255,255,255,0.1)" label="WHAT YOU GET" labelPosition="center" />

                            {/* The Spec Sheet */}
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                                {FREE_ARSENAL.map((item, i) => (
                                    <Group key={i} justify="space-between" style={{ padding: '12px 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <Group gap="sm">
                                            <IconCheck size={16} color="#34C759" />
                                            <Text size="sm" c="gray.4">{item.label}</Text>
                                        </Group>
                                        <Badge size="sm" variant="filled" color="dark" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>{item.value}</Badge>
                                    </Group>
                                ))}
                            </SimpleGrid>

                            {/* The "Why We Charge" Honest Footnote */}
                            <Box mt="lg" p="md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Group align="flex-start" wrap="nowrap">
                                    <ThemeIcon variant="light" color="gray" size="sm" radius="xl" mt={2}><IconServer size={12}/></ThemeIcon>
                                    <Stack gap={4}>
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Transparency Note</Text>
                                        <Text size="sm" c="gray.5" lh={1.5}>
                                            We only charge for "Unlimited" plans because AI generation costs real money.
                                            But if you have the discipline to finish one mission before starting the next, 
                                            <span style={{ color: 'white', fontWeight: 600 }}> the free daily credits are enough to seriously test KalPad on your syllabus.</span>
                                        </Text>
                                    </Stack>
                                </Group>
                            </Box>

                            {/* The Cost */}
                            <Group justify="center" gap="xl" mt="sm">
                                <Stack gap={0} align="center">
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.1em' }}>Financial Cost</Text>
                                    <Text size="2.5rem" fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1 }}>Rs 0</Text>
                                </Stack>
                                <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                <Stack gap={0} align="center">
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.1em' }}>Real Cost</Text>
                                    <Text size="2.5rem" fw={700} c="green.4" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1 }}>Focus</Text>
                                </Stack>
                            </Group>

                        </Stack>
                    </GlassCard>
                </Box>

                {/* --- FINAL EXIT: THE ZERO FRICTION LAUNCH --- */}
                <Box style={{ position: 'relative', padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Stack align="center" gap="xl">
                        <Title 
                            order={2} 
                            style={{ 
                                fontFamily: 'var(--font-lexend)', 
                                fontSize: 'clamp(2rem, 4vw, 3.5rem)', 
                                textAlign: 'center', 
                                color: 'white'
                            }}
                        >
                            Don't trust us. <span style={{ color: '#22d3ee' }}>Test us.</span>
                        </Title>
                        
                        <Interactive>
                            <Link href="/guest-plan" style={{ textDecoration: 'none' }}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
                                        padding: '24px 60px',
                                        borderRadius: '999px',
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        boxShadow: '0 20px 60px -10px rgba(34, 211, 238, 0.4)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <IconBolt size={32} color="white" fill="white" />
                                    <Box>
                                        <Text size="xl" fw={800} c="white" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1 }}>
                                            INSTANT GUEST MODE
                                        </Text>
                                        <Text size="xs" c="rgba(255,255,255,0.8)" fw={600} mt={4} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                            No Login - No Credit Card - 10 Seconds
                                        </Text>
                                    </Box>
                                    <IconArrowRight size={32} color="white" />
                                </motion.div>
                            </Link>
                        </Interactive>

                    </Stack>
                </Box>

            </Container>
        </Box>
    );
}
