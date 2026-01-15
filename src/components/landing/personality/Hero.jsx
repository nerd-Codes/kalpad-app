// src/components/landing/personality/Hero.jsx
"use client";

import { Container, Title, Text, Box, Group, Stack, Button, Badge, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconArrowRight, IconBrandAndroid, IconCheck, IconClock, IconBrain, IconFlame, IconRefresh, IconShare3, IconListCheck, IconEye, IconLayoutDashboard, IconPlus, IconFileText } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '../ShimmerButton';

// --- SUB-COMPONENT: FAKE APP SCREEN (The "Screenshot") ---
function AppScreenMockup() {
    return (
        <Box style={{ height: '100%', width: '100%', backgroundColor: '#050505', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-inter)' }}>
            
            {/* 1. Header Section */}
            <Box pt={60} px={24} pb="sm">
                <Text size="10px" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.15em' }}>Active Mission</Text>
                <Title order={3} c="white" mt={4} style={{ fontFamily: 'var(--font-lexend)', letterSpacing: '-0.02em', fontSize: '1.75rem' }}>
                    JEE Mains Sprint
                </Title>
                
                {/* Action Ribbon */}
                <SimpleGrid cols={2} spacing={8} mt={20}>
                    <Button size="xs" radius="lg" variant="light" color="teal" leftSection={<IconBrain size={14}/>} style={{ height: '36px', fontSize: '11px', justifyContent: 'flex-start' }}>Start Quiz</Button>
                    <Button size="xs" radius="lg" variant="filled" color="dark" c="orange" leftSection={<IconFlame size={14}/>} style={{ height: '36px', fontSize: '11px', backgroundColor: 'rgba(255, 149, 0, 0.15)', justifyContent: 'flex-start' }}>Cram Sheet</Button>
                    <Button size="xs" radius="lg" variant="filled" color="dark" c="violet" leftSection={<IconRefresh size={14}/>} style={{ height: '36px', fontSize: '11px', backgroundColor: 'rgba(191, 90, 242, 0.15)', justifyContent: 'flex-start' }}>Refine Plan</Button>
                    <Button size="xs" radius="lg" variant="filled" color="dark" c="gray" leftSection={<IconShare3 size={14}/>} style={{ height: '36px', fontSize: '11px', backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'flex-start' }}>Share Plan</Button>
                </SimpleGrid>
            </Box>

            {/* 2. Timeline Strip */}
            <Box pl={24} mb={24} style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
                {[11, 12, 13, 14, 15].map((day, i) => {
                    const isActive = day === 14; // Simulating Day 4/14 as active
                    return (
                        <Box key={day} style={{ 
                            minWidth: '60px', height: '64px', borderRadius: '14px', 
                            backgroundColor: isActive ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.03)',
                            border: isActive ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Text size="9px" c="dimmed" fw={700} tt="uppercase">DAY</Text>
                            <Text size="lg" c={isActive ? 'white' : 'dimmed'} fw={700} lh={1}>{day}</Text>
                            {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34C759', marginTop: 4 }} />}
                        </Box>
                    );
                })}
            </Box>

            {/* 3. The Active Card (Electrostatics) */}
            <Box px={24}>
                <GlassCard p={0} style={{ borderLeft: '4px solid #FF3B30', backgroundColor: 'rgba(20, 20, 25, 0.8)', overflow: 'hidden' }}>
                    <Stack gap={0} p={20}>
                        <Group gap="xs" mb="sm">
                            <Badge color="dark" variant="filled" size="sm" c="dimmed" radius="sm">DAY 14</Badge>
                            <Badge color="red" variant="filled" size="sm" radius="sm">HARD</Badge>
                        </Group>
                        
                        <Title order={4} c="white" style={{ fontFamily: 'var(--font-lexend)', fontSize: '1.4rem', lineHeight: 1.2 }}>
                            Electrostatics & Fields
                        </Title>
                        
                        <Button 
                            variant="light" color="violet" size="xs" radius="md" mt="lg" w="fit-content"
                            leftSection={<IconListCheck size={14}/>}
                        >
                            Bulk Notes
                        </Button>
                    </Stack>
                    
                    {/* The Task Item (Inside the card) */}
                    <Box p={20} pt={0}>
                        <Box p="md" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Group justify="space-between" align="start" wrap="nowrap">
                                <Group gap="md" align="start" wrap="nowrap">
                                    <div style={{ 
                                        width: 20, height: 10, borderRadius: '50%', 
                                        border: '2px solid rgba(255,255,255,0.3)', marginTop: 2 
                                    }} />
                                    <Box>
                                        <Text size="sm" c="white" fw={500} lh={1.4}>
                                            Derive Electric Field due to a Dipole
                                        </Text>
                                        <Group gap={6} mt={6}>
                                            <Badge size="xs" color="gray" variant="outline" style={{ fontSize: '9px', height: '18px' }}>DERIVATION</Badge>
                                            <Badge size="xs" color="teal" variant="filled" style={{ fontSize: '9px', height: '18px' }}>NOTE READY</Badge>
                                        </Group>
                                    </Box>
                                </Group>
                                <ThemeIcon variant="light" color="teal" radius="xl" size="md">
                                    <IconEye size={14} />
                                </ThemeIcon>
                            </Group>
                        </Box>
                    </Box>
                </GlassCard>
            </Box>

            {/* Bottom Fade (To simulate scroll) */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, #050505 20%, transparent)', zIndex: 20 }} />
            
            {/* Bottom Nav Mockup */}
            <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 30, padding: '0 30px' }}>
                <Group justify="space-between" style={{ opacity: 0.5 }}>
                     <Stack gap={2} align="center"><IconLayoutDashboard size={20} /><Text size="8px" fw={600}>Home</Text></Stack>
                     <Stack gap={2} align="center"><IconPlus size={20} /><Text size="8px" fw={600}>Create</Text></Stack>
                     <Stack gap={2} align="center"><IconFileText size={20} /><Text size="8px" fw={600}>Plans</Text></Stack>
                     <Stack gap={2} align="center"><div style={{width: 20, height: 20, borderRadius: '50%', background: '#BF5AF2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color:'black', fontWeight:'bold'}}>SR</div><Text size="8px" fw={600}>Profile</Text></Stack>
                </Group>
            </div>
        </Box>
    );
}

export function Hero() {
    return (
        <Box
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                paddingTop: '100px', // Header offset
                paddingBottom: '60px',
                paddingLeft: '20px',
                paddingRight: '20px',
                background: 'transparent', // FIX: Transparent to let Global Void show
            }}
        >
            {/* --- BACKGROUND AMBIENCE (The Local Glow) --- */}
            <div style={{
                position: 'absolute', top: '20%', right: '-10%',
                width: '60vw', height: '60vw',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 60%)',
                filter: 'blur(100px)', zIndex: 0
            }} />

            <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
                {/* FIX: Use SimpleGrid for reliable responsive layout */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={80} verticalSpacing={60}>
                    
                    {/* --- LEFT COLUMN: THE PITCH --- */}
                    <Stack gap="xl" justify="center">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                            <Group gap="xs" mb="xs">
                                <ThemeIcon size="sm" radius="xl" color="white" variant="white"><IconCheck size={10} color="black"/></ThemeIcon>
                                <Text size="sm" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                    AI-Powered Strategist
                                </Text>
                            </Group>

                            <Title 
                                order={1} 
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: 'clamp(3rem, 5vw, 5rem)', 
                                    fontWeight: 800, 
                                    lineHeight: 1,
                                    letterSpacing: '-0.04em',
                                    color: 'white'
                                }}
                            >
                                <span className="apple-text-gradient">
                                    FIGHT THE<br/>SYLLABUS.
                                </span>
                            </Title>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                            <Text size="xl" c="gray.4" lh={1.6} maw={600}>
                                It's a trap designed to make you panic. I got tired of losing, so I built our weapon. KalPad generates a ruthless, adaptive study plan that turns 
                                <span style={{ color: '#fff', fontWeight: 600 }}> "Kal Padhunga"</span> into 
                                <span style={{ color: '#34C759', fontWeight: 600 }}> "Done."</span>
                            </Text>
                        </motion.div>

                        {/* Buttons */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
                            <Group gap="md" mt="sm">
                                {/* FIX: Replaced with ShimmerButton */}
                                <Interactive>
                                    <ShimmerButton
                                        component={Link}
                                        href="/guest-plan"
                                        size="xl"
                                        radius="xl"
                                        style={{ height: '60px', padding: '0 40px', fontSize: '1.1rem' }}
                                    >
                                        Try it Now <IconArrowRight size={20} style={{ marginLeft: 8 }}/>
                                    </ShimmerButton>
                                </Interactive>

                                <Interactive>
                                    <Button
                                        component="a"
                                        href="/android/kalpad.apk"
                                        target="_blank"
                                        download="KalPad.apk"
                                        size="xl"
                                        radius="xl"
                                        variant="default"
                                        leftSection={<IconBrandAndroid size={22} color="#3DDC84"/>}
                                        style={{ 
                                            height: '60px',
                                            fontSize: '1.1rem',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white',
                                        }}
                                    >
                                        Download App
                                    </Button>
                                </Interactive>
                            </Group>
                            
                            <Text size="sm" c="dimmed" mt="md" fs="italic">
                                *No Sign Up required to try
                            </Text>
                        </motion.div>
                    </Stack>

                    {/* --- RIGHT COLUMN: THE PROOF (PHONE MOCKUP) --- */}
                    <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Background Decor */}
                        <svg width="600" height="600" viewBox="0 0 600 600" fill="none" style={{ position: 'absolute', zIndex: 0, opacity: 0.3, transform: 'scale(1.2)' }}>
                            <path d="M50 300 C 150 500, 450 100, 550 300" stroke="url(#grad1)" strokeWidth="40" strokeLinecap="round" fill="none" />
                            <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style={{ stopColor: '#7C3AED', stopOpacity: 0 }} />
                                    <stop offset="50%" style={{ stopColor: '#BF5AF2', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#34C759', stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* The Phone Chassis */}
                        <motion.div 
                            initial={{ y: 50, opacity: 0, rotate: -5 }}
                            animate={{ y: 0, opacity: 1, rotate: 0 }}
                            transition={{ duration: 1, ease: "circOut", delay: 0.2 }}
                            style={{
                                width: '320px',
                                height: '650px',
                                borderRadius: '50px',
                                border: '8px solid #2d2d2d',
                                backgroundColor: '#000',
                                boxShadow: `
                                    0 0 0 2px #444, /* Outer Bezel */
                                    0 20px 50px -10px rgba(0,0,0,0.8), /* Drop Shadow */
                                    inset 0 0 20px rgba(255,255,255,0.1) /* Inner Gloss */
                                `,
                                position: 'relative',
                                zIndex: 10,
                                overflow: 'hidden'
                            }}
                        >
                            {/* Dynamic Island */}
                            <div style={{
                                position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
                                width: '100px', height: '28px', backgroundColor: '#000', borderRadius: '20px', zIndex: 50
                            }} />

                            {/* Screen Content */}
                            <AppScreenMockup />
                        </motion.div>
                    </Box>

                </SimpleGrid>
            </Container>
        </Box>
    );
}