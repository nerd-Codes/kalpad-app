// src/app/dashboard/page.js
"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

// Mantine component imports
import { Container, Title, Text, SimpleGrid, Grid, GridCol, Group, Badge, Button, Paper, Alert, Loader, Stack } from '@mantine/core';
import { format, isToday } from 'date-fns';
import { ContinueStudyingCard } from '@/components/ContinueStudyingCard';

// Custom component imports
import { StatCard } from '@/components/StatCard';
import { GlassCard } from '@/components/GlassCard';
import { Heatmap } from '@/components/Heatmap';
import { DatePicker } from '@/components/DatePicker';
import { TimelineEntry } from '@/components/TimelineEntry';
import { IconCheck, IconFileText, IconCalendarEvent, IconBulb, IconFlame } from '@tabler/icons-react';

// Import our list of tips
import { studyTips } from '@/lib/studyTips';

export default function DashboardPage() {

    const router = useRouter(); // Initialize the router
    const { setIsLoading } = useLoading(); // This should already exist
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);
    const [stats, setStats] = useState({ 
        plansCreated: 0, 
        nextExamDate: 'N/A',
        weeklyCompleted: 0,
        currentStreak: 0,
        completions: {}
    });
    const [error, setError] = useState('');
    const [tipOfTheDay, setTipOfTheDay] = useState('');

    // State for the timeline section
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyTasks, setDailyTasks] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    const handleContinuePlanClick = (planId) => {
        setIsLoading(true); // Trigger the blurry page loader
        router.push(`/plan/${planId}`);
    };

    useEffect(() => {
        // Pick a random tip on the initial load
        setTipOfTheDay(studyTips[Math.floor(Math.random() * studyTips.length)]);

        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (!session) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('study_plans')
                    .select(`id, exam_name, exam_date, plan_topics ( date, sub_topics )`)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                setPlans(data || []);
                calculateAllStats(data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // This effect runs whenever the `selectedDate` or `session` changes to fetch timeline data
    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!session) return;
            setTimelineLoading(true);
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            try {
                const response = await fetch(`/api/timeline?date=${dateString}`);
                if (!response.ok) throw new Error((await response.json()).error);
                const data = await response.json();
                setDailyTasks(data);
            } catch (err) {
                console.error("Timeline fetch error:", err.message);
                // Optionally set a specific error for the timeline
            } finally {
                setTimelineLoading(false);
            }
        };
        fetchTimelineData();
    }, [selectedDate, session]);

    const calculateAllStats = (allPlans) => {
        if (!allPlans || allPlans.length === 0) {
            setStats({ plansCreated: 0, nextExamDate: 'N/A', completions: {}, weeklyCompleted: 0, currentStreak: 0 });
            return;
        }
        
        const upcomingExams = allPlans.filter(p => new Date(p.exam_date) >= new Date());
        const completionsByDay = {};
        let weeklyCompletedCount = 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        allPlans.forEach(plan => {
            if (plan.plan_topics) {
                plan.plan_topics.forEach(day => {
                    if (day.date && day.sub_topics) {
                        const dayDate = new Date(day.date);
                        const completedInDay = day.sub_topics.filter(sub => sub.completed).length;
                        if (completedInDay > 0) {
                            const dateString = format(dayDate, 'yyyy-MM-dd');
                            completionsByDay[dateString] = (completionsByDay[dateString] || 0) + completedInDay;
                            if (dayDate >= oneWeekAgo) { weeklyCompletedCount += completedInDay; }
                        }
                    }
                });
            }
        });

        let currentStreak = 0;
        let today = new Date();
        today.setHours(0,0,0,0);
        if (completionsByDay[format(today, 'yyyy-MM-dd')]) {
            currentStreak = 1;
            let yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            while (completionsByDay[format(yesterday, 'yyyy-MM-dd')]) {
                currentStreak++;
                yesterday.setDate(yesterday.getDate() - 1);
            }
        }

        setStats({
            plansCreated: allPlans.length,
            nextExamDate: upcomingExams.length > 0 ? upcomingExams[0].exam_date : 'All exams passed!',
            completions: completionsByDay,
            weeklyCompleted: weeklyCompletedCount,
            currentStreak: currentStreak,
        });
    };
    
    const handleUpdateTaskGroup = (planTopicId, updates) => {
        setDailyTasks(currentTasks => 
            currentTasks.map(group => {
                if (group.dailyTopic.id === planTopicId) {
                    return { ...group, dailyTopic: { ...group.dailyTopic, ...updates } };
                }
                return group;
            })
        );
        supabase.from('plan_topics').update(updates).eq('id', planTopicId)
            .then(({ error }) => { if (error) console.error("Background update failed:", error); });
    };

            const calculateProgress = (plan) => {
            if (!plan || !plan.plan_topics) return 0;

            let totalSubTopics = 0;
            let completedSubTopics = 0;
            
            plan.plan_topics.forEach(day => {
                if (day.sub_topics && Array.isArray(day.sub_topics)) {
                    totalSubTopics += day.sub_topics.length;
                    completedSubTopics += day.sub_topics.filter(sub => sub.completed).length;
                }
            });

            if (totalSubTopics === 0) return 0;
            return Math.round((completedSubTopics / totalSubTopics) * 100);
        };

    const examDates = plans.map(plan => plan.exam_date);

    const mostRecentPlan = plans.length > 0 ? plans[0] : null;
    const mostRecentPlanProgress = mostRecentPlan ? calculateProgress(mostRecentPlan) : 0;

    // Find the specific topic scheduled for today within the most recent plan
    const todaysTopicForRecentPlan = mostRecentPlan?.plan_topics.find(topic => 
        isToday(new Date(topic.date))
    );

    // Calculate days left specifically for this plan for context
    const daysLeftForRecentPlan = mostRecentPlan ? Math.max(0, Math.ceil((new Date(mostRecentPlan.exam_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

   return (
    <AppLayout session={session}>
        <Container size="xl">
            <Title order={1} ff="Lexend, sans-serif">Dashboard</Title>
            <Text c="dimmed" mb="xl">Welcome back! Here's your mission control for academic success.</Text>
            
            {loading && <Group justify="center" py="xl"><Loader /></Group>}
            {error && <Alert color="red" title="Error" mb="xl" withCloseButton onClose={() => setError('')}>{error}</Alert>}

            {!loading && (
                <Stack gap={50}>
                    {/* --- ACT I: IMMEDIATE FOCUS --- */}
                    <ContinueStudyingCard 
                        plan={mostRecentPlan} 
                        progress={mostRecentPlanProgress} 
                        todaysTopic={todaysTopicForRecentPlan}
                        onJumpBackIn={handleContinuePlanClick} // Pass the handler as a prop
                    />

                    {/* --- ACT II: TODAY'S MISSION (Now full-width) --- */}
                    <Stack gap="lg">
                        <Title order={2} ff="Lexend, sans-serif">Today's Mission</Title>
                        <GlassCard>
                            <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} examDates={examDates} />
                            {timelineLoading && <Group justify="center" py="xl"><Loader /></Group>}
                            {!timelineLoading && dailyTasks.length === 0 && (
                                <Text ta="center" c="dimmed" py="md">Nothing scheduled for this day. Enjoy your break!</Text>
                            )}
                            {!timelineLoading && dailyTasks.length > 0 && (
                                <Stack gap="md">
                                    {dailyTasks.map(taskGroup => (
                                        <TimelineEntry key={taskGroup.dailyTopic.id} taskGroup={taskGroup} onUpdate={handleUpdateTaskGroup} />
                                    ))}
                                </Stack>
                            )}
                        </GlassCard>
                    </Stack>
                    
                    {/* --- ACT III: STATS & INSIGHTS (Now includes Heatmap) --- */}
                    <Stack gap="lg">
    <Title order={2} ff="Lexend, sans-serif">Stats & Insights</Title>

    {/* A single SimpleGrid to arrange all 5 cards linearly */}
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 5 }} spacing="xl">
        
        {/* Card 1: The Heatmap, styled to match the StatCards */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
                <Heatmap data={stats.completions} />
        </GlassCard>
        
        {/* Cards 2-5: The StatCards */}
        <StatCard title="Current Study Streak" value={`${stats.currentStreak} Days`} emoji="🔥" color="var(--mantine-color-orange-5)" />
        <StatCard title="Topics This Week" value={stats.weeklyCompleted} emoji="✅" color="var(--mantine-color-brandGreen-4)" />
        <StatCard title="Active Plans" value={stats.plansCreated} emoji="📚" color="var(--mantine-color-blue-4)" />
        <StatCard title="Next Exam" value={mostRecentPlan ? format(new Date(mostRecentPlan.exam_date), 'MMM d') : 'N/A'} emoji="🗓️" color="var(--mantine-color-brandPurple-4)" />

    </SimpleGrid>
</Stack>
                </Stack>
            )}
        </Container>
    </AppLayout>
);
}