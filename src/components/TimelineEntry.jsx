// src/components/TimelineEntry.jsx
"use client";
import { useState } from 'react';
import { Paper, Title, Text, Group, Badge, Checkbox, Button, Collapse, Box, Alert } from '@mantine/core';
import { differenceInCalendarDays } from 'date-fns';
import { IconPencilPlus, IconPrinter, IconBrain } from '@tabler/icons-react';
import Link from 'next/link'; // <-- Import Link
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { QuizModal } from './QuizModal';
import { SummaryModal } from './SummaryModal'; // <-- Import the new modal
import { IconMessageCircle } from '@tabler/icons-react'; // <-- Import a new icon


export function TimelineEntry({ taskGroup, onUpdate }) {
    const [openedNotesId, setOpenedNotesId] = useState(null);
    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    const [quizModalOpened, setQuizModalOpened] = useState(false);

    const [summaryModalOpened, setSummaryModalOpened] = useState(false);

    const { examId, examName, examDate, dailyTopic } = taskGroup;
    
    const daysLeft = differenceInCalendarDays(new Date(examDate), new Date());
    let color = 'brandGreen';
    if (daysLeft < 7) color = 'red';
    else if (daysLeft < 14) color = 'yellow';

    const allTopicsCompleted = dailyTopic.sub_topics?.every(sub => sub.completed) && dailyTopic.sub_topics?.length > 0;

    const handleToggleSubTopic = async (subTopicIndex) => {
        const newSubTopics = [...dailyTopic.sub_topics];
        newSubTopics[subTopicIndex].completed = !newSubTopics[subTopicIndex].completed;
        onUpdate(dailyTopic.id, { sub_topics: newSubTopics });
    };

    // src/components/TimelineEntry.jsx

const handleGenerateNotes = async (subTopicText) => {
    setGeneratingNotesFor(dailyTopic.id);
    setNoteError('');
    try {
        const response = await fetch('/api/generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // --- THIS IS THE FIX: We now send the full context ---
            body: JSON.stringify({ 
                plan_topic_id: dailyTopic.id,
                sub_topic_text: subTopicText,
                exam_name: examName, // The name of the overall plan
                day_topic: dailyTopic.topic_name // The main topic for the day
            }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate notes.');
        const { notes } = await response.json();
        onUpdate(dailyTopic.id, { generated_notes: notes });
    } catch (err) {
        setNoteError(err.message);
    } finally {
        setGeneratingNotesFor(null);
    }
};
    return (
        <>
            <Paper withBorder p="lg" radius="lg">
                <Group justify="space-between">
                    <Link href={`/plan/${examId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Title order={3} style={{ cursor: 'pointer' }}>{examName}</Title>
                    </Link>
                    <Badge color={color} variant="light">{daysLeft > 0 ? `${daysLeft} days left` : 'Exam Day!'}</Badge>
                </Group>
                <Text c="dimmed" size="sm" mt="xs">{dailyTopic.topic_name}</Text>
                
                <Box mt="md" component="ul" style={{ listStyle: 'none', padding: 0 }}>
                    {dailyTopic.sub_topics?.map((subTopic, index) => (
                        <Group key={index} justify="space-between" wrap="nowrap" align="flex-start" mb="sm" component="li">
                            {/* This is the "Task Zone" that can grow */}
                            <Group gap="sm" wrap="nowrap" align="flex-start">
                                <Checkbox 
                                    checked={subTopic.completed || false} 
                                    onChange={() => handleToggleSubTopic(index)}
                                    mt={4} // Adds a slight top margin to align better with the text
                                />
                                {/* The Text component will now wrap naturally within this group */}
                                <Text>{subTopic.text}</Text>
                            </Group>

                            {/* This is the "Button Zone" which is now protected */}
                            <Button 
                                onClick={() => handleGenerateNotes(subTopic.text)} 
                                disabled={generatingNotesFor === dailyTopic.id} 
                                variant="light" 
                                color="grape" 
                                size="xs" 
                                title={`Generate notes for "${subTopic.text}"`}
                                style={{ flexShrink: 0 }} // Prevents the button from ever shrinking
                            >
                                {generatingNotesFor === dailyTopic.id ? '...' : <IconPencilPlus size={16} />}
                            </Button>
                        </Group>
                    ))}
                </Box>

                {/* --- THIS IS THE CORRECTED SECTION --- */}
                {allTopicsCompleted && (
                    <Paper withBorder p="md" mt="lg" radius="md" bg="dark.6">
                        <Text fw={500} mb="sm">Daily Mission Complete!</Text>
                        <Group>
                            <Button color="brandGreen" leftSection={<IconBrain size={16}/>} onClick={() => setQuizModalOpened(true)}>
                                Take a Quiz
                            </Button>
                            <Button variant="default" leftSection={<IconMessageCircle size={16}/>} onClick={() => setSummaryModalOpened(true)}>
                                Write a Summary
                            </Button>
                        </Group>
                    </Paper>
                )}

                {dailyTopic.generated_notes && (
                    <div style={{ marginTop: '1rem' }}>
                        <Button variant="subtle" size="xs" color="gray" onClick={() => setOpenedNotesId(openedNotesId === dailyTopic.id ? null : dailyTopic.id)}>
                            {openedNotesId === dailyTopic.id ? 'Hide Notes' : 'Show Notes'}
                        </Button>
                        <Collapse in={openedNotesId === dailyTopic.id}>
                             <Paper p="sm" mt="xs" withBorder radius="sm" bg="dark.6">
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} size="sm">Study Notes:</Text>
                                    <Button 
                                        component={Link}
                                        href={`/plan/topic/${dailyTopic.id}/pdf`}
                                        target="_blank" // Open in a new tab
                                        variant="default" 
                                        size="xs" 
                                        leftSection={<IconPrinter size={14} />}
                                    >
                                        Export PDF
                                    </Button>
                                </Group>
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>
                                    {dailyTopic.generated_notes}
                                </ReactMarkdown>
                            </Paper>
                        </Collapse>
                    </div>
                )}
                {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
            </Paper>

            <QuizModal opened={quizModalOpened} onClose={() => setQuizModalOpened(false)} planTopicId={dailyTopic.id} />
    <SummaryModal opened={summaryModalOpened} onClose={() => setSummaryModalOpened(false)} planTopicId={dailyTopic.id} />
        </>
    );
}