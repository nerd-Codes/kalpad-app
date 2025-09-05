// src/components/QuizSetupModal.jsx
"use client";

import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Group, Button, Text, Title, Paper, Slider, UnstyledButton, SegmentedControl } from '@mantine/core';
import { IconBolt, IconBrain, IconPuzzle } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import classes from './QuizSetupModal.module.css';
import { ShimmerButton } from './landing/ShimmerButton';


// Data-driven approach for the selection cards
const quizModes = [
    { value: 'Rapid Fire', label: 'Rapid Fire', description: 'Quick-recall facts and definitions.', icon: IconBolt },
    { value: 'Core Concepts', label: 'Core Concepts', description: 'Tests deep, foundational understanding.', icon: IconBrain },
    { value: 'Problem Solving', label: 'Problem Solving', description: 'Application-based scenarios.', icon: IconPuzzle },
];

// A dedicated, reusable sub-component for the selection cards
function ModeCard({ mode, isActive, onClick }) {
    return (
        <UnstyledButton onClick={onClick} className={classes.modeCard} >
             {isActive && (
                <motion.div 
                    className={classes.activeHighlight}
                    layoutId="activeModeHighlight" // This tells framer-motion to animate between cards
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
            )}
            <Stack align="center">
                <mode.icon size={32} color={isActive ? 'var(--mantine-color-brandPurple-4)' : 'var(--mantine-color-gray-5)'} />
                <Text fw={600} fz="lg">{mode.label}</Text>
                <Text c="dimmed" size="xs">{mode.description}</Text>
            </Stack>
        </UnstyledButton>
    );
}

export function QuizSetupModal({ opened, onClose, onStartQuiz, isLoading }) {
    const [questionCount, setQuestionCount] = useState(10);
    const [quizMode, setQuizMode] = useState('Core Concepts');

    const handleStart = () => { onStartQuiz({ question_count: questionCount, quiz_mode: quizMode }); };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Title order={3} ff="Lexend, sans-serif">Mission Parameters</Title>} 
            centered 
            radius="lg"
            size="lg"
            classNames={{ root: classes.modalRoot }} // Apply our custom root class

            styles={{
                body: { padding: '2rem' } // Increase internal padding
            }}
        >
            <div className={classes.backgroundEffect} />
            <Stack gap="2rem" className={classes.content}>
                
                <SimpleGrid cols={3} spacing="lg">
                    {quizModes.map(mode => (
                        <ModeCard 
                            key={mode.value}
                            mode={mode}
                            isActive={quizMode === mode.value}
                            onClick={() => setQuizMode(mode.value)}
                            radius="md"
                        />
                    ))}
                </SimpleGrid>
                
                 <Paper withBorder p="md" radius="md" bg="transparent">
                    <Text fw={500} ta="center" mb="sm">Select Quiz Length</Text>
                    <SegmentedControl
                        value={String(questionCount)} // SegmentedControl works with strings
                        onChange={(value) => setQuestionCount(Number(value))} // Convert back to number on change
                        data={[
                            { label: 'Sprint (5)', value: '5' },
                            { label: 'Standard (10)', value: '10' },
                            { label: 'Marathon (15)', value: '15' },
                        ]}
                        color="brandPurple"
                        fullWidth
                        size="md"
                        radius="xl"
                    />
                </Paper>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <ShimmerButton 
                        onClick={handleStart} 
                        loading={isLoading} 
                        color="brandPurple"
                        leftSection={isLoading ? null : <IconBrain size={16} />}
                        size="md"
                    >
                        {isLoading ? 'Building Your Quiz...' : 'Engage'}
                    </ShimmerButton>
                </Group>
            </Stack>
        </Modal>
    );
}