"use client";

import { useState } from 'react';
import { Modal, Stack, Title, Text, Group, Button, Box, Progress, SimpleGrid, ScrollArea, ThemeIcon } from '@mantine/core';
import { IconChevronRight, IconChevronLeft, IconCheck, IconTarget, IconCircle } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@mantine/hooks';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';

// --- VISUAL CONSTANTS ---
const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
         maxHeight: '85vh' 
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0, zIndex: 10 },
    body: { padding: '0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export function QuizRunner({ questions, onSubmit, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [direction, setDirection] = useState(1); // 1 = Next, -1 = Back
    const isMobile = useMediaQuery('(max-width: 48em)');

    const currentQuestion = questions[currentIndex];
    const progressVal = ((currentIndex + 1) / questions.length) * 100;
    const isAnswered = answers[currentIndex] !== undefined;

    // --- HANDLERS ---
    const handleSelect = (option) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: option }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };
    
    const handleSubmit = () => {
        const attempts = questions.map((q, index) => ({
            question_text: q.question_text,
            options: q.options,
            user_answer: answers[index] || null,
            correct_answer: q.correct_answer,
            is_correct: answers[index] === q.correct_answer
        }));
        onSubmit(attempts);
    };

    // --- ANIMATION VARIANTS ---
    const variants = {
        enter: (dir) => ({
            x: dir > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.98
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (dir) => ({
            x: dir > 0 ? -50 : 50,
            opacity: 0,
            scale: 0.98
        })
    };

    return (
        <Modal 
            opened={true} 
            onClose={onClose} 
            title={<Group gap="xs"><IconTarget size={20} color="#BF5AF2"/><Text inherit>Live Combat</Text></Group>} 
            size="xl" 
            centered
            fullScreen={isMobile}
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
            zIndex={7000}
            scrollArea ="inside"
        >
            <ScrollArea h="70vh" type="auto">
            <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* 1. HUD: PROGRESS (Sticky Top) */}
                <Box p={isMobile ? 'md' : '32px'} pb={0}>
                    <Group justify="space-between" mb="xs">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                            Objective {currentIndex + 1} / {questions.length}
                        </Text>
                        <Text size="xs" fw={700} c="#BF5AF2">
                            {Math.round(progressVal)}%
                        </Text>
                    </Group>
                    <Progress 
                        value={progressVal} 
                        color="#BF5AF2" 
                        size="sm" 
                        radius="xl" 
                        styles={{ root: { backgroundColor: 'rgba(255,255,255,0.1)' } }}
                    />
                </Box>

                {/* 2. QUESTION & OPTIONS (Scrollable Middle) */}
                <ScrollArea style={{ flex: 1 }}>
                    <Box p={isMobile ? 'md' : '32px'}>
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentIndex}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            >
                                <Stack gap="xl">
                                    {/* The Question */}
                                    <Title order={3} style={{ fontFamily: 'var(--font-lexend)', fontWeight: 500, lineHeight: 1.4, fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                                        {currentQuestion.question_text}
                                    </Title>

                                    {/* The Options Grid */}
                                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                        {currentQuestion.options.map((option, i) => {
                                            const isSelected = answers[currentIndex] === option;
                                            return (
                                                <Interactive key={i} onClick={() => handleSelect(option)} className="h-full">
                                                    <GlassCard 
                                                        p="md" 
                                                        h="100%"
                                                        style={{ 
                                                            backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            border: isSelected ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.08)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex', alignItems: 'center', gap: '16px',
                                                            minHeight: '70px'
                                                        }}
                                                    >
                                                        {/* Radio Circle */}
                                                        <div style={{
                                                            width: '24px', height: '24px', borderRadius: '50%',
                                                            border: isSelected ? '7px solid #BF5AF2' : '2px solid rgba(255,255,255,0.3)',
                                                            backgroundColor: 'transparent',
                                                            transition: 'all 0.2s ease',
                                                            flexShrink: 0
                                                        }} />
                                                        
                                                        <Text size="md" c={isSelected ? 'white' : 'dimmed'} fw={isSelected ? 600 : 400} style={{ lineHeight: 1.4 }}>
                                                            {option}
                                                        </Text>
                                                    </GlassCard>
                                                </Interactive>
                                            );
                                        })}
                                    </SimpleGrid>
                                </Stack>
                            </motion.div>
                        </AnimatePresence>
                    </Box>
                </ScrollArea>

                {/* 3. NAVIGATION CONTROLS (Sticky Bottom) */}
                <Box p={isMobile ? 'md' : '32px'} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <Group justify="space-between">
                        <Button 
                            variant="subtle" 
                            color="gray" 
                            radius="xl"
                            onClick={handleBack} 
                            disabled={currentIndex === 0}
                            leftSection={<IconChevronLeft size={18} />}
                            styles={{ root: { paddingLeft: 8 } }}
                        >
                            Back
                        </Button>

                        <ShimmerButton 
                            onClick={handleNext} 
                            disabled={!isAnswered}
                            size={isMobile ? "md" : "lg"}
                            radius="xl"
                            style={{ paddingRight: 24, paddingLeft: 24, width: isMobile ? 'auto' : undefined }}
                        >
                            <Group gap="xs">
                                <span>{currentIndex === questions.length - 1 ? 'Submit Mission' : 'Next Objective'}</span>
                                {currentIndex === questions.length - 1 ? <IconCheck size={18} /> : <IconChevronRight size={18} />}
                            </Group>
                        </ShimmerButton>
                    </Group>
                </Box>
            </Box>
            </ScrollArea>
        </Modal>
    );
}