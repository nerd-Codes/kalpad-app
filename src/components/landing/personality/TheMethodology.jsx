// src/components/landing/personality/TheMethodology.jsx
"use client";

import { Container, Title, Text, Box, Stack, Badge, SimpleGrid, Group, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconFileUpload, IconCalendar, IconBrain } from '@tabler/icons-react';

// --- DATA: THE 3-STEP STUDY PIPELINE ---
const STEPS = [
    {
        step: "01",
        title: "Find What Matters",
        subtitle: "Syllabus Ingestion & Triage",
        icon: IconFileUpload,
        isActive: false,
        desc: "Upload your syllabus PDF and target exam date.",
        detail: "KalPad triages high-yield chapters, removes low-priority filler, and establishes prerequisite dependencies so you know where to start.",
        tag: "Step 01 · Ingestion"
    },
    {
        step: "02",
        title: "Make The Plan",
        subtitle: "High-Yield Scheduling & Prerequisite Mapping",
        icon: IconCalendar,
        isActive: true,
        desc: "Your study schedule, concise notes, and curated lectures are balanced across your available days.",
        detail: "No guessing. KalPad maps prerequisites first, allocates realistic daily study budgets, and schedules buffer days for weak topics.",
        tag: "Step 02 · Active Engine"
    },
    {
        step: "03",
        title: "You Study",
        subtitle: "Active Recall & Dynamic Pacing",
        icon: IconBrain,
        isActive: false,
        desc: "Open today's milestone, review distilled notes, and test retention with targeted questions.",
        detail: "If you miss a day, the recovery engine recalculates your daily pace without guilt or broken streaks.",
        tag: "Step 03 · Execution"
    }
];

export function TheMethodology() {
    return (
        <Box py={{ base: 64, md: 96 }} style={{ position: 'relative', backgroundColor: 'transparent' }}>
            <Container size="xl">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={{ base: 48, md: 64 }}>
                    <Badge 
                        variant="filled" 
                        size="md" 
                        radius="sm"
                        style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                            border: '1px solid rgba(237, 237, 237, 0.08)',
                            color: '#a1a1a6',
                            fontWeight: 500
                        }}
                    >
                        How KalPad works
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-inter), sans-serif', 
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', 
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                            fontWeight: 500,
                            color: '#ededed',
                            maxWidth: '720px'
                        }}
                    >
                        How KalPad schedules your revision
                    </Title>
                    <Text 
                        size="md" 
                        c="#a1a1a6" 
                        maw={620} 
                        lh={1.6}
                    >
                        A methodical three-step pipeline that turns a dense, overwhelming syllabus into a realistic daily study plan.
                    </Text>
                </Stack>

                {/* --- THE PIPELINE GRID --- */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 24, md: 24 }}>
                    {STEPS.map((item, index) => {
                        return (
                            <Box key={index} style={{ position: 'relative', height: '100%' }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ height: '100%' }}
                                >
                                    <Box 
                                        p={{ base: 20, md: 24 }}
                                        style={{ 
                                            backgroundColor: '#19191b',
                                            borderRadius: '12px',
                                            border: item.isActive 
                                                ? '1px solid rgba(217, 119, 6, 0.35)' 
                                                : '1px solid rgba(237, 237, 237, 0.08)',
                                            boxShadow: item.isActive 
                                                ? 'inset 0 1px 0 rgba(217, 119, 6, 0.2)' 
                                                : 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            position: 'relative',
                                            height: '100%'
                                        }}
                                    >
                                        <Group justify="space-between" align="flex-start" mb="lg">
                                            <ThemeIcon 
                                                size={42} 
                                                radius="md" 
                                                variant="light" 
                                                style={{ 
                                                    backgroundColor: item.isActive ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 255, 255, 0.04)', 
                                                    color: item.isActive ? '#D97706' : '#a1a1a6',
                                                    border: '1px solid rgba(237, 237, 237, 0.08)'
                                                }}
                                            >
                                                <item.icon size={20} stroke={1.5} />
                                            </ThemeIcon>
                                            
                                            <Group gap="xs" align="center">
                                                {item.isActive && (
                                                    <Badge 
                                                        size="xs" 
                                                        radius="sm"
                                                        style={{ 
                                                            backgroundColor: 'rgba(217, 119, 6, 0.14)', 
                                                            color: '#D97706',
                                                            border: '1px solid rgba(217, 119, 6, 0.25)',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Active Step
                                                    </Badge>
                                                )}
                                                <Text 
                                                    size="sm" 
                                                    fw={500} 
                                                    c={item.isActive ? '#D97706' : '#85858b'} 
                                                    style={{ 
                                                        fontFamily: 'var(--font-lexend), monospace', 
                                                        fontVariantNumeric: 'tabular-nums' 
                                                    }}
                                                >
                                                    {item.step}
                                                </Text>
                                            </Group>
                                        </Group>

                                        <Text size="xs" c={item.isActive ? '#D97706' : '#85858b'} fw={500} mb={4}>
                                            {item.subtitle}
                                        </Text>

                                        <Title order={3} c="#ededed" mb="sm" style={{ fontSize: '18px', fontWeight: 500, lineHeight: 1.3 }}>
                                            {item.title}
                                        </Title>
                                        
                                        <Text size="sm" c="#ededed" lh={1.5} mb="sm" fw={400}>
                                            {item.desc}
                                        </Text>
                                        
                                        <Text size="xs" c="#a1a1a6" lh={1.6} mt="auto">
                                            {item.detail}
                                        </Text>
                                    </Box>
                                </motion.div>
                            </Box>
                        );
                    })}
                </SimpleGrid>

            </Container>
        </Box>
    );
}
