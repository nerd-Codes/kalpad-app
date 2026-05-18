// src/components/TimelineDayCard.jsx
"use client";

import { useState, useEffect } from 'react';
import { Box, Group, Checkbox, Button, Collapse, Text, Alert, Badge, Stack, Title, ActionIcon, Menu, Modal, ScrollArea, Paper, Tooltip } from '@mantine/core';
import { 
    IconPencilPlus, IconBrain, IconPlayerPlay, IconClock, IconEye, 
    IconChevronsDown, IconListCheck, IconDotsVertical, IconLock
} from '@tabler/icons-react';
import { FullscreenNoteViewer } from './FullscreenNoteViewer';
import { differenceInCalendarDays, isToday, parseISO } from 'date-fns';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient'; 

// --- IMPORTS FOR KALPAD OS DESIGN SYSTEM ---
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';
import { QuizOrchestratorModal } from './QuizOrchestratorModal';

// --- LOGIC IMPORTS ---
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useLoading } from '@/context/LoadingContext';
import { useGuest } from '@/context/GuestContext';

// --- VISUAL CONSTANTS ---
const DIFFICULTY_CONFIG = {
    easy: { color: '#34C759', bg: 'rgba(52, 199, 89, 0.1)' },    
    medium: { color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)' },  
    hard: { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' },    
    intense: { color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.1)' },
    default: { color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.1)' }
};

const TYPE_COLORS = {
    concept: 'blue',
    'problem-solving': 'violet',
    derivation: 'cyan',
    review: 'teal',
    default: 'gray'
};

export function TimelineDayCard({ plan, dayTopic, onUpdate, isInitiallyCollapsed, onNoteGenerated, viewMode = 'plan', isReadOnly = false, onConfirmBulkGenerate, isGuestMode = false, setPlan }) {
    const { setIsLoading } = useLoading();
    const { guestArtifact, updateGuestNote } = useGuest();

    // --- GATE 2: TIER STATE ---
    const [userTier, setUserTier] = useState('free');
    
    useEffect(() => {
        const checkTier = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('user_subscriptions')
                .select('tier').eq('user_id', session.user.id).eq('status', 'active').maybeSingle();
            if (data) setUserTier(data.tier);
        };
        checkTier();
    }, []);

    // Lock logic: Locked if FREE tier AND date is NOT today
    // --- LOCK LOGIC ---
    // Guests: Locked if they already have >= 1 note.
    // Free Users: Locked if date is NOT today.
    const isNoteGenerationLocked = isGuestMode 
        ? (guestArtifact?.generatedNotes?.length || 0) >= 1
        : (userTier === 'free' && !isToday(parseISO(dayTopic.date)));

    const [generatingNotesFor, setGeneratingNotesFor] = useState(null);
    const [noteError, setNoteError] = useState('');
    
    // Default open unless explicitly told otherwise
    const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(!isInitiallyCollapsed);
    const [noteToView, setNoteToView] = useState(null); 

    const [bulkNoteModalOpened, { open: openBulkNoteModal, close: closeBulkNoteModal }] = useDisclosure(false);
    const [bulkNoteSelection, setBulkNoteSelection] = useState([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    // --- LOCAL STATE MANAGEMENT ---
    const [internalSubTopics, setInternalSubTopics] = useState(dayTopic.sub_topics || []);
    const [localNotes, setLocalNotes] = useState(dayTopic.new_notes || []);

    useEffect(() => {
        setInternalSubTopics(dayTopic.sub_topics || []);
    }, [dayTopic.sub_topics]);

    useEffect(() => {
        setLocalNotes(dayTopic.new_notes || []);
    }, [dayTopic.new_notes]);

    const allTopicsCompleted = dayTopic.sub_topics?.every(sub => sub.completed) && dayTopic.sub_topics?.length > 0;
    
    const diffConfig = DIFFICULTY_CONFIG[dayTopic.day_difficulty?.toLowerCase()] || DIFFICULTY_CONFIG.default;

    // --- LOGIC HANDLERS ---
    const handleCheckboxChange = (subTopicIndex, isChecked) => {
        if (isReadOnly) return;
        const newSubTopics = internalSubTopics.map((sub, index) => 
            index === subTopicIndex ? { ...sub, completed: isChecked } : sub
        );
        setInternalSubTopics(newSubTopics);
        onUpdate(dayTopic.id, { sub_topics: newSubTopics });
    };

    const patchNoteLocally = (noteId, patch) => {
        if (!noteId) return;

        setLocalNotes(currentNotes => currentNotes.map(note => (
            note.id === noteId ? { ...note, ...patch } : note
        )));
        setNoteToView(currentNote => (
            currentNote?.id === noteId ? { ...currentNote, ...patch } : currentNote
        ));

        if (!setPlan) return;

        setPlan(currentPlan => {
            const nextPlanTopics = currentPlan.plan_topics.map(topic => {
                if (topic.id !== dayTopic.id) return topic;
                return {
                    ...topic,
                    new_notes: (topic.new_notes || []).map(note => (
                        note.id === noteId ? { ...note, ...patch } : note
                    )),
                };
            });

            return { ...currentPlan, plan_topics: nextPlanTopics };
        });
    };

    const handleGenerateNotes = async (subTopicText) => {
        if (isGuestMode) {
            // ... (Guest mode logic is unchanged)
            const currentNotes = guestArtifact?.generatedNotes || [];
             if (currentNotes.length >= 1) {
                 notifications.show({ title: 'Guest Limit', message: 'Sign up to generate unlimited notes.', color: 'orange' });
                 return;
             }
        }

        setIsLoading(true); 
        setGeneratingNotesFor(subTopicText);
        setNoteError('');
        try {
            const response = await fetch('/api/generate-notes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-is-guest': isGuestMode ? 'true' : 'false'
                },
                body: JSON.stringify({
                    plan_topic_id: isGuestMode ? 0 : dayTopic.id,
                    sub_topic_text: subTopicText,
                    exam_name: isGuestMode ? plan.exam_name : plan.exam_name, // Use plan.exam_name for consistency
                    day_topic: dayTopic.topic_name,
                }),
            });

            if (!response.ok) throw new Error((await response.json()).error);
            const { note: newNote } = await response.json();

            // --- REACTIVE UI LOGIC ---
            if (isGuestMode) {
                 updateGuestNote(dayTopic.day, subTopicText, newNote.notes_markdown);
                 notifications.show({ title: 'Sample Note Forged', message: 'Sign up to save.', color: 'teal' });
            } else {
                setLocalNotes(currentNotes => {
                    const existingNoteIndex = currentNotes.findIndex(n => n.sub_topic_text === subTopicText);
                    if (existingNoteIndex > -1) {
                        const updatedNotes = [...currentNotes];
                        updatedNotes[existingNoteIndex] = newNote;
                        return updatedNotes;
                    }
                    return [...currentNotes, newNote];
                });
            }

            if (!isGuestMode && setPlan) {
                // Perform local mutation instead of full refresh
                setPlan(currentPlan => {
                    const newPlanTopics = currentPlan.plan_topics.map(topic => {
                        if (topic.id === dayTopic.id) {
                            // Find the note if it already exists to update it, otherwise add it
                            const existingNoteIndex = topic.new_notes.findIndex(n => n.sub_topic_text === subTopicText);
                            let updatedNotes;
                            if (existingNoteIndex > -1) {
                                updatedNotes = [...topic.new_notes];
                                updatedNotes[existingNoteIndex] = newNote;
                            } else {
                                updatedNotes = [...topic.new_notes, newNote];
                            }
                            return { ...topic, new_notes: updatedNotes };
                        }
                        return topic;
                    });
                    return { ...currentPlan, plan_topics: newPlanTopics };
                });
                notifications.show({ title: 'Note Synced', message: 'Your timeline has updated instantly.', color: 'teal' });
            } else if (!isGuestMode) {
                // Fallback to old method if setPlan is not provided
                if (onNoteGenerated) await onNoteGenerated();
                notifications.show({ title: 'Note Synced', message: 'Reloading data...', color: 'teal' });
            }

        } catch (err) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
            setNoteError(err.message);
        } finally {
            setIsLoading(false);
            setGeneratingNotesFor(null);
        }
    };

    // Quiz Logic
    const [quizOpened, { open: openQuiz, close: closeQuiz }] = useDisclosure(false);

    // Bulk Logic
    const handleConfirmBulkGenerate = async () => {
        if (bulkNoteSelection.length === 0) return;
        setIsBulkGenerating(true); closeBulkNoteModal();
        let completedCount = 0;
        const notificationId = `bulk-notes-${dayTopic.id}`;
        
        notifications.show({ id: notificationId, loading: true, title: `Forging Notes... (0/${bulkNoteSelection.length})`, message: 'Starting...', autoClose: false, withCloseButton: false });

        // --- THE FIX: We collect the new notes first ---
        let newlyGeneratedNotes = [];

        for (const subTopicText of bulkNoteSelection) {
            try {
                const response = await fetch('/api/generate-notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan_topic_id: dayTopic.id, sub_topic_text: subTopicText, exam_name: plan.exam_name, day_topic: dayTopic.topic_name }),
                });

                if (response.ok) {
                    const { note } = await response.json();
                    newlyGeneratedNotes.push(note); // Collect the note object
                    completedCount++;
                    notifications.update({ id: notificationId, title: `Forging... (${completedCount}/${bulkNoteSelection.length})`, message: `Done: ${subTopicText}` });
                }
                
                // We add a small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (err) { console.error(err); }
        }

        // --- The Fix: Perform ONE state update at the end ---
        if (setPlan && newlyGeneratedNotes.length > 0) {
            setPlan(currentPlan => {
                const newPlanTopics = currentPlan.plan_topics.map(topic => {
                    if (topic.id === dayTopic.id) {
                        // Merge the newly generated notes with any existing ones
                        const existingNotes = new Map(topic.new_notes.map(n => [n.sub_topic_text, n]));
                        newlyGeneratedNotes.forEach(n => existingNotes.set(n.sub_topic_text, n));
                        return { ...topic, new_notes: Array.from(existingNotes.values()) };
                    }
                    return topic;
                });
                return { ...currentPlan, plan_topics: newPlanTopics };
            });
        }

        if (newlyGeneratedNotes.length > 0) {
            setLocalNotes(currentNotes => {
                const existingNotes = new Map(currentNotes.map(note => [note.sub_topic_text, note]));
                newlyGeneratedNotes.forEach(note => existingNotes.set(note.sub_topic_text, note));
                return Array.from(existingNotes.values());
            });
        }

        notifications.update({ id: notificationId, loading: false, color: 'teal', title: 'Bulk Forge Complete', message: `Forged ${completedCount} notes.`, autoClose: 5000 });
        setIsBulkGenerating(false);
        setBulkNoteSelection([]);
    };

    const daysLeft = differenceInCalendarDays(new Date(plan.exam_date), new Date());
    let badgeColor = 'green';
    if (daysLeft < 7) badgeColor = 'red';
    else if (daysLeft < 14) badgeColor = 'yellow';

    // --- RENDER ---
    return (
        <Box mb="lg" style={{ position: 'relative' }}>
            
            {/* Dashboard Header Context */}
            {viewMode === 'dashboard' && (
                <Group justify="space-between" mb="xs" align="center">
                    {!isGuestMode ? (
                        <Link href={`/plan/${plan.id}`} style={{ textDecoration: 'none' }}>
                            <Title order={3} className="apple-text-gradient" style={{ cursor: 'pointer', fontSize: '1.25rem' }}>
                                {plan.exam_name}
                            </Title>
                        </Link>
                    ) : (
                        <Title order={3} className="apple-text-gradient" style={{ fontSize: '1.25rem' }}>{plan.exam_name}</Title>
                    )}
                    <Badge color={badgeColor} variant="light" size="lg">{daysLeft > 0 ? `${daysLeft}d left` : 'EXAM DAY'}</Badge>
                </Group>
            )}

            {/* --- CARD ROOT --- */}
            {/* We moved Collapse INSIDE the card so the header is always visible */}
            <GlassCard 
                p={0} 
                style={{ 
                    overflow: 'hidden', 
                    borderLeft: `6px solid ${diffConfig.color}`, // Difficulty Color Stripe
                    transition: 'all 0.3s ease'
                }}
            >
                {/* 1. Header Section (Always Visible) */}
                <Box 
                    p={{ base: 'md', sm: 'xl' }} 
                    onClick={toggleDetails} // Whole header is clickable to toggle
                    style={{ 
                        background: `linear-gradient(to right, ${diffConfig.bg} 0%, transparent 100%)`,
                        borderBottom: detailsOpened ? '1px solid var(--glass-border)' : 'none', // Conditional border
                        cursor: 'pointer'
                    }}
                >
                    <Stack gap="sm">
                        <Group justify="space-between" align="start">
                            {/* Left: Day & Title */}
                            <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                    <Badge 
                                        size="sm" 
                                        variant="outline" 
                                        color="gray" 
                                        style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        DAY {dayTopic.day}
                                    </Badge>
                                    <Badge 
                                        size="sm" 
                                        variant="filled" 
                                        color={dayTopic.day_difficulty?.toLowerCase() === 'easy' ? 'green' : dayTopic.day_difficulty?.toLowerCase() === 'medium' ? 'yellow' : 'red'}
                                        style={{ color: '#000' }}
                                    >
                                        {dayTopic.day_difficulty}
                                    </Badge>
                                </Group>
                                <Title 
                                    order={3} 
                                    style={{ 
                                        fontFamily: 'var(--font-lexend)', 
                                        letterSpacing: '-0.02em', 
                                        lineHeight: 1.2,
                                        fontSize: '1.5rem',
                                    }}
                                >
                                    {dayTopic.topic_name}
                                </Title>
                            </Stack>

                            {/* Right: Actions */}
                            <Group visibleFrom="sm">
                                {!isReadOnly && !isGuestMode && (
                                    // STOP PROPAGATION on button click so it doesn't toggle collapse
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="light" 
                                            color={isNoteGenerationLocked ? "orange" : "violet"}
                                            size="xs" 
                                            leftSection={isNoteGenerationLocked ? <IconLock size={16} /> : <IconListCheck size={16} />}
                                            onClick={isNoteGenerationLocked ? () => window.dispatchEvent(new CustomEvent('open-upgrade-modal')) : openBulkNoteModal}
                                            style={{ boxShadow: isNoteGenerationLocked ? 'none' : '0 2px 10px rgba(139, 92, 246, 0.2)' }}
                                        >
                                            {isNoteGenerationLocked ? 'Unlock Bulk' : 'Bulk Notes'}
                                        </Button>
                                    </div>
                                )}
                                <ActionIcon variant="transparent" color="gray">
                                    <IconChevronsDown size={20} style={{ transform: detailsOpened ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </ActionIcon>
                            </Group>
                        </Group>

                        {/* Summary Text (Visible if expanded OR if you want a preview) */}
                         <Collapse in={detailsOpened}>
                             <Text size="sm" c="dimmed" style={{ maxWidth: '90%', lineHeight: 1.5 }}>
                                {dayTopic.day_summary}
                            </Text>
                         </Collapse>
                         <Group hiddenFrom="sm">
                                {!isReadOnly && !isGuestMode && (
                                    // STOP PROPAGATION on button click so it doesn't toggle collapse
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="light" 
                                            color={isNoteGenerationLocked ? "orange" : "violet"}
                                            size="xs" 
                                            leftSection={isNoteGenerationLocked ? <IconLock size={16} /> : <IconListCheck size={16} />}
                                            onClick={isNoteGenerationLocked ? () => window.dispatchEvent(new CustomEvent('open-upgrade-modal')) : openBulkNoteModal}
                                            style={{ boxShadow: isNoteGenerationLocked ? 'none' : '0 2px 10px rgba(139, 92, 246, 0.2)' }}
                                        >
                                            {isNoteGenerationLocked ? 'Unlock Bulk' : 'Bulk Notes'}
                                        </Button>
                                    </div>
                                )}
                            </Group>
                    </Stack>
                </Box>

                {/* 2. The Task List (Collapsible) */}
                <Collapse in={detailsOpened}>
                    <Box p={{ base: 'md', sm: 'xl' }}>
                        <Stack gap="md">
                            {internalSubTopics.map((subTopic, index) => {
                                // Guest Logic for existing note detection
                                const guestNote = isGuestMode ? guestArtifact?.generatedNotes?.find(n => n.sub_topic_text === subTopic.text) : null;
                                const v2_note = localNotes.find(n => n.sub_topic_text === subTopic.text);
                                const v1_note = (index === 0 && dayTopic.generated_notes) ? { notes_markdown: dayTopic.generated_notes, sub_topic_text: subTopic.text } : null;
                                
                                const existingNote = isGuestMode ? guestNote : (v2_note || v1_note);
                                const lecture = dayTopic.curated_lectures?.find(l => l.sub_topic_text === subTopic.text);

                                return (
    // 1. ADDED: onClick handler to the whole row & pointer cursor
    <Group 
        key={index}
        align="flex-start" 
        wrap="nowrap" 
        onClick={() => !isReadOnly && handleCheckboxChange(index, !subTopic.completed)}
        style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid transparent',
            transition: 'background 0.2s',
            cursor: isReadOnly ? 'default' : 'pointer' // Cursor feedback
        }}
        className="hover:bg-white/5 hover:border-white/10"
    >
        {/* 2. MODIFIED: Checkbox is now 'readOnly' and clicks pass through to the Group via pointerEvents: 'none' */}
        <Checkbox
            checked={subTopic.completed}
            readOnly
            color="green"
            radius="xl"
            size="md"
            iconColor="white"
            styles={{ root: { marginTop: 2, pointerEvents: 'none' } }} 
        />
        
        <Stack gap={4} style={{ flex: 1 }}>
            <Text 
                size="md" 
                fw={500}
                td={subTopic.completed ? 'line-through' : 'none'}
                c={subTopic.completed ? 'dimmed' : 'bright'}
                style={{ transition: 'color 0.2s' }}
            >
                {subTopic.text}
            </Text>
            <Group gap="xs">
                <Badge size="xs" variant="dot" color={TYPE_COLORS[subTopic.type?.toLowerCase()] || 'gray'}>
                    {subTopic.type}
                </Badge>
                {existingNote && <Badge size="xs" variant="filled" color="teal">Note Ready</Badge>}
            </Group>
        </Stack>

        {/* Action Menu */}
        {!isReadOnly && (
            // 3. ADDED: Stop propagation so clicking menu doesn't toggle the checkbox
            <div onClick={(e) => e.stopPropagation()}>
                                            {existingNote ? (
                                                <Tooltip label="Read Notes" withArrow>
                                                    <ActionIcon 
                                                        variant="light" 
                                                        color="teal" 
                                                        size="md" 
                                                        radius="xl"
                                                        onClick={() => setNoteToView({ ...existingNote, sub_topic: subTopic, day_topic: dayTopic, exam_name: plan.exam_name })}
                                                    >
                                                        <IconEye size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : isNoteGenerationLocked ? (
                                                <Tooltip label="Unlock to Create Notes" withArrow>
                                                    <ActionIcon 
                                                        variant="light" 
                                                        color="orange" 
                                                        size="md" 
                                                        radius="xl"
                                                        onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                                                    >
                                                        <IconLock size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip label="Create Notes" withArrow>
                                                    <ActionIcon 
                                                        variant="subtle" 
                                                        color="gray" 
                                                        size="md" 
                                                        radius="xl"
                                                        onClick={() => handleGenerateNotes(subTopic.text)}
                                                        loading={generatingNotesFor === subTopic.text}
                                                    >
                                                        <IconPencilPlus size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </div>
                                        )}
                                    </Group>
                                );
                            })}
                        </Stack>
                    </Box>

                    {/* 3. Footer (Quiz CTA) */}
                    {!isReadOnly && !isGuestMode && allTopicsCompleted && (
                        <Box 
                            p="md" 
                            style={{ 
                                borderTop: '1px solid var(--glass-border)',
                                backgroundColor: 'rgba(52, 199, 89, 0.05)' // Subtle Green Tint
                            }}
                        >
                            <Group justify="center">
                                <ShimmerButton 
                                    onClick={openQuiz}
                                    style={{ width: '100%' }}
                                >
                                    <Group gap="xs" justify="center">
                                        <IconBrain size={18} />
                                        <span>Start Daily Smart Quiz</span>
                                    </Group>
                                </ShimmerButton>
                            </Group>
                        </Box>
                    )}
                </Collapse>
            </GlassCard>

            {/* --- MODALS --- */}
            <QuizOrchestratorModal opened={quizOpened} onClose={closeQuiz} planTopicId={dayTopic.id} />
            <FullscreenNoteViewer
                noteData={noteToView}
                onClose={() => setNoteToView(null)}
                onUpdate={onUpdate}
                onNoteUpdate={patchNoteLocally}
            />

            {/* Bulk Modal */}
            <Modal
                opened={bulkNoteModalOpened}
                onClose={closeBulkNoteModal}
                title="Bulk Note Forge"
                centered
                size="md"
                styles={{ 
                    content: { backgroundColor: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: '16px' },
                    header: { backgroundColor: 'transparent' },
                    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600 }
                }}
            >
                <Stack>
                    <Text size="sm" c="dimmed">Select topics to auto-generate notes for.</Text>
                    <ScrollArea.Autosize mah={300}>
                        <Stack gap="xs">
                            {internalSubTopics.map((sub, i) => {
                                const exists = isGuestMode ? guestArtifact?.generatedNotes?.find(n => n.sub_topic_text === sub.text) : localNotes.find(n => n.sub_topic_text === sub.text);
                                const isSelected = bulkNoteSelection.includes(sub.text);
                                return (
                                    <Paper 
                                        key={i} 
                                        p="sm" 
                                        withBorder 
                                        style={{ 
                                            backgroundColor: exists ? 'rgba(255,255,255,0.02)' : isSelected ? 'rgba(191, 90, 242, 0.1)' : 'transparent',
                                            borderColor: isSelected ? '#BF5AF2' : 'var(--glass-border)',
                                            cursor: exists ? 'default' : 'pointer'
                                        }}
                                        onClick={() => !exists && setBulkNoteSelection(prev => prev.includes(sub.text) ? prev.filter(t => t !== sub.text) : [...prev, sub.text])}
                                    >
                                        <Group>
                                            <Checkbox 
                                                checked={isSelected || !!exists} 
                                                readOnly 
                                                color="green" // Also Green here
                                                radius="xl"
                                                disabled={!!exists}
                                            />
                                            <Text size="sm" c={exists ? 'dimmed' : 'bright'}>{sub.text}</Text>
                                        </Group>
                                    </Paper>
                                )
                            })}
                        </Stack>
                    </ScrollArea.Autosize>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeBulkNoteModal}>Cancel</Button>
                        <Button color="violet" onClick={handleConfirmBulkGenerate} loading={isBulkGenerating} disabled={bulkNoteSelection.length === 0}>
                            Start Forge ({bulkNoteSelection.length})
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}
