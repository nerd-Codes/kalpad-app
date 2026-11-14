"use client";

import { Container, Title, Text, Stack, Box, Group, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconRocket, IconLockOpen, IconCreditCardOff, IconBolt } from '@tabler/icons-react';
import Link from 'next/link';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '../ShimmerButton';

// --- VISUAL CONSTANTS ---
const ACCENT_COLOR = '#D97706'; // Warm Amber

// --- SUB-COMPONENT: FRICTION KILLER BADGE ---
function FrictionBadge({ icon: Icon, text, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: delay, duration: 0.5 }}
            viewport={{ once: true }}
        >
            <Box 
                py={8} px={16} 
                style={{ 
                    borderRadius: '8px', 
                    background: 'rgba(217, 119, 6, 0.05)', 
                    border: '1px solid rgba(217, 119, 6, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <Icon size={16} color={ACCENT_COLOR} />
                <Text size="xs" fw={700} c="orange.3">
                    {text}
                </Text>
            </Box>
        </motion.div>
    );
}

export function GuestCTA() {
    return (
        <Box 
            py={{ base: 64, md: 96 }} 
            style={{ position: 'relative', zIndex: 10, overflow: 'hidden' }}
        >
            {/* --- BACKGROUND WARP EFFECT --- */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 4, repeat: 0, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '80vw', height: '80vw', borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.1) 0%, transparent 70%)',
                        filter: 'blur(80px)'
                    }}
                />
            </div>

            <Container size="md" style={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                >
                    <GlassCard 
                        p={{ base: 'xl', md: 80 }}
                        style={{
                            textAlign: 'center',
                            background: '#19191b',
                            border: '1px solid rgba(237, 237, 237, 0.08)',
                            boxShadow: 'none'
                        }}
                    >
                        <Stack align="center" gap="xl">
                            
                            {/* 1. The Hook */}
                            <Stack gap="xs" align="center">
                                <Title 
                                    order={2} 
                                    style={{ 
                                        fontFamily: 'var(--font-lexend)', 
                                        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
                                        lineHeight: 1,
                                        letterSpacing: '-0.03em',
                                        color: 'white'
                                    }}
                                >
                                    Don't trust us. <span style={{ color: ACCENT_COLOR }}>Test us.</span>
                                </Title>
                            </Stack>

                            {/* 2. The Friction Killers (Badges) */}
                            <Group gap="md" justify="center" wrap="wrap">
                                <FrictionBadge icon={IconLockOpen} text="No Login" delay={0.2} />
                                <FrictionBadge icon={IconCreditCardOff} text="No Credit Card" delay={0.3} />
                                <FrictionBadge icon={IconBolt} text="Instant Gen" delay={0.4} />
                            </Group>

                            {/* 3. The Pitch */}
                            <Text size="xl" c="dimmed" lh={1.6} maw={700}>
                                Build a complete, 7-day battle plan for any subject right now. 
                                We'll show you the hidden prerequisites and the adaptive strategy.
                                <br/>
                                <span style={{ color: 'white', fontWeight: 600 }}>Zero friction. Pure utility. No bullshit.</span>
                            </Text>

                            {/* 4. The God Button */}
                            <Box mt="md" style={{ position: 'relative', zIndex: 10 }}>
                                <Interactive>
                                    <ShimmerButton
                                        component={Link}
                                        href="/guest-plan"
                                        size="xl"
                                        radius="md"
                                        style={{ 
                                            fontSize: '1.25rem', 
                                            padding: '16px 40px',
                                            height: 'auto',
                                            background: '#D97706',
                                            color: '#0f0f10',
                                            boxShadow: 'none'
                                        }}
                                    >
                                        Create My Free Guest Plan <IconRocket size={22} style={{ marginLeft: 10 }} />
                                    </ShimmerButton>
                                </Interactive>
                            </Box>

                        </Stack>
                    </GlassCard>
                </motion.div>
            </Container>
        </Box>
    );
}