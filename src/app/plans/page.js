// src/app/plans/page.js
"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Container, Title, Text, Group, Button, SimpleGrid, Badge, Progress, Loader, Alert, Stack, Divider } from '@mantine/core';
import { GlassCard } from '@/components/GlassCard';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

export default function AllPlansPage() {
    const { setIsLoading } = useLoading(); // Get the loader function
    const router = useRouter(); // Get the router
    const [session, setSession] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (!session) { setLoading(false); return; }

            try {
                // This is the correct query for this page.
                const { data, error } = await supabase
                    .from('study_plans')
                    .select(`id, exam_name, exam_date, created_at, plan_topics ( sub_topics )`)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPlans(data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePlanClick = (planId) => {
        setIsLoading(true); // Trigger the blurry page loader
        router.push(`/plan/${planId}`); // Navigate to the specific plan
    };

    const calculateProgress = (plan) => {
        let totalSubTopics = 0;
        let completedSubTopics = 0;
        if (plan.plan_topics) {
            plan.plan_topics.forEach(day => {
                if (day.sub_topics && Array.isArray(day.sub_topics)) {
                    totalSubTopics += day.sub_topics.length;
                    completedSubTopics += day.sub_topics.filter(sub => sub.completed).length;
                }
            });
        }
        if (totalSubTopics === 0) return 0;
        return Math.round((completedSubTopics / totalSubTopics) * 100);
    };

    // src/app/plans/page.js - The final return statement

return (
    <AppLayout session={session}>
        <Container>
            <Group justify="space-between" align="center" mb="xl">
                <Title order={1}>All Study Plans</Title>
                <Button component={Link} href="/new-plan" variant="outline" color="brandPurple">
                    + Create New Plan
                </Button>
            </Group>

            {loading && <Group justify="center" py="xl"><Loader /></Group>}
            {error && <Alert color="red" title="Error">{error}</Alert>}

            {!loading && plans.length === 0 && (
                <GlassCard style={{ textAlign: 'center' }}>
                    <Text size="lg">You haven't created any plans yet.</Text>
                    <Button component={Link} href="/new-plan" mt="lg" color="brandGreen">
                        Create Your First Plan
                    </Button>
                </GlassCard>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
    {plans.map((plan) => {
        const progress = calculateProgress(plan);
        const daysLeft = Math.max(0, Math.ceil((new Date(plan.exam_date) - new Date()) / (1000 * 60 * 60 * 24)));
        
        let color = 'brandGreen';
        if (progress > 85) color = 'teal';
        if (daysLeft < 7) color = 'red';
        else if (daysLeft < 14) color = 'orange';

        const coolEmojis = [
            '🤯', '😤', '😭', '🤓', '😅', '😵‍💫', '🫠', '😎', '😇', '🥲',
            '🤔', '🫡', '🙃', '😴', '🧘‍♂️', '🫥', '😬', '😈', '😌', '🤠',
            '🤑', '😶‍🌫️', '🥹', '😵', '🫢', '😑', '😳', '🤡', '🤫', '🤭',
            '🫨', '😮‍💨', '🫣', '🫶', '💀', '👀', '😕', '😧', '😨', '😰',
            '😩', '😫', '😖', '😟', '😢', '😥', '😠', '😡', '🤬', '😇',
            '😌', '😈', '🥴', '🤕', '🤒', '🤧', '🤤', '🥳', '😛', '😜',
            '🤪', '😝', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
            '😾', '🫨', '😲', '🤯', '😵‍💫', '🫣', '🫢', '🫥', '🙄', '🤥',
            '🤐', '😶', '😬', '😑', '😮‍💨', '😴', '🫠', '🧠'
            ];
        const emojiIndex = String(plan.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % coolEmojis.length;
        const backgroundEmoji = coolEmojis[emojiIndex];

        return (
            // --- FIX #2: The card is no longer a Link component. It now has an onClick handler. ---
            <GlassCard
                key={plan.id}
                onClick={() => handlePlanClick(plan.id)}
                style={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer', // Add cursor to indicate it's clickable
                }}
                p="lg"
            >
                {/* --- FIX #1: The background emoji is moved to the top right. --- */}
                <Text
                    style={{
                        position: 'absolute',
                        top: -20,   // Changed from 'bottom'
                        right: -15,
                        fontSize: '6rem',
                        color: 'white',
                        opacity: 0.08,
                        zIndex: 0,
                        userSelect: 'none',
                    }}
                >
                    {backgroundEmoji}
                </Text>

                <Stack justify="space-between" h="100%" style={{ zIndex: 1, position: 'relative' }}>
                    {/* The rest of the card content is unchanged. */}
                    <Stack gap="xs">
                        <Title order={3} ff="Lexend, sans-serif" fw={600} lineClamp={2}>
                            {plan.exam_name}
                        </Title>
                        <Text size="xs" c="dimmed">
                            Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
                        </Text>
                        <Badge color={color} variant="light" size="sm" style={{ alignSelf: 'flex-start' }}>
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Exam Day!'}
                        </Badge>
                    </Stack>

                    <Stack gap="md" mt="md">
                        <Stack gap={4}>
                           <Group justify="space-between">
                                <Text size="sm" fw={500}>Progress</Text>
                                <Text size="sm" fw={700} c={color}>{progress}%</Text>
                           </Group>
                           <Progress value={progress} color={color} size="md" radius="sm" />
                        </Stack>
                        <Divider my="xs" />
                        <Group justify="space-between" c="dimmed">
                            <Text size="xs">Exam Date</Text>
                            <Text size="sm" fw={500} c="white">
                                {format(new Date(plan.exam_date), 'MMMM do, yyyy')}
                            </Text>
                        </Group>
                    </Stack>
                </Stack>
            </GlassCard>
        );
    })}
</SimpleGrid>
        </Container>
    </AppLayout>
);
}