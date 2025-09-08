// src/app/shared/[shareId]/page.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Container, Title, Text, Alert, Group, Button, Paper, Badge, Stack, ThemeIcon } from '@mantine/core';
import AppLayout from '@/components/AppLayout';
import { QuestTimeline } from '@/components/QuestTimeline';
import { format } from 'date-fns';
import { IconTargetArrow, IconX, IconInfoCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import {GlassCard} from '@/components/GlassCard'; // Ensuring correct default import

// Helper function to fetch data for the server component
async function getPublicPlan(supabase, shareId) {
    const { data, error } = await supabase
        .from('public_plans')
        .select(`
            exam_name,
            exam_date,
            generation_context,
            plan_topics:public_plan_topics (*)
        `)
        .eq('public_id', shareId)
        .single();
    
    if (error) {
        console.error("Error fetching public plan:", error);
        return null;
    }
    
    if (data && data.plan_topics) {
        data.plan_topics.sort((a, b) => a.day - b.day);
    }
    return data;
}

// Main Server Component
export default async function SharedPlanPage({ params }) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    const plan = await getPublicPlan(supabase, params.shareId);

    const strategy = plan?.generation_context ? (typeof plan.generation_context === 'string' ? JSON.parse(plan.generation_context) : plan.generation_context) : null;

    if (!plan) {
        return (
            <AppLayout session={session}>
                <Container>
                    <Alert color="red" title="Plan Not Found">
                        The shared plan you are looking for does not exist or has been removed.
                    </Alert>
                </Container>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout session={session}>
            <Container>
                {!session && (
                    <Paper withBorder p="lg" radius="md" mb="xl" style={{backgroundColor: 'var(--mantine-color-dark-8)'}}>
                        <Group justify="space-between">
                            <Text fw={500}>You're viewing a shared plan. Create your own personalized AI study plan!</Text>
                            <ShimmerButton component={Link} href="/sign-up">
                                Get Started for Free
                            </ShimmerButton>
                        </Group>
                    </Paper>
                )}
                
                <Title order={1}>{plan.exam_name}</Title>
                <Text c="dimmed" mb="lg">Exam Date: {format(new Date(plan.exam_date), 'MMMM do, yyyy')}</Text>

                {strategy && (
                    <GlassCard mb="xl" p="lg">
                        <Title order={3} ff="Lexend, sans-serif">AI Strategy Report</Title>
                        <Stack gap="lg" mt="md">
                            <Text c="dimmed">{strategy.overall_approach}</Text>
                            
                            {strategy.emphasized_topics?.length > 0 && (
                                <Stack gap="xs">
                                    {/* --- DEFINITIVE FIX: Add align="center" to the Group --- */}
                                    <Group wrap="nowrap" gap="xs" align="center">
                                        <ThemeIcon color="green" size={20} radius="xl"><IconTargetArrow size={14} /></ThemeIcon>
                                        <Text fw={500}>Key Focus Areas:</Text>
                                    </Group>
                                    <Stack gap={2} pl={30}>
                                        {strategy.emphasized_topics.map((item, i) => <Text key={i} size="sm">{item.topic}</Text>)}
                                    </Stack>
                                </Stack>
                            )}

                            {strategy.deprioritized_topics?.length > 0 && (
                                <Stack gap="xs">
                                    {/* --- DEFINITIVE FIX: Add align="center" to the Group --- */}
                                    <Group wrap="nowrap" gap="xs" align="center">
                                        <ThemeIcon color="blue" size={20} radius="xl"><IconInfoCircle size={14} /></ThemeIcon>
                                        <Text fw={500}>De-prioritized Topics:</Text>
                                    </Group>
                                    <Stack gap={2} pl={30}>
                                        {strategy.deprioritized_topics.map((item, i) => <Text key={i} size="sm">{item.topic}</Text>)}
                                    </Stack>
                                </Stack>
                            )}

                            {strategy.skipped_topics?.length > 0 && (
                                <Stack gap="xs">
                                    {/* --- DEFINITIVE FIX: Add align="center" to the Group --- */}
                                    <Group wrap="nowrap" gap="xs" align="center">
                                        <ThemeIcon color="yellow" size={20} radius="xl"><IconX size={14} /></ThemeIcon>
                                        <Text fw={500}>Strategically Skipped:</Text>
                                    </Group>
                                    <Stack gap={2} pl={30}>
                                        {strategy.skipped_topics.map((item, i) => <Text key={i} size="sm">{item.topic}</Text>)}
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>
                    </GlassCard>
                )}

                <QuestTimeline
                    plan={plan}
                    planTopics={plan.plan_topics}
                    isReadOnly={true}
                />
            </Container>
        </AppLayout>
    );
}