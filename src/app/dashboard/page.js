// src/app/dashboard/page.js
"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

// Mantine component imports
import { Container, Title, Text, SimpleGrid, Grid, GridCol, Group, Badge, Button, Paper, Alert, Loader } from '@mantine/core';
import { format } from 'date-fns';

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
                    .order('exam_date', { ascending: true });

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

    const examDates = plans.map(plan => plan.exam_date);

    return (
        <AppLayout session={session}>
            <Container size="xl">
                <Title order={1}>Dashboard</Title>
                <Text c="dimmed" mb="xl">Welcome back! Here's your mission control for academic success.</Text>
                
                {error && <Alert color="red" title="Error" mb="xl" withCloseButton onClose={() => setError('')}>{error}</Alert>}

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                    <StatCard title="Current Study Streak" value={`${stats.currentStreak} Days`} icon={IconFlame} color="var(--mantine-color-orange-5)" />
                    <StatCard title="Topics Completed This Week" value={stats.weeklyCompleted} icon={IconCheck} color="var(--mantine-color-brandGreen-4)" />
                    <StatCard title="Active Study Plans" value={stats.plansCreated} icon={IconFileText} color="var(--mantine-color-blue-4)" />
                    <StatCard title="Next Exam Date" value={<Text fz="2.2rem" fw={700}>{stats.nextExamDate}</Text>} icon={IconCalendarEvent} color="var(--mantine-color-brandPurple-4)" />
                </SimpleGrid>
                
                <Title order={2} mt={50} mb="md">Today's Mission</Title>
                <GlassCard>
                    <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} examDates={examDates} />
                    {timelineLoading && <Group justify="center" py="xl"><Loader /></Group>}
                    {!timelineLoading && dailyTasks.length === 0 && (
                        <Text ta="center" c="dimmed" py="md">Nothing scheduled for this day. Enjoy your break!</Text>
                    )}
                    {!timelineLoading && dailyTasks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {dailyTasks.map(taskGroup => (
                                <TimelineEntry key={taskGroup.examId} taskGroup={taskGroup} onUpdate={handleUpdateTaskGroup} />
                            ))}
                        </div>
                    )}
                </GlassCard>

                <Title order={2} mt={50} mb="md">Progress & Insights</Title>
                <Grid gutter="lg">
                    <Grid.Col span={{ base: 12, lg: 8 }}>
                        <GlassCard>
                            {stats.completions && <Heatmap data={stats.completions} />}
                        </GlassCard>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, lg: 4 }}>
                        <Paper withBorder p="lg" radius="lg" style={{ height: '100%' }}>
                            <Group>
                                <Badge variant="filled" color="yellow" size="lg" radius="xl" leftSection={<IconBulb size={16} />}>
                                    Study Tip of the Day
                                </Badge>
                            </Group>
                            <Text mt="md" c="dimmed">{tipOfTheDay}</Text>
                        </Paper>
                    </Grid.Col>
                </Grid>
            </Container>
        </AppLayout>
    );
}