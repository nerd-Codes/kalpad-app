// src/components/landing/personality/Devlog.jsx
"use client";

import { Container, Title, Text, Stack, Box, Badge, Group } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconGitCommit, IconCpu, IconDeviceMobile, IconBroadcast } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 

// --- DATA: THE EVOLUTION ---
const LOGS = [
    {
        id: 'v1',
        version: 'v1.0 :: GENESIS',
        title: 'The Strategist',
        description: 'First constitutional AI deployed. Capable of ruthless syllabus triage and ROI calculation.',
        align: 'left',
        icon: IconCpu,
        color: '#34d399', // Green
        status: 'DEPLOYED'
    },
    {
        id: 'v2',
        version: 'v2.0 :: HIVE MIND',
        title: 'The Mentor Engine',
        description: 'Multi-modal RAG integrated. The system now "sees" your diagrams and "reads" your chaotic handwriting.',
        align: 'right',
        icon: IconGitCommit,
        color: '#bf5af2', // Purple
        status: 'DEPLOYED'
    },
    {
        id: 'v3',
        version: 'v3.0 :: NEURAL LINK',
        title: 'Native Android Interface',
        description: 'Forging a dedicated mobile uplink. Offline caching, haptic study timers, and persistent "Focus Mode".',
        align: 'left',
        icon: IconDeviceMobile,
        color: '#f59e0b', // Orange
        status: 'COMPILING...' // Active dev state
    }
];

// --- SUB-COMPONENT: TIMELINE NODE ---
function LogNode({ log, index }) {
    const isLeft = log.align === 'left';
    return (
        <div className={`flex flex-col md:flex-row items-center justify-between w-full mb-16 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
            
            {/* 1. Spacer for opposite side */}
            <div className="hidden md:block w-5/12" />

            {/* 2. The Center Node (Mobile: Hidden or simplified) */}
            <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 flex flex-col items-center z-10">
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    viewport={{ once: true, margin: "-50px" }} // FIX: Play once
                    style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: '#000', border: `2px solid ${log.color}`,
                        boxShadow: `0 0 15px ${log.color}`,
                        willChange: 'transform' // FIX: GPU Hint
                    }}
                />
            </div>

            {/* 3. The Content Card */}
            <motion.div
                initial={{ opacity: 0, x: isLeft ? -20 : 20 }} // FIX: Reduced distance for performance
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }} // FIX: Faster, simpler easing
                viewport={{ once: true, margin: "-100px" }} // FIX: Play once, prevents lag on scroll back
                className="w-full pl-12 md:pl-0 md:w-5/12"
                style={{ willChange: 'transform, opacity' }} // FIX: GPU Hint
            >
                <GlassCard 
                    p="lg"
                    style={{
                        backgroundColor: 'rgba(20, 20, 25, 0.6)',
                        border: `1px solid ${log.color}20`,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    animate={false} // Disable inner GlassCard physics to save CPU
                >
                    {/* Status Strip */}
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: log.color }} />
                    
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="xs" ff="monospace" c={log.color} style={{ letterSpacing: '0.1em' }}>
                                [{log.version}]
                            </Text>
                            {log.status === 'COMPILING...' && (
                                <Badge variant="filled" color="orange" size="xs" radius="sm" className="animate-pulse">
                                    BUILDING
                                </Badge>
                            )}
                        </Group>
                        <Group gap="sm">
                            <log.icon size={20} color="white" />
                            <Title order={4} ff="Lexend" c="white" size="h4">{log.title}</Title>
                        </Group>
                        <Text size="sm" c="dimmed" lh={1.5}>
                            {log.description}
                        </Text>
                    </Stack>
                </GlassCard>
            </motion.div>
        </div>
    );
}

export function Devlog() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={100}>
                    <Group gap="xs" style={{ opacity: 0.7 }}>
                        <IconBroadcast size={18} className="text-purple-400" />
                        <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.2em' }}>
                            LIVE TRANSMISSION
                        </Text>
                    </Group>
                    <Title 
                        order={2} 
                        className="apple-text-gradient"
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1
                        }}
                    >
                        Built in Public.<br/>Forged in Chaos.
                    </Title>
                </Stack>

                {/* --- THE TIMELINE --- */}
                <Box style={{ position: 'relative' }}>
                    {/* The Center Line */}
                    <div 
                        className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 h-full w-px"
                        style={{ 
                            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 80%, transparent)',
                            zIndex: 0
                        }} 
                    />
                    
                    <Stack gap={0}>
                        {LOGS.map((log, i) => (
                            <LogNode key={log.id} log={log} index={i} />
                        ))}
                    </Stack>
                </Box>

            </Container>
        </Box>
    );
}