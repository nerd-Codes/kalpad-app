"use client";

import { useState } from 'react';
import { Modal, Stack, Text, Group, Button, Box, Progress, SimpleGrid, ScrollArea } from '@mantine/core';
import { IconChevronRight, IconChevronLeft, IconCheck, IconTarget } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';
import { QuizRichText } from '@/components/quiz/QuizRichText';
import { useUniformOptionHeight } from '@/hooks/useUniformOptionHeight';

// --- VISUAL CONSTANTS ---
const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: 0,
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100vh',
        maxHeight: '100vh',
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0, zIndex: 10 },
    body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export function QuizRunner({ questions, onSubmit, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [direction, setDirection] = useState(1); // 1 = Next, -1 = Back

    const currentQuestion = questions[currentIndex];
    const progressVal = ((currentIndex + 1) / questions.length) * 100;
    const isAnswered = answers[currentIndex] !== undefined;
    const { optionHeight, setOptionRef } = useUniformOptionHeight(currentQuestion.options);

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
            fullScreen
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
            zIndex={7000}
        >
            <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                
                {/* 1. HUD: PROGRESS (Sticky Top) */}
                <Box p={{ base: 'md', md: '32px' }} pb={0}>
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
                <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                    <Box p={{ base: 'md', md: '32px' }}>
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
                                    <QuizRichText
                                        content={currentQuestion.question_text}
                                        variant="question"
                                        style={{ fontSize: 'clamp(1.25rem, 2vw, 1.55rem)' }}
                                    />

                                    {/* The Options Grid */}
                                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                        {currentQuestion.options.map((option, i) => {
                                            const isSelected = answers[currentIndex] === option;
                                            return (
                                                <Box key={i} ref={setOptionRef(i)} style={{ height: optionHeight ? `${optionHeight}px` : 'auto' }}>
                                                    <Interactive onClick={() => handleSelect(option)} className="h-full">
                                                        <GlassCard 
                                                            p="md" 
                                                            h="100%"
                                                            style={{ 
                                                                backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                border: isSelected ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.08)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '16px',
                                                                height: '100%',
                                                                minHeight: optionHeight ? undefined : '88px',
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '24px', height: '24px', borderRadius: '50%',
                                                                border: isSelected ? '7px solid #BF5AF2' : '2px solid rgba(255,255,255,0.3)',
                                                                backgroundColor: 'transparent',
                                                                transition: 'all 0.2s ease',
                                                                flexShrink: 0,
                                                                marginTop: '2px',
                                                            }} />

                                                            <QuizRichText
                                                                content={option}
                                                                variant="option"
                                                                style={{ color: isSelected ? '#FFFFFF' : '#A1A1AA', flex: 1 }}
                                                            />
                                                        </GlassCard>
                                                    </Interactive>
                                                </Box>
                                            );
                                        })}
                                    </SimpleGrid>
                                </Stack>
                            </motion.div>
                        </AnimatePresence>
                    </Box>
                </ScrollArea>

                {/* 3. NAVIGATION CONTROLS (Sticky Bottom) */}
                <Box p={{ base: 'md', md: '32px' }} pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
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
                            size="lg"
                            radius="xl"
                            style={{ paddingRight: 24, paddingLeft: 24 }}
                        >
                            <Group gap="xs">
                                <span>{currentIndex === questions.length - 1 ? 'Submit Mission' : 'Next Objective'}</span>
                                {currentIndex === questions.length - 1 ? <IconCheck size={18} /> : <IconChevronRight size={18} />}
                            </Group>
                        </ShimmerButton>
                    </Group>
                </Box>
            </Box>
        </Modal>
    );
}
