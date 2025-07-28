// src/app/plans/page.js
"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Container, Title, Text, Group, Button, SimpleGrid, Badge, Progress, Loader, Alert } from '@mantine/core';
import { GlassCard } from '@/components/GlassCard';
import { format } from 'date-fns';

export default function AllPlansPage() {
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

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {plans.map((plan) => {
                    const progress = calculateProgress(plan);
                    const daysLeft = Math.max(0, Math.ceil((new Date(plan.exam_date) - new Date()) / (1000 * 60 * 60 * 24)));
                    let color = 'brandGreen';
                    if (daysLeft < 7) color = 'red';
                    else if (daysLeft < 14) color = 'yellow';

                    return (
                        // --- FIX #3: Added GlassCard transparency props ---
                        <GlassCard 
                            key={plan.id} 
                            component={Link} 
                            href={{ pathname: `/plan/${plan.id}` }} 
                            style={{ 
                                textDecoration: 'none', 
                                display: 'flex', 
                                flexDirection: 'column', // Make the card a flex container
                            }}
                        >
                            {/* The main content of the card */}
                            <div style={{ flexGrow: 1 }}>
                                <Title order={4}>{plan.exam_name}</Title>
                                
                                {/* --- FIX #1: "Days Left" is now on its own line --- */}
                                <Badge color={color} variant="light" mt="sm">
                                    {daysLeft > 0 ? `${daysLeft} days left` : 'Exam Day!'}
                                </Badge>
                                
                                {/* --- FIX #2: Added Exam Date --- */}
                                <Group mt="md">
                                    <Text size="xs" c="dimmed">Exam Date:</Text>
                                    <Text size="xs">{format(new Date(plan.exam_date), 'MMM d, yyyy')}</Text>
                                </Group>
                                <Group>
                                    <Text size="xs" c="dimmed">Created:</Text>
                                    <Text size="xs">{format(new Date(plan.created_at), 'MMM d, yyyy')}</Text>
                                </Group>
                            </div>

                            {/* The progress bar, pushed to the bottom */}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <Text size="xs">Progress:</Text>
                                <Progress value={progress} color={color} mt={4} />
                            </div>
                        </GlassCard>
                    );
                })}
            </SimpleGrid>
        </Container>
    </AppLayout>
);
}