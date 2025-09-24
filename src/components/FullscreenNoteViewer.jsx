// src/components/FullscreenNoteViewer.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Modal, ScrollArea, Group, Title, Text, Textarea, Stack, Badge, Button, ActionIcon, Box, Loader, Tooltip, Alert, Paper, ThemeIcon } from '@mantine/core';
import { IconCircleCheck, IconMessageQuestion,IconMessageCircle, IconBook, IconBulb, IconSparkles, IconFileExport, IconBolt, IconAward   } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { Popover } from '@mantine/core';
import { useTextSelection } from '../hooks/useTextSelection';
import { notifications } from '@mantine/notifications';

import { ShimmerButton } from './landing/ShimmerButton';

import Link from 'next/link';

import { FollowUpModal } from './FollowUpModal';

// Markdown and LaTeX imports
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import markdownStyles from '../styles/MarkdownStyles.module.css';

import { PrintableNote } from './PrintableNote';

// import katexCSS from '!!raw-loader!katex/dist/katex.min.css';
// import markdownCustomCSS from '!!raw-loader!../styles/MarkdownStyles.module.css';


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

const PDF_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lexend+Deca:wght@900&display=swap');
body { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #222; margin: 2rem; }
h1, h2, h3, h4, h5, h6 { font-family: 'Lexend Deca', sans-serif; font-weight: 600; margin: 1.5rem 0 0.75rem 0; color: #111; }
h1 { font-size: 2rem; } h2 { font-size: 1.6rem; } h3 { font-size: 1.3rem; } h4 { font-size: 1.1rem; } h5, h6 { font-size: 1rem; }
a { color: #2563eb; text-decoration: none; } a:hover { text-decoration: underline; }
pre, code { font-family: 'Fira Code', monospace; background: #f6f8fa; padding: 0.25rem 0.5rem; border-radius: 4px; }
pre { padding: 1rem; overflow-x: auto; }
img { max-width: 100%; display: block; margin: 1rem auto; }
blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #555; font-style: italic; }
table { border-collapse: collapse; margin: 1rem 0; width: 100%; }
th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
th { background: #f0f0f0; }
.katex { font: normal 1.1em 'KaTeX_Main', 'Times New Roman', serif; line-height: 1.2; white-space: nowrap; text-indent: 0; text-rendering: auto; }
.katex-display { display: block; margin: 1em 0; text-align: center; }
.katex .katex-mathml { position: absolute; clip: rect(1px, 1px, 1px, 1px); padding: 0; border: 0; height: 1px; width: 1px; overflow: hidden; }
.katex .katex-html { display: inline-block; }
.katex .katex-html > .newline { display: block; height: 0; }
.katex { font-family: 'Lexend Deca', 'Inter', serif; font-size: 1em; }
@page { size: A4; margin: 0.3in; }`;

export function FullscreenNoteViewer({ noteData, onClose, onUpdate, isCramSheet = false }) {

    const [renderContent, setRenderContent] = useState(false);
    const { selection, clearSelection } = useTextSelection();
    const [followUpModalOpened, { open: openFollowUpModal, close: closeFollowUpModal }] = useDisclosure(false);
    const [customQuestion, setCustomQuestion] = useState('');

    // --- DEFINITIVE FIX: CUSTOM STATE MANAGEMENT (REPLACES `useChat`) ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [aiResponse, setAiResponse] = useState(null);

    const [isExporting, setIsExporting] = useState(false);

    const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);

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
const handleExportToPdf = async () => {
        if (!noteData) return;
        setIsExporting(true);
        try {
            const response = await fetch('/api/export-note-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown: notes_markdown,
                    topicName: day_topic.topic_name,
                    subTopicName: sub_topic.text,
                    css: PDF_CSS, // Send the definitive CSS
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to export PDF.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileName = `${sub_topic.text.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            notifications.show({ title: 'Export Successful', message: 'Your PDF has started downloading.', color: 'green' });
        } catch (err) {
            notifications.show({ title: 'Export Failed', message: err.message, color: 'red' });
        } finally {
            setIsExporting(false);
        }
    };

const handleAutoPrint = () => {
    if (!noteData) return;
    setIsExporting(true);

    const printUrl = isCramSheet 
    ? `/print-cram-sheet/${noteData.id}` 
    : `/print/${noteData.id}`;

    const printWindow = window.open(printUrl, '_blank');

    if (!printWindow) {
        notifications.show({
            title: 'Popup Blocked',
            message: 'Please allow popups for this site to export your note.',
            color: 'yellow',
        });
        setIsExporting(false);
        return;
    }

    // --- THE DEFINITIVE "LISTENER" LOGIC ---
    const handleMessage = (event) => {
        // 1. We only care about messages from the window we just opened.
        if (event.source !== printWindow) {
            return;
        }
        
        // 2. We only care about our specific "ready" signal.
        if (event.data === 'KALPAD_PRINT_READY') {
            console.log("Print page is ready. Triggering print command.");
            
            // 3. Trigger the print command on the popup window.
            printWindow.print();
            setIsExporting(false); // Can re-enable the button now
            
            // 4. Clean up this listener to prevent memory leaks.
            window.removeEventListener('message', handleMessage);
        }
    };

    const handleAfterPrint = () => {
        printWindow.close();
        printWindow.removeEventListener('afterprint', handleAfterPrint);
        // Ensure the message listener is also cleaned up if the user closes the print dialog
        window.removeEventListener('message', handleMessage);
    };
    
    // Start listening for messages from the popup window.
    window.addEventListener('message', handleMessage);
    // Listen for when the print dialog is closed.
    printWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
};

    // Handler 1: API-based export
    const handleAPIBasedExport = async () => {
        setIsExporting(true);
        closeExportModal(); // Close the choice modal
        try {
            const response = await fetch('/api/export-note-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown: notes_markdown,
                    topicName: day_topic.topic_name,
                    subTopicName: sub_topic.text,
                    css: PDF_CSS,
                }),
            });
            if (!response.ok) { throw new Error((await response.json()).error || 'Failed to export PDF.'); }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileName = `${sub_topic.text.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            notifications.show({ title: 'Export Successful', message: 'Your PDF has started downloading.', color: 'green' });
        } catch (err) {
            notifications.show({ title: 'Export Failed', message: err.message, color: 'red' });
        } finally {
            setIsExporting(false);
        }
    };

    // Handler 2: The high-quality, client-side auto-print
    const handleClientSidePrint = () => {
        setIsExporting(true);
        closeExportModal(); // Close the choice modal
        const printUrl = isCramSheet 
            ? `/print-cram-sheet/${noteData.id}` 
            : `/print/${noteData.id}`;
        const printWindow = window.open(printUrl, '_blank');
        if (!printWindow) {
            notifications.show({ title: 'Popup Blocked', message: 'Please allow popups for this site to export your note.', color: 'yellow' });
            setIsExporting(false);
            return;
        }
        const handleMessage = (event) => {
            if (event.source === printWindow && event.data === 'KALPAD_PRINT_READY') {
                printWindow.print();
                setIsExporting(false);
                window.removeEventListener('message', handleMessage);
            }
        };
        const handleAfterPrint = () => {
            printWindow.close();
            printWindow.removeEventListener('afterprint', handleAfterPrint);
            window.removeEventListener('message', handleMessage);
        };
        window.addEventListener('message', handleMessage);
        printWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
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
            zIndex={3000}
        >

            <Popover opened={selection.text.length > 5} position="top" withArrow shadow="md" zIndex={3002}>
                    <Popover.Target>
                        <div style={{ position: 'absolute', top: `${selection.position.y - 45}px`, left: `${selection.position.x}px`, transform: 'translateX(-50%)' }} />
                    </Popover.Target>
                    <Popover.Dropdown>
                        <Group gap="xs">
                            <Tooltip label="Explain this simply" zIndex={3003} withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('explain')}><IconBook size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Give a real-world analogy" zIndex={3003} withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('analogy')}><IconBulb size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Why is this important?" zIndex={3003} withArrow><ActionIcon variant="default" onClick={() => handleDoubtRequest('importance')}><IconMessageCircle size={18} /></ActionIcon></Tooltip>
                        </Group>
                    </Popover.Dropdown>
                </Popover>


            <ScrollArea h="100%" type="auto">
                <Stack p="md" className="printable-note-area">
                    {/* --- THE IMMERSIVE HEADER --- */}
                    <Stack gap="xs" className="modal-header">
                        <Title order={2} ff="Lexend, sans-serif">{day_topic.topic_name}</Title>
                        <Title order={4} fw={500}>{sub_topic.text}</Title>
                        {!isCramSheet && (
                        <Group>
                            <Badge color={getDayDifficultyColor(day_topic.day_difficulty)} variant="light">
                                Day: {day_topic.day_difficulty}
                            </Badge>
                             <Badge color={getDayDifficultyColor(sub_topic.difficulty)} variant="light">
                                Task: {sub_topic.difficulty}
                            </Badge>
                        </Group>
                        )}
                    </Stack>
                    
                    {/* --- THE ACTION BAR --- */}
                    <Group justify="flex-end" className="action-bar">
                        <Button
                                leftSection={<IconFileExport size={16} />}
                                variant="default"
                                onClick={openExportModal} // This now opens the choice modal
                                loading={isExporting}
                            >
                                Export to PDF
                        </Button>
                        {/* --- DEFINITIVE ADDITION: THE "ASK A FOLLOW-UP" BUTTON --- */}
                        <Button
                            leftSection={<IconMessageQuestion size={16} />}
                            variant="default"
                            onClick={openFollowUpModal}
                        >
                            Ask a Follow-up
                        </Button>

                        {!isCramSheet && (
                        <ShimmerButton
                            leftSection={<IconCircleCheck size={16} />}
                            color="green"
                            variant="light"
                            onClick={handleMarkAsComplete}
                            disabled={sub_topic.completed}
                        >
                            {sub_topic.completed ? 'Completed' : 'Mark as Complete'}
                        </ShimmerButton>
                        )}
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
                zIndex={3001}
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

            <FollowUpModal
                opened={followUpModalOpened}
                onClose={closeFollowUpModal}
                isLoading={isLoading}
                onSubmit={(question) => {
                    handleDoubtRequest('custom', question);
                }}
            />

            <Modal
                opened={exportModalOpened}
                onClose={closeExportModal}
                title={<Title order={3} ff="Lexend, sans-serif">Choose Export Quality</Title>}
                centered
                zIndex={3010}
            >
                <Stack>
                    <Text c="dimmed" size="sm" mb="md">
                        Select an export method based on your needs.
                    </Text>
                    <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }} onClick={handleAPIBasedExport}>
                        <Group>
                            <ThemeIcon color="teal" size="lg" variant="light">
                                <IconBolt size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={500}>Fast Export</Text>
                                <Text size="xs" c="dimmed">Quickest method. Good for text, but may have minor styling issues with complex math.</Text>
                            </Box>
                        </Group>
                    </Paper>
                    <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }} onClick={handleClientSidePrint}>
                        <Group>
                            <ThemeIcon color="brandPurple" size="lg" variant="light">
                                <IconAward size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={500}>High-Quality Export</Text>
                                <Text size="xs" c="dimmed">Pixel-perfect rendering. Recommended for final drafts. May be slower to load.</Text>
                            </Box>
                        </Group>
                    </Paper>
                </Stack>
            </Modal>
        </>

    );
}