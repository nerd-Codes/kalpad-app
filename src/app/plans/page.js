// src/app/plans/page.js
"use client";

import { useState, useEffect, useMemo } from 'react';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Container, Title, Text, Group, Button, SimpleGrid, Progress, Loader, Alert, Stack, Divider, Select, Checkbox, Modal, Box, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import { notifications } from '@mantine/notifications';
import { 
    IconTrash, IconSelect, IconSortAscending, IconAlertTriangle, 
    IconPlus, IconArchive, IconFolderOpen, IconClock 
} from '@tabler/icons-react';

// --- KALPAD OS VISUAL IMPORTS ---
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';

export default function AllPlansPage() {
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- STATE MANAGEMENT ---
    const [sortOrder, setSortOrder] = useState('newest');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- DATA FETCHING ---
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

    // --- LOGIC: Progress & Sorting ---
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

    const { activePlans, pastPlans } = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        let sortedPlans = [...plans];
        if (sortOrder === 'newest') sortedPlans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (sortOrder === 'oldest') sortedPlans.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (sortOrder === 'nearestExam') sortedPlans.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
        if (sortOrder === 'farthestExam') sortedPlans.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
        if (sortOrder === 'mostProgress') sortedPlans.sort((a, b) => calculateProgress(b) - calculateProgress(a));
        if (sortOrder === 'leastProgress') sortedPlans.sort((a, b) => calculateProgress(a) - calculateProgress(b));

        const active = [];
        const past = [];
        sortedPlans.forEach(plan => {
            const examDate = new Date(plan.exam_date);
            if (examDate < startOfToday) past.push(plan);
            else active.push(plan);
        });
        return { activePlans: active, pastPlans: past };
    }, [plans, sortOrder]);

    // --- HANDLERS ---
    const handleSelectionToggle = () => { setSelectionMode(!selectionMode); setSelectedPlans([]); };
    const handlePlanSelect = (planId) => {
        setSelectedPlans(current => current.includes(planId) ? current.filter(id => id !== planId) : [...current, planId]);
    };
    const handleDeletePlans = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/archive-plans', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planIds: selectedPlans }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            setPlans(current => current.filter(p => !selectedPlans.includes(p.id)));
            setSelectionMode(false); setSelectedPlans([]); closeDeleteModal();
            notifications.show({ title: 'Archived', message: 'Plans moved to archive.', color: 'green' });
        } catch (err) { notifications.show({ title: 'Error', message: err.message, color: 'red' }); } 
        finally { setIsDeleting(false); }
    };
    const handlePlanClick = (planId) => {
        if (selectionMode) { handlePlanSelect(planId); return; }
        setIsLoading(true); router.push(`/plan/${planId}`);
    };

    // --- SUB-COMPONENT: The "Tactical Dossier" Card ---
    const DossierCard = ({ plan, isPastPlan = false }) => {
        const progress = calculateProgress(plan);
        const today = new Date(); today.setHours(0,0,0,0);
        const examDate = new Date(plan.exam_date); examDate.setHours(0,0,0,0);
        const daysLeft = differenceInDays(examDate, today);

        let statusText = "DAYS LEFT";
        let accentColor = '#34C759'; // Green
        let daysValue = daysLeft;

        if (daysLeft < 0) { statusText = "CLOSED"; accentColor = '#8E8E93'; daysValue = 0; }
        else if (daysLeft === 0) { statusText = "TODAY"; accentColor = '#FF3B30'; daysValue = "!"; }
        else if (daysLeft < 7) { accentColor = '#FF3B30'; } // Red
        else if (daysLeft < 14) { accentColor = '#FF9500'; } // Orange

        const isSelected = selectedPlans.includes(plan.id);

        return (
            <Interactive onClick={() => handlePlanClick(plan.id)}>
                <GlassCard
                    p={0}
                    style={{ 
                        position: 'relative',
                        overflow: 'hidden',
                        height: '320px', 
                        display: 'flex', flexDirection: 'column',
                        opacity: isPastPlan ? 0.7 : 1,
                        filter: isPastPlan ? 'grayscale(0.8)' : 'none',
                        transition: 'transform 0.2s',
                    }}
                >
                    {/* --- LIGHTWEIGHT SELECTION OVERLAY --- */}
                    {selectionMode && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 20,
                            backgroundColor: isSelected ? 'rgba(191, 90, 242, 0.2)' : 'transparent',
                            border: isSelected ? '3px solid #BF5AF2' : 'none',
                            borderRadius: '24px',
                            pointerEvents: 'none', 
                            transition: 'background-color 0.1s ease'
                        }} />
                    )}

                    {/* Checkbox (Visual only) */}
                    {selectionMode && (
                        <Box style={{ position: 'absolute', top: 16, right: 16, zIndex: 21 }}>
                            <Checkbox checked={isSelected} readOnly radius="xl" size="md" color="violet" style={{ pointerEvents: 'none' }} />
                        </Box>
                    )}

                    {/* --- CARD CONTENT --- */}
                    <Stack justify="space-between" h="100%" gap={0}>
                        
                        {/* TOP SECTION: HUD DISPLAY (FIXED ALIGNMENT) */}
                        <Box p="xl" style={{ position: 'relative' }}>
                            <Stack gap={0} align="flex-start">
                                <Text 
                                    style={{ 
                                        fontFamily: 'var(--font-lexend)', 
                                        fontSize: '4.5rem', // Slightly larger
                                        fontWeight: 800, 
                                        lineHeight: 0.9,
                                        color: accentColor,
                                        letterSpacing: '-0.05em'
                                    }}
                                >
                                    {daysValue}
                                </Text>
                                <Text 
                                    size="xs" fw={700} c="dimmed" tt="uppercase" 
                                    style={{ letterSpacing: '0.15em', marginTop: 4, paddingLeft: 4 }}
                                >
                                    {statusText}
                                </Text>
                            </Stack>
                        </Box>

                        {/* MIDDLE SECTION: TITLE (MENU REMOVED) */}
                        <Box px="xl" style={{ flex: 1 }}>
                            <Title 
                                order={2} 
                                lineClamp={3} 
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: '1.75rem', 
                                    letterSpacing: '-0.02em', 
                                    lineHeight: 1.1,
                                    color: 'white'
                                }}
                            >
                                {plan.exam_name}
                            </Title>
                        </Box>

                        {/* BOTTOM SECTION: METADATA & PROGRESS */}
                        <Box>
                            {/* Date Badge */}
                            <Box px="xl" mb="sm">
                                <Group gap="xs">
                                    <IconClock size={14} color="var(--apple-text-secondary)" />
                                    <Text size="xs" c="dimmed" fw={500}>
                                        {format(new Date(plan.exam_date), 'MMMM do')}
                                    </Text>
                                </Group>
                            </Box>

                            {/* Prominent Progress Bar */}
                            <Box style={{ position: 'relative', height: '12px', background: 'rgba(255,255,255,0.05)' }}>
                                <Box 
                                    style={{ 
                                        position: 'absolute', top: 0, left: 0, bottom: 0,
                                        width: `${progress}%`,
                                        background: `linear-gradient(90deg, ${accentColor} 0%, white 100%)`, 
                                        boxShadow: `0 0 10px ${accentColor}`,
                                        borderTopRightRadius: '4px',
                                        borderBottomRightRadius: '4px'
                                    }} 
                                />
                            </Box>
                        </Box>
                    </Stack>
                </GlassCard>
            </Interactive>
        );
    };

    return (
        <AppLayout session={session}>
            <Container size="xl" pt="sm">
                
                {/* --- HEADER: TITLE & STATS --- */}
                <Group justify="space-between" align="end" mb={40}>
                    <Box>
                        <Title order={1} className="apple-text-gradient" style={{ fontSize: '3rem', letterSpacing: '-0.03em' }}>
                            All Plans
                        </Title>
                        <Text c="dimmed" size="sm" fw={500} mt={4}>
                            {activePlans.length} Active • {pastPlans.length} Archived
                        </Text>
                    </Box>
                    
                    {/* --- THE HOLOGRAPHIC BUTTON --- */}
                    <ShimmerButton 
                                onClick={() => router.push('/new-plan')}
                                loading={loading}
                                size="lg"
                                radius="xl"

                             >
                                <IconPlus size={18} /> New Mission
                    </ShimmerButton>
                </Group>

                {/* --- THE COMMAND BAR (Floating Toolbar) --- */}
                <Box mb={32} style={{ position: 'sticky', top: 20, zIndex: 40 }}>
                    <GlassCard p={6} radius="xl" style={{ display: 'inline-block', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Group gap="xs">
                            <Select
                                placeholder="Sort Plans"
                                leftSection={<IconSortAscending size={16} />}
                                value={sortOrder}
                                onChange={setSortOrder}
                                data={[
                                    { value: 'newest', label: 'Newest' },
                                    { value: 'nearestExam', label: 'Urgent' },
                                    { value: 'mostProgress', label: 'Progress' },
                                ]}
                                variant="unstyled"
                                size="sm"
                                allowDeselect={false}
                                styles={{ input: { color: 'var(--apple-text-primary)', width: '120px', fontWeight: 500 } }}
                            />
                            <Divider orientation="vertical" color="rgba(255,255,255,0.1)" />
                            
                            {!selectionMode ? (
                                <Button 
                                    variant="subtle" 
                                    color="gray" 
                                    size="sm" 
                                    radius="lg" 
                                    leftSection={<IconSelect size={16} />}
                                    onClick={handleSelectionToggle}
                                >
                                    Select
                                </Button>
                            ) : (
                                <Group gap="xs">
                                    <Button 
                                        color="red" 
                                        size="xs" 
                                        radius="lg" 
                                        leftSection={<IconTrash size={14} />}
                                        onClick={openDeleteModal}
                                        disabled={selectedPlans.length === 0}
                                    >
                                        Archive ({selectedPlans.length})
                                    </Button>
                                    <Button variant="default" size="xs" radius="lg" onClick={handleSelectionToggle}>
                                        Done
                                    </Button>
                                </Group>
                            )}
                        </Group>
                    </GlassCard>
                </Box>

                {loading ? <Group justify="center"><Loader color="white" /></Group> : (
                    <Stack gap={48}>
                        
                        {/* --- ACTIVE PLANS --- */}
                        <Box>
                            {activePlans.length === 0 ? (
                                <GlassCard p="xl" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                    <Text c="dimmed">No active plans. The vault is empty.</Text>
                                    <Button component={Link} href="/new-plan" variant="subtle" mt="md">Start a new mission</Button>
                                </GlassCard>
                            ) : (
                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                                    {activePlans.map(plan => <DossierCard key={plan.id} plan={plan} />)}
                                </SimpleGrid>
                            )}
                        </Box>

                        {/* --- PAST PLANS (ARCHIVE) --- */}
                        {pastPlans.length > 0 && (
                            <Box>
                                <Divider my="xl" color="rgba(255,255,255,0.1)" />
                                <Group mb="md" gap="xs">
                                    <ThemeIcon variant="transparent" color="gray"><IconArchive size={20} /></ThemeIcon>
                                    <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Archive</Text>
                                </Group>
                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                                    {pastPlans.map(plan => <DossierCard key={plan.id} plan={plan} isPastPlan />)}
                                </SimpleGrid>
                            </Box>
                        )}
                    </Stack>
                )}
            </Container>

            {/* --- DELETE CONFIRMATION --- */}
            <Modal 
                opened={deleteModalOpened} 
                onClose={closeDeleteModal} 
                title="Confirm Archival" 
                centered
                styles={{ 
                    content: { backgroundColor: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: '16px' },
                    header: { backgroundColor: 'transparent' },
                    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600 }
                }}
            >
                <Stack>
                    <Alert color="red" variant="light" icon={<IconAlertTriangle/>}>
                        You are about to archive {selectedPlans.length} plan(s). They will be removed from your active view.
                    </Alert>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
                        <Button color="red" onClick={handleDeletePlans} loading={isDeleting}>Archive</Button>
                    </Group>
                </Stack>
            </Modal>
        </AppLayout>
    );
}