"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Text, Box, Group, Stack, Button } from '@mantine/core';
import { ShimmerButton } from '../ShimmerButton';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBrandDiscord, IconBrandWhatsapp, IconArrowRight, IconSparkles, IconBolt, IconBrandAndroid  } from '@tabler/icons-react';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';

// --- SUB-COMPONENT: THE LIVING MESH ---

function GradientMesh({ mode }) {

    const isPanic = mode === 'panic';



    // Configuration for the orb movements

    const transition = {

        duration: 8,

        repeat: Infinity,

        repeatType: "mirror",

        ease: "easeInOut"

    };



    return (

        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>

            {/* Base Background Color */}

            <motion.div 

                animate={{ backgroundColor: isPanic ? '#1a0505' : '#0a0514' }}

                style={{ position: 'absolute', inset: 0, transition: 'background-color 2s ease' }}

            />



            {/* Orb 1: Top Left (The Primary Light) */}

            <motion.div

                animate={{

                    x: ['-20%', '10%', '-20%'],

                    y: ['-20%', '10%', '-20%'],

                    scale: [1, 1.2, 1],

                    backgroundColor: isPanic ? '#ff3a30a2' : '#bf5af2c0', // Red vs Purple

                }}

                transition={transition}

                style={{

                    position: 'absolute', top: 0, left: 0,

                    width: '60vw', height: '60vw', borderRadius: '50%',

                    filter: 'blur(100px)', opacity: 0.4

                }}

            />



            {/* Orb 2: Bottom Right (The Counter Weight) */}

            <motion.div

                animate={{

                    x: ['20%', '-10%', '20%'],

                    y: ['20%', '-10%', '20%'],

                    scale: [1, 1.3, 1],

                    backgroundColor: isPanic ? '#ff9500ac' : '#34c759ae', // Orange vs Green

                }}

                transition={{ ...transition, duration: 12 }}

                style={{

                    position: 'absolute', bottom: 0, right: 0,

                    width: '50vw', height: '50vw', borderRadius: '50%',

                    filter: 'blur(120px)', opacity: 0.3

                }}

            />



            {/* Orb 3: Center Floating (The Accent) */}

            <motion.div

                animate={{

                    x: ['-50%', '50%', '-50%'],

                    y: ['-30%', '30%', '-30%'],

                    backgroundColor: isPanic ? '#5c00009e' : '#007bffa1', // Dark Red vs Blue

                }}

                transition={{ ...transition, duration: 15 }}

                style={{

                    position: 'absolute', top: '40%', left: '40%',

                    width: '40vw', height: '40vw', borderRadius: '50%',

                    filter: 'blur(90px)', opacity: 0.2

                }}

            />



            {/* Technical Grid Overlay (Stripe Style) */}

            <div style={{

                position: 'absolute', inset: 0,

                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,

                backgroundSize: '100px 100px',

                transform: 'skewY(-5deg) scale(1.2)', // The "Stripe Tilt"

                opacity: 0.5,

                zIndex: 1

            }} />

        </div>

    );

}

export function Hero() {
    const handleGetStarted = useAuthRedirect();
    const [phase, setPhase] = useState('problem'); // 'problem' (Kal Padhunga) | 'solution' (KalPad)
    const [mode, setMode] = useState('panic'); 
    
     useEffect(() => {

        const interval = setInterval(() => {

            setMode(prev => prev === 'panic' ? 'power' : 'panic');

        }, 5000); 

        return () => clearInterval(interval);

    }, []);

    useEffect(() => {

        const interval = setInterval(() => {

            setPhase(prev => prev === 'problem' ? 'solution' : 'problem');

        }, 5000); // 4 Second cycle

        return () => clearInterval(interval);

    }, []);



    const isPanic = mode === 'panic';
     const isSolution = phase === 'solution';

    return (
        <Box
            style={{
                position: 'relative',
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* --- BACKGROUND LAYER --- */}

            <GradientMesh mode={mode} />

            {/* --- 2. THE PERSPECTIVE GRID (Floor) --- */}
            <div style={{
                position: 'absolute', bottom: '-20%', left: '-50%', right: '-50%', height: '80vh',
                backgroundSize: '60px 60px',
                backgroundImage: `
                    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
                transform: 'perspective(500px) rotateX(60deg)', // The 3D Floor Effect
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)',
                zIndex: 0,
                pointerEvents: 'none',
            }} />

            {/* --- 3. THE 3D TEXT ENGINE --- */}
            <Box style={{ position: 'relative', zIndex: 10, height: '30vh', display: 'flex', alignItems: 'center' }}>
                <AnimatePresence mode="wait">
                    {isSolution ? (
                        <motion.div
                            key="solution"
                            initial={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Apple-style spring
                        >
                            <Title
                                style={{
                                    fontSize: 'clamp(5rem, 15vw, 12rem)',
                                    fontFamily: 'var(--font-lexend)',
                                    fontWeight: 900,
                                    lineHeight: 0.9,
                                    textAlign: 'center',
                                    color: 'transparent',
                                    background: 'linear-gradient(180deg, #FFFFFF 0%, #A78BFA 100%)', // Crisp White to Soft Purple
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    filter: 'drop-shadow(0 0 30px rgba(167, 139, 250, 0.6))', // Glowing Aura
                                    letterSpacing: '-0.04em'
                                }}
                            >
                                KalPad
                            </Title>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="problem"
                            initial={{ opacity: 0, y: 50, rotateX: -45 }}
                            animate={{ opacity: 0.4, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, y: -50, rotateX: 45, filter: 'blur(20px)' }}
                            transition={{ duration: 0.8 }}
                        >
                            <Title
                                style={{
                                    fontSize: 'clamp(4rem, 10vw, 8rem)',
                                    fontFamily: 'var(--font-lexend)',
                                    fontWeight: 800,
                                    lineHeight: 0.9,
                                    textAlign: 'center',
                                    color: 'transparent',
                                    WebkitTextStroke: '2px rgba(255, 255, 255, 0.3)', // Hollow Outline style
                                    letterSpacing: '0.05em',
                                    whiteSpace: 'pre-line' // Allow stacking
                                }}
                            >
                                KAL{"\n"}PADHUNGA
                            </Title>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            {/* --- 4. THE GLASS INTERFACE (Bottom Anchored) --- */}
              {/* --- FOREGROUND INTERFACE --- */}

            <Container size="md" style={{ position: 'relative', zIndex: 10 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <GlassCard 
                        p={{ base: 'xl'}} 
                        style={{ 
                            // Thinner, brighter glass for the Stripe feel
                            backdropFilter: 'blur(40px)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <Stack align="center">
                            {/* Status Pill */}
                            <motion.div
                                animate={{ 
                                    backgroundColor: isPanic ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                                    color: isPanic ? '#FF3B30' : '#34C759',
                                    borderColor: isPanic ? 'rgba(255, 59, 48, 0.2)' : 'rgba(52, 199, 89, 0.2)'
                                }}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '99px',
                                    border: '1px solid',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'currentColor' }} />
                                {isPanic ? "Current State: Panic" : "Target State: Control"}
                            </motion.div>

                            <Title 
                                order={2} 
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.03em',
                                    color: 'white'
                                }}
                            >
                                Stop negotiating with <br/> your syllabus.
                            </Title>

                            <Text size="sm" c="dimmed" maw={600} mx="auto" style={{ lineHeight: 1.6 }}>
                                You have 10 days. The syllabus is 500 pages. 
                                <span style={{ color: '#fff', fontWeight: 600 }}> We build the strategy that makes it possible.</span>
                            </Text>

                            <Group mt="md" gap="md" justify="center">
                                {/* 1. Existing Web App Button */}
                                <ShimmerButton
                                    size="xl"
                                    onClick={() => handleGetStarted()}
                                    radius="xl"
                                    style={{ 
                                        fontSize: '1.1rem', 
                                        padding: '0 40px', 
                                        height: '60px', // Explicit height to match
                                        boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)',
                                        background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)'
                                    }}
                                >
                                    Start The Engine <IconArrowRight size={20} style={{ marginLeft: 8 }}/>
                                </ShimmerButton>

                                {/* 2. New Android Download Button */}
                                <Interactive>
                                    <Button
                                        component="a"
                                        href="/android/kalpad.apk" // Points to public/android/kalpad.apk
                                        download="KalPad.apk"   // The name the user's file will save as
                                        size="xl"
                                        radius="xl"
                                        variant="default"
                                        leftSection={<IconBrandAndroid size={24} color="#3DDC84" />} // Official Android Green
                                        style={{ 
                                            height: '60px',
                                            fontSize: '1.1rem',
                                            backgroundColor: 'rgba(61, 220, 132, 0.05)', // Subtle green tint
                                            border: '1px solid rgba(61, 220, 132, 0.3)',
                                            color: 'white',
                                            boxShadow: '0 0 20px rgba(61, 220, 132, 0.1)'
                                        }}
                                    >
                                        Download App
                                    </Button>
                                </Interactive>
                            </Group>

                            <Group gap="xl" mt="sm" style={{ opacity: 0.7 }}>
                                <Interactive>
                                    <Group gap={6} style={{ cursor: 'pointer' }}>
                                        <IconBrandDiscord size={20} />
                                        <Text size="sm" fw={500}>Join the Community</Text>
                                    </Group>
                                </Interactive>
                                <Interactive>
                                    <Group gap={6} style={{ cursor: 'pointer' }}>
                                        <IconBolt size={20} />
                                        <Text size="sm" fw={500}>v2.5 Now Live</Text>
                                    </Group>
                                </Interactive>
                            </Group>
                        </Stack>
                    </GlassCard>
                </motion.div>
            </Container>
        </Box>
    );
}