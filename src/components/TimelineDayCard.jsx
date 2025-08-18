// src/components/TimelineDayCard.jsx
"use client";

import { useState } from 'react';
// --- MODIFICATION: ADDED NEW MANTINE COMPONENTS & ICONS ---
import { Paper, Box, Group, Checkbox, Button, Collapse, Text, Alert, Badge, List, Stack, Title } from '@mantine/core';
import { IconPencilPlus, IconBrain, IconPlayerPlay, IconClock } from '@tabler/icons-react';
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


export function TimelineDayCard({ dayTopic, onUpdate, isInitiallyCollapsed }) {
     const { setIsLoading } = useLoading();

    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    const [quizModalOpened, setQuizModalOpened] = useState(false);
    const [summaryModalOpened, setSummaryModalOpened] = useState(false);
    
    // --- MODIFICATION: RENAMED `opened` to avoid conflict, simplified state ---
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(!isInitiallyCollapsed);
    const [notesOpened, { toggle: toggleNotes }] = useDisclosure(false);

    const allTopicsCompleted = dayTopic.sub_topics?.every(sub => sub.completed) && dayTopic.sub_topics?.length > 0;

     const handleCheckboxChange = (subTopicIndex, isChecked) => {
        const newSubTopics = dayTopic.sub_topics.map((sub, index) => {
            if (index === subTopicIndex) {
                return { ...sub, completed: isChecked };
            }
            return sub;
        });
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
            <Button variant="subtle" size="xs" onClick={toggleDetails} mb="xs">
                {detailsOpened ? 'Hide Details' : 'Show Details'}
            </Button>
        )}

        <Collapse in={detailsOpened}>
            <GlassCard withBorder style={{ borderLeft: `5px solid ${getDayDifficultyColor(dayTopic.day_difficulty)}`}}>
                <Stack gap="md">
                    {/* --- UPGRADED HEADER --- */}
                    <Group justify="space-between">
                        <Title order={4} ff="Lexend, sans-serif">{dayTopic.topic_name}</Title>
                        <Group gap="xs">
                            <Badge
                                color="gray"
                                variant="light"
                                size="sm"
                                leftSection={<IconClock size={14} style={{ marginRight: '-0.2rem' }} />}
                            >
                                {dayTopic.study_hours} hrs
                            </Badge>
                            <Badge color={getDayDifficultyColor(dayTopic.day_difficulty)} size="sm" variant="light">
                                {dayTopic.day_difficulty}
                            </Badge>
                        </Group>
                    </Group>

                    {/* --- NEW DAY SUMMARY --- */}
                    <Text c="dimmed" size="sm" mt={-12}>
                        {dayTopic.day_summary}
                    </Text>
                    
                    {/* --- UPGRADED SUB-TOPICS LIST (NO BULLETS) --- */}
                    <Stack gap="sm" mt="xs">
                        {dayTopic.sub_topics?.map((subTopic, index) => (
                            <Box key={index}>
                                <Group justify="space-between" wrap="nowrap" align="flex-start">
                                    {/* Task Zone */}
                                    <Checkbox
                                        checked={subTopic.completed}
                                        onChange={(event) => handleCheckboxChange(index, event.currentTarget.checked)}
                                        label={
                                            <Text strikethrough={subTopic.completed} c={subTopic.completed ? 'dimmed' : 'inherit'}>
                                                {subTopic.text}
                                            </Text>
                                        }
                                    />
                                    {/* Button Zone (RESTORED) */}
                                    <Group gap="xs" wrap="nowrap">
                                        <Button 
                                            onClick={() => handleGenerateNotes(subTopic.text)} 
                                            disabled={generatingNotesFor === dayTopic.id} 
                                            variant="light" 
                                            color="grape" 
                                            size="xs" 
                                            title={`Generate notes for "${subTopic.text}"`}
                                            style={{ flexShrink: 0 }}
                                        >
                                            {generatingNotesFor === dayTopic.id ? '...' : <IconPencilPlus size={16} />}
                                        </Button>

                                        {(() => {
                                            const lecture = dayTopic.curated_lectures?.find(l => l.sub_topic_text === subTopic.text);
                                            if (lecture) {
                                                return (
                                                    <Button
                                                        component="a"
                                                        href={lecture.video_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        variant="filled"
                                                        color="red"
                                                        size="xs"
                                                        title={`Watch lecture for "${subTopic.text}"`}
                                                        style={{ flexShrink: 0 }}
                                                    >
                                                        <IconPlayerPlay size={16} />
                                                    </Button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </Group>
                                </Group>
                                <Group gap="xs" mt={4} ml={30}>
                                    <Badge size="xs" variant="light" color={getSubTopicTypeColor(subTopic.type)}>{subTopic.type}</Badge>
                                    <Badge size="xs" variant="light" color={getDayDifficultyColor(subTopic.difficulty)}>{subTopic.difficulty}</Badge>
                                </Group>
                            </Box>
                        ))}
                    </Stack>

                    {allTopicsCompleted && (
                        <GlassCard mt="md">
                            <Text fw={500} mb="sm">Daily Mission Complete!</Text>
                            <Group>
                                <Button color="brandGreen" leftSection={<IconBrain size={16}/>} onClick={() => setQuizModalOpened(true)}>Take a Quiz</Button>
                                <Button variant="default" onClick={() => setSummaryModalOpened(true)}>Write a Summary</Button>
                            </Group>
                        </GlassCard>
                    )}
                    
                    {dayTopic.generated_notes && (
                       <Box mt="md">
                           <Button variant="subtle" size="xs" color="gray" onClick={toggleNotes}>
                               {notesOpened ? 'Hide Notes' : 'Show Notes'}
                           </Button>
                           <Collapse in={notesOpened}>
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
                       </Box>
                    )}
                    {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
                </Stack>
            </GlassCard>
        </Collapse>

        <QuizModal opened={quizModalOpened} onClose={() => setQuizModalOpened(false)} planTopicId={dayTopic.id} />
        <SummaryModal opened={summaryModalOpened} onClose={() => setSummaryModalOpened(false)} planTopicId={dayTopic.id} />
    </>
);
}