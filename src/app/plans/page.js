// src/app/plans/page.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Container, Title, Text, Group, Button, SimpleGrid, Badge, Progress, Loader, Alert, Stack, Divider, Select, Checkbox, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GlassCard } from '@/components/GlassCard';
import { format, isPast, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconSelect, IconSortAscending, IconAlertTriangle } from '@tabler/icons-react';

export default function AllPlansPage() {
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- NEW STATE MANAGEMENT FOR FEATURES ---
    const [sortOrder, setSortOrder] = useState('newest');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (!session) { setLoading(false); return; }

            try {
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
        plan.plan_topics?.forEach(day => {
            if (day.sub_topics && Array.isArray(day.sub_topics)) {
                totalSubTopics += day.sub_topics.length;
                completedSubTopics += day.sub_topics.filter(sub => sub.completed).length;
            }
        });
        return totalSubTopics === 0 ? 0 : Math.round((completedSubTopics / totalSubTopics) * 100);
    };

    // --- ARCHITECTURAL REFACTOR: Declarative data processing with useMemo ---
    const { activePlans, pastPlans } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        const sortedPlans = [...plans].sort((a, b) => {
            switch (sortOrder) {
                case 'nearestExam': return new Date(a.exam_date) - new Date(b.exam_date);
                case 'farthestExam': return new Date(b.exam_date) - new Date(a.exam_date);
                case 'mostProgress': return calculateProgress(b) - calculateProgress(a);
                case 'leastProgress': return calculateProgress(a) - calculateProgress(b);
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                case 'newest':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        const active = [];
        const past = [];
        sortedPlans.forEach(plan => {
            if (isPast(new Date(plan.exam_date)) && differenceInDays(new Date(plan.exam_date), today) < 0) {
                past.push(plan);
            } else {
                active.push(plan);
            }
        });
        return { activePlans: active, pastPlans: past };
    }, [plans, sortOrder]);


    // --- HANDLERS FOR NEW FUNCTIONALITY ---
    const handleSelectionToggle = () => {
        setSelectionMode(!selectionMode);
        setSelectedPlans([]); // Clear selection when toggling mode
    };

    const handlePlanSelect = (planId) => {
        setSelectedPlans(current =>
            current.includes(planId)
                ? current.filter(id => id !== planId)
                : [...current, planId]
        );
    };
    
    const handleDeletePlans = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/archive-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planIds: selectedPlans }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to archive plans.');
            }
            
            // Optimistic UI update
            setPlans(current => current.filter(p => !selectedPlans.includes(p.id)));
            setSelectionMode(false);
            setSelectedPlans([]);
            closeDeleteModal();

            notifications.show({
                title: 'Plans Archived',
                message: `${selectedPlans.length} plan(s) have been moved to your archive.`,
                color: 'green',
            });

        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePlanClick = (planId) => {
        // Disable navigation when in selection mode
        if (selectionMode) {
            handlePlanSelect(planId);
            return;
        }
        setIsLoading(true);
        router.push(`/plan/${planId}`);
    };

    // --- COMPONENT FOR RENDERING A SINGLE PLAN CARD ---
    const PlanCard = ({ plan, isPastPlan = false }) => {
        const progress = calculateProgress(plan);
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(plan.exam_date);
        examDate.setHours(0,0,0,0);
        
        const daysLeft = differenceInDays(examDate, today);

        let statusText;
        let color = 'brandGreen';

        if (daysLeft < 0) {
            statusText = 'Exam Finished';
            color = 'gray';
        } else if (daysLeft === 0) {
            statusText = 'Exam Day!';
            color = 'red';
        } else {
            statusText = `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`;
            if (daysLeft < 7) color = 'red';
            else if (daysLeft < 14) color = 'orange';
        }

        const emojiIndex = String(plan.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
        const backgroundEmoji = String.fromCodePoint(128512 + emojiIndex);
        
        return (
            <GlassCard
                key={plan.id}
                onClick={() => handlePlanClick(plan.id)}
                style={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    opacity: isPastPlan ? 0.6 : 1,
                    border: selectedPlans.includes(plan.id) ? '2px solid var(--mantine-color-brandPurple-5)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
                p="lg"
            >
                {selectionMode && (
                    <Checkbox
                        checked={selectedPlans.includes(plan.id)}
                        onChange={() => {}}
                        style={{ position: 'absolute', top: 15, right: 15, zIndex: 2 }}
                        size="md"
                    />
                )}
                <Text
                    style={{
                        position: 'absolute',
                        top: -20,
                        right: -15,
                        fontSize: '6rem',
                        opacity: 0.08,
                        zIndex: 0,
                    }}
                >
                    {backgroundEmoji}
                </Text>
                <Stack justify="space-between" h="100%" style={{ zIndex: 1, position: 'relative' }}>
                    <Stack gap="xs">
                        <Title order={3} ff="Lexend, sans-serif" fw={600} lineClamp={2}>
                            {plan.exam_name}
                        </Title>
                        <Text size="xs" c="dimmed">
                            Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
                        </Text>
                        <Badge color={color} variant="light" size="sm" style={{ alignSelf: 'flex-start' }}>
                            {statusText}
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
    };

return (
    <AppLayout session={session}>
        <Container>
            {/* --- NEW HEADER WITH CONTROLS --- */}
            <Group justify="space-between" align="center" mb="xl">
                <Title order={1}>All Study Plans</Title>
                {!selectionMode ? (
                     <Button component={Link} href="/new-plan" variant="outline" color="brandPurple">
                        + Create New Plan
                    </Button>
                ) : (
                    <Button variant="default" onClick={handleSelectionToggle}>Cancel</Button>
                )}
            </Group>
            
            <Group justify="space-between" mb="xl">
                <Select
                    leftSection={<IconSortAscending size={16} />}
                    placeholder="Sort by..."
                    value={sortOrder}
                    onChange={setSortOrder}
                    data={[
                        { value: 'newest', label: 'Newly Created First' },
                        { value: 'oldest', label: 'Oldest Created First' },
                        { value: 'nearestExam', label: 'Nearest Exam First' },
                        { value: 'farthestExam', label: 'Farthest Exam First' },
                        { value: 'mostProgress', label: 'Most Progress First' },
                        { value: 'leastProgress', label: 'Least Progress First' },
                    ]}
                    style={{ flex: 1, maxWidth: '250px' }}
                />
                {!selectionMode ? (
                     <Button leftSection={<IconSelect size={16} />} variant="subtle" onClick={handleSelectionToggle}>
                        Select Plans
                    </Button>
                ) : (
                    <Button
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        disabled={selectedPlans.length === 0}
                        onClick={openDeleteModal}
                    >
                        Delete ({selectedPlans.length})
                    </Button>
                )}
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

            {/* --- RENDER ACTIVE PLANS --- */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                {activePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </SimpleGrid>

            {/* --- RENDER PAST PLANS SECTION --- */}
            {pastPlans.length > 0 && (
                <>
                    <Divider my="xl" label={<Title order={4} c="dimmed">Past Plans</Title>} labelPosition="center" />
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                         {pastPlans.map((plan) => <PlanCard key={plan.id} plan={plan} isPastPlan />)}
                    </SimpleGrid>
                </>
            )}
        </Container>

        {/* --- CONFIRMATION MODAL FOR DELETION --- */}
        <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Confirm Deletion" centered>
            <Stack>
                <Alert color="red" variant="light" icon={<IconAlertTriangle/>}>
                     <Title order={5}>Are you sure?</Title>
                     <Text>You are about to delete {selectedPlans.length} plan(s). This will archive them, and they will no longer appear on this page.</Text>
                     <Text fw={700}>This action cannot be undone.</Text>
                </Alert>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
                    <Button color="red" onClick={handleDeletePlans} loading={isDeleting}>
                        Yes, Delete
                    </Button>
                </Group>
            </Stack>
        </Modal>
    </AppLayout>
);
}