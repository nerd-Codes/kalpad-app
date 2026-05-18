// src/app/plan/[id]/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { notifications } from '@mantine/notifications';
import { isSameDay, parseISO, format, isToday } from 'date-fns';
import { 
    IconFlame, IconShare3, IconVideo, IconRefresh, IconPlayerPlay, IconChevronRight, IconChevronLeft, IconBrain, IconTrash, IconDownload
} from '@tabler/icons-react';
import { 
    Container, Title, Text, Loader, Alert, Group, Button, Box, 
    Stack, Modal, Checkbox, TextInput, ScrollArea, Paper, Grid, CopyButton, ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLoading } from '@/context/LoadingContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTS ---
import { TimelineDayCard } from '@/components/TimelineDayCard';
import { RegeneratePlanModal } from '@/components/RegeneratePlanModal';
import { wittyFacts as cramSheetFacts } from '@/lib/newplanFacts';

import { QuizOrchestratorModal } from '@/components/QuizOrchestratorModal';
import { getDayNoteSections } from '@/lib/dayNotes';

import Link from 'next/link';

// --- VISUAL CONSTANTS ---
const MOBILE_DAY_WIDTH = 70;
const DESKTOP_DAY_WIDTH = 50;

// --- SHARED MODAL STYLES ---
const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0 },
    body: { padding: '20px' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export default function PlanDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { id: planId } = params;

    // --- STATE MANAGEMENT ---
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState(null);
    
    // Timeline State (Dual Refs for dual layouts)
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const mobileScrubberRef = useRef(null);
    const desktopScrubberRef = useRef(null);

    const [quizOpened, { open: openQuiz, close: closeQuiz }] = useDisclosure(false);


    // Modals & Jobs
    const [regenerateModalOpened, { open: openRegenerateModal, close: closeRegenerateModal }] = useDisclosure(false);
    const [lectureModalOpened, { open: openLectureModal, close: closeLectureModal }] = useDisclosure(false);
    const [shareModalOpened, { open: openShareModal, close: closeShareModal }] = useDisclosure(false);
    
    const [isCurating, setIsCurating] = useState(false);
    const [isForging, setIsForging] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    
    const [cramSheet, setCramSheet] = useState(null);
    const [todaysTopics, setTodaysTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [shareableLink, setShareableLink] = useState('');
    const [isInApp, setIsInApp] = useState(false);

    // --- WITTY MESSAGES ---
    const wittyStatusMessages = [
        "Scanning for content that wasn't written on a typewriter...",
        "My rival's job is to write a eulogy for your free time. Mine is to resurrect it.",
        "Sifting through the web for a cure to 'death by bullet points'.",
        "The other guy gives you notes. I give you a pulse.",
    ];

    // --- INITIALIZATION ---
    useEffect(() => {
        if (navigator.userAgent.includes('KalPad-Android-App')) setIsInApp(true);
        const getSessionAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if(session && planId) fetchPlanData(session);
        };
        getSessionAndFetch();
    }, [planId]);

    // --- DATA FETCHING ---
    const fetchPlanData = async (session) => {
        if (!session || !planId) { setError(planId ? "Authentication error." : "Plan ID not found."); setLoading(false); return; }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('study_plans')
                .select(`
                    id, exam_name, exam_date, syllabus, generation_context, is_active,
                    plan_topics ( 
                        *, curated_lectures ( plan_topic_id, sub_topic_text, video_url ), 
                        topic_confidence ( score, activity_type ),
                        new_notes:generated_notes ( * )
                    ),
                    generated_cram_sheets ( id, status ) 
                `)
                .eq('id', planId).eq('user_id', session.user.id).single();

            if (error) throw error;
            if (!data) throw new Error("Plan not found or permission denied.");
            
            data.plan_topics.sort((a, b) => a.day - b.day);
            setPlan(data);
            setCramSheet(data.generated_cram_sheets?.[0] || null);

            // Auto-select "Today" or default to first day
            let initialDayIndex = data.plan_topics.findIndex(t => isToday(parseISO(t.date)));
            // If no "Today" is found (e.g., past plan), default to Day 1 (index 0)
            if (initialDayIndex === -1) {
                initialDayIndex = 0; 
            }
            setSelectedDayIndex(initialDayIndex);
            setTimeout(() => scrollToDay(initialDayIndex), 500);

            if (window.Android?.cachePlanForOffline) window.Android.cachePlanForOffline(JSON.stringify(data));
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // --- HANDLERS ---
    const handleUpdateTopic = (planTopicId, updates) => {
        setPlan(currentPlan => ({
            ...currentPlan,
            plan_topics: currentPlan.plan_topics.map(topic => topic.id === planTopicId ? { ...topic, ...updates } : topic)
        }));
        supabase.from('plan_topics').update(updates).eq('id', planTopicId).then(({ error }) => { if (error) console.error(error); });
    };

    const handleSharePlan = async () => {
        if (!plan) return;
        setIsSharing(true); setError(''); setShareableLink('');
        try {
            const response = await fetch('/api/share-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_id: plan.id }) });
            if (!response.ok) throw new Error((await response.json()).error);
            const { public_id } = await response.json();
            setShareableLink(`${window.location.origin}/shared/${public_id}`);
            openShareModal();
        } catch (err) { notifications.show({ title: 'Error', message: err.message, color: 'red' }); } 
        finally { setIsSharing(false); }
    };

    const handleStartCuration = async () => {
        const today = new Date();
        const topicsForToday = plan.plan_topics.filter(t => isSameDay(parseISO(t.date), today));
        const allSubTopicsForToday = topicsForToday.flatMap(t => t.sub_topics.map(st => ({ text: st.text, plan_topic_id: t.id, day_topic: t.topic_name, exam_name: plan.exam_name })));
        
        if (allSubTopicsForToday.length === 0) {
            notifications.show({ color: 'blue', title: 'All Set!', message: 'No topics scheduled for today.' });
            return;
        }
        setTodaysTopics(allSubTopicsForToday); setSelectedTopics([]); openLectureModal();
    };

    const confirmAndStartCuration = async () => {
        closeLectureModal();
        if (selectedTopics.length === 0) return;
        setIsCurating(true);
        let wittyMessageIndex = 0;
        const notificationId = notifications.show({ loading: true, title: 'Initializing Lecture Scout...', message: wittyStatusMessages[0], autoClose: false, withCloseButton: false });
        const wittyInterval = setInterval(() => {
            wittyMessageIndex = (wittyMessageIndex + 1) % wittyStatusMessages.length;
            notifications.update({ id: notificationId, message: wittyStatusMessages[wittyMessageIndex] });
        }, 7000);

        try {
            const topicsToCurate = selectedTopics.map(topicString => JSON.parse(topicString));
            const payload = { plan_id: planId, topics_to_curate: topicsToCurate, all_todays_topics: todaysTopics.map(t => t.text), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
            const response = await fetch('/api/start-lecture-curation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error((await response.json()).error);
            const { job_id } = await response.json();
            
            const poll = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/curation-status?job_id=${job_id}`);
                    if (!statusRes.ok) throw new Error("Status fetch failed");
                    const statusData = await statusRes.json();
                    notifications.update({ id: notificationId, loading: statusData.status === 'in_progress', title: `Finding Lectures (${statusData.completed_topics}/${statusData.total_topics})` });
                    if (statusData.status === 'complete' || statusData.status === 'error') {
                        clearInterval(poll); clearInterval(wittyInterval);
                        notifications.update({ id: notificationId, color: statusData.status === 'complete' ? 'teal' : 'red', title: statusData.status === 'complete' ? 'Lectures Found!' : 'Curation Failed', message: statusData.status === 'complete' ? 'Timeline updated. Refreshing...' : 'Try again later.', autoClose: 7000 });
                        if (statusData.status === 'complete') fetchPlanData(session);
                        setIsCurating(false);
                    }
                } catch (pollError) { clearInterval(poll); clearInterval(wittyInterval); setIsCurating(false); }
            }, 7000);
        } catch (err) { clearInterval(wittyInterval); notifications.update({ id: notificationId, color: 'red', title: 'Error', message: err.message, autoClose: 5000 }); setIsCurating(false); }
    };

    const handleForgeCramSheet = async () => {
        if (!plan) return;
        setIsForging(true);
        let wittyMessageIndex = 0;
        const notificationId = notifications.show({ loading: true, title: 'Initializing Forge...', message: cramSheetFacts[0], autoClose: false, withCloseButton: false });
        const wittyInterval = setInterval(() => { wittyMessageIndex = (wittyMessageIndex + 1) % cramSheetFacts.length; notifications.update({ id: notificationId, message: cramSheetFacts[wittyMessageIndex] }); }, 5000);

        try {
            const response = await fetch('/api/forge-cram-sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_id: plan.id }) });
            if (!response.body) throw new Error("Streaming failed");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n---\n');
                buffer = parts.pop() || ''; 
                for (const part of parts) {
                    if (!part.trim()) continue;
                    try {
                        const message = JSON.parse(part);
                        if (message.type === 'status') notifications.update({ id: notificationId, title: message.data.title });
                        else if (message.type === 'complete') {
                            clearInterval(wittyInterval);
                            notifications.update({ id: notificationId, loading: false, title: 'Forge Complete!', message: 'Cram Sheet ready.', color: 'teal', autoClose: 5000 });
                            await fetchPlanData(session); 
                            router.push(`/cram-sheet/${message.data.cramSheetId}`);
                            break; 
                        } else if (message.type === 'error') throw new Error(message.data.message);
                    } catch (e) { console.warn(e); }
                }
            }
        } catch (err) { clearInterval(wittyInterval); notifications.update({ id: notificationId, loading: false, title: 'Forge Failed', message: err.message, color: 'red', autoClose: 7000 }); } 
        finally { setIsForging(false); }
    };

    const handleDownloadDayNotes = () => {
        const selectedDayTopic = plan?.plan_topics?.[selectedDayIndex];
        if (!selectedDayTopic) return;

        const printableSections = getDayNoteSections(selectedDayTopic);
        if (printableSections.length === 0) {
            notifications.show({
                title: 'No Notes Yet',
                message: 'Generate at least one note for this day before exporting.',
                color: 'yellow',
            });
            return;
        }

        const printWindow = window.open(`/print/day/${selectedDayTopic.id}`, '_blank');
        if (!printWindow) {
            notifications.show({
                title: 'Popup Blocked',
                message: 'Please allow popups to export the day notes.',
                color: 'yellow',
            });
            return;
        }

        const handleMessage = (event) => {
            if (event.source === printWindow && event.data === 'KALPAD_PRINT_READY') {
                printWindow.print();
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

        notifications.update({ id: notificationId, loading: false, color: 'teal', title: 'Bulk Forge Complete', message: `Forged ${completedCount} notes.`, autoClose: 5000 });
        setIsBulkGenerating(false);
        setBulkNoteSelection([]);
    };

    // --- TIMELINE NAVIGATION HELPER (Dual Ref Support) ---
    const scrollToDay = (index) => {
        setSelectedDayIndex(index);
        
        // Scroll Mobile Scrubber
        if (mobileScrubberRef.current) {
            const scrollPos = (index * MOBILE_DAY_WIDTH) - (mobileScrubberRef.current.clientWidth / 2) + (MOBILE_DAY_WIDTH / 2);
            mobileScrubberRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
        }

        // Scroll Desktop Scrubber
        if (desktopScrubberRef.current) {
            const scrollPos = (index * DESKTOP_DAY_WIDTH)  + (DESKTOP_DAY_WIDTH / 2);
            desktopScrubberRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
        }
    };

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const selectedDayTopic = plan?.plan_topics?.[selectedDayIndex] || null;
    const selectedDayNoteCount = selectedDayTopic ? getDayNoteSections(selectedDayTopic).length : 0;
    const canDownloadSelectedDayNotes = selectedDayNoteCount > 0;

    return (
    <AppLayout session={session}>
        <Container size="xl" pt="sm" pb={120} style={{
    maxWidth: isDesktop ? '76vw' : '93vw',
  }}> 
            {loading ? (
                <Group justify="center"><Loader color="white" /></Group>
            ) : !plan?.is_active ? (
                // --- DELETED STATE ---
                <Container size="sm" pt={100}>
                    <GlassCard p="xl" style={{ textAlign: 'center', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                        <Stack align="center" gap="lg">
                            <ThemeIcon size={80} radius="100%" color="red" variant="light" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
                                <IconTrash size={40} />
                            </ThemeIcon>
                            <Box>
                                <Title order={2} className="apple-text-gradient">Mission Archived</Title>
                                <Text c="dimmed" mt="sm">This plan was deleted or archived by you. It is no longer active.</Text>
                            </Box>
                            <Button component={Link} href="/plans" variant="default" radius="xl" size="md">
                                Return to Base
                            </Button>
                        </Stack>
                    </GlassCard>
                </Container>
            ) : (
                // --- ACTIVE STATE ---
                <>
                        {/* --- TITLE --- */}
                        <Box mb="md" px={{ base: 'md', md: 0 }}>
                            <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.1em' }}>Active Mission</Text>
                            <Title 
                                order={1} 
                                className="apple-text-gradient" 
                                style={{ 
                                    fontSize: 'clamp(1.8rem, 5vw, 3rem)', 
                                    letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word'
                                }}
                            >
                                {plan.exam_name}
                            </Title>
                        </Box>

                        {/* --- MOBILE: ACTION RIBBON --- */}
                        <Box hiddenFrom="md" mb="lg" px="md">
                            <ScrollArea type="never" scrollbars="x" offsetScrollbars>
                            <Group gap="2px" wrap="nowrap" style={{ width: 'max-content' }}>
                                <Button 
                                    variant="light" color="teal" radius="xl" size="xs"
                                    leftSection={<IconBrain size={16}/>} 
                                    onClick={openQuiz} 
                                >
                                    Start Quiz
                                </Button>
                                <Button 
                                    variant="light" color="orange" radius="xl" size="xs" 
                                    leftSection={<IconFlame size={16}/>} 
                                    loading={isForging}
                                    onClick={() => cramSheet?.status === 'complete' ? router.push(`/cram-sheet/${cramSheet.id}`) : handleForgeCramSheet()}
                                >
                                    {cramSheet?.status === 'complete' ? 'View Sheet' : 'Cram Sheet'}
                                </Button>
                                <Button
                                    variant="light"
                                    color="blue"
                                    radius="xl"
                                    size="xs"
                                    leftSection={<IconDownload size={16} />}
                                    onClick={handleDownloadDayNotes}
                                    disabled={!canDownloadSelectedDayNotes}
                                >
                                    Day Notes File
                                </Button>
                                <Button variant="light" color="violet" radius="xl" size="xs" leftSection={<IconRefresh size={16}/>} onClick={openRegenerateModal}>Refine Plan</Button>
                                <Button variant="default" radius="xl" size="xs" leftSection={<IconShare3 size={16}/>} onClick={handleSharePlan}>Share</Button>
                            </Group>
                            </ScrollArea>
                        </Box>

                        {/* --- MOBILE: TIMELINE SCRUBBER (Edge-to-Edge) --- */}
                        <Box hiddenFrom="md" mb="lg" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', position: 'relative' }}>
                            <Box style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                                <Box ref={mobileScrubberRef} style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px', gap: '8px', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {plan.plan_topics.map((topic, index) => {
                                        const isSelected = index === selectedDayIndex;
                                        const isCurrent = isToday(parseISO(topic.date));
                                        return (
                                            <Interactive key={topic.id} onClick={() => scrollToDay(index)}>
                                                <Box style={{ minWidth: '60px', height: '60px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.2)' : isCurrent ? 'rgba(52, 199, 89, 0.1)' : 'transparent', border: isSelected ? '1px solid #BF5AF2' : isCurrent ? '1px solid #34C759' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', scrollSnapAlign: 'center', transition: 'all 0.2s ease' }}>
                                                    <Text size="10px" c="dimmed" tt="uppercase" fw={700}>Day</Text>
                                                    <Text size="md" fw={700} c={isSelected ? 'white' : isCurrent ? '#34C759' : 'dimmed'}>{topic.day}</Text>
                                                    {isCurrent && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34C759', marginTop: 2 }} />}
                                                </Box>
                                            </Interactive>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                        
                        {/* --- DESKTOP: TIMELINE SCRUBBER (GlassCard Container) --- */}
<Box visibleFrom="md" mb="xl">
    <GlassCard p={0} style={{ overflow: 'hidden' }}>
        <Box style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Group justify="space-between">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Timeline</Text>
                <Button size="xs" variant="subtle" color="teal" onClick={() => { const todayIdx = plan.plan_topics.findIndex(t => isToday(parseISO(t.date))); if(todayIdx !== -1) scrollToDay(todayIdx); }}>
                    Jump to Today
                </Button>
            </Group>
        </Box>
        {/* Adjusted padding: reduced from 24px to 16px */}
        <Box ref={desktopScrubberRef} style={{ display: 'flex', overflowX: 'auto', padding: '16px', gap: '10px', scrollBehavior: 'smooth', scrollbarWidth: 'none' }}>
            {plan.plan_topics.map((topic, index) => {
                const isSelected = index === selectedDayIndex;
                const isCurrent = isToday(parseISO(topic.date));
                
                const cardBg = isSelected ? '#BF5AF2' : isCurrent ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255,255,255,0.03)';
                const cardBorder = isSelected ? 'none' : isCurrent ? '1px solid #34C759' : '1px solid rgba(255,255,255,0.05)';
                const shadow = isSelected ? '0 4px 12px rgba(191, 90, 242, 0.35)' : 'none';
                
                return (
                    <Interactive key={topic.id} onClick={() => scrollToDay(index)}>
                        <Box
                            style={{
                                // Reduced dimensions from 100x90 to 70x70
                                minWidth: '70px', height: '70px',
                                borderRadius: '14px', // Slightly tighter radius
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: cardBg,
                                border: cardBorder,
                                boxShadow: shadow,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
                            }}
                        >
                            <Text size="10px" c={isSelected ? 'white' : 'dimmed'} tt="uppercase" fw={700} style={{ opacity: isSelected ? 0.8 : 1 }}>Day</Text>
                            {/* Reduced font size from 1.75rem to 1.4rem */}
                            <Text size="1.4rem" fw={800} c={isSelected ? 'white' : isCurrent ? '#34C759' : 'dimmed'} style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1 }}>
                                {topic.day}
                            </Text>
                            {isCurrent && !isSelected && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34C759', marginTop: 4 }} />}
                        </Box>
                    </Interactive>
                );
            })}
        </Box>
    </GlassCard>
</Box>

                        {/* --- MAIN DECK (SPLIT VIEW) --- */}
                        <Grid gutter={{ base: 0, md: 'xl' }} px={{ base: 'md', md: 0 }}>
                            {/* --- LEFT: ACTIVE CARD --- */}
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <AnimatePresence mode="wait">
                                    {/* --- FIX: GUARD AGAINST UNDEFINED --- */}
                                    {plan.plan_topics && plan.plan_topics[selectedDayIndex] ? (
                                        <motion.div
                                            key={selectedDayIndex}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <TimelineDayCard 
                                                plan={plan}
                                                dayTopic={plan.plan_topics[selectedDayIndex]}
                                                onUpdate={handleUpdateTopic}
                                                setPlan={setPlan} 
                                                isInitiallyCollapsed={false}
                                                onConfirmBulkGenerate={handleConfirmBulkGenerate} 
                                            />
                                        </motion.div>
                                    ) : (
                                        <GlassCard><Text c="dimmed">No topics found for this day.</Text></GlassCard>
                                    )}
                                </AnimatePresence>
                            </Grid.Col>

                            {/* --- RIGHT: CONTEXT RAIL (DESKTOP ONLY) --- */}
                            <Grid.Col span={{ base: 12, md: 4 }} visibleFrom="md">
                                <Stack>
                                    {/* Action Card */}
                                    <GlassCard p="lg">
                                        <Stack gap="md">
                                            <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Actions</Text>
                                            <Button 
                                                fullWidth
                                                variant="light" color="teal" radius="xl"
                                                leftSection={<IconBrain size={16}/>} 
                                                onClick={openQuiz} 
                                            >
                                                Start Quiz
                                            </Button>
                                            <Button fullWidth variant="light" color="yellow" leftSection={<IconFlame size={16} color="orange"/>} loading={isForging} onClick={() => cramSheet?.status === 'complete' ? router.push(`/cram-sheet/${cramSheet.id}`) : handleForgeCramSheet()}>
                                                {cramSheet?.status === 'complete' ? 'View Cram Sheet' : 'Forge Cram Sheet'}
                                            </Button>
                                            <Button
                                                fullWidth
                                                variant="light"
                                                color="blue"
                                                leftSection={<IconDownload size={16} />}
                                                onClick={handleDownloadDayNotes}
                                                disabled={!canDownloadSelectedDayNotes}
                                            >
                                                Download Day Notes
                                            </Button>
                                            <Button fullWidth variant="light" leftSection={<IconShare3 size={16}/>} onClick={handleSharePlan} loading={isSharing}>Share</Button>
                                            <Button fullWidth variant="light" color="violet" onClick={openRegenerateModal} leftSection={<IconRefresh size={16} />}>Refine Plan</Button>
                                        </Stack>
                                    </GlassCard>

                                    {/* Details Card */}
                                    <GlassCard p="lg">
                                        <Stack gap="xs">
                                            <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Details</Text>
                                            {/* --- FIX: GUARD AGAINST UNDEFINED --- */}
                                            {plan.plan_topics && plan.plan_topics[selectedDayIndex] && (
                                                <>
                                                    <Group justify="space-between">
                                                        <Text size="sm" c="dimmed">Date</Text>
                                                        <Text size="sm" fw={500}>{format(parseISO(plan.plan_topics[selectedDayIndex].date), 'MMM do, yyyy')}</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm" c="dimmed">Tasks</Text>
                                                        <Text size="sm" fw={500}>{plan.plan_topics[selectedDayIndex].sub_topics.length} items</Text>
                                                    </Group>
                                                </>
                                            )}
                                        </Stack>
                                    </GlassCard>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </>
                )}
            </Container>

            {/* --- MODALS --- */}

            {/* UNIFIED QUIZ ORCHESTRATOR */}
            <QuizOrchestratorModal 
                opened={quizOpened} 
                onClose={closeQuiz} 
                planTopicId={plan?.plan_topics[selectedDayIndex]?.id} 
            />

            <RegeneratePlanModal opened={regenerateModalOpened} onClose={closeRegenerateModal} plan={plan} />
            
            <Modal opened={shareModalOpened} onClose={closeShareModal} title={<Title order={3}>Share Plan</Title>} centered styles={glassModalStyles} overlayProps={{ blur: 4 }}>
                <GlassCard>
                    <Stack>
                        <Text c="dimmed" size="sm">Share a read-only link to your plan.</Text>
                        <TextInput value={shareableLink} readOnly variant="filled" styles={{ input: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' } }} />
                        <CopyButton value={shareableLink}>
                            {({ copied, copy }) => <ShimmerButton fullWidth color={copied ? 'teal' : 'brandPurple'} onClick={copy} radius="xl">{copied ? 'Copied!' : 'Copy Link'}</ShimmerButton>}
                        </CopyButton>
                    </Stack>
                </GlassCard>
            </Modal>
        </AppLayout>
    );
}
