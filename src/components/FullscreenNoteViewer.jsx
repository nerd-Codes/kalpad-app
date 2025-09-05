// src/components/FullscreenNoteViewer.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Modal, ScrollArea, Group, Title, Text, Textarea, Stack, Badge, Button, ActionIcon, Box, Loader, Tooltip, Alert } from '@mantine/core';
import { IconCircleCheck, IconMessageQuestion,IconMessageCircle, IconBook, IconBulb, IconSparkles } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { Popover } from '@mantine/core';
import { useTextSelection } from '../hooks/useTextSelection';
import { notifications } from '@mantine/notifications';

import { ShimmerButton } from './landing/ShimmerButton';

// Markdown and LaTeX imports
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import markdownStyles from '../styles/MarkdownStyles.module.css';


// --- HELPER FUNCTIONS FOR DYNAMIC BADGE COLORS ---
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

export function FullscreenNoteViewer({ noteData, onClose, onUpdate }) {

    const [renderContent, setRenderContent] = useState(false);
    const { selection, clearSelection } = useTextSelection();
    const [followUpModalOpened, { open: openFollowUpModal, close: closeFollowUpModal }] = useDisclosure(false);
    const [customQuestion, setCustomQuestion] = useState('');

    // --- DEFINITIVE FIX: CUSTOM STATE MANAGEMENT (REPLACES `useChat`) ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [aiResponse, setAiResponse] = useState(null);

    // This effect delays the rendering of the heavy markdown content.
    useEffect(() => {
        if (noteData) {
            // When the modal is told to open, wait a short moment for the animation to start.
            const timer = setTimeout(() => {
                setRenderContent(true);
            }, 100); // 100ms is a good starting point

            return () => clearTimeout(timer);
        } else {
            // When the modal closes, immediately hide the content so it's fresh for next time.
            setRenderContent(false);
        }
    }, [noteData]);

    // Defensive check: If no note data, render nothing.
    if (!noteData) {
        return null;
    }
    
    // Destructure all the necessary data with fallbacks
    const { 
        notes_markdown = "No content available.",
        sub_topic = {},
        day_topic = {},
        exam_name = "Study Plan"
    } = noteData;
    
    const handleDoubtRequest = async (action, questionText = '') => {
        setIsLoading(true);
        setError(null);
        setAiResponse(null);
        clearSelection();
        closeFollowUpModal();

        const bodyPayload = {
            fullNoteContent: notes_markdown,
            context: { examName: exam_name, dayTopic: day_topic.topic_name, subTopic: sub_topic.text },
            action: action,
            highlightedText: action !== 'custom' ? selection.text : undefined,
            question: action === 'custom' ? questionText : undefined,
        };

        try {
            const response = await fetch('/api/solve-doubt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload) // No `data` nesting
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'The AI tutor failed to respond.');
            }
            
            setAiResponse(data.response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setCustomQuestion('');
        }
    };


    const handleMarkAsComplete = () => {
        // 1. Find the index of the sub-topic that needs to be updated.
        const subTopicIndex = day_topic.sub_topics?.findIndex(st => st.text === sub_topic.text);
        
        // 2. If it's found, create a new `sub_topics` array with the updated completion status.
        if (subTopicIndex !== -1) {
            const newSubTopics = day_topic.sub_topics.map((st, index) => 
                index === subTopicIndex ? { ...st, completed: true } : st
            );
            
            // 3. Call the parent `onUpdate` function with the correct signature: (planTopicId, { updates })
            onUpdate(day_topic.id, { sub_topics: newSubTopics });

            // 4. Provide clear user feedback.
            notifications.show({
                title: 'Task Completed!',
                message: `"${sub_topic.text}" has been marked as complete.`,
                color: 'green',
                icon: <IconCircleCheck size={18} />,
            });
        }
        onClose(); // Close the modal
    };

     const customRenderers = {
        img: ({ node, ...props }) => {
            // --- DEFINITIVE FIX: CONDITIONAL STYLING ---
            // Check if the image source is an SVG.
            const isSvg = props.src.endsWith('.svg');

            // Define the base style for all images.
            const baseStyle = {
                maxWidth: '100%',
                maxHeight: '1500px',
                borderRadius: '8px',
            };

            // Conditionally add the background and padding only for SVGs.
            const finalStyle = isSvg 
                ? { ...baseStyle, background: 'black', padding: '0.5rem' } 
                : baseStyle;

            return (
                <span style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                    <img {...props} style={finalStyle} />
                </span>
            );
        },
    };

     const handleCloseResponseModal = () => {
        setAiResponse(null);
        setError(null);
    };



    return (
        <>
        <Modal
            opened={!!noteData}
            onClose={onClose}
            fullScreen
            withCloseButton
            size="90%" // Uses 90% of the viewport width for a better reading experience
            title={
                <Text fw={500}>{exam_name}</Text>
            }
            styles={{
                header: { background: 'var(--mantine-color-dark-8)' },
                body: { height: 'calc(100% - 60px)', background: 'var(--mantine-color-dark-8)' },
            }}

            transitionProps={{ duration: 200 }} 
        >

            <Popover opened={selection.text.length > 5} position="top" withArrow shadow="md">
                    <Popover.Target>
                        <div style={{ position: 'absolute', top: `${selection.position.y - 45}px`, left: `${selection.position.x}px`, transform: 'translateX(-50%)' }} />
                    </Popover.Target>
                    <Popover.Dropdown>
                        <Group gap="xs">
                            <Tooltip label="Explain this simply" withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('explain')}><IconBook size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Give a real-world analogy" withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('analogy')}><IconBulb size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Why is this important?" withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('importance')}><IconMessageCircle size={18} /></ActionIcon></Tooltip>
                        </Group>
                    </Popover.Dropdown>
                </Popover>


            <ScrollArea h="100%" type="auto">
                <Stack p="md" className="printable-note-area">
                    {/* --- THE IMMERSIVE HEADER --- */}
                    <Stack gap="xs" className="modal-header">
                        <Title order={2} ff="Lexend, sans-serif">{day_topic.topic_name}</Title>
                        <Title order={4} fw={500}>{sub_topic.text}</Title>
                        <Group>
                            <Badge color={getDayDifficultyColor(day_topic.day_difficulty)} variant="light">
                                Day: {day_topic.day_difficulty}
                            </Badge>
                             <Badge color={getDayDifficultyColor(sub_topic.difficulty)} variant="light">
                                Task: {sub_topic.difficulty}
                            </Badge>
                        </Group>
                    </Stack>
                    
                    {/* --- THE ACTION BAR --- */}
                    <Group justify="flex-end" className="action-bar">
                        {/* --- DEFINITIVE ADDITION: THE "ASK A FOLLOW-UP" BUTTON --- */}
                        <Button
                            leftSection={<IconMessageQuestion size={16} />}
                            variant="default"
                            onClick={openFollowUpModal}
                        >
                            Ask a Follow-up
                        </Button>

                        <ShimmerButton
                            leftSection={<IconCircleCheck size={16} />}
                            color="green"
                            variant="light"
                            onClick={handleMarkAsComplete}
                            disabled={sub_topic.completed}
                        >
                            {sub_topic.completed ? 'Completed' : 'Mark as Complete'}
                        </ShimmerButton>
                    </Group>
                    
                   <Box className={markdownStyles.markdown}>
                        {renderContent ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={customRenderers}
                            >
                                {notes_markdown}
                            </ReactMarkdown>
                        ) : (
                            <Group justify="center" p="xl">
                                <Loader />
                            </Group>
                        )}
                    </Box>
                </Stack>
            </ScrollArea>

        </Modal>

        <Modal
                opened={isLoading || !!aiResponse || !!error}
                onClose={handleCloseResponseModal}
                title={ <Group> <IconSparkles size={20} /> <Title order={4}>The Professor</Title> </Group> }
                centered size="xl"
            >
                <Stack>
                    {isLoading && <Group justify="center" p="xl"><Loader /></Group>}
                    {error && <Alert color="red" title="An error occurred">{error}</Alert>}
                    {aiResponse && (
                        <Box className={markdownStyles.markdown} mah="60vh" style={{ overflowY: 'auto' }}>
                             {/* --- DEFINITIVE FIX: ADDED FULL SUITE OF PLUGINS --- */}
                             <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={customRenderers}
                            >
                                {aiResponse}
                            </ReactMarkdown>
                        </Box>
                    )}
                </Stack>
            </Modal>

            <Modal opened={followUpModalOpened} onClose={closeFollowUpModal} title="Ask a Custom Question" centered size="lg">
                <Stack>
                    <Textarea
                        placeholder="Type your question..."
                        value={customQuestion}
                        onChange={(event) => setCustomQuestion(event.currentTarget.value)}
                        autosize
                        minRows={3}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeFollowUpModal}>Cancel</Button>
                        <ShimmerButton
                            onClick={() => handleDoubtRequest('custom', customQuestion)}
                        >
                            Ask KalPad
                        </ShimmerButton>
                    </Group>
                </Stack>
            </Modal>
        </>

    );
}