"use client";

import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Group, Button, Text, Title, Box, ThemeIcon, Loader } from '@mantine/core';
import { IconBolt, IconBrain, IconPuzzle, IconRocket } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Interactive } from '@/components/Interactive';
import { GlassCard } from '@/components/GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';

// --- VISUAL ASSETS ---
const MODES = [
    { id: 'Rapid Fire', label: 'Rapid Fire', desc: 'Speed & Recall', icon: IconBolt, color: '#FF9500' },
    { id: 'Core Concepts', label: 'Core Concepts', desc: 'Deep Understanding', icon: IconBrain, color: '#BF5AF2' },
    { id: 'Problem Solving', label: 'Simulation', desc: 'Applied Scenarios', icon: IconPuzzle, color: '#34C759' },
];

const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)'
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0 },
    body: { padding: '32px' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export function QuizSetupModal({ opened, onClose, onStartQuiz, isLoading }) {
    const [questionCount, setQuestionCount] = useState(10);
    const [quizMode, setQuizMode] = useState('Core Concepts');

    // --- INTERNAL HANDLER ---
    // We handle the loading state LOCALLY to prevent the modal from closing early
    const handleEngage = async () => {
        // Trigger parent handler
        // The parent is responsible for setting `isLoading` to true immediately
        onStartQuiz({ question_count: questionCount, quiz_mode: quizMode });
    };

    return (
        <Modal 
            opened={opened} 
            onClose={isLoading ? () => {} : onClose} // Lock close during loading
            title={<Group gap="xs"><IconRocket size={20} color="#BF5AF2" /><Text inherit>Initialize Training</Text></Group>}
            centered 
            size="lg"
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            zIndex={7000}
            scrollarea="inside"
        >
            {isLoading ? (
                // --- LOADING STATE (IN-MODAL) ---
                <Stack align="center" py={60} gap="xl">
                    <div style={{ position: 'relative' }}>
                        <Loader size={60} color="violet" />
                        <motion.div 
                            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(191,90,242,0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }}
                        />
                    </div>
                    <Stack gap={4} align="center">
                        <Title order={3} className="apple-text-gradient">Forging Mission...</Title>
                        <Text c="dimmed" size="sm">The AI is generating your combat scenario.</Text>
                    </Stack>
                </Stack>
            ) : (
                // --- SELECTION STATE ---
                <Stack gap="xl">
                    <Stack gap="xs">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Select Protocol</Text>
                        <SimpleGrid cols={3} spacing="md">
                            {MODES.map((mode) => {
                                const isActive = quizMode === mode.id;
                                return (
                                    <Interactive key={mode.id} onClick={() => setQuizMode(mode.id)} className="h-full">
                                        <GlassCard 
                                            p="md" 
                                            h="100%"
                                            style={{ 
                                                backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: isActive ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isActive ? `0 0 20px ${mode.color}20` : 'none'
                                            }}
                                        >
                                            <Stack align="center" gap="sm">
                                                <ThemeIcon size={40} radius="xl" variant="light" color={isActive ? mode.color : 'gray'} style={{ backgroundColor: isActive ? `${mode.color}20` : 'rgba(255,255,255,0.05)' }}>
                                                    <mode.icon size={22} />
                                                </ThemeIcon>
                                                <Box ta="center">
                                                    <Text size="sm" fw={700} c="white">{mode.label}</Text>
                                                    <Text size="xs" c="dimmed" lh={1.3} mt={4}>{mode.desc}</Text>
                                                </Box>
                                            </Stack>
                                        </GlassCard>
                                    </Interactive>
                                );
                            })}
                        </SimpleGrid>
                    </Stack>

                    <Stack gap="xs">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Intensity</Text>
                        <Group grow>
                            {[5, 10, 15].map(count => (
                                <Interactive key={count} onClick={() => setQuestionCount(count)}>
                                    <Box 
                                        py={12} 
                                        style={{ 
                                            textAlign: 'center', 
                                            borderRadius: '12px',
                                            border: questionCount === count ? '1px solid #BF5AF2' : '1px solid rgba(255,255,255,0.1)',
                                            backgroundColor: questionCount === count ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)',
                                            color: questionCount === count ? 'white' : 'gray',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {count} Questions
                                    </Box>
                                </Interactive>
                            ))}
                        </Group>
                    </Stack>

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose} radius="xl" style={{ border: 'none', backgroundColor: 'transparent' }}>Abort</Button>
                        <ShimmerButton 
                            onClick={handleEngage} 
                            size="lg" 
                            radius="xl"
                            style={{ padding: '0 40px', background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}
                        >
                            Start Simulation
                        </ShimmerButton>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}