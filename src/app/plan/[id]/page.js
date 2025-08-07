// src/app/plan/[id]/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { QuestTimeline } from '@/components/QuestTimeline';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from '@/components/landing/ShimmerButton';

// Mantine Imports
import { Container, Title, Text, Loader, Alert, Group, Button, Breadcrumbs, Anchor, Modal, Textarea, Paper, Badge } from '@mantine/core';
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (!session) { router.push('/sign-in'); return; }
            if (!planId) { setError("Plan ID not found."); setLoading(false); return; }

            try {
                const { data, error } = await supabase
                    .from('study_plans')
                    .select(`id, exam_name, exam_date, plan_topics ( *, topic_confidence ( score, activity_type ) )`)
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
        fetchData();
    }, [planId, router]);

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
                            <Button variant="light" onClick={openRegenerateModal}>Regenerate Plan</Button>
                        </Group>
                        <QuestTimeline planTopics={plan.plan_topics} onUpdate={handleUpdateTopic} />
                    </>
                )}
            </Container>

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
                                
                                {/* --- START OF FIX --- */}
                                {regenerationSuccess.newStrategy.emphasized_topics && regenerationSuccess.newStrategy.emphasized_topics.length > 0 && (
                                    <>
                                        <Text mt="md" fw={500}>Key Topics to Emphasize:</Text>
                                        <Group mt="xs" gap="xs">
                                            {regenerationSuccess.newStrategy.emphasized_topics.map((item, index) => {
                                                // Robustly handle if item is a string OR an object with a 'topic' key
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
                                                        {/* Conditionally render based on available keys */}
                                                        {item.topic && <Text fw={500} span>{item.topic}:</Text>}
                                                        {item.week && <Text fw={500} span>{item.week}:</Text>}
                                                        
                                                        {/* Also handle reason/reasoning keys */}
                                                        {item.reason && <Text c="dimmed" span> {item.reason}</Text>}
                                                        {item.reasoning && <Text c="dimmed" span> {item.reasoning}</Text>}
                                                    </Text>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                {/* --- END OF FIX --- */}
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