// src/components/landing/personality/TheBlueprint.jsx
"use client";

import { Container, Title, Text, Box, Stack, Badge, Group, ThemeIcon, SimpleGrid, RingProgress } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconHierarchy, IconTarget, IconDatabase, IconArrowDown, IconAlertTriangle, IconSparkles, IconHistory } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#F5F5F7', 
    textTransform: 'lowercase'
};

const FEATURES = [
    {
        id: "01",
        title: "Hidden Dependency Analysis",
        subtitle: "IT FINDS THE TRAPS",
        icon: IconHierarchy,
        color: "#BF5AF2", // Purple
        desc: "Most students fail because they try to study 'Chapter 5' without knowing it relies on a concept from 'Chapter 2'.",
        detail: "KalPad scans the entire syllabus graph. If a topic has a hidden prerequisite, the AI detects it and forces you to study the foundation first. No more hitting walls.",
        visual: (
            <Box p="md" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(191, 90, 242, 0.2)' }}>
                <Group justify="space-between" mb="xs">
                    <Badge variant="filled" color="dark" size="xs">Dependency Graph</Badge>
                    <IconAlertTriangle size={14} color="#BF5AF2" />
                </Group>
                <Stack gap="xs" align="center">
                    <Box style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', width: '100%', textAlign: 'center' }}>
                        <Text size="10px" c="dimmed">Advanced Calculus (Target)</Text>
                    </Box>
                    <IconArrowDown size={12} color="gray" />
                    <Box style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #BF5AF2', background: 'rgba(191, 90, 242, 0.1)', width: '100%', textAlign: 'center' }}>
                        <Text size="10px" c="violet.2" fw={700}>⚠️ Missing: Limits & Continuity</Text>
                    </Box>
                </Stack>
            </Box>
        )
    },
    {
        id: "02",
        title: "Golden Question Extraction",
        subtitle: "IT PREDICTS THE EXAM",
        icon: IconTarget,
        color: "#FFD700", // Gold
        desc: "Studying everything is a rookie mistake. The AI identifies the specific 'Archetype Questions' that appear every year.",
        detail: "It injects these 'Golden Questions' directly into your daily mission. You don't just learn the theory; you learn exactly what will be on the test paper.",
        visual: (
            <Box p="md" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                <Group justify="space-between" mb="xs">
                    <Badge variant="gradient" gradient={{ from: 'yellow', to: 'orange' }} size="xs">High Yield</Badge>
                    <IconSparkles size={14} color="#FFD700" />
                </Group>
                <Text size="10px" c="white" lh={1.4} fw={500}>
                    "Derive the expression for electric field on the equatorial line of a dipole."
                </Text>
                <Group gap="xs" mt="xs">
                    <Badge variant="outline" color="gray" size="xs" style={{ fontSize: '8px', height: '16px' }}>2018</Badge>
                    <Badge variant="outline" color="gray" size="xs" style={{ fontSize: '8px', height: '16px' }}>2020</Badge>
                    <Badge variant="outline" color="gray" size="xs" style={{ fontSize: '8px', height: '16px' }}>2022</Badge>
                </Group>
            </Box>
        )
    },
    {
        id: "03",
        title: "The Weakness Database",
        subtitle: "IT NEVER FORGETS",
        icon: IconDatabase,
        color: "#22d3ee", // Cyan
        desc: "Static plans don't know you failed a quiz yesterday. KalPad does.",
        detail: "Every time you get a question wrong, the system logs it in your 'Weakness DNA'. Future plans automatically schedule extra revision for these specific topics until you master them.",
        visual: (
            <Box p="md" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                <Group justify="space-between" align="center">
                    <Stack gap={0}>
                        <Text size="10px" c="dimmed" tt="uppercase" fw={700}>Retention Score</Text>
                        <Text size="lg" c="white" fw={700}>64%</Text>
                    </Stack>
                    <RingProgress 
                        size={50} thickness={4} roundCaps
                        sections={[{ value: 64, color: 'cyan' }]}
                        label={<IconHistory size={16} style={{ display: 'block', margin: '0 auto' }} />}
                    />
                </Group>
                <Text size="10px" c="cyan.3" mt="xs">
                    +2 Revision sessions added for "Optics"
                </Text>
            </Box>
        )
    }
];

export function TheBlueprint() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10, backgroundColor: '#05050500' }}>
            <Container size="lg">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="lg" mb={100}>
                    <Badge 
                        variant="filled" size="md" radius="xl" color="dark"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.1em' }}
                    >
                        SYSTEM ARCHITECTURE
                    </Badge>
                    <Title 
                        order={2} 
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                            color: 'white',
                            maxWidth: '900px'
                        }}
                    >
                        We built the <span style={{ ...serifItalic, color: '#86868B' }}>brain</span><br/>
                        you wish you had.
                    </Title>
                </Stack>

                {/* --- THE FEATURE STACK --- */}
                <Box style={{ position: 'relative' }}>
                    
                    {/* The Connecting Line (Vertical) */}
                    <div style={{ 
                        position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', 
                        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 80%, transparent)',
                        transform: 'translateX(-50%)', zIndex: 0
                    }} className="hidden md:block" />

                    <Stack gap={80}>
                        {FEATURES.map((feat, index) => (
                            <Box key={feat.id} style={{ position: 'relative' }}>
                                
                                {/* The Central Node Dot */}
                                <Box 
                                    className="hidden md:flex"
                                    style={{ 
                                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                                        width: '12px', height: '12px', borderRadius: '50%', 
                                        backgroundColor: '#050505', border: `2px solid ${feat.color}`, zIndex: 10
                                    }} 
                                />

                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} style={{ alignItems: 'center' }}>
                                    
                                    {/* CONTENT SIDE (Alternates) */}
                                    <Box style={{ order: index % 2 === 0 ? 1 : 2 }}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-100px" }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <Group gap="sm" mb="md">
                                                <ThemeIcon variant="light" size="lg" radius="md" color={feat.color} style={{ backgroundColor: `${feat.color}15` }}>
                                                    <feat.icon size={20} />
                                                </ThemeIcon>
                                                <Text size="xs" fw={700} c={feat.color} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                                    {feat.subtitle}
                                                </Text>
                                            </Group>
                                            <Title order={3} c="white" mb="sm" style={{ fontFamily: 'var(--font-lexend)' }}>
                                                {feat.title}
                                            </Title>
                                            <Text size="lg" c="white" lh={1.5} mb="md">
                                                {feat.desc}
                                            </Text>
                                            <Text size="sm" c="gray.5" lh={1.6}>
                                                {feat.detail}
                                            </Text>
                                        </motion.div>
                                    </Box>

                                    {/* VISUAL SIDE (Alternates) */}
                                    <Box style={{ order: index % 2 === 0 ? 2 : 1, display: 'flex', justifyContent: index % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true, margin: "-100px" }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            style={{ width: '100%', maxWidth: '400px' }}
                                        >
                                            <GlassCard 
                                                p="xl" 
                                                style={{ 
                                                    background: 'rgba(20, 20, 25, 0.6)',
                                                    border: `1px solid ${feat.color}30`,
                                                    boxShadow: `0 0 60px -30px ${feat.color}20`
                                                }}
                                            >
                                                {feat.visual}
                                            </GlassCard>
                                        </motion.div>
                                    </Box>

                                </SimpleGrid>
                            </Box>
                        ))}
                    </Stack>
                </Box>

            </Container>
        </Box>
    );
}