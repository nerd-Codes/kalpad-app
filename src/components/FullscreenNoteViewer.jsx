// src/components/FullscreenNoteViewer.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
    Modal, ScrollArea, Group, Title, Text, Stack, Badge, Button, 
    ActionIcon, Box, Loader, Tooltip, Alert, Paper, ThemeIcon, Transition 
} from '@mantine/core';
import { 
    IconCircleCheck, IconMessageQuestion, IconMessageCircle, IconBook, 
    IconBulb, IconSparkles, IconFileExport, IconBolt, IconAward, IconX, IconHighlight 
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { Popover } from '@mantine/core';
import { useTextSelection } from '../hooks/useTextSelection';
import { notifications } from '@mantine/notifications';
import { AnimatePresence, motion } from 'framer-motion';

import supabase from '@/lib/supabaseClient'; 

// --- KALPAD OS IMPORTS ---
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { FollowUpModal } from './FollowUpModal';

// --- MARKDOWN ENGINE ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import markdownStyles from '../styles/MarkdownStyles.module.css';

// --- CONSTANTS ---
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

// --- MODAL STYLES ---
const glassPopupStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    header: { backgroundColor: 'transparent' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white' },
    close: { color: 'gray', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export function FullscreenNoteViewer({ noteData, onClose, onUpdate, isCramSheet = false }) {
    // --- 1. DATA EXTRACTION (MOVED UP) ---
    // We must destructure this first so we can use `notes_markdown` in useState
    const { notes_markdown = "No content available.", sub_topic = {}, day_topic = {}, exam_name = "Study Plan" } = noteData || {};

    const [renderContent, setRenderContent] = useState(false);
    const { selection, clearSelection } = useTextSelection();
    
    // Modals
    const [followUpModalOpened, { open: openFollowUpModal, close: closeFollowUpModal }] = useDisclosure(false);
    const [exportModalOpened, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);

    // Logic State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [aiResponse, setAiResponse] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- LOCAL STATE FOR INSTANT UPDATES ---
    // Now valid because notes_markdown is defined above
    const [localMarkdown, setLocalMarkdown] = useState(notes_markdown);

    // Sync local state when the prop changes (e.g., opening a different note)
    useEffect(() => {
        setLocalMarkdown(notes_markdown);
    }, [notes_markdown]);

    // --- EFFECTS ---
    useEffect(() => {
        if (noteData) {
            const timer = setTimeout(() => setRenderContent(true), 100);
            return () => clearTimeout(timer);
        } else {
            setRenderContent(false);
        }
    }, [noteData]);

    if (!noteData) return null;
    
    // --- HANDLERS ---
    const handleDoubtRequest = async (action, textOverride = null) => {
        setIsLoading(true); setError(null); setAiResponse(null); clearSelection(); closeFollowUpModal();
        
        // Determine the text to analyze: Override > Selection > undefined
        const textToAnalyze = textOverride || selection.text;

        const bodyPayload = {
            fullNoteContent: localMarkdown, // Use local state here too
            context: { examName: exam_name, dayTopic: day_topic.topic_name, subTopic: sub_topic.text },
            action: action,
            // Logic: If action is custom, we don't need highlighted text. Otherwise, we do.
            highlightedText: action !== 'custom' ? textToAnalyze : undefined,
            question: action === 'custom' ? textOverride : undefined, // reused parameter name for custom question
        };
        try {
            const response = await fetch('/api/solve-doubt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'The AI tutor failed to respond.');
            setAiResponse(data.response);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };

    const handleMarkAsComplete = () => {
        const subTopicIndex = day_topic.sub_topics?.findIndex(st => st.text === sub_topic.text);
        if (subTopicIndex !== -1) {
            const newSubTopics = day_topic.sub_topics.map((st, index) => index === subTopicIndex ? { ...st, completed: true } : st);
            onUpdate(day_topic.id, { sub_topics: newSubTopics });
            notifications.show({ title: 'Task Completed!', message: `"${sub_topic.text}" has been marked as complete.`, color: 'green', icon: <IconCircleCheck size={18} /> });
        }
        onClose();
    };

    const handleAPIBasedExport = async () => {
        setIsExporting(true); closeExportModal();
        try {
            const response = await fetch('/api/export-note-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdown: notes_markdown, topicName: day_topic.topic_name, subTopicName: sub_topic.text, css: PDF_CSS }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to export PDF.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${sub_topic.text.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
            notifications.show({ title: 'Export Successful', message: 'Downloading PDF...', color: 'green' });
        } catch (err) { notifications.show({ title: 'Export Failed', message: err.message, color: 'red' }); } finally { setIsExporting(false); }
    };

    const handleClientSidePrint = () => {
        setIsExporting(true); closeExportModal();
        const printUrl = isCramSheet ? `/print-cram-sheet/${noteData.id}` : `/print/${noteData.id}`;
        const printWindow = window.open(printUrl, '_blank');
        if (!printWindow) { notifications.show({ title: 'Popup Blocked', message: 'Please allow popups.', color: 'yellow' }); setIsExporting(false); return; }
        const handleMessage = (event) => { if (event.source === printWindow && event.data === 'KALPAD_PRINT_READY') { printWindow.print(); setIsExporting(false); window.removeEventListener('message', handleMessage); } };
        const handleAfterPrint = () => { printWindow.close(); printWindow.removeEventListener('afterprint', handleAfterPrint); window.removeEventListener('message', handleMessage); };
        window.addEventListener('message', handleMessage);
        printWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
    };

    const handleCloseResponseModal = () => {
        setAiResponse(null);
        setError(null);
    };

    const customRenderers = {
        img: ({ node, ...props }) => {
            const isSvg = props.src.endsWith('.svg');
            const finalStyle = isSvg ? { maxWidth: '100%', maxHeight: '1500px', borderRadius: '8px', background: 'black', padding: '0.5rem' } : { maxWidth: '100%', maxHeight: '1500px', borderRadius: '8px' };
            return <span style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}><img {...props} style={finalStyle} /></span>;
        },
         mark: ({ node, ...props }) => {
            // Convert children to string safely
            const textContent = Array.isArray(props.children) 
                ? props.children.join('') 
                : props.children.toString();

            return (
                <Tooltip label="Click to Ask AI" withArrow zIndex={3100}>
                    <mark 
                        onClick={(e) => {
                            e.stopPropagation();
                            // Pass textContent as the second argument (textOverride)
                            handleDoubtRequest('explain', textContent);
                        }}
                    >
                        {props.children}
                    </mark>
                </Tooltip>
            );
        }
    };

    // --- HIGHLIGHT HANDLER ---
    const handleHighlightSelection = async () => {
        if (!selection.text) return;

        // 1. Wrap in HTML using the CURRENT local state
        const newMarkdown = localMarkdown.replace(
            selection.text, 
            `<mark>${selection.text}</mark>`
        );

        // 2. Optimistic UI Update (Instant)
        setLocalMarkdown(newMarkdown);
        clearSelection(); // Clear the browser selection immediately
        
        // 3. Persist to Database (Background)
        try {
            if (noteData.id) {
                await supabase
                    .from('generated_notes')
                    .update({ notes_markdown: newMarkdown })
                    .eq('id', noteData.id);
                
                // Optional: Update parent if needed, but local state handles the view
                if (onUpdate) onUpdate(day_topic.id, { generated_notes: newMarkdown });
            }
        } catch (e) {
            console.error("Highlight save failed", e);
        }
    };

    // --- RENDER ---
    return (
        <>
            {/* 1. THE FULLSCREEN READER MODAL */}
            <Modal
                opened={!!noteData}
                onClose={onClose}
                fullScreen
                withCloseButton={false} 
                padding={0}
                zIndex={3000}
                styles={{
                    root: { '--modal-size': '100vw' },
                    content: { backgroundColor: 'var(--mantine-color-dark-8)' }, 
                    body: { height: '100vh', overflow: 'hidden', backgroundColor: '#0A0A0A' }
                }}
            >
                {/* --- CONTEXT LENS (POPOVER) --- */}
                <Popover opened={selection.text.length > 5} position="top" withArrow shadow="xl" zIndex={3002}>
                    <Popover.Target>
                        <div style={{ position: 'absolute', top: `${selection.position.y}px`, left: `${selection.position.x}px`, pointerEvents: 'none' }} />
                    </Popover.Target>
                    <Popover.Dropdown style={{ 
                        backgroundColor: 'rgba(30, 30, 35, 0.9)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '6px',
                        borderRadius: '99px'
                    }}>
                        <Group gap="xs">
                            <Tooltip label="Highlight & Save" withArrow zIndex={3100}>
                                <ActionIcon 
                                    variant="transparent" 
                                    color="yellow" 
                                    onClick={handleHighlightSelection}
                                >
                                    <IconHighlight size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Explain" withArrow zIndex={3100}><ActionIcon variant="transparent" color="gray" onClick={() => handleDoubtRequest('explain')} ><IconBook size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Analogy" withArrow zIndex={3100}><ActionIcon variant="transparent" color="gray" onClick={() => handleDoubtRequest('analogy')} zIndex={3100}><IconBulb size={18} /></ActionIcon></Tooltip>
                            <Tooltip label="Importance" withArrow zIndex={3100}><ActionIcon variant="transparent" color="gray" onClick={() => handleDoubtRequest('importance')} zIndex={3100}><IconMessageCircle size={18} /></ActionIcon></Tooltip>
                        </Group>
                    </Popover.Dropdown>
                </Popover>

                {/* --- FLOATING CLOSE BUTTON (Top Right) --- */}
                <Box style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 50 }}>
                    <Interactive onClick={onClose}>
                        <ActionIcon 
                            size="xl" 
                            radius="xl" 
                            variant="filled" 
                            color="gray" 
                            style={{ 
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        >
                            <IconX size={24} />
                        </ActionIcon>
                    </Interactive>
                </Box>

                {/* --- MAIN SCROLL AREA --- */}
                <ScrollArea h="100vh" type="auto" offsetScrollbars>
                    <Box pt={80} pb={150}> 
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ 
                                width: '100%',
                                maxWidth: '100%', // EDGE TO EDGE
                                padding: '0 5%', // Comfortable gutters
                                margin: '0 auto'
                            }}
                        >
                            {/* --- THE DOCUMENT TITLE BLOCK --- */}
                            <Box mb="xl" pb="lg" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Text size="lg" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }} mb={4}>
                                    {day_topic.topic_name}
                                </Text>
                                <Title 
                                    order={1} 
                                    className="apple-text-gradient"
                                    style={{ 
                                        fontFamily: 'var(--font-lexend)', 
                                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.03em',
                                        lineHeight: 1.1
                                    }}
                                >
                                    {sub_topic.text}
                                </Title>
                            </Box>

                            {/* --- CONTENT SURFACE --- */}
                            {renderContent ? (
                                <Box className={markdownStyles.markdown} style={{ fontSize: '1.125rem' }}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                                        components={customRenderers}
                                    >
                                        {localMarkdown}
                                    </ReactMarkdown>
                                </Box>
                            ) : (
                                <Group justify="center" p="xl"><Loader color="gray" type="dots" /></Group>
                            )}
                        </motion.div>
                    </Box>
                </ScrollArea>

                {/* --- FLOATING COMMAND DOCK (Bottom, Labeled) --- */}
                <Box 
                    style={{ 
                        position: 'fixed', 
                        bottom: '32px', 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        zIndex: 40 
                    }}
                >
                    <GlassCard 
                        p={8} 
                        radius="xl"
                        style={{ 
                            backgroundColor: 'rgba(30, 30, 35, 0.85)', 
                            backdropFilter: 'blur(24px) saturate(180%)',
                            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Interactive onClick={openFollowUpModal}>
                            <Button 
                                variant="subtle" 
                                color="gray" 
                                radius="xl" 
                                leftSection={<IconMessageQuestion size={20} />}
                                style={{ color: 'white', fontWeight: 500 }}
                            >
                                Ask Tutor
                            </Button>
                        </Interactive>

                        <Interactive onClick={openExportModal}>
                            <Button 
                                variant="subtle" 
                                color="gray" 
                                radius="xl" 
                                leftSection={<IconFileExport size={20} />}
                                loading={isExporting}
                                style={{ color: 'white', fontWeight: 500 }}
                            >
                                Export
                            </Button>
                        </Interactive>

                        {!isCramSheet && (
                            <Interactive onClick={handleMarkAsComplete}>
                                <Button 
                                    radius="xl" 
                                    color={sub_topic.completed ? 'teal' : 'brandPurple'}
                                    variant="gradient"
                                    gradient={sub_topic.completed ? { from: 'teal', to: 'green' } : { from: '#BF5AF2', to: '#5E5CE6' }}
                                    leftSection={<IconCircleCheck size={20} />}
                                    disabled={sub_topic.completed}
                                    style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                                >
                                    {sub_topic.completed ? 'Done' : 'Complete'}
                                </Button>
                            </Interactive>
                        )}
                    </GlassCard>
                </Box>

            </Modal>

            {/* --- ANCILLARY MODALS --- */}
            <Modal
                opened={isLoading || !!aiResponse || !!error}
                onClose={handleCloseResponseModal}
                title={<Group gap="xs"><IconSparkles size={18} color="#A78BFA"/><Text inherit>AI Tutor</Text></Group>}
                centered size="xl"
                zIndex={3001}
                styles={glassPopupStyles}
            >
                <Stack>
                    {isLoading && <Group justify="center" p="xl"><Loader color="violet" /></Group>}
                    {error && <Alert color="red" title="Error">{error}</Alert>}
                    {aiResponse && (
                        <Box className={markdownStyles.markdown} mah="60vh" style={{ overflowY: 'auto' }}>
                             <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]} components={customRenderers}>
                                {aiResponse}
                            </ReactMarkdown>
                        </Box>
                    )}
                </Stack>
            </Modal>

            <FollowUpModal opened={followUpModalOpened} onClose={closeFollowUpModal} isLoading={isLoading} onSubmit={(q) => handleDoubtRequest('custom', q)} />

            <Modal opened={exportModalOpened} onClose={closeExportModal} title="Export Options" centered zIndex={3010} styles={glassPopupStyles}>
                <Stack>
                    <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer', backgroundColor: 'transparent' }} onClick={handleAPIBasedExport}>
                        <Group>
                            <ThemeIcon color="teal" size="lg" variant="light"><IconBolt size={20}/></ThemeIcon>
                            <Box><Text fw={500} c="white">Fast Export</Text><Text size="xs" c="dimmed">Quick .pdf generation</Text></Box>
                        </Group>
                    </Paper>
                    <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer', backgroundColor: 'transparent' }} onClick={handleClientSidePrint}>
                        <Group>
                            <ThemeIcon color="brandPurple" size="lg" variant="light"><IconAward size={20}/></ThemeIcon>
                            <Box><Text fw={500} c="white">High-Quality</Text><Text size="xs" c="dimmed">Pixel-perfect print rendering</Text></Box>
                        </Group>
                    </Paper>
                </Stack>
            </Modal>
        </>
    );
}