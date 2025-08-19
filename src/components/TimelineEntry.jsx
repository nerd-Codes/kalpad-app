// src/components/TimelineEntry.jsx
"use client";

import { useState } from 'react';
import { Paper, Title, Text, Group, Badge, Checkbox, Button, Box, Alert, Stack, ActionIcon, Tooltip } from '@mantine/core';
import { differenceInCalendarDays } from 'date-fns';
import { IconPencilPlus, IconBrain, IconPlayerPlay, IconMessageCircle, IconEye } from '@tabler/icons-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { notifications } from '@mantine/notifications';
import { FullscreenNoteViewer } from './FullscreenNoteViewer';
import { QuizModal } from './QuizModal';
import { SummaryModal } from './SummaryModal';

// --- MODIFICATION: ADDED HELPER FUNCTIONS FOR DYNAMIC BADGE COLORS ---
const getDayDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
        case 'easy': return 'green';
        case 'medium': return 'yellow';
        case 'hard': return 'orange';
        case 'intense': return 'red';
        default: return 'gray';
    }
};

const getSubTopicTypeColor = (type) => {
    switch (type?.toLowerCase()) {
        case 'concept': return 'blue';
        case 'problem-solving': return 'grape';
        case 'derivation': return 'cyan';
        case 'review': return 'teal';
        default: return 'gray';
    }
};

// --- ARCHITECTURAL OVERHAUL ---
// The component now accepts the full `plan` object for context and a refetch function.
export function TimelineEntry({ taskGroup, onUpdate, onNoteGenerated }) {
    const { setIsLoading } = useLoading();
    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    const [quizModalOpened, setQuizModalOpened] = useState(false);
    const [summaryModalOpened, setSummaryModalOpened] = useState(false);
    const [noteToView, setNoteToView] = useState(null);

    const { plan, dailyTopic } = taskGroup;
    const { exam_name: examName, exam_date: examDate, id: examId } = plan;
    
    const daysLeft = differenceInCalendarDays(new Date(examDate), new Date());
    let color = 'brandGreen';
    if (daysLeft < 7) color = 'red';
    else if (daysLeft < 14) color = 'yellow';

    const allTopicsCompleted = dailyTopic.sub_topics?.every(sub => sub.completed) && dailyTopic.sub_topics?.length > 0;

    const handleCheckboxChange = (subTopicIndex, isChecked) => {
        const newSubTopics = dailyTopic.sub_topics.map((sub, index) => 
            index === subTopicIndex ? { ...sub, completed: isChecked } : sub
        );
        onUpdate(dailyTopic.id, { sub_topics: newSubTopics });
    };

    const handleGenerateNotes = async (subTopicText) => {
        setIsLoading(true);
        setGeneratingNotesFor(subTopicText);
        setNoteError('');
        try {
            const response = await fetch('/api/generate-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan_topic_id: dailyTopic.id,
                    sub_topic_text: subTopicText,
                    exam_name: examName,
                    day_topic: dailyTopic.topic_name
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate notes.');
            
            if (onNoteGenerated) {
                await onNoteGenerated();
            }

            notifications.show({
                title: 'Note Generated & Synced!',
                message: 'Your new study note has been added to your timeline.',
                color: 'teal',
            });

        } catch (err) {
            notifications.show({ title: 'Note Generation Failed', message: err.message, color: 'red' });
            setNoteError(err.message);
        } finally {
            setIsLoading(false);
            setGeneratingNotesFor(null);
        }
    };

    return (
        <>
            <Paper withBorder p="lg" radius="lg" style={{ borderLeft: `5px solid ${getDayDifficultyColor(dailyTopic.day_difficulty)}`}}>
                <Stack>
                    <Group justify="space-between">
                        <Link href={`/plan/${examId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Title order={3} style={{ cursor: 'pointer' }}>{examName}</Title>
                        </Link>
                        <Badge color={color} variant="light">{daysLeft > 0 ? `${daysLeft} days left` : 'Exam Day!'}</Badge>
                    </Group>
                    <Text c="dimmed" size="sm" mt={-10}>{dailyTopic.topic_name}</Text>
                    
                    <Stack gap="sm" mt="xs">
                        {dailyTopic.sub_topics?.map((subTopic, index) => {
                            const v2_note = dailyTopic.new_notes?.find(n => n.sub_topic_text === subTopic.text);
                            const v1_note = (index === 0 && dailyTopic.generated_notes) ? { notes_markdown: dailyTopic.generated_notes, sub_topic_text: subTopic.text } : null;
                            const existingNote = v2_note || v1_note;

                            return (
                                <Box key={index}>
                                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                                        <Checkbox
                                            checked={subTopic.completed}
                                            onChange={(event) => handleCheckboxChange(index, event.currentTarget.checked)}
                                            label={
                                                <Text td={subTopic.completed ? 'line-through' : 'none'} c={subTopic.completed ? 'dimmed' : 'inherit'}>
                                                    {subTopic.text}
                                                </Text>
                                            }
                                        />
                                        <Group gap="xs" wrap="nowrap">
                                            {existingNote ? (
                                                <Tooltip label="View Note" withArrow>
                                                    <ActionIcon variant="light" color="blue" size="lg" onClick={() => setNoteToView({ ...existingNote, sub_topic: subTopic, day_topic: dailyTopic, exam_name: examName })}>
                                                        <IconEye size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip label="Generate Note" withArrow>
                                                    <ActionIcon variant="light" color="grape" size="lg" onClick={() => handleGenerateNotes(subTopic.text)} loading={generatingNotesFor === subTopic.text}>
                                                        <IconPencilPlus size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Group>
                                    <Group gap="xs" mt={4} ml={30}>
                                        <Badge size="xs" variant="light" color={getSubTopicTypeColor(subTopic.type)}>{subTopic.type}</Badge>
                                        <Badge size="xs" variant="light" color={getDayDifficultyColor(subTopic.difficulty)}>{subTopic.difficulty}</Badge>
                                    </Group>
                                </Box>
                            )
                        })}
                    </Stack>
                    
                    {allTopicsCompleted && (
                        <Paper withBorder p="md" mt="lg" radius="md" bg="dark.6">
                            <Text fw={500} mb="sm">Daily Mission Complete!</Text>
                            <Group>
                                <Button color="brandGreen" leftSection={<IconBrain size={16}/>} onClick={() => setQuizModalOpened(true)}>Take a Quiz</Button>
                                <Button variant="default" leftSection={<IconMessageCircle size={16}/>} onClick={() => setSummaryModalOpened(true)}>Write a Summary</Button>
                            </Group>
                        </Paper>
                    )}
                    
                    {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
                </Stack>
            </Paper>

            <QuizModal opened={quizModalOpened} onClose={() => setQuizModalOpened(false)} planTopicId={dailyTopic.id} />
            <SummaryModal opened={summaryModalOpened} onClose={() => setSummaryModalOpened(false)} planTopicId={dailyTopic.id} />
            <FullscreenNoteViewer noteData={noteToView} onClose={() => setNoteToView(null)} onUpdate={onUpdate} />
        </>
    );
}