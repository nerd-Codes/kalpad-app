// src/components/QuizResults.jsx
"use client";

import { Modal, Stack, Title, Text, RingProgress, Accordion, Group, Badge, Paper, ScrollArea, Button, Center } from '@mantine/core';
import { IconCheck, IconX, IconRefresh, IconMoodHappy, IconMoodSad, IconTrophy } from '@tabler/icons-react';
import { GlassCard } from './GlassCard';

// This sub-component is now architecturally sound and pixel-perfect.
function ScoreDisplay({ score }) {
    let color = 'red.8';
    let emoji = <IconMoodSad size={48} />;
    if (score >= 80) {
        color = 'brandGreen.6';
        emoji = <IconTrophy size={48} />;
    } else if (score >= 50) {
        color = 'yellow.6';
        emoji = <IconMoodHappy size={48} />;
    }

    return (
        <Stack align="center" gap="xs">
            <RingProgress
                sections={[{ value: score, color: color }, { value: 100 - score, color: 'var(--mantine-color-dark-6)' }]}
                size={220} thickness={18} 
                label={
                    // --- DEFINITIVE FIX: USE A <Center> COMPONENT FOR PERFECT ALIGNMENT ---
                    <Center>
                        <Stack align="center" gap={0}>
                            <Text c={color} fw={700} ta="center" size={40} ff="Lexend, sans-serif">
                                {score}%
                            </Text>
                        </Stack>
                    </Center>
                }
            />
        </Stack>
    );
}

export function QuizResults({ results, onClose, onRetake }) {
    const { score, feedback_summary, full_results } = results;

    return (
        <Modal 
            opened={true} 
            onClose={onClose} 
            title={<Title order={3} ff="Lexend, sans-serif">Mission Debrief</Title>} 
            size="55rem"
            centered 
            radius="lg"
        >
            <ScrollArea h="70vh">
                <Stack gap="xl" p="md">
                    <ScoreDisplay score={score} />
                    
                    <GlassCard p="lg">
                        <Title order={4} ff="Lexend, sans-serif">AI Performance Analysis</Title>
                        <Text c="dimmed" mt="xs">{feedback_summary}</Text>
                    </GlassCard>

                    <Title order={4} ff="Lexend, sans-serif" ta="center">Question Breakdown</Title>
                    <Accordion variant="separated" w="100%" radius="md">
                        
                        {full_results.map((item, index) => (
                            <Accordion.Item value={String(index)} key={index} bg="dark.6">
                                <Accordion.Control icon={item.is_correct ? <IconCheck color="var(--mantine-color-brandGreen-4)" /> : <IconX color="var(--mantine-color-red-5)" />}>
                                    <Text>{item.question_text}</Text>
                                </Accordion.Control>
                                <Accordion.Panel bg="dark.7">
                                    <Stack gap="xs" p="md">
                                        <Text size="sm">Your Answer: <Badge color={item.is_correct ? 'green' : 'red'} variant="light">{item.user_answer || "Not Answered"}</Badge></Text>
                                        {!item.is_correct && (
                                            <>
                                                <Text size="sm">Correct Answer: <Badge color="green" variant="light">{item.correct_answer}</Badge></Text>
                                                <Paper withBorder p="sm" radius="sm" bg="dark.8" mt="xs">
                                                    <Text size="sm" fw={500}>The Professor's Explanation:</Text>
                                                    <Text size="sm" c="dimmed">{item.ai_explanation}</Text>
                                                </Paper>
                                            </>
                                        )}
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </Stack>
            </ScrollArea>
             <Group justify="flex-end" mt="xl" p="md" pt={0}>
                <Button variant="default" onClick={onClose}>Close</Button>
                <Button leftSection={<IconRefresh size={16} />} onClick={onRetake} color="brandPurple">Retake Quiz</Button>
            </Group>
        </Modal>
    );
}