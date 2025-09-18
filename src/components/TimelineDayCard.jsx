// src/components/TimelineDayCard.jsx
"use client";

import { useState, useEffect } from 'react';
// --- MODIFICATION: ADDED NEW MANTINE COMPONENTS & ICONS ---
import { Box, Group, Checkbox, Button, Collapse, Text, Alert, Badge, Stack, Title, ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconPencilPlus, IconBrain, IconPlayerPlay, IconClock, IconEye, IconChevronsDown } from '@tabler/icons-react';
import { FullscreenNoteViewer } from './FullscreenNoteViewer';
import { differenceInCalendarDays } from 'date-fns';
import Link from 'next/link';

import { QuizSetupModal } from './QuizSetupModal';
import { QuizRunner } from './QuizRunner';
import { QuizResults } from './QuizResults';

import { notifications } from '@mantine/notifications';
import 'katex/dist/katex.min.css';
import { useDisclosure } from '@mantine/hooks';
import { GlassCard } from './GlassCard';
import { useLoading } from '@/context/LoadingContext';
import classes from './TimelineDayCard.module.css';

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


export function TimelineDayCard({ plan, dayTopic, onUpdate, isInitiallyCollapsed, onNoteGenerated, viewMode = 'plan', isReadOnly = false }) {
     const { setIsLoading } = useLoading();

    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    
    // --- MODIFICATION: RENAMED `opened` to avoid conflict, simplified state ---
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(!isInitiallyCollapsed);
    // --- NEW STATE & LOGIC FOR THE FULLSCREEN VIEWER (PREPARATION FOR PHASE 3) ---
    const [noteToView, setNoteToView] = useState(null); 
    // This will eventually open the FullscreenNoteViewer.jsx modal.
    // For now, setting this state is the goal.

    // --- DEFINITIVE FIX #1: LOCAL STATE MANAGEMENT ---
    // The card now manages its own sub-topics for an instantaneous UI response.
    const [internalSubTopics, setInternalSubTopics] = useState(dayTopic.sub_topics || []);

    // --- DEFINITIVE FIX #2: SYNCHRONIZATION EFFECT ---
    // This effect ensures that if the parent's data changes (e.g., on a full refresh),
    // our local state is updated to match, preventing stale data.
    useEffect(() => {
        setInternalSubTopics(dayTopic.sub_topics || []);
    }, [dayTopic.sub_topics]);

    const allTopicsCompleted = dayTopic.sub_topics?.every(sub => sub.completed) && dayTopic.sub_topics?.length > 0;

     const handleCheckboxChange = (subTopicIndex, isChecked) => {
        if (isReadOnly) return;

        // 1. Create the new state array for an immediate update.
        const newSubTopics = internalSubTopics.map((sub, index) => {
            if (index === subTopicIndex) {
                return { ...sub, completed: isChecked };
            }
            return sub;
        });

        // 2. Update the local state INSTANTLY. This is the optimistic UI update.
        setInternalSubTopics(newSubTopics);

        // 3. Call the parent's onUpdate function in the background to sync the change.
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

     // --- DEFINITIVE UPGRADE: NEW STATE FOR THE SMART QUIZ FLOW ---
    const [quizSetupOpened, { open: openQuizSetup, close: closeQuizSetup }] = useDisclosure(false);
    const [quizQuestions, setQuizQuestions] = useState(null);
    const [quizResults, setQuizResults] = useState(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [isEvaluatingQuiz, setIsEvaluatingQuiz] = useState(false);
    const [quizConfig, setQuizConfig] = useState(null);

    const handleStartQuiz = async (config) => {
        setIsGeneratingQuiz(true);
        setQuizConfig(config);
        closeQuizSetup();
        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: dayTopic.id, ...config }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();
            setQuizQuestions(data.questions);
        } catch (err) {
            notifications.show({ title: 'Failed to generate quiz', message: err.message, color: 'red' });
        } finally {
            setIsGeneratingQuiz(false);
        }
    };
    
    const handleSubmitQuiz = async (attempts) => {
        setIsEvaluatingQuiz(true);
        setQuizQuestions(null); // Close the runner
        try {
             const response = await fetch('/api/evaluate-quiz-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_topic_id: dayTopic.id, attempts, quiz_mode: quizConfig.quiz_mode }),
            });
             if (!response.ok) throw new Error((await response.json()).error);
             const results = await response.json();
             setQuizResults(results);
        } catch (err) {
             notifications.show({ title: 'Failed to evaluate quiz', message: err.message, color: 'red' });
        } finally {
            setIsEvaluatingQuiz(false);
        }
    };

    const daysLeft = differenceInCalendarDays(new Date(plan.exam_date), new Date());
    let color = 'brandGreen';
    if (daysLeft < 7) color = 'red';
    else if (daysLeft < 14) color = 'yellow';

    const handleSetReminder = (subTopicText) => {
    if (window.Android && typeof window.Android.setReminder === 'function') {
        const reminderTime = new Date().getTime() + 60 * 1000;
        
        const reminderDetails = {
            title: dayTopic.topic_name,
            message: `Time to start: ${subTopicText}`,
            timestamp: reminderTime,
        };
        
        // --- DEFINITIVE FIX: Use JSON.stringify for proper logging ---
        console.log("Sending reminder to native:", JSON.stringify(reminderDetails));
        window.Android.setReminder(JSON.stringify(reminderDetails));
    } else {
        alert("This feature is only available in the KalPad Android app.");
    }
};

return (
    <>
        {viewMode === 'dashboard' && (
            <Group justify="space-between">
                <Link href={`/plan/${plan.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Title order={3} style={{ cursor: 'pointer' }}>{plan.exam_name}</Title>
                </Link>
                <Badge color={color} variant="light">{daysLeft > 0 ? `${daysLeft} days left` : 'Exam Day!'}</Badge>
            </Group>
        )}

        {isInitiallyCollapsed && (
            <Button variant="subtle" size="xs" onClick={toggleDetails} mb="xs">
                {detailsOpened ? 'Hide Details' : 'Show Details'}
            </Button>
        )}

        <Collapse in={detailsOpened}>
            <GlassCard withBorder 
                className={classes.cardRoot}
                style={{ borderLeft: `5px solid ${getDayDifficultyColor(dayTopic.day_difficulty)}`}}
            >
                <Stack gap="md">
                    <Group justify="space-between">
                        <Title order={4} ff="Lexend, sans-serif" className={classes.dayTitle}>
                            {dayTopic.topic_name}
                        </Title>
                        <Group gap="xs">
                            <Badge className={classes.badge} color="gray" variant="light" size="sm" leftSection={<IconClock size={14} style={{ marginRight: '-0.2rem' }} />}>
                                {dayTopic.study_hours} hrs
                            </Badge>
                            <Badge className={classes.badge} color={getDayDifficultyColor(dayTopic.day_difficulty)} size="sm" variant="light">
                                {dayTopic.day_difficulty}
                            </Badge>
                        </Group>
                    </Group>

                    <Text c="dimmed" size="sm" mt={-12}>
                        {dayTopic.day_summary}
                    </Text>
                    
                    <Stack gap="sm" mt="xs">
                        {internalSubTopics.map((subTopic, index) => {
                            const v2_note = dayTopic.new_notes?.find(n => n.sub_topic_text === subTopic.text);
                            const v1_note = (index === 0 && dayTopic.generated_notes) ? { notes_markdown: dayTopic.generated_notes, sub_topic_text: subTopic.text } : null;
                            const existingNote = v2_note || v1_note;
                            const lecture = dayTopic.curated_lectures?.find(l => l.sub_topic_text === subTopic.text);

                            return (
                                <Box key={index}>
                                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Checkbox
                                                readOnly={isReadOnly}
                                                checked={subTopic.completed}
                                                onChange={(event) => handleCheckboxChange(index, event.currentTarget.checked)}
                                                label={
                                                    <Text
                                                        className={classes.subTopicText}
                                                        td={!isReadOnly && subTopic.completed ? 'line-through' : 'none'}
                                                        c={!isReadOnly && subTopic.completed ? 'dimmed' : 'inherit'}
                                                    >
                                                        {subTopic.text}
                                                    </Text>
                                                }
                                            />
                                        </Box>
                                        
                                        {!isReadOnly && (
                                            <Menu shadow="md" width={200} position="bottom-end">
                                                <Menu.Target>
                                                    <ActionIcon 
                                                        variant="light" 
                                                        color="gray"
                                                        size="lg"
                                                        loading={generatingNotesFor === subTopic.text}
                                                    >
                                                        <IconChevronsDown size={18} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    {existingNote ? (
                                                        <Menu.Item
                                                            leftSection={<IconEye size={16} />}
                                                            onClick={() => setNoteToView({ ...existingNote, sub_topic: subTopic, day_topic: dayTopic, exam_name: plan.exam_name })}
                                                        >
                                                            View Note
                                                        </Menu.Item>
                                                    ) : (
                                                        <Menu.Item
                                                            leftSection={<IconPencilPlus size={16} />}
                                                            onClick={() => handleGenerateNotes(subTopic.text)}
                                                        >
                                                            Generate Note
                                                        </Menu.Item>
                                                    )}
                                                    {lecture && (
                                                        <>
                                                            <Menu.Divider />
                                                            <Menu.Item
                                                                color="red"
                                                                leftSection={<IconPlayerPlay size={16} />}
                                                                component="a" href={lecture.video_url} target="_blank" rel="noopener noreferrer"
                                                            >
                                                                Watch Lecture
                                                            </Menu.Item>
                                                        </>
                                                    )}
                                                    {/* <Menu.Item
                                                        leftSection={<IconClock size={16} />}
                                                        onClick={() => handleSetReminder(subTopic.text)}
                                                    >
                                                        Remind Me (in 1 min)
                                                    </Menu.Item> */}
                                                </Menu.Dropdown>
                                            </Menu>
                                        )}
                                    </Group>
                                    <Group gap="xs" mt={4} ml={isReadOnly ? 0 : 30}>
                                        <Badge className={classes.badge} size="xs" variant="light" color={getSubTopicTypeColor(subTopic.type)}>{subTopic.type}</Badge>
                                        <Badge className={classes.badge} size="xs" variant="light" color={getDayDifficultyColor(subTopic.difficulty)}>{subTopic.difficulty}</Badge>
                                    </Group>
                                </Box>
                            )
                        })}
                    </Stack>
                    
                    {!isReadOnly && allTopicsCompleted && (
                        <GlassCard mt="md">
                            <Text fw={500} mb="sm">Daily Mission Complete!</Text>
                            <Group>
                                <Button 
                                    color="brandGreen" 
                                    leftSection={<IconBrain size={16}/>} 
                                    onClick={openQuizSetup}
                                    loading={isGeneratingQuiz || isEvaluatingQuiz}
                                >
                                    {isGeneratingQuiz ? 'Building...' : isEvaluatingQuiz ? 'Evaluating...' : 'Take a Smart Quiz'}
                                </Button>
                            </Group>
                        </GlassCard>
                    )}
                    
                    {noteError && <Alert color="red" title="Note Generation Error" mt="md">{noteError}</Alert>}
                </Stack>
            </GlassCard>
        </Collapse>

        {/* --- Modals are unchanged --- */}
        <QuizSetupModal
            opened={quizSetupOpened}
            onClose={closeQuizSetup}
            onStartQuiz={handleStartQuiz}
            isLoading={isGeneratingQuiz}
        />
        {quizQuestions && (
            <QuizRunner 
                questions={quizQuestions} 
                onClose={() => setQuizQuestions(null)}
                onSubmit={handleSubmitQuiz}
            />
        )}
        {quizResults && (
            <QuizResults
                results={quizResults}
                onClose={() => setQuizResults(null)}
                onRetake={() => { setQuizResults(null); openQuizSetup(); }}
            />
        )}
        <FullscreenNoteViewer 
            noteData={noteToView} 
            onClose={() => setNoteToView(null)} 
            onUpdate={onUpdate}
        />
    </>
);
}