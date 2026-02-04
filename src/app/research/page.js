"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import AppLayout from '@/components/AppLayout';
import { 
    Container, Title, Text, Group, Button, SimpleGrid, Loader, 
    Stack, Box, TextInput, Modal, Badge, ThemeIcon, ActionIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
    IconFlask, IconPlus, IconArrowRight, IconDatabase, IconClock, 
    IconTrash, IconFolderOpen
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';

// --- KALPAD OS VISUALS ---
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';

// --- VISUAL CONSTANTS ---
const LAB_BLUE = '#5538f8'; // The new Electric Indigo

// --- COMPONENT: HUB BACKGROUND ---
function HubBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#020617' }}>
            {/* The "Lab Glow" - Bottom Weighted, Deep Indigo */}
            <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '70vh', 
                background: `radial-gradient(ellipse at center bottom, ${LAB_BLUE}30 0%, transparent 70%)`
            }} />
            
            {/* The Tech Grid Overlay */}
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.1,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, transparent 20%, black 100%)'
            }} />
        </div>
    );
}

// --- COMPONENT: BOLD PROJECT CARD ---
function ProjectCard({ project, onClick }) {
    return (
        <Interactive onClick={onClick}>
            <GlassCard 
                p={0}
                style={{ 
                    height: '240px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    // Bolder visual language:
                    backgroundColor: 'rgba(15, 15, 20, 0.85)', // More opaque
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeft: `6px solid ${LAB_BLUE}`, // The signature bold mark
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Internal Tech Decoration */}
                <div style={{ 
                    position: 'absolute', top: 0, right: 0, padding: '12px', 
                    opacity: 0.1, pointerEvents: 'none' 
                }}>
                    <IconFlask size={64} />
                </div>

                <Stack gap="sm" p="lg" style={{ flex: 1 }}>
                    <Group justify="space-between" align="start">
                        <ThemeIcon variant="light" color="indigo" radius="md" size="lg" style={{ backgroundColor: `${LAB_BLUE}20`, color: LAB_BLUE }}>
                            <IconFolderOpen size={22}/>
                        </ThemeIcon>
                        <ActionIcon variant="subtle" color="gray" size="sm">
                            <IconArrowRight size={16} />
                        </ActionIcon>
                    </Group>
                    
                    <Title 
                        order={3} 
                        size="h4" 
                        c="white" 
                        lineClamp={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            letterSpacing: '-0.02em',
                            fontSize: '1.4rem',
                            marginTop: 'auto'
                        }}
                    >
                        {project.title}
                    </Title>
                </Stack>

                {/* Footer Strip */}
                <Box p="md" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Group justify="space-between">
                        <Group gap={6}>
                            <IconClock size={14} color="gray" />
                            <Text size="xs" c="dimmed" ff="monospace">
                                {format(new Date(project.updated_at), 'MMM dd, yyyy')}
                            </Text>
                        </Group>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                            OPEN PROJECT
                        </Text>
                    </Group>
                </Box>
            </GlassCard>
        </Interactive>
    );
}

// --- MAIN PAGE ---
export default function ResearchHubPage() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const router = useRouter();

    // --- DATA FETCHING ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                await fetchProjects(session.user.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchProjects = async (userId) => {
        const { data } = await supabase
            .from('research_projects')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (data) setProjects(data);
    };

    // --- HANDLER ---
    const handleCreateProject = async () => {
        if (!newProjectTitle.trim()) return;
        
        const { data, error } = await supabase
            .from('research_projects')
            .insert({ title: newProjectTitle, user_id: session.user.id })
            .select()
            .single();
        
        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            // Navigate immediately to the new workbench
            router.push(`/research/${data.id}`);
        }
    };

    return (
        <AppLayout session={session}>
            <HubBackground />
            
            <Container size="xl" pt="md" style={{ position: 'relative', minHeight: '85vh' }}>
                
                {/* --- HEADER --- */}
                <Box mb={50}>
                    <Group justify="space-between" align="end">
                        <Box>
                            <Badge 
                                variant="outline" size="md" mb="xs"
                                leftSection={<IconFlask size={12} />}
                                style={{ 
                                    borderColor: `${LAB_BLUE}60`, 
                                    color: LAB_BLUE, 
                                    letterSpacing: '0.1em',
                                    backgroundColor: `${LAB_BLUE}10`
                                }}
                            >
                                PROJECT CURIE // HUB
                            </Badge>
                            <Title order={1} style={{ fontFamily: 'var(--font-lexend)', fontSize: '3rem', color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>
                                Research Projects
                            </Title>
                            <Text c="dimmed" mt={4} size="lg">Select a workbench to initialize the Analyst Agent.</Text>
                        </Box>
                        
                        <Interactive>
                            <ShimmerButton onClick={openCreate} size="lg" radius="xl" color={LAB_BLUE}>
                                <IconPlus size={18} /> New Project
                            </ShimmerButton>
                        </Interactive>
                    </Group>
                </Box>

                {/* --- PROJECT GRID --- */}
                {loading ? (
                    <Group justify="center" py={100}><Loader color={LAB_BLUE} type="dots" /></Group>
                ) : (
                    <AnimatePresence mode="wait">
                        {projects.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            >
                                <GlassCard p="xl" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: 80, height: 80, borderRadius: '50%', 
                                        backgroundColor: `${LAB_BLUE}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '20px'
                                    }}>
                                        <IconDatabase size={40} color={LAB_BLUE} style={{ opacity: 0.8 }} />
                                    </div>
                                    <Title order={3} c="white" mb="xs" style={{ fontFamily: 'var(--font-lexend)' }}>No Active Projects</Title>
                                    <Text c="dimmed" mb="xl">Initialize a new research container to begin the collection protocol.</Text>
                                    <Button variant="light" color="indigo" size="md" onClick={openCreate} style={{ backgroundColor: `${LAB_BLUE}20`, color: LAB_BLUE }}>
                                        Initialize First Project
                                    </Button>
                                </GlassCard>
                            </motion.div>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={30}>
                                {projects.map((project, i) => (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <ProjectCard 
                                            project={project} 
                                            onClick={() => router.push(`/research/${project.id}`)} 
                                        />
                                    </motion.div>
                                ))}
                            </SimpleGrid>
                        )}
                    </AnimatePresence>
                )}
            </Container>

            {/* --- MODAL: CREATE PROJECT --- */}
            <Modal 
                opened={createModalOpened} onClose={closeCreate} 
                title="Initialize Research Project" centered
                overlayProps={{ blur: 8 }}
                styles={{ 
                    content: { backgroundColor: '#0f172a', border: `1px solid ${LAB_BLUE}40` },
                    header: { backgroundColor: 'transparent' },
                    title: { color: 'white', fontFamily: 'var(--font-lexend)', fontWeight: 700 },
                    close: { color: 'gray' }
                }}
            >
                <Stack>
                    <TextInput 
                        label="Project Title" 
                        description="Usually your thesis topic or paper name."
                        placeholder="e.g. 'Optimizing Transformers for Edge Devices'"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        data-autofocus
                        size="md"
                        styles={{
                            input: { 
                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'white' 
                            }
                        }}
                    />
                    <ShimmerButton fullWidth onClick={handleCreateProject} color={LAB_BLUE} size="md">
                        Initialize
                    </ShimmerButton>
                </Stack>
            </Modal>

        </AppLayout>
    );
}