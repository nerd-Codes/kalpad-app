// src/components/landing/personality/TheMethodology.jsx
"use client";

import { Container, Title, Text, Box, Stack, Badge, SimpleGrid, Group, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconFileUpload, IconCpu, IconFocus2, IconBook, IconBrandYoutube } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#BF5AF2',
    textTransform: 'lowercase'
};

// --- DATA: THE 3-STEP FLOW ---
const STEPS = [
    {
        step: "01",
        title: "Find What Matters",
        icon: IconFileUpload,
        color: "#BF5AF2", // Purple
        desc: "You upload the confusing, 50-page syllabus PDF.",
        detail: "KalPad checks the important topics, your deadline, and what can wait so you do not waste time on low-priority extras."
    },
    {
        step: "02",
        title: "Make The Plan",
        icon: IconCpu,
        color: "#22d3ee", // Cyan
        desc: "Your study plan, notes, and lectures come together in one place.",
        detail: "No endless searching. KalPad creates readable notes and finds useful YouTube explanations for the topics on your schedule."
    },
    {
        step: "03",
        title: "You Study",
        icon: IconFocus2,
        color: "#34C759", // Green
        desc: "You log in and just study.",
        detail: "No planning fatigue. No 'where do I start' anxiety. You open today's task and get moving."
    }
];

// --- ANIMATED CONNECTOR BEAM ---
function ConnectorBeam({ mobile }) {
    if (mobile) {
        return (
            <div style={{ position: 'absolute', left: '50%', top: '100%', width: '2px', height: '40px', background: 'rgba(255,255,255,0.1)', transform: 'translateX(-50%)', zIndex: 0 }}>
                <motion.div 
                    animate={{ top: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ position: 'absolute', width: '100%', height: '50%', background: 'linear-gradient(to bottom, transparent, white, transparent)' }}
                />
            </div>
        );
    }
    return (
        <div style={{ position: 'absolute', top: '50%', left: '100%', width: '40px', height: '2px', background: 'rgba(255,255,255,0.1)', transform: 'translateY(-50%)', zIndex: 0 }}>
            <motion.div 
                animate={{ left: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ position: 'absolute', height: '100%', width: '50%', background: 'linear-gradient(to right, transparent, white, transparent)' }}
            />
        </div>
    );
}

export function TheMethodology() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10, backgroundColor: '#05050500' }}>
            <Container size="xl">
                
                {/* --- HEADER --- */}
                <Stack align="center" ta="center" gap="lg" mb={80}>
                    <Badge 
                        variant="filled" size="md" radius="xl" color="gray"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', letterSpacing: '0.1em' }}
                    >
                        HOW IT WORKS
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
                        We handle the <span style={{ ...serifItalic, textShadow: '0 5px 20px rgba(191, 90, 242, 0.25)' }}>planning.</span><br/>
                        You focus on the learning.
                    </Title>
                </Stack>

                {/* --- THE PIPELINE GRID --- */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 60, md: 40 }}>
                    {STEPS.map((item, index) => {
                        const isLast = index === STEPS.length - 1;
                        return (
                            <Box key={index} style={{ position: 'relative', height: '100%' }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.2, duration: 0.6 }}
                                    style={{ height: '100%' }}
                                >
                                    <GlassCard 
                                        p="xl" 
                                        h="100%"
                                        style={{ 
                                            background: 'rgba(20, 20, 25, 0.6)',
                                            border: `1px solid ${item.color}30`,
                                            boxShadow: `0 0 40px -20px ${item.color}20`,
                                            display: 'flex', flexDirection: 'column',
                                            position: 'relative', zIndex: 10,
                                            minHeight: '100%'
                                        }}
                                    >
                                        <Group justify="space-between" mb="xl">
                                            <ThemeIcon 
                                                size={50} radius="md" variant="light" 
                                                style={{ backgroundColor: `${item.color}10`, color: item.color }}
                                            >
                                                <item.icon size={28} stroke={1.5} />
                                            </ThemeIcon>
                                            <Text size="3rem" fw={900} c="rgba(255,255,255,0.05)" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 0.8 }}>
                                                {item.step}
                                            </Text>
                                        </Group>

                                        <Title order={3} c="white" mb="sm" style={{ fontFamily: 'var(--font-lexend)' }}>
                                            {item.title}
                                        </Title>
                                        
                                        <Text size="lg" c="white" lh={1.4} mb="md" fw={500}>
                                            {item.desc}
                                        </Text>
                                        
                                        <Text size="sm" c="gray.5" lh={1.6}>
                                            {item.detail}
                                        </Text>
                                    </GlassCard>
                                </motion.div>

                                {/* Desktop Connector */}
                                {!isLast && (
                                    <Box visibleFrom="md">
                                        <ConnectorBeam mobile={false} />
                                    </Box>
                                )}
                                
                                {/* Mobile Connector */}
                                {!isLast && (
                                    <Box hiddenFrom="md">
                                        <ConnectorBeam mobile={true} />
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </SimpleGrid>

            </Container>
        </Box>
    );
}
