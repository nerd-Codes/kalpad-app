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
import { IconVideo } from '@tabler/icons-react';

// Mantine Imports
import { Container, Title, Text, Loader, Alert, Group, Button, Breadcrumbs, Anchor, Modal, Textarea, Paper, Badge, ScrollArea, Stack, Checkbox } from '@mantine/core';
import Link from 'next/link';
import { useDisclosure } from '@mantine/hooks';
import { useLoading } from '@/context/LoadingContext';

export default function PlanDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { id: planId } = params;

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState(null);

    const [regenerateModalOpened, { open: openRegenerateModal, close: closeRegenerateModal }] = useDisclosure(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenerateError, setRegenerateError] = useState('');
    const [regenerateText, setRegenerateText] = useState('');
    const [regenerationSuccess, setRegenerationSuccess] = useState(null);
    const [isCurating, setIsCurating] = useState(false);

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

    const [todaysTopics, setTodaysTopics] = useState([]);

    const [lectureModalOpened, { open: openLectureModal, close: closeLectureModal }] = useDisclosure(false);
    const [selectedTopics, setSelectedTopics] = useState([]);

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
                        plan_topics ( 
                            *, 
                            curated_lectures ( plan_topic_id, sub_topic_text, video_url ), 
                            topic_confidence ( score, activity_type ),
                            new_notes:generated_notes ( * )
                        )
                    `)
                    .eq('id', planId)
                    .eq('user_id', session.user.id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Plan not found or you don't have permission to view it.");
                
                data.plan_topics.sort((a, b) => a.day - b.day);
                setPlan(data);
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
                fetchPlanData(session); // Call the single, correct function
            };
            getSessionAndFetch();
        }, [planId]); // The dependency array is clean.

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

    const handleRegeneratePlan = async () => {
        if (!planId) return;
        setIsRegenerating(true);
        setRegenerateError('');
        setIsLoading(true);
        try {
            const response = await fetch('/api/regenerate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: planId, user_feedback: regenerateText }),
            });
            // --- THIS IS THE FIX ---
            const responseData = await response.json(); // Declare and use responseData
            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to regenerate the plan.');
            }
            // Use the correct variable here
            setRegenerationSuccess({ newPlanId: responseData.newPlanId, newStrategy: responseData.newStrategy });
        } catch (err) {
            setRegenerateError(err.message);
        } finally {
            setIsRegenerating(false);
            setIsLoading(false);
        }
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
        const todayString = new Date().toISOString().split('T')[0];
        const topicsForToday = plan.plan_topics.filter(t => t.date === todayString);
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


    return (
    <AppLayout session={session}>
        <Container>
            {loading && <Group justify="center" py="xl"><Loader /></Group>}
            {error && <Alert color="red" title="Error">{error}</Alert>}
            
            {plan && (
                <>
                    <Breadcrumbs mb="md">{breadcrumbs}</Breadcrumbs>
                    <Group justify="space-between" align="center" mb="xl">
                        <Title order={1}>{plan.exam_name}</Title>
                        {/* The "Find Lectures" button is now located in the QuestTimeline component */}
                        <Button variant="light" onClick={openRegenerateModal}>Regenerate Plan</Button>
                    </Group>
                    
                    {/* The QuestTimeline now receives the handler and loading state */}
                     <QuestTimeline 
                        plan={plan} // Pass the entire plan object
                        planTopics={plan.plan_topics} 
                        onUpdate={handleUpdateTopic}
                        onFindLectures={handleStartCuration}
                        isCurating={isCurating}
                        onNoteGenerated={() => fetchPlanData(session)}
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
                    Select the topics you'd like our AI to find the best lectures for.
                </Text>
                
                <Group justify="flex-end">
                    <Button variant="subtle" size="xs" onClick={handleSelectAllTopics}>
                        {selectedTopics.length < todaysTopics.length ? 'Select All' : 'Deselect All'}
                    </Button>
                </Group>

                <ScrollArea.Autosize mah={350}>
                    <Checkbox.Group value={selectedTopics} onChange={setSelectedTopics}>
                        <Stack gap="xs">
                            {todaysTopics.map((topic, index) => (
                                <Paper 
                                    key={index} 
                                    withBorder 
                                    p="sm" 
                                    radius="md" 
                                    style={{ 
                                        backgroundColor: 'var(--mantine-color-dark-6)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Checkbox 
                                        value={JSON.stringify(topic)}
                                        label={topic.text}
                                        styles={{ label: { cursor: 'pointer' } }}
                                    />
                                </Paper>
                            ))}
                        </Stack>
                    </Checkbox.Group>
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

        {/* Regenerate Plan Modal (Unchanged) */}
        <Modal opened={regenerateModalOpened} onClose={closeRegenerateModal} title="Regenerate Your Study Plan" centered withCloseButton={false} radius="lg" size="lg">
            <GlassCard>
                {!regenerationSuccess ? (
                    <>
                        <Title order={3}>Give the AI some feedback</Title>
                        <Text c="dimmed" size="sm" mt="xs" mb="lg">Fallen behind? Mention any topics you want to repeat or focus on.</Text>
                        <Textarea
                            placeholder="e.g., I need more practice on Calculus..."
                            value={regenerateText}
                            onChange={(e) => setRegenerateText(e.target.value)}
                            autosize minRows={4}
                        />
                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={closeRegenerateModal}>Cancel</Button>
                            <ShimmerButton color="brandGreen" onClick={handleRegeneratePlan} loading={isRegenerating}>
                                Regenerate & Optimize
                            </ShimmerButton>
                        </Group>
                        {regenerateError && <Alert color="red" mt="md">{regenerateError}</Alert>}
                    </>
                ) : (
                    <>
                        <Title order={3}>✅ Success!</Title>
                        <Text c="dimmed" size="sm" mt="xs" mb="lg">Your new plan is ready. Here is the AI's new strategy report:</Text>
                        <Paper withBorder p="md" radius="md" style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                            <Text mt="sm" fw={500}>New Approach:</Text>
                            <Text c="dimmed">{regenerationSuccess.newStrategy.overall_approach}</Text>
                            
                            {regenerationSuccess.newStrategy.emphasized_topics && regenerationSuccess.newStrategy.emphasized_topics.length > 0 && (
                                <>
                                    <Text mt="md" fw={500}>Key Topics to Emphasize:</Text>
                                    <Group mt="xs" gap="xs">
                                        {regenerationSuccess.newStrategy.emphasized_topics.map((item, index) => {
                                            const topicText = typeof item === 'string' ? item : item.topic;
                                            return <Badge key={index} color="brandGreen" variant="light">{topicText}</Badge>;
                                        })}
                                    </Group>
                                </>
                            )}

                            {regenerationSuccess.newStrategy.skipped_topics && regenerationSuccess.newStrategy.skipped_topics.length > 0 && (
                                <>
                                    <Text mt="md" fw={500}>De-prioritized Topics:</Text>
                                    <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '0' }}>
                                        {regenerationSuccess.newStrategy.skipped_topics.map((item, index) => (
                                            <li key={index}>
                                                <Text size="sm">
                                                    {item.topic && <Text fw={500} span>{item.topic}:</Text>}
                                                    {item.week && <Text fw={500} span>{item.week}:</Text>}
                                                    {item.reason && <Text c="dimmed" span> {item.reason}</Text>}
                                                    {item.reasoning && <Text c="dimmed" span> {item.reasoning}</Text>}
                                                </Text>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </Paper>
                        <Group justify="flex-end" mt="xl">
                            <ShimmerButton color="brandPurple" onClick={() => handleGoToNewPlan(regenerationSuccess.newPlanId)}>
                                Go to New Plan →
                            </ShimmerButton>
                        </Group>
                    </>
                )}
            </GlassCard>
        </Modal>
    </AppLayout>
);
}