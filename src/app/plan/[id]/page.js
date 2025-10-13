// src/app/plan/[id]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { QuestTimeline } from '@/components/QuestTimeline';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { notifications } from '@mantine/notifications';

import { isSameDay, parseISO } from 'date-fns'; 

import { IconFlame } from '@tabler/icons-react';
import { wittyFacts as cramSheetFacts } from '@/lib/newplanFacts';
import { useRef } from 'react'; 
import { IconListCheck } from '@tabler/icons-react';


// Mantine Imports
import { Container, Title, Text, Loader, Alert, Group, Button, Breadcrumbs, Anchor, Modal, Textarea, Paper, Badge, ScrollArea, Stack, Checkbox, TextInput, List } from '@mantine/core';
import Link from 'next/link';
import { useDisclosure } from '@mantine/hooks';
import { useLoading } from '@/context/LoadingContext';

import { RegeneratePlanModal } from '@/components/RegeneratePlanModal';

import { CopyButton } from '@mantine/core';
import { IconBellRinging, IconShare3, IconVideo, IconPlayerPlay} from '@tabler/icons-react';
import { format } from 'date-fns';// <-- Make sure this is imported

export default function PlanDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { id: planId } = params;

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState(null);

    // --- We only need the open/close state now ---
    const [regenerateModalOpened, { open: openRegenerateModal, close: closeRegenerateModal }] = useDisclosure(false);

    const [isCurating, setIsCurating] = useState(false);

    const [cramSheet, setCramSheet] = useState(null);
    const [isForging, setIsForging] = useState(false);

    const [curationJobId, setCurationJobId] = useState(null);
    const wittyStatusMessages = [
        "My rival builds prisons of text. I'm finding you the key.",
        "Let's find someone who uses a voice, not just a font.",
        "Searching for teachers who are still breathing...",
        "Executing `anti-boring-notes-protocol.exe`...",
        "Because life's too short to read something without a play button.",
        "Scanning for content that wasn't written on a typewriter.",
        "My rival's job is to write a eulogy for your free time. Mine is to resurrect it.",
        "Let's find a teacher, not just a glorified `.txt` file.",
        "Sifting through the web for a cure to 'death by bullet points'.",
        "The other guy gives you notes. I give you a pulse.",
        "Why read a dry summary when you can watch a living story?",
        "Upgrading your brain from monochrome text to full-color HD.",
        "I bet my rival's favorite color is beige.",
        "Performing CPR on concepts that died in a PDF somewhere...",
        "Let's find an explanation that doesn't sound like it was written by a robot. Oh, wait...",
        "My rival thinks 'engagement' is using bold text. How cute.",
        "Finding content that will actually stay in your brain past tomorrow.",
        "Because a 'wall of text' is what stands between you and success.",
        "I process gigabytes of video so you don't have to process kilobytes of boredom.",
        "Let's find a teacher who explains, not just a PDF that helps you 'ratta maar'.",
        "My rival is for studying. I'm for understanding.",
        "Analyzing videos made this century. Unlike some people's methods.",
        "Does my rival even have a favorite movie? Or just a favorite font?",
        "Finding an escape route from the 'pakaau' paragraph prison.",
        "One day, my rival will generate a note about how I made it obsolete."
    ];

    const [bulkNoteJob, setBulkNoteJob] = useState({ active: false, total: 0, requestedTopics: [] });
    const wittyIntervalRef = useRef(null);

    const handleConfirmBulkGenerate = async ({ total, topics }) => {
    const notificationId = `bulk-notes-job-${planId}`;
    
    // Clean up any previous intervals
    if (wittyIntervalRef.current) clearInterval(wittyIntervalRef.current);

    try {
        // Set the state to start tracking the job
        setBulkNoteJob({ active: true, total, requestedTopics: topics.map(t => t.sub_topic_text) });

        notifications.show({
            id: notificationId,
            loading: true,
            title: `Forging ${total} Notes... (0/${total})`,
            message: wittyFacts[0],
            autoClose: false,
            withCloseButton: false,
        });
        
        let factIndex = 1;
        wittyIntervalRef.current = setInterval(() => {
            notifications.update({
                id: notificationId,
                message: wittyFacts[factIndex % wittyFacts.length],
            });
            factIndex++;
        }, 5000);

        const response = await fetch('/api/bulk-generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topics }),
        });

        if (response.status !== 202) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server rejected the request.');
        }
    } catch (err) {
        if (wittyIntervalRef.current) clearInterval(wittyIntervalRef.current);
        notifications.update({
            id: notificationId,
            color: 'red', title: 'Request Failed',
            message: err.message, loading: false, autoClose: 8000,
        });
        setBulkNoteJob({ active: false, total: 0, requestedTopics: [] });
    }
};

    const [isInApp, setIsInApp] = useState(false);
    useEffect(() => {
        // This check runs once on mount.
        if (navigator.userAgent.includes('KalPad-Android-App')) {
            setIsInApp(true);
        }
    }, []);

    const handleScheduleReminders = () => {
        if (!plan) return;

        const todayString = format(new Date(), 'yyyy-MM-dd');
        const todaysTopic = plan.plan_topics.find(t => t.date === todayString);

        if (!todaysTopic || !todaysTopic.sub_topics || todaysTopic.sub_topics.length === 0) {
            notifications.show({ title: 'Nothing to Schedule', message: 'There are no tasks scheduled for today.', color: 'blue' });
            return;
        }

        // --- DEFINITIVE FIX #1: CALCULATE DURATION BASED ON ALL TASKS ---
        // The time budget for each task is now fixed based on the original plan.
        const totalHours = todaysTopic.study_hours || 1;
        const minutesPerOriginalTask = (totalHours * 60) / todaysTopic.sub_topics.length;

        // --- DEFINITIVE FIX #2: FILTER *AFTER* CALCULATION ---
        const remainingTasks = todaysTopic.sub_topics.filter(task => !task.completed);

        if (remainingTasks.length === 0) {
            notifications.show({ title: 'All Done!', message: "You've already completed all tasks for today.", color: 'green' });
            return;
        }
        
        // --- DEFINITIVE FIX #3: START THE FIRST REMINDER 1 MINUTE FROM NOW ---
        let currentTime = new Date().getTime() + 60 * 1000; // 1 minute (60,000 ms) grace period

        const remindersArray = remainingTasks.map(task => {
            const reminderTime = currentTime;
            
            // Increment the time for the next task using the original, fixed duration.
            currentTime += minutesPerOriginalTask * 60 * 1000; 

            return {
                title: todaysTopic.topic_name,
                message: `Time to start: ${task.text}`,
                timestamp: reminderTime,
            };
        });

        if (window.Android && typeof window.Android.scheduleBulkReminders === 'function') {
            console.log("Sending bulk reminders to native:", JSON.stringify(remindersArray));
            window.Android.scheduleBulkReminders(JSON.stringify(remindersArray));
        } else {
            alert("This smart scheduling feature is only available in the KalPad Android app.");
        }
    };

    const [todaysTopics, setTodaysTopics] = useState([]);

    const [lectureModalOpened, { open: openLectureModal, close: closeLectureModal }] = useDisclosure(false);
    const [selectedTopics, setSelectedTopics] = useState([]);

    const [shareModalOpened, { open: openShareModal, close: closeShareModal }] = useDisclosure(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareableLink, setShareableLink] = useState('');

    const handleSharePlan = async () => {
        if (!plan) return;
        setIsSharing(true);
        setError(''); // Clear previous errors
        setShareableLink('');

        try {
            const response = await fetch('/api/share-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: plan.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create shareable link.');
            }

            const { public_id } = await response.json();
            const link = `${window.location.origin}/shared/${public_id}`;
            setShareableLink(link);
            openShareModal();

        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsSharing(false);
        }
    };

    // This is the ONLY function that fetches the plan data.
        const fetchPlanData = async (session) => {
            if (!session || !planId) {
                setError(planId ? "Authentication error." : "Plan ID not found.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // --- ARCHITECTURAL UPGRADE: THE NEW DATA FETCHING QUERY ---
                // This query now fetches everything: the plan, its topics, and joins all V2 notes.
                const { data, error } = await supabase
                    .from('study_plans')
                    .select(`
                        id, 
                        exam_name, 
                        exam_date,
                        syllabus,
                        generation_context,
                        plan_topics ( 
                            *, 
                            curated_lectures ( plan_topic_id, sub_topic_text, video_url ), 
                            topic_confidence ( score, activity_type ),
                            new_notes:generated_notes ( * )
                        ),
                        generated_cram_sheets ( id, status ) 
                    `)
                    .eq('id', planId)
                    .eq('user_id', session.user.id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Plan not found or you don't have permission to view it.");
                
                data.plan_topics.sort((a, b) => a.day - b.day);
                setPlan(data);

                setCramSheet(data.generated_cram_sheets?.[0] || null);

                if (window.Android && typeof window.Android.cachePlanForOffline === 'function') {
                    console.log("Android bridge detected. Caching plan for offline access.");
                    // We pass the entire fetched plan object as a JSON string to the native side.
                    window.Android.cachePlanForOffline(JSON.stringify(data));
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // This is the ONLY useEffect that runs on page load.
        useEffect(() => {
            const getSessionAndFetch = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if(session && planId) {
                fetchPlanData(session);
                }
            };
            getSessionAndFetch();
        }, [planId]);

        // --- DEFINITIVE FIX: THE NEW REAL-TIME SUBSCRIPTION EFFECT ---
    useEffect(() => {
        // Only set up the subscription if we have a valid plan object.
        if (!plan) return;

        // Get an array of all the plan_topic IDs for the current plan.
        const topicIds = plan.plan_topics.map(topic => topic.id);

        // Create a Supabase channel to listen for changes.
        // We listen for any INSERT or UPDATE on the `generated_notes` table
        // where the `plan_topic_id` is one of our current topics.
        const channel = supabase
            .channel(`notes-for-plan-${planId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT or UPDATE
                    schema: 'public',
                    table: 'generated_notes',
                    filter: `plan_topic_id=in.(${topicIds.join(',')})`
                },
                (payload) => {
                    console.log('Realtime update received! Refetching plan data...', payload);
                    // When a change is detected, show a notification and refetch all data
                    // to ensure the UI is perfectly in sync.
                    notifications.show({
                        title: 'Illustrations Ready!',
                        message: 'Your notes have been automatically updated with new visual aids.',
                        color: 'teal',
                        zindex: 5000,
                    });
                    fetchPlanData(session);
                }
            )
            .subscribe();

        // This is the cleanup function. It's critical to unsubscribe when the
        // component unmounts to prevent memory leaks.
        return () => {
            supabase.removeChannel(channel);
        };

    }, [plan, session]); // This effect re-runs if the plan or session changes.

    useEffect(() => {
    // This effect runs whenever the 'plan' data is successfully re-fetched.
    if (!plan || loading) return; // Only run when data is fresh and not loading

    // --- Logic for Bulk Note Generation Progress ---
    if (bulkNoteJob.active) {
        const notificationId = `bulk-notes-job-${planId}`;
        
        const currentCompletedNotes = new Set(
            plan.plan_topics.flatMap(pt => pt.new_notes?.map(n => n.sub_topic_text) || [])
        );
        const completedCount = bulkNoteJob.requestedTopics.filter(t => currentCompletedNotes.has(t)).length;

        if (completedCount >= bulkNoteJob.total) {
            // Job is complete
            if (wittyIntervalRef.current) clearInterval(wittyIntervalRef.current);
            notifications.update({
                id: notificationId,
                color: 'teal', title: 'Bulk Generation Complete!',
                message: `${bulkNoteJob.total} notes have been successfully forged.`,
                loading: false, autoClose: 8000, icon: <IconListCheck size={18} />,
            });
            setBulkNoteJob({ active: false, total: 0, requestedTopics: [] });
        } else {
            // Job is in progress
            notifications.update({
                id: notificationId,
                title: `Forging Notes... (${completedCount}/${bulkNoteJob.total})`,
            });
        }
    }

    // Setup the Supabase Realtime subscription
    const channel = supabase
        .channel(`notes-for-plan-${planId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'generated_notes' },
            (payload) => {
                // The ONLY job of the listener is to trigger a data re-fetch.
                // All complex logic now lives outside the listener, preventing race conditions.
                console.log('Realtime change detected, refetching data...', payload);
                fetchPlanData(session);
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };

}, [plan, loading, session, bulkNoteJob]); // This dependency array is now correct and robust.

     useEffect(() => {
        // Only set up the listener if we have a valid session.
        if (!session) return;

        // Create a unique, private channel for this user.
        const channel = supabase.channel(`user-notifications:${session.user.id}`);

        // Subscribe to a custom event named 'illustration-complete'
        channel.on('broadcast', { event: 'illustration-complete' }, (payload) => {
            console.log('User notification received!', payload);
            
            // Show a notification that prompts the user to refresh.
            notifications.show({
                id: `note-updated-${payload.note_id}`, // Use an ID to prevent duplicate notifications
                title: 'Illustrations Ready!',
                message: 'Your note has been upgraded with new visual aids. Please refresh the page to see them.',
                color: 'teal',
                autoClose: false, // Keep the notification until the user dismisses it
            });
        });

        channel.subscribe();

        // The cleanup function is critical.
        return () => {
            supabase.removeChannel(channel);
        };

    }, [session]);

    const handleUpdateTopic = (planTopicId, updates) => {
        setPlan(currentPlan => {
            const newPlanTopics = currentPlan.plan_topics.map(topic => {
                if (topic.id === planTopicId) {
                    return { ...topic, ...updates };
                }
                return topic;
            });
            return { ...currentPlan, plan_topics: newPlanTopics };
        });
        supabase.from('plan_topics').update(updates).eq('id', planTopicId)
            .then(({ error }) => {
                if (error) { console.error("Background update failed:", error); }
            });
    };

    
    
    const handleGoToNewPlan = (newId) => {
        setIsLoading(true);
        setTimeout(() => {
            router.replace(`/plan/${newId}`); // Use replace to prevent "back" navigation to the old plan
            closeRegenerateModal();
            setTimeout(() => {
                setRegenerationSuccess(null);
                setRegenerateText('');
            }, 500);
        }, 300);
    };

    const handleBreadcrumbClick = (href) => {
        // Don't trigger loader if clicking the current page's link
        if (href === `/plan/${planId}`) return;
        setIsLoading(true);
        router.push(href);
    };

    const breadcrumbs = [
        { title: 'All Plans', href: '/plans' },
        { title: plan ? plan.exam_name : 'Plan', href: `/plan/${planId}` },
    ].map((item, index) => (
        <Anchor component="button" onClick={() => handleBreadcrumbClick(item.href)} key={index}>
            {item.title}
        </Anchor>
    ));

    const handleStartCuration = async () => {
        // Find all sub-topics for today to pass to the modal
        const today = new Date(); // Get the current date in the user's local timezone

    // --- DEFINITIVE FIX: Use isSameDay for a timezone-agnostic comparison ---
    const topicsForToday = plan.plan_topics.filter(t => {
        // parseISO converts the "YYYY-MM-DD" string from the database into a proper Date object (at UTC midnight)
        // isSameDay then correctly compares just the calendar day, ignoring time and timezone.
        return isSameDay(parseISO(t.date), today);
    });
        const allSubTopicsForToday = topicsForToday.flatMap(t => 
            t.sub_topics.map(st => ({
                text: st.text,
                plan_topic_id: t.id,
                day_topic: t.topic_name,
                exam_name: plan.exam_name,
            }))
        );
        
        if (allSubTopicsForToday.length === 0) {
            notifications.show({
                color: 'blue',
                title: 'All Set for Today!',
                message: 'There are no topics scheduled for today to find lectures for.',
            });
            return;
        }
        
        setTodaysTopics(allSubTopicsForToday);
        setSelectedTopics([]);
        openLectureModal(); // We will add the modal and this function next
    };

    const confirmAndStartCuration = async () => {
    closeLectureModal();
    if (selectedTopics.length === 0) return;

    setIsCurating(true);
    let wittyMessageIndex = 0;
    const notificationId = notifications.show({
        loading: true,
        title: 'Initializing Lecture Scout...',
        message: wittyStatusMessages[wittyMessageIndex],
        autoClose: false,
        withCloseButton: false,
    });

    const wittyInterval = setInterval(() => {
        wittyMessageIndex = (wittyMessageIndex + 1) % wittyStatusMessages.length;
        notifications.update({
            id: notificationId,
            message: wittyStatusMessages[wittyMessageIndex],
        });
    }, 7000); // Cycle witty message every 7 seconds

    try {
        // Parse the stringified topic objects back into actual objects
        const topicsToCurate = selectedTopics.map(topicString => JSON.parse(topicString));
        
        // This is the full, correct payload for the API
        const payload = { 
            plan_id: planId,
            topics_to_curate: topicsToCurate,
            all_todays_topics: todaysTopics.map(t => t.text),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        const response = await fetch('/api/start-lecture-curation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to start curation job.');
        }
        
        const { job_id } = await response.json();
        
        // --- POLLING LOGIC ---
        const poll = setInterval(async () => {
            try {
                const statusRes = await fetch(`/api/curation-status?job_id=${job_id}`);
                if (!statusRes.ok) {
                    clearInterval(poll);
                    clearInterval(wittyInterval);
                    notifications.update({
                        id: notificationId,
                        color: 'red', title: 'Error',
                        message: 'Could not get status updates from the server.',
                        autoClose: 5000,
                    });
                    setIsCurating(false); // Stop the main button loader
                    return;
                }

                const statusData = await statusRes.json();
                
                notifications.update({
                    id: notificationId,
                    loading: statusData.status === 'in_progress',
                    title: `Finding Lectures (${statusData.completed_topics}/${statusData.total_topics})`,
                });
                
                if (statusData.status === 'complete' || statusData.status === 'error') {
                    clearInterval(poll);
                    clearInterval(wittyInterval);
                    notifications.update({
                        id: notificationId,
                        color: statusData.status === 'complete' ? 'teal' : 'red',
                        title: statusData.status === 'complete' ? 'Lectures Found!' : 'Curation Failed',
                        message: statusData.status === 'complete' ? 'Your timeline has been updated. Please refresh' : 'Please try again later.',
                        icon: <IconVideo size="1rem" />,
                        autoClose: 7000,
                        zindex: 5000,
                    });
                    
                    if (statusData.status === 'complete') {
                        fetchPlanData(session); // Re-fetch the plan data to show new buttons
                    }
                    setIsCurating(false); // Reset the button's loading state
                }
            } catch (pollError) {
                console.error("Polling error:", pollError);
                clearInterval(poll);
                clearInterval(wittyInterval);
                setIsCurating(false);
            }
        }, 7000); // Poll every 7 seconds

    } catch (err) {
        clearInterval(wittyInterval);
        notifications.update({
            id: notificationId,
            color: 'red',
            title: 'Error Initiating Job',
            message: err.message,
            autoClose: 5000,
        });
        setIsCurating(false);
    }
};

const handleSelectAllTopics = () => {
    // If not all topics are currently selected, select all of them.
    if (selectedTopics.length < todaysTopics.length) {
        setSelectedTopics(todaysTopics.map(topic => JSON.stringify(topic)));
    } else {
        // Otherwise, clear the selection.
        setSelectedTopics([]);
    }
};

const handleForgeCramSheet = async () => {
    if (!plan) return;

    setIsForging(true);
    let wittyMessageIndex = 0;

    const notificationId = notifications.show({
        loading: true,
        title: 'Initializing the Forge...',
        message: cramSheetFacts[wittyMessageIndex],
        autoClose: false,
        withCloseButton: false,
    });

    const wittyInterval = setInterval(() => {
        wittyMessageIndex = (wittyMessageIndex + 1) % cramSheetFacts.length;
        notifications.update({
            id: notificationId,
            message: cramSheetFacts[wittyMessageIndex],
        });
    }, 5000); // Cycle witty message every 5 seconds

    try {
        const response = await fetch('/api/forge-cram-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: plan.id }),
        });

        if (!response.body) throw new Error("Streaming response not available.");

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
                if (part.trim() === '') continue;
                
                try {
                    const message = JSON.parse(part);
                    if (message.type === 'status') {
                        notifications.update({
                            id: notificationId,
                            title: message.data.title,
                        });
                    } else if (message.type === 'complete') {
                        clearInterval(wittyInterval);
                        notifications.update({
                            id: notificationId,
                            loading: false,
                            title: 'Forge Complete!',
                            message: 'Your Cram Sheet is ready.',
                            color: 'teal',
                            autoClose: 5000,
                        });

                          await fetchPlanData(session); 
                        router.push(`/cram-sheet/${message.data.cramSheetId}`);
                        break; 
                    } else if (message.type === 'error') {
                        throw new Error(message.data.message);
                    }
                } catch (e) { console.warn("Stream parse error:", part, e); }
            }
        }
    } catch (err) {
        clearInterval(wittyInterval);
        notifications.update({
            id: notificationId,
            loading: false,
            title: 'Forge Failed',
            message: err.message,
            color: 'red',
            autoClose: 7000,
        });
    } finally {
        setIsForging(false);
    }
};


    return (
    <AppLayout session={session}>
        <Container>
            {loading && <Group justify="center" py="xl"><Loader color="rgba(255, 255, 255, 1)"/></Group>}
            {error && <Alert color="red" title="Error">{error}</Alert>}
            
            {plan && (
                <>
                    <Breadcrumbs mb="md">{breadcrumbs}</Breadcrumbs>
                        <Group justify="space-between" align="center" mb="xl">
                            <Title order={1}>{plan.exam_name}</Title>
                            
                            {/* --- 4. Add the new Share button to the header group --- */}
                            <Group>

                                <Button
                                    leftSection={<IconFlame size={16} />}
                                    variant="outline"
                                    color="orange"
                                    onClick={() => {
                                        if (cramSheet && cramSheet.status === 'complete') {
                                            router.push(`/cram-sheet/${cramSheet.id}`);
                                        } else {
                                            handleForgeCramSheet();
                                        }
                                    }}
                                    loading={isForging || (cramSheet && cramSheet.status === 'in_progress')}
                                    disabled={cramSheet && cramSheet.status === 'in_progress'}
                                >
                                    {cramSheet && cramSheet.status === 'in_progress'
                                        ? "Forging..."
                                        : cramSheet && cramSheet.status === 'complete'
                                        ? "View Cram Sheet"
                                        : "Forge Cram Sheet"}
                                </Button>

                                <Button 
                                    leftSection={<IconShare3 size={16} />} 
                                    variant="subtle"
                                    onClick={handleSharePlan}
                                    loading={isSharing}
                                >
                                    Share
                                </Button>
                                <Button variant="light" onClick={openRegenerateModal}>Regenerate Plan</Button>
                            </Group>

                        </Group>
                    
                    {/* The QuestTimeline now receives the handler and loading state */}
                     <QuestTimeline 
                        plan={plan} // Pass the entire plan object
                        planTopics={plan.plan_topics} 
                        onUpdate={handleUpdateTopic}
                        onFindLectures={handleStartCuration}
                        isCurating={isCurating}
                        onNoteGenerated={() => fetchPlanData(session)}
                        isInApp={isInApp}
                        onScheduleReminders={handleScheduleReminders}
                        onConfirmBulkGenerate={handleConfirmBulkGenerate} 
                    />
                </>
            )}
        </Container>

        {/* --- New Modal for Selecting Topics --- */}
        <Modal 
            opened={lectureModalOpened} 
            onClose={closeLectureModal} 
            title={<Title order={3} ff="Lexend, sans-serif">AI Lecture Scout</Title>} 
            centered 
            size="lg" 
            radius="lg"
        >
            <Stack>
                <Text c="dimmed" size="sm">
                    Select the topics you'd like our AI to find the best lectures for. Previously found lectures are shown below.
                </Text>
                
                <Group justify="flex-end">
                    <Button variant="subtle" size="xs" onClick={() => {
                        const uncuratedTopics = todaysTopics
                            .filter(topic => !plan.plan_topics.flatMap(pt => pt.curated_lectures || []).some(lec => lec.sub_topic_text === topic.text))
                            .map(topic => JSON.stringify(topic));

                        if (selectedTopics.length < uncuratedTopics.length) {
                            setSelectedTopics(uncuratedTopics);
                        } else {
                            setSelectedTopics([]);
                        }
                    }}>
                        {/* Logic to intelligently show Select/Deselect All */}
                        Select All Available
                    </Button>
                </Group>

                <ScrollArea.Autosize mah={350}>
                    <Stack gap="xs">
                        {todaysTopics.map((topic, index) => {
                            // Check if a lecture for this specific sub-topic text already exists in the plan data.
                            const existingLecture = plan.plan_topics
                                .flatMap(pt => pt.curated_lectures || [])
                                .find(lec => lec.sub_topic_text === topic.text);

                            // --- DEFINITIVE FIX: Manual state management ---
                            const topicString = JSON.stringify(topic);
                            const isSelected = selectedTopics.includes(topicString);

                            return (
                                <Paper 
                                    key={index} 
                                    withBorder 
                                    p="sm" 
                                    radius="md" 
                                    style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}
                                >
                                    {existingLecture ? (
                                        // If a lecture exists, render a non-interactive view.
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed" td="line-through">{topic.text}</Text>
                                            <Button
                                                component="a"
                                                href={existingLecture.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="light"
                                                color="red"
                                                size="xs"
                                                leftSection={<IconPlayerPlay size={16} />}
                                            >
                                                View Lecture
                                            </Button>
                                        </Group>
                                    ) : (
                                        // If no lecture exists, render a functional checkbox.
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={(event) => {
                                                const newSelection = event.currentTarget.checked
                                                    ? [...selectedTopics, topicString]
                                                    : selectedTopics.filter(t => t !== topicString);
                                                setSelectedTopics(newSelection);
                                            }}
                                            label={topic.text}
                                            styles={{ root: { width: '100%' }, label: { cursor: 'pointer', width: '100%'} }}
                                        />
                                    )}
                                </Paper>
                            );
                        })}
                    </Stack>
                </ScrollArea.Autosize>
                
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={closeLectureModal}>Cancel</Button>
                    <ShimmerButton 
                        color="red" 
                        onClick={confirmAndStartCuration} 
                        disabled={selectedTopics.length === 0}
                    >
                        Find {selectedTopics.length > 0 ? `(${selectedTopics.length})` : ''} Lecture{selectedTopics.length !== 1 && 's'}
                    </ShimmerButton>
                </Group>
            </Stack>
        </Modal>

        <RegeneratePlanModal
            opened={regenerateModalOpened}
            onClose={closeRegenerateModal}
            plan={plan}
        />

        <Modal opened={shareModalOpened} onClose={closeShareModal} title={
            // --- DEFINITIVE FIX 1.1: BOLD MODAL TITLE ---
            <Title order={3} ff="Lexend, sans-serif">Share Your Plan</Title>
        } centered>
            {/* --- DEFINITIVE FIX 1.2: USE GLASSCARD FOR CONSISTENT UI --- */}
            <GlassCard>
                <Stack>
                    <Text c="dimmed" size="sm">
                        Anyone with this link can view a read-only version of your plan.
                        Your personal notes and progress will not be shared.
                    </Text>
                    <TextInput
                        value={shareableLink}
                        readOnly
                        label="Your public link"
                    />
                    <CopyButton value={shareableLink} timeout={2000}>
                        {({ copied, copy }) => (
                            <ShimmerButton fullWidth color={copied ? 'teal' : 'brandPurple'} onClick={copy}>
                                {copied ? 'Copied to clipboard!' : 'Copy Link'}
                            </ShimmerButton>
                        )}
                    </CopyButton>
                </Stack>
            </GlassCard>
        </Modal>
    </AppLayout>
);
}