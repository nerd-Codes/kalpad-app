// src/app/dashboard/page.js
"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import { Container, Title, Text, Group, Loader, Stack, Box, Grid } from '@mantine/core'; // Added Grid
import { format, isToday } from 'date-fns';

// --- NEW BENTO COMPONENTS ---
import { HeroTile } from '@/components/HeroTile';
import { MetricsDeck } from '@/components/MetricsDeck';
import { CalendarStrip } from '@/components/CalendarStrip';
import { TimelineDayCard } from '@/components/TimelineDayCard';
import { GlassCard } from '@/components/GlassCard';

import { studyTips } from '@/lib/studyTips';

export default function DashboardPage() {
    const router = useRouter();
    const { setIsLoading } = useLoading();
    
    // ... [STATE & EFFECT LOGIC PRESERVED 1:1 - COPY FROM PREVIOUS BLOCK] ...
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);
    const [stats, setStats] = useState({ plansCreated: 0, weeklyCompleted: 0, currentStreak: 0, completions: {} });
    const [error, setError] = useState('');
    const [tipOfTheDay, setTipOfTheDay] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyTasks, setDailyTasks] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    useEffect(() => {
        setTipOfTheDay(studyTips[Math.floor(Math.random() * studyTips.length)]);
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (!session) { setLoading(false); return; }
            try {
                const { data, error } = await supabase
                    .from('study_plans')
                    .select(`id, exam_name, exam_date, plan_topics ( date, sub_topics )`)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setPlans(data || []);
                calculateAllStats(data || []);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!session) return;
            setTimelineLoading(true);
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            try {
                const response = await fetch(`/api/timeline?date=${dateString}`);
                if (!response.ok) throw new Error((await response.json()).error);
                const responseData = await response.json();
                setDailyTasks(responseData.plans || []);
                const trigger = responseData.triggerNativeAction;
                if (trigger && window.Android && typeof window.Android.setReminder === 'function' && trigger.type === 'SET_REMINDER') {
                    window.Android.setReminder(JSON.stringify(trigger.details));
                }
            } catch (err) { console.error(err); } finally { setTimelineLoading(false); }
        };
        fetchTimelineData();
    }, [selectedDate, session]);

    const calculateAllStats = (allPlans) => {
        if (!allPlans || allPlans.length === 0) return;
        const completionsByDay = {};
        let weeklyCompletedCount = 0;
        const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        allPlans.forEach(plan => {
            plan.plan_topics?.forEach(day => {
                if (day.date && day.sub_topics) {
                    const completed = day.sub_topics.filter(sub => sub.completed).length;
                    if (completed > 0) {
                        const dStr = format(new Date(day.date), 'yyyy-MM-dd');
                        completionsByDay[dStr] = (completionsByDay[dStr] || 0) + completed;
                        if (new Date(day.date) >= oneWeekAgo) weeklyCompletedCount += completed;
                    }
                }
            });
        });
        let currentStreak = 0;
        let d = new Date(); d.setHours(0,0,0,0);
        if (completionsByDay[format(d, 'yyyy-MM-dd')]) {
            currentStreak = 1;
            let y = new Date(d); y.setDate(y.getDate() - 1);
            while (completionsByDay[format(y, 'yyyy-MM-dd')]) { currentStreak++; y.setDate(y.getDate() - 1); }
        }
        setStats({ plansCreated: allPlans.length, completions: completionsByDay, weeklyCompleted: weeklyCompletedCount, currentStreak });
    };

    const handleUpdateTaskGroup = (planTopicId, updates) => {
        setDailyTasks(current => current.map(p => p.plan_topics[0]?.id === planTopicId ? { ...p, plan_topics: [{ ...p.plan_topics[0], ...updates }] } : p));
        supabase.from('plan_topics').update(updates).eq('id', planTopicId).then();
    };

    const calculateProgress = (plan) => {
        if (!plan?.plan_topics) return 0;
        let total = 0, done = 0;
        plan.plan_topics.forEach(d => { total += d.sub_topics?.length || 0; done += d.sub_topics?.filter(s => s.completed).length || 0; });
        return total === 0 ? 0 : Math.round((done / total) * 100);
    };

    const mostRecentPlan = plans[0];
    const todaysTopic = mostRecentPlan?.plan_topics.find(t => isToday(new Date(t.date)));
    const examDates = plans.map(p => p.exam_date);

    return (
        <AppLayout session={session}>
            <Container size="xl" pt="sm">
                <Box mb={32}>
                    <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                        {format(new Date(), 'EEEE, MMMM do')}
                    </Text>
                    <Title order={1} className="apple-text-gradient" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>
                        Dashboard
                    </Title>
                </Box>

                {loading ? <Group justify="center"><Loader color="white"/></Group> : (
                    <Grid gutter="xl">
                        {/* --- LEFT COLUMN (FOCUS & METRICS) - Spans 8 cols --- */}
                        <Grid.Col span={{ base: 12, lg: 8 }}>
                            <Stack gap="lg">
                                <HeroTile 
                                    plan={mostRecentPlan} 
                                    progress={mostRecentPlan ? calculateProgress(mostRecentPlan) : 0} 
                                    todaysTopic={todaysTopic} 
                                    onJumpBackIn={(id) => { setIsLoading(true); router.push(`/plan/${id}`); }} 
                                />
                                <MetricsDeck stats={stats} />
                            </Stack>
                        </Grid.Col>

                        {/* --- RIGHT COLUMN (TIMELINE) - Spans 4 cols --- */}
                        <Grid.Col span={{ base: 12, lg: 4 }}>
                            <Stack gap="lg">
                                <GlassCard p="lg">
                                    <CalendarStrip 
                                        selectedDate={selectedDate} 
                                        setSelectedDate={setSelectedDate} 
                                        examDates={examDates} 
                                    />
                                </GlassCard>

                                <Stack gap="md">
                                    <Group justify="space-between" px="xs">
                                        <Text size="sm" fw={600} c="dimmed" tt="uppercase">Agenda</Text>
                                        <Text size="xs" c="dimmed">{dailyTasks.length} Sessions</Text>
                                    </Group>

                                    {timelineLoading && <Loader size="sm" mx="auto" />}
                                    
                                    {!timelineLoading && dailyTasks.length === 0 && (
                                        <GlassCard p="xl" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Text ta="center" c="dimmed" size="sm">No missions scheduled.</Text>
                                        </GlassCard>
                                    )}

                                    {dailyTasks.map(planWithTopic => (
                                        <TimelineDayCard 
                                            key={planWithTopic.plan_topics[0].id}
                                            viewMode="dashboard"
                                            plan={planWithTopic}
                                            dayTopic={planWithTopic.plan_topics[0]}
                                            onUpdate={handleUpdateTaskGroup}
                                            onNoteGenerated={() => {}}
                                            isInitiallyCollapsed={false}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                )}
            </Container>
        </AppLayout>
    );
}