// src/components/landing/personality/Arsenal.jsx
"use client";

import { useState } from 'react';
import { Container, Title, Text, SimpleGrid, Paper, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { GlassCard } from '../../GlassCard'; 

const features = [
    {
        emoji: '🎯',
        title: 'The Strategist',
        description: 'Our AI acts like a ruthless senior who red-pens your syllabus, highlights the gold, and crosses out the garbage. Its "Strategy Report" is brutally honest.',
        accents: ['🔥', '🗑️']
    },
    {
        emoji: '🤯',
        title: 'The Professor',
        description: "This AI can actually make sense of your professor's hieroglyphics. It reads your chaotic notes and generates a single, beautiful document that sounds like it was written by a human who actually slept.",
        accents: ['✍️', '✨']
    },
    {
        emoji: '🎬',
        title: 'The Scout',
        description: 'Our Lecture Scout slays the YouTube algorithm for you. It hunts for high-signal lectures and ignores the ones with 5-minute "LIKE AND SUBSCRIBE PLS" intros.',
        accents: ['🤫', '⚡']
    }
];

// A single, reusable card component with the flip logic built-in
function FlipCard({ feature }) {
    const [isFlipped, setIsFlipped] = useState(false);

    const cardStyles = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--mantine-spacing-xl)',
    };

    return (
        <div
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
            style={{
                width: '100%',
                minHeight: '350px',
                backgroundColor: 'transparent',
                perspective: '1000px',
            }}
        >
            <motion.div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* --- FRONT OF THE CARD --- */}
                <GlassCard 
                    style={{ 
                        ...cardStyles,
                        // --- FIX #1: Less blur, brighter background ---
                        backgroundColor: 'rgba(37, 38, 43, 0.6)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <Stack align="center">
                        <Text fz={80} lh={1}>{feature.emoji}</Text>
                        <Title order={3} ff="Lexend, sans-serif">{feature.title}</Title>
                    </Stack>
                </GlassCard>

                {/* --- BACK OF THE CARD --- */}
                <GlassCard 
                    style={{ 
                        ...cardStyles, 
                        transform: 'rotateY(180deg)',
                        // --- FIX #2: More blur, darker background ---
                        backgroundColor: 'rgba(23, 24, 28, 0.7)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <motion.span style={{ position: 'absolute', top: 20, left: 20, opacity: 0.5, fontSize: '1.5rem' }}>{feature.accents[0]}</motion.span>
                    <motion.span style={{ position: 'absolute', bottom: 20, right: 20, opacity: 0.5, fontSize: '1.5rem' }}>{feature.accents[1]}</motion.span>
                    
                    <Stack align="center">
                        <Title order={4} ff="Lexend, sans-serif">{feature.title}</Title>
                        <Text c="dimmed">{feature.description}</Text>
                    </Stack>
                </GlassCard>
            </motion.div>
        </div>
    );
}



export function Arsenal() {
    return (
        <Container size="lg" py={80}>
            <Stack align="center" ta="center" gap="xs" mb={50}>
                 <Title order={2} ff="Lexend, sans-serif" fz={{ base: '2rem', sm: '2.5rem' }}>
                    Meet the slightly unhinged AI crew that does your dirty work.
                </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing={40}>
                {features.map((feature) => (
                    <FlipCard key={feature.title} feature={feature} />
                ))}
            </SimpleGrid>
        </Container>
    );
}