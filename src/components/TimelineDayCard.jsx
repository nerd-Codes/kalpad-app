// src/components/TimelineDayCard.jsx
"use client";

import { useState } from 'react';
// --- MODIFICATION: ADDED NEW MANTINE COMPONENTS & ICONS ---
import { Box, Group, Checkbox, Button, Collapse, Text, Alert, Badge, Stack, Title, ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconPencilPlus, IconBrain, IconPlayerPlay, IconClock, IconChevronDown, IconEye } from '@tabler/icons-react';
import { FullscreenNoteViewer } from './FullscreenNoteViewer';
import { QuizModal } from './QuizModal';
import { SummaryModal } from './SummaryModal';
import { notifications } from '@mantine/notifications';
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


export function TimelineDayCard({plan, dayTopic, onUpdate, isInitiallyCollapsed, onNoteGenerated, onUpdateCompletion }) {
     const { setIsLoading } = useLoading();

    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    const [quizModalOpened, setQuizModalOpened] = useState(false);
    const [summaryModalOpened, setSummaryModalOpened] = useState(false);
    
    // --- MODIFICATION: RENAMED `opened` to avoid conflict, simplified state ---
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(!isInitiallyCollapsed);
    // --- NEW STATE & LOGIC FOR THE FULLSCREEN VIEWER (PREPARATION FOR PHASE 3) ---
    const [noteToView, setNoteToView] = useState(null); 
    // This will eventually open the FullscreenNoteViewer.jsx modal.
    // For now, setting this state is the goal.

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
        // --- RESTORED: ENGAGE THE GLOBAL PAGE LOADER ---
        setIsLoading(true); 
        setGeneratingNotesFor(subTopicText); // Keep per-button loader
        setNoteError('');
        try {
            const response = await fetch('/api/generate-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_topic_id: dayTopic.id,
                    sub_topic_text: subTopicText,
                    exam_name: dayTopic.exam_name, 
                    day_topic: dayTopic.topic_name,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate notes.');
            }
            
            // This is now guaranteed to work because the prop is received.
            if (onNoteGenerated) {
                await onNoteGenerated();
            }

            notifications.show({
                title: 'Note Generated & Synced!',
                message: 'Your new study note is ready and has been added to your timeline.',
                color: 'teal',
            });

        } catch (err) {
            notifications.show({
                title: 'Note Generation Failed',
                message: err.message,
                color: 'red',
            });
            setNoteError(err.message);
        } finally {
            // --- RESTORED: DISENGAGE ALL LOADERS ---
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
                        {dayTopic.sub_topics?.map((subTopic, index) => {
                            // --- CRITICAL LOGIC: CHECK FOR EXISTING NOTES (V1 & V2) ---
                            const v2_note = dayTopic.new_notes?.find(n => n.sub_topic_text === subTopic.text);
                            const v1_note = (index === 0 && dayTopic.generated_notes) ? { notes_markdown: dayTopic.generated_notes, sub_topic_text: subTopic.text } : null;
                            const existingNote = v2_note || v1_note;

                            return (
                                <Box key={index}>
                                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                                        <Checkbox
                                            checked={subTopic.completed}
                                            onChange={(event) => handleCheckboxChange(index, event.currentTarget.checked)}
                                            label={
                                                <Text
                                                td={subTopic.completed ? 'line-through' : 'none'}
                                                c={subTopic.completed ? 'dimmed' : 'inherit'}
                                            >
                                                    {subTopic.text}
                                                </Text>
                                            }
                                        />
                                        <Group gap="xs" wrap="nowrap">
                                            {existingNote ? (
                                                <Tooltip label="View Note" withArrow>
                                                    <ActionIcon 
                                                        variant="light" 
                                                        color="blue" 
                                                        size="lg"
                                                         onClick={() => setNoteToView({ 
                                                                ...existingNote, 
                                                                sub_topic: subTopic, 
                                                                day_topic: dayTopic, 
                                                                exam_name: plan.exam_name // Use the prop from the parent plan object
                                                            })}
                                                    >
                                                        <IconEye size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip label="Generate Note" withArrow>
                                                    <ActionIcon 
                                                        variant="light" 
                                                        color="grape" 
                                                        size="lg"
                                                        onClick={() => handleGenerateNotes(subTopic.text)}
                                                        loading={generatingNotesFor === subTopic.text}
                                                    >
                                                        <IconPencilPlus size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                             {(() => {
                                                const lecture = dayTopic.curated_lectures?.find(l => l.sub_topic_text === subTopic.text);
                                                if (lecture) {
                                                    return (
                                                        <ActionIcon
                                                            component="a"
                                                            href={lecture.video_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            variant="filled"
                                                            color="red"
                                                            size="lg"
                                                            title={`Watch lecture for "${subTopic.text}"`}
                                                        >
                                                            <IconPlayerPlay size={18} />
                                                        </ActionIcon>
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
                            )
                        })}
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
                    
                    {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
                </Stack>
            </GlassCard>
        </Collapse>

        <QuizModal opened={quizModalOpened} onClose={() => setQuizModalOpened(false)} planTopicId={dayTopic.id} />
        <SummaryModal opened={summaryModalOpened} onClose={() => setSummaryModalOpened(false)} planTopicId={dayTopic.id} />

        <FullscreenNoteViewer 
                noteData={noteToView} 
                onClose={() => setNoteToView(null)} 
                onUpdate={onUpdate} // Pass the function down
            />
        </>
);
}