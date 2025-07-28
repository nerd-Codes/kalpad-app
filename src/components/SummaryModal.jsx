// src/components/SummaryModal.jsx
"use client";
import { useState } from 'react';
import { Modal, Button, Group, Text, Title, Textarea, Loader, Alert, RingProgress } from '@mantine/core';

export function SummaryModal({ opened, onClose, planTopicId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [summaryText, setSummaryText] = useState('');
    const [result, setResult] = useState(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            // 1. Get evaluation from AI
            const evalResponse = await fetch('/api/evaluate-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: planTopicId, user_summary: summaryText }),
            });
            if (!evalResponse.ok) throw new Error((await evalResponse.json()).error || 'Failed to evaluate summary.');
            const evaluation = await evalResponse.json();
            setResult(evaluation);

            // 2. Save the score to the database
            await fetch('/api/save-confidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: planTopicId, activity_type: 'summary', score: evaluation.score }),
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Reset state when modal is closed
    const handleClose = () => {
        setSummaryText('');
        setResult(null);
        setError('');
        onClose();
    };

    return (
        <Modal opened={opened} onClose={handleClose} title={<Title order={4}>Summarize Your Learning</Title>} size="lg" centered>
            {result === null ? (
                <>
                    <Text mb="md">In 2-3 paragraphs, write down everything you remember about the topics you just completed. This is a powerful way to solidify your knowledge.</Text>
                    <Textarea 
                        placeholder="Start writing..."
                        value={summaryText}
                        onChange={(e) => setSummaryText(e.target.value)}
                        autosize
                        minRows={6}
                    />
                    <Group justify="flex-end" mt="xl">
                        <Button color="brandGreen" onClick={handleSubmit} loading={loading} disabled={!summaryText.trim()}>
                            Evaluate My Summary
                        </Button>
                    </Group>
                    {error && <Alert color="red" mt="md">{error}</Alert>}
                </>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <Title order={2} mb="md">Evaluation Complete!</Title>
                    <RingProgress
                        sections={[{ value: result.score, color: 'brandGreen' }]}
                        label={<Text c="brandGreen" fw={700} ta="center" size="xl">{result.score}%</Text>}
                        size={120} thickness={12} roundCaps mx="auto"
                    />
                    <Text fw={500} mt="lg">Feedback:</Text>
                    <Text mt="xs" c="dimmed">"{result.feedback}"</Text>
                    <Button mt="xl" onClick={handleClose}>Close</Button>
                </div>
            )}
        </Modal>
    );
}
