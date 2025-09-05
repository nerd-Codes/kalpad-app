// src/components/QuizRunner.jsx
"use client";

import { useState, useEffect } from 'react';
import { Modal, Stack, Title, Text, Radio, Group, Button, Progress, UnstyledButton } from '@mantine/core';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import classes from './QuizRunner.module.css';

// A list of "spirit emojis" for the background
const spiritEmojis = ['🧠', '🔥', '💡', '🚀', '🎯', '✨', '🤯'];

export function QuizRunner({ questions, onSubmit, onClose }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    // State to hold a single, randomly chosen emoji for the entire session
    const [spiritEmoji, setSpiritEmoji] = useState('');

    useEffect(() => {
        // Pick a random emoji when the quiz starts and keep it
        setSpiritEmoji(spiritEmojis[Math.floor(Math.random() * spiritEmojis.length)]);
    }, [questions]); // Re-pick if the questions change (new quiz)

    const handleAnswerSelect = (value) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: value }));
        // Automatically go to the next question for a fluid "rapid fire" feel
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            }
        }, 300);
    };

    const handleNext = () => setCurrentQuestionIndex(prev => prev + 1);
    const handleBack = () => setCurrentQuestionIndex(prev => prev - 1);
    
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
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <Modal 
            opened={true} 
            onClose={onClose} 
            title={<Title order={3} ff="Lexend, sans-serif">Quiz in Progress</Title>} 
            size="xl" // A comfortable, larger size
            centered 
            radius="lg"
        >
            <GlassCard p="xl" style={{ position: 'relative', overflow: 'hidden' }}>
                 <Text
                    style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        fontSize: '8rem', opacity: 0.05, zIndex: 1, userSelect: 'none',
                    }}
                 >
                    {spiritEmoji}
                </Text>
                
                <Stack style={{ position: 'relative', zIndex: 2 }}>
                    <Progress value={progress} size="lg" radius="xl" color="brandPurple" striped animated />
                    
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } }}
                        >
                            <Stack>
                                <Title order={3} ff="Lexend, sans-serif" mt="xl">
                                    {currentQuestion.question_text}
                                </Title>
                                
                                <Stack gap="md" mt="md">
                                    {currentQuestion.options.map(option => (
                                        <UnstyledButton
                                            key={option}
                                            className={`${classes.optionCard} ${answers[currentQuestionIndex] === option ? classes.selected : ''}`}
                                            p="md"
                                            radius="md"
                                            onClick={() => handleAnswerSelect(option)}
                                        >
                                            <Group>
                                                <Radio checked={answers[currentQuestionIndex] === option} readOnly tabIndex={-1} />
                                                <Text>{option}</Text>
                                            </Group>
                                        </UnstyledButton>
                                    ))}
                                </Stack>
                            </Stack>
                        </motion.div>
                    </AnimatePresence>

                    <Group justify="space-between" mt="xl">
                        <Button variant="default" onClick={handleBack} disabled={currentQuestionIndex === 0}>Back</Button>
                        {currentQuestionIndex < questions.length - 1 ? (
                            <Button onClick={handleNext} disabled={!answers[currentQuestionIndex]} color="brandPurple">Next</Button>
                        ) : (
                            <Button color="brandGreen" onClick={handleSubmit} disabled={!answers[currentQuestionIndex]}>Finish & Submit</Button>
                        )}
                    </Group>
                </Stack>
            </GlassCard>
        </Modal>
    );
}