// src/components/landing/personality/Playground.jsx
"use client";

import { useState } from 'react';
import { Container, Title, Text, Stack, Grid, Group, ActionIcon, Box } from '@mantine/core';
import { motion, AnimatePresence, useDragControls, LayoutGroup } from 'framer-motion';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; // Import GlassCard

// Data for the cards
const useCases = [
    {
        value: 'interview',
        emoji: '💼',
        label: 'Interview Crackdown',
        description: 'Drop in the job description and your resume. KalPad will build you a 14-day hyper-focused prep plan, from system design fundamentals to the exact behavioral questions you’ll be asked.'
    },
    {
        value: 'hackathon',
        emoji: '🏆',
        label: 'Hackathon Heist',
        description: "Got a weekend and a dream? Feed KalPad the hackathon theme and the tech stack you want to use. It will generate a high-level architectural plan and a learning roadmap so you can build, not just google."
    },
    {
        value: 'upsc',
        emoji: '🇮🇳',
        label: 'UPSC/CAT Gauntlet',
        description: "These aren't just exams; they're life-defining quests. KalPad's long-term planning engine can take a multi-year syllabus and build a cohesive, month-by-month architectural plan."
    },
    {
        value: 'freelance',
        emoji: '💸',
        label: 'Freelance God-Mode',
        description: "Your client just dropped a 100-page project brief on you. Upload it to KalPad, and it will generate a project timeline, identify key deliverables, and create a learning plan for any new tech you need to master."
    }
];

export function Playground() {
    const [activeIndex, setActiveIndex] = useState(0);
    const dragControls = useDragControls();

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % useCases.length);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + useCases.length) % useCases.length);
    };

    return (
        <Container size="lg" py={80}>
            <Stack align="center" ta="center" gap="xs" mb={50}>
                 <Title order={2} ff="Lexend, sans-serif" fz={{ base: '2rem', sm: '2.5rem' }}>
                    Exams are the tutorial. This is the real game.
                </Title>
            </Stack>

            <Grid gutter={{ base: 40, lg: 80 }}>
                {/* Left Column: Text Descriptions */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Stack justify="center" h="100%" gap="xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Title order={3} ff="Lexend, sans-serif">{useCases[activeIndex].label}</Title>
                                <Text size="lg" c="dimmed" mt="md">{useCases[activeIndex].description}</Text>
                            </motion.div>
                        </AnimatePresence>
                        <Group mt="lg">
                            <ActionIcon variant="default" size="xl" radius="xl" onClick={handlePrev}><IconArrowLeft /></ActionIcon>
                            <ActionIcon variant="default" size="xl" radius="xl" onClick={handleNext}><IconArrowRight /></ActionIcon>
                        </Group>
                    </Stack>
                </Grid.Col>

                {/* Right Column: High-Fidelity Stacked Card Carousel */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* LayoutGroup is the key to the smooth re-stacking animation */}
                    <LayoutGroup>
                        <Box 
                            style={{ 
                                position: 'relative', 
                                height: '400px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}
                        >
                            {/* AnimatePresence is no longer needed here, simplifying the logic */}
                            {useCases.map((card, index) => {
                                const position = index - activeIndex;
                                // Render only the top 3 cards for performance and visual clarity
                                if (Math.abs(position) >= 3) return null; 
                                
                                return (
                                    <motion.div
                                        key={card.value}
                                        layout // This is now the ONLY prop driving the animation
                                        initial={false}
                                        animate={{
                                            y: position * 15,
                                            scale: 1 - Math.abs(position) * 0.05,
                                            zIndex: useCases.length - Math.abs(position),
                                            opacity: position === 0 ? 1 : 0.7,
                                            rotate: position * 3, // Adds a subtle tilt to the stack
                                        }}

                                        // A simple spring transition feels more tactile
                                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}

                                        // Drag logic is unchanged but will feel better with the new animation
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        onDragEnd={(event, info) => {
                                            if (info.offset.x > 100) handlePrev();
                                            if (info.offset.x < -100) handleNext();
                                        }}
                                        style={{
                                            position: 'absolute',
                                            width: '80%',
                                            height: '90%',
                                        }}
                                    >
                                        <GlassCard p="xl" h="100%" style={{ cursor: 'grab' }}>
                                            <Stack align="center" justify="center" h="100%">
                                                <Text fz={100}>{card.emoji}</Text>
                                            </Stack>
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </Box>
                    </LayoutGroup>
                </Grid.Col>
            </Grid>
        </Container>
    );
}