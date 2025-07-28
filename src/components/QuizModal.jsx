// src/components/QuizModal.jsx
"use client";
import { useState, useEffect } from 'react';
import { Modal, Button, Group, Text, Title, Radio, Loader, Alert, RingProgress } from '@mantine/core';
import supabase from '@/lib/supabaseClient';

export function QuizModal({ opened, onClose, planTopicId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [score, setScore] = useState(null);

    useEffect(() => {
        if (opened && planTopicId) {
            // Reset state when modal opens
            setLoading(true);
            setError('');
            setQuiz(null);
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
            setScore(null);

            const fetchQuiz = async () => {
                try {
                    const response = await fetch('/api/generate-quiz', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan_topic_id: planTopicId }),
                    });
                    if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate quiz.');
                    const data = await response.json();
                    setQuiz(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
        }
    }, [opened, planTopicId]);

    const handleAnswerSelect = (option) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestionIndex]: option,
        });
    };

    const handleSubmit = async () => {
        let correctAnswers = 0;
        quiz.questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correct_answer) {
                correctAnswers++;
            }
        });
        const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
        setScore(finalScore);

        // Save score to the database
        await supabase
            .from('topic_confidence')
            .insert({
                plan_topic_id: planTopicId,
                activity_type: 'quiz',
                score: finalScore
            });
    };

    const currentQuestion = quiz?.questions[currentQuestionIndex];

    return (
        <Modal opened={opened} onClose={onClose} title={<Title order={4}>Test Your Knowledge</Title>} size="lg" centered>
            {loading && <Group justify="center" py="xl"><Loader /><Text ml="md">Generating your quiz...</Text></Group>}
            {error && <Alert color="red">{error}</Alert>}
            
            {quiz && score === null && currentQuestion && (
                <>
                    <Text fw={500}>{currentQuestionIndex + 1}. {currentQuestion.question_text}</Text>
                    <Radio.Group value={selectedAnswers[currentQuestionIndex] || null} onChange={handleAnswerSelect} mt="md">
                        <Group mt="xs" direction="column">
                            {currentQuestion.options.map(option => <Radio key={option} value={option} label={option} />)}
                        </Group>
                    </Radio.Group>
                    <Group justify="flex-end" mt="xl">
                        {currentQuestionIndex < quiz.questions.length - 1 ? (
                            <Button onClick={() => setCurrentQuestionIndex(i => i + 1)} disabled={!selectedAnswers[currentQuestionIndex]}>Next</Button>
                        ) : (
                            <Button color="brandGreen" onClick={handleSubmit} disabled={!selectedAnswers[currentQuestionIndex]}>Finish & See Score</Button>
                        )}
                    </Group>
                </>
            )}

            {score !== null && (
                <div style={{ textAlign: 'center' }}>
                    <Title order={2} mb="md">Quiz Complete!</Title>
                    <RingProgress
                        sections={[{ value: score, color: 'brandGreen' }]}
                        label={<Text c="brandGreen" fw={700} ta="center" size="xl">{score}%</Text>}
                        size={120}
                        thickness={12}
                        roundCaps
                        mx="auto"
                    />
                    <Text mt="lg">You scored {score}%. Great job solidifying your knowledge!</Text>
                    <Button mt="xl" onClick={onClose}>Close</Button>
                </div>
            )}
        </Modal>
    );
}