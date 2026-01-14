// src/components/QuizResults.jsx
"use client";

import { Modal, Stack, Title, Text, RingProgress, Accordion, Group, Badge, Paper, ScrollArea, Button, Center, Box, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX, IconRefresh, IconTrophy, IconAlertTriangle, IconChartBar } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { ShimmerButton } from './landing/ShimmerButton';
import { Interactive } from '@/components/Interactive';
import { useMediaQuery } from '@mantine/hooks';
// --- VISUAL CONSTANTS ---
const glassModalStyles = {
    content: { 
        backgroundColor: '#1C1C1E', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden'
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0 },
    body: { padding: '0' }, // Full width for scroll area
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white', fontSize: '1.25rem' },
    close: { color: 'gray', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

// --- SUB-COMPONENT: GLOWING SCORE ---
function ScoreReactor({ score }) {
    let color = '#FF3B30'; // Apple Red
    let glowColor = 'rgba(255, 59, 48, 0.3)';
    
    if (score >= 80) {
        color = '#34C759'; // Apple Green
        glowColor = 'rgba(52, 199, 89, 0.3)';
    } else if (score >= 50) {
        color = '#FF9500'; // Apple Orange
        glowColor = 'rgba(255, 149, 0, 0.3)';
    }

    return (
        <Box style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            {/* The Ambient Glow */}
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '180px', height: '180px', borderRadius: '50%',
                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                    filter: 'blur(30px)', zIndex: 0
                }}
            />
            
            {/* The Ring */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <RingProgress
                    sections={[{ value: score, color: color }, { value: 100 - score, color: 'rgba(255,255,255,0.1)' }]}
                    size={240} thickness={20} roundCaps
                    label={
                        <Center>
                            <Stack align="center" gap={0}>
                                <Text c={color} fw={800} style={{ fontSize: '4rem', fontFamily: 'var(--font-lexend)', lineHeight: 0.9 }}>
                                    {score}%
                                </Text>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.15em' }}>
                                    Accuracy
                                </Text>
                            </Stack>
                        </Center>
                    }
                />
            </div>
        </Box>
    );
}

export function QuizResults({ results, onClose, onRetake }) {
    const { score, feedback_summary, full_results } = results;
    const passed = score >= 50;

    const isMobile = useMediaQuery('(max-width: 48em)');

    return (
        <Modal 
            opened={true} 
            onClose={onClose} 
            title={<Group gap="xs"><IconChartBar size={20} color="#BF5AF2"/><Text inherit>Mission Debrief</Text></Group>} 
            size="lg" 
            centered 
            styles={glassModalStyles}
            overlayProps={{ blur: 8, opacity: 0.8 }}
            fullScreen={isMobile}
        >
            <ScrollArea h="70vh" type="auto">
                <Stack gap="xl" p="xl">
                    
                    {/* 1. SCORE REACTOR */}
                    <ScoreReactor score={score} />
                    
                    {/* 2. AI ANALYSIS CARD */}
                    <GlassCard 
                        p="lg"
                        style={{ 
                            borderLeft: `4px solid ${passed ? '#34C759' : '#FF9500'}`,
                            backgroundColor: 'rgba(255,255,255,0.03)'
                        }}
                    >
                        <Group align="flex-start" wrap="nowrap">
                            <ThemeIcon 
                                size="lg" radius="md" variant="light" 
                                color={passed ? 'green' : 'orange'}
                            >
                                {passed ? <IconTrophy size={20} /> : <IconAlertTriangle size={20} />}
                            </ThemeIcon>
                            <Stack gap="xs">
                                <Text size="sm" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                                    Performance Analysis
                                </Text>
                                <Text size="md" c="dimmed" lh={1.6}>
                                    {feedback_summary}
                                </Text>
                            </Stack>
                        </Group>
                    </GlassCard>

                    {/* 3. QUESTION BREAKDOWN */}
                    <Stack gap="md">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }} pl={4}>
                            Tactical Breakdown
                        </Text>
                        
                        <Accordion 
                            variant="separated" 
                            radius="lg"
                            styles={{
                                item: { 
                                    backgroundColor: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    marginBottom: '12px'
                                },
                                control: { color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } },
                                content: { padding: '16px' },
                                chevron: { color: 'gray' }
                            }}
                        >
                            {full_results.map((item, index) => (
                                <Accordion.Item value={String(index)} key={index}>
                                    <Accordion.Control 
                                        icon={
                                            <ThemeIcon 
                                                color={item.is_correct ? 'green' : 'red'} 
                                                variant="light" 
                                                radius="xl" 
                                                size="sm"
                                            >
                                                {item.is_correct ? <IconCheck size={14} /> : <IconX size={14} />}
                                            </ThemeIcon>
                                        }
                                    >
                                        <Text size="sm" fw={500} lineClamp={1}>{item.question_text}</Text>
                                    </Accordion.Control>
                                    
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            {/* Question Text */}
                                            <Text size="md" fw={600} style={{ fontFamily: 'var(--font-lexend)' }}>
                                                {item.question_text}
                                            </Text>
                                            
                                            {/* Answer Comparison */}
                                            <Group grow align="flex-start">
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }}>
                                                    <Text size="xs" c="red.3" fw={700} mb={4}>YOUR ANSWER</Text>
                                                    <Text size="sm" c="white">{item.user_answer || "Skipped"}</Text>
                                                </Paper>
                                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.2)' }}>
                                                    <Text size="xs" c="green.3" fw={700} mb={4}>CORRECT ANSWER</Text>
                                                    <Text size="sm" c="white">{item.correct_answer}</Text>
                                                </Paper>
                                            </Group>

                                            {/* Explanation */}
                                            {!item.is_correct && (
                                                <Box p="md" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                                    <Text size="xs" fw={700} c="dimmed" mb={4}>EXPLANATION</Text>
                                                    <Text size="sm" c="white" lh={1.5}>{item.ai_explanation}</Text>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Stack>
                </Stack>
            </ScrollArea>

            {/* 4. FOOTER ACTIONS */}
            <Box p="xl" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} radius="xl" style={{ border: 'none', backgroundColor: 'transparent' }}>
                        Dismiss
                    </Button>
                    <ShimmerButton 
                        onClick={onRetake} 
                        leftSection={<IconRefresh size={18} />}
                        radius="xl"
                        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}
                    >
                        Retake Quiz
                    </ShimmerButton>
                </Group>
            </Box>
        </Modal>
    );
}
