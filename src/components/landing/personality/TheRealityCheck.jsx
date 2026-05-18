// src/components/landing/personality/TheRealityCheck.jsx
"use client";

import { useRef } from 'react';
import Image from 'next/image';
import { Container, Title, Text, Box, Group, Stack, Avatar, Grid } from '@mantine/core';
import { motion, useScroll, useTransform } from 'framer-motion';
import { IconBrandDiscordFilled, IconQuote, IconActivityHeartbeat } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- SUB-COMPONENT: PARALLAX CHAT WIDGET ---
function MessageWidget({ avatar, name, handle, time, message, yOffset, rotate, color = "#BF5AF2" }) {
    return (
        <motion.div
            style={{ y: yOffset, rotate: rotate, zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
            <GlassCard 
                p="md" 
                style={{ 
                    backgroundColor: 'rgba(20, 20, 25, 0.7)', 
                    border: `1px solid rgba(255,255,255,0.05)`,
                    borderTop: `1px solid ${color}40`, 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                    width: '100%',
                    maxWidth: '360px', // Strictly bounded width
                    backdropFilter: 'blur(24px)'
                }}
            >
                <Group gap="sm" mb="xs" wrap="nowrap" align="flex-start">
                    <Avatar color={color} radius="xl" size="md" style={{ border: `1px solid ${color}40` }}>{avatar}</Avatar>
                    <Box style={{ flex: 1 }}>
                        <Group justify="space-between" gap={0}>
                            <Text size="sm" fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>{name}</Text>
                            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>{time}</Text>
                        </Group>
                        <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{handle}</Text>
                    </Box>
                </Group>
                <Text size="sm" c="gray.3" lh={1.5} style={{ fontFamily: 'var(--font-inter)' }}>
                    {message}
                </Text>
            </GlassCard>
        </motion.div>
    );
}

// --- SUB-COMPONENT: LIVE SERVER STATUS ---
function ServerStatus() {
    return (
        <GlassCard p="sm" style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(52, 199, 89, 0.2)', width: 'fit-content' }}>
            <Group gap="md">
                <Group gap="xs">
                    <motion.div 
                        animate={{ opacity: [1, 0.4, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34C759', boxShadow: '0 0 10px #34C759' }} 
                    />
                    <Text size="xs" fw={700} c="green.4" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Used by IITians, NITians & future doctors</Text>
                </Group>
                <Box style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <Group gap="xs">
                    <IconActivityHeartbeat size={16} color="#86868B" />
                    <Text size="xs" c="dimmed" fw={600} style={{ fontFamily: 'monospace' }}>100+ STUDENTS ACTIVE</Text>
                </Group>
            </Group>
        </GlassCard>
    );
}

function InstitutionProofCard() {
    return (
        <GlassCard
            p={{ base: 'lg', md: 'xl' }}
            style={{
                background: 'linear-gradient(135deg, rgba(21, 21, 26, 0.88) 0%, rgba(14, 14, 18, 0.96) 100%)',
                border: '1px solid rgba(191, 90, 242, 0.22)',
                boxShadow: '0 32px 70px -35px rgba(191, 90, 242, 0.55)',
                width: '100%',
                backdropFilter: 'blur(24px)'
            }}
        >
            <Group gap="xl" wrap="wrap" justify="space-between" align="center">
                <Box
                    style={{
                        position: 'relative',
                        width: 180,
                        height: 96,
                        borderRadius: 20,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255,255,255,0.98)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        flexShrink: 0
                    }}
                >
                    <Image
                        src="/mchiie.avif"
                        alt="MHCIIE logo"
                        fill
                        sizes="180px"
                        style={{ objectFit: 'contain', padding: '12px' }}
                    />
                </Box>

                <Stack gap={6} style={{ flex: 1, minWidth: 260 }}>
                    <Text size="11px" fw={800} c="violet.3" tt="uppercase" style={{ letterSpacing: '0.18em' }}>
                        Officially Incubated
                    </Text>
                    <Title order={3} c="white" lh={1.2} style={{ fontFamily: 'var(--font-lexend)', maxWidth: '820px' }}>
                        KalPad is officially incubated by MHCIIE at Hansraj College.
                    </Title>
                    <Text size="sm" c="gray.4" lh={1.65} maw={760}>
                        Mahatma Hansraj Centre for Innovation, Incubation and Entrepreneurship
                    </Text>
                </Stack>
            </Group>
        </GlassCard>
    );
}

export function TheRealityCheck() {
    const sectionRef = useRef(null);
    
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // Recalibrated parallax arrays for smoother shear
    const y1 = useTransform(scrollYProgress, [0, 1], [100, -80]);
    const y2 = useTransform(scrollYProgress, [0, 1], [250, -150]);
    const y3 = useTransform(scrollYProgress, [0, 1], [50, -100]);

    return (
        <Box
            ref={sectionRef}
            py={{ base: 120, md: 180 }}
            style={{
                position: 'relative',
                backgroundColor: '#050505',
                overflow: 'hidden',
                borderTop: '1px solid rgba(255,255,255,0.02)'
            }}
        >
            {/* Ambient Background Gradient */}
            <div style={{
                position: 'absolute', top: '30%', left: '-10%',
                width: '60vw', height: '60vw',
                background: 'radial-gradient(circle, rgba(191, 90, 242, 0.05) 0%, transparent 60%)',
                filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none'
            }} />

            <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
                

                {/* THE FIX: Native Mantine Grid for deterministic column rendering */}
                <Grid gutter={{ base: 60, lg: 80 }} align="center">
                    
                    {/* --- LEFT: THE MANIFESTO --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Stack gap="xl" pr={{ base: 0, lg: 40 }}>
                            <Group gap="sm">
                                <IconQuote size={24} color="#BF5AF2" style={{ opacity: 0.5 }} />
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.2em' }}>STUDENT REALITY</Text>
                            </Group>

                            <Title 
                                style={{ 
                                    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', 
                                    fontSize: 'clamp(2.5rem, 4vw, 3.8rem)', 
                                    fontWeight: 400, 
                                    lineHeight: 1.1,
                                    color: '#F5F5F7',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                One app for the part of studying <span style={{ fontStyle: 'italic', color: '#BF5AF2' }}>no one teaches you.</span>
                            </Title>

                            <Text size="lg" c="gray.4" lh={1.7} style={{ fontFamily: 'var(--font-inter)' }}>
                                Classes, coaching, internships, projects, family plans: students are juggling more than just a timetable. The hard part is not always studying. It is deciding what to study first.
                                <br/><br/>
                                KalPad reads the syllabus mess and turns it into small daily steps. <span style={{ color: 'white', fontWeight: 600 }}>You still learn the topic. We just make the starting point obvious.</span>
                            </Text>

                            <Box mt="md">
                                <ServerStatus />
                            </Box>
                        </Stack>
                    </Grid.Col>

                    {/* --- RIGHT: THE WAR ROOM (Parallax Wall) --- */}
                    <Grid.Col span={{ base: 12, lg: 6 }}>
                        <Box 
                            style={{ 
                                position: 'relative', 
                                height: '650px', // Fixed height creates the bounding box for absolute children
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* The "Gravity Well" Visual Anchor */}
                            <motion.div 
                                style={{ position: 'absolute', zIndex: 0, opacity: 0.15 }}
                                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            >
                                <IconBrandDiscordFilled size={280} color="#BF5AF2" />
                            </motion.div>

                            {/* THE FIX: Strict, opposing coordinate geometry */}
                            {/* Widget 1: Anchored Top Left */}
                            <Box style={{ position: 'absolute', top: '5%', left: 0, zIndex: 10 }}>
                                <MessageWidget 
                                    avatar="A" name="Aditya" handle="B.Tech student" time="Today at 2:14 AM"
                                    message="KalPad noticed I kept missing Vector Calculus questions and moved revision earlier in the week. Saved me from guessing what to fix."
                                    yOffset={y1} rotate={-3} color="#FF9500"
                                />
                            </Box>

                            {/* Widget 2: Anchored Center Right */}
                            <Box style={{ position: 'absolute', top: '35%', right: 0, zIndex: 12 }}>
                                <MessageWidget 
                                    avatar="P" name="Priya" handle="NIT student" time="Yesterday at 11:45 PM"
                                    message="I had one week for OS internals. It turned my messy syllabus into a day-wise plan and gave notes I could actually read."
                                    yOffset={y2} rotate={2} color="#BF5AF2"
                                />
                            </Box>

                            {/* Widget 3: Anchored Bottom Left */}
                            <Box style={{ position: 'absolute', bottom: '5%', left: '10%', zIndex: 14 }}>
                                <MessageWidget 
                                    avatar="K" name="Kabir" handle="NEET aspirant" time="Sunday at 4:20 PM"
                                    message="The YouTube lecture suggestions saved me so much time. I got a short explanation instead of opening ten random tabs."
                                    yOffset={y3} rotate={-1} color="#34C759"
                                />
                            </Box>

                        </Box>
                    </Grid.Col>

                </Grid>
            </Container>
        </Box>
    );
}
