// src/components/TimelineDayCard.jsx
"use client";

import { useState } from 'react';
import { Paper, Box, Group, Checkbox, Button, Collapse, Text, Alert } from '@mantine/core';
import { IconPencilPlus, IconBrain } from '@tabler/icons-react';
import { PDFButton } from './PDFButton';
import { QuizModal } from './QuizModal';
import { SummaryModal } from './SummaryModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useDisclosure } from '@mantine/hooks';
import { GlassCard } from './GlassCard';
import { useLoading } from '@/context/LoadingContext';

export function TimelineDayCard({ dayTopic, onUpdate, isInitiallyCollapsed }) {
    const { setIsLoading } = useLoading();

    const [openedNotesId, setOpenedNotesId] = useState(null);
    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    const [quizModalOpened, setQuizModalOpened] = useState(false);
    const [summaryModalOpened, setSummaryModalOpened] = useState(false);
    const [opened, { toggle }] = useDisclosure(!isInitiallyCollapsed);

    const allTopicsCompleted = dayTopic.sub_topics?.every(sub => sub.completed) && dayTopic.sub_topics?.length > 0;

    const handleToggleSubTopic = (subTopicIndex) => {
        const newSubTopics = [...dayTopic.sub_topics];
        newSubTopics[subTopicIndex].completed = !newSubTopics[subTopicIndex].completed;
        onUpdate(dayTopic.id, { sub_topics: newSubTopics });
    };

    const handleGenerateNotes = async (subTopicText) => {
        setIsLoading(true);
        setGeneratingNotesFor(dayTopic.id);
        setNoteError('');
        try {
            const response = await fetch('/api/generate-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: dayTopic.id, sub_topic_text: subTopicText }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate notes.');
            const { notes } = await response.json();
            onUpdate(dayTopic.id, { generated_notes: notes });
        } catch (err) {
            setNoteError(err.message);
        } finally {
            setIsLoading(false);
            setGeneratingNotesFor(null);
        }
    };


    return (
        <>
            {isInitiallyCollapsed && (
                <Button variant="subtle" size="xs" onClick={toggle} mb="xs">
                    {opened ? 'Hide Details' : 'Show Details'}
                </Button>
            )}

            <Collapse in={opened}>
                <GlassCard>
                    <Box component="ul" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {dayTopic.sub_topics?.map((subTopic, index) => (
                            <Group key={index} wrap="nowrap" align="center" mb="sm" component="li">
                                <Checkbox checked={subTopic.completed || false} onChange={() => handleToggleSubTopic(index)} />
                                <Text style={{ flexGrow: 1 }}>{subTopic.text}</Text>
                                <Button 
                                    onClick={() => handleGenerateNotes(subTopic.text)} 
                                    disabled={generatingNotesFor === dayTopic.id} 
                                    variant="light" color="grape" size="xs" 
                                    title={`Generate notes for "${subTopic.text}"`}
                                >
                                    {generatingNotesFor === dayTopic.id ? '...' : <IconPencilPlus size={16} />}
                                </Button>
                            </Group>
                        ))}
                    </Box>

                    {allTopicsCompleted && (
                        <GlassCard mt="lg">
                            <Text fw={500} mb="sm">Daily Mission Complete!</Text>
                            <Group>
                                <Button color="brandGreen" leftSection={<IconBrain size={16}/>} onClick={() => setQuizModalOpened(true)}>Take a Quiz</Button>
                                <Button variant="default" onClick={() => setSummaryModalOpened(true)}>Write a Summary</Button>
                            </Group>
                        </GlassCard>
                    )}

                    {dayTopic.generated_notes && (
                        <div style={{ marginTop: '1rem' }}>
                            <Button variant="subtle" size="xs" color="gray" onClick={() => setOpenedNotesId(openedNotesId === dayTopic.id ? null : dayTopic.id)}>
                                {openedNotesId === dayTopic.id ? 'Hide Notes' : 'Show Notes'}
                            </Button>
                            <Collapse in={openedNotesId === dayTopic.id}>
                                <GlassCard mt="xs">
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={500} size="sm">Study Notes:</Text>
                                        <PDFButton dayTopic={dayTopic} />
                                    </Group>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>
                                        {dayTopic.generated_notes}
                                    </ReactMarkdown>
                                </GlassCard>
                            </Collapse>
                        </div>
                    )}
                    {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
                </GlassCard>
            </Collapse>

            <QuizModal opened={quizModalOpened} onClose={() => setQuizModalOpened(false)} planTopicId={dayTopic.id} />
            <SummaryModal opened={summaryModalOpened} onClose={() => setSummaryModalOpened(false)} planTopicId={dayTopic.id} />
        </>
    );
}