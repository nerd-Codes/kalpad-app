// src/components/landing/personality/TheMethodology.jsx
"use client";

import { Container, Title, Text, Box, Stack, Badge, SimpleGrid, Group, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconFileUpload, IconCpu, IconFocus2, IconArrowRight, IconBook, IconBrandYoutube } from '@tabler/icons-react';
import { GlassCard } from '@/components/GlassCard';

// --- EDITORIAL FONT STYLE ---
const serifItalic = {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#F5F5F7', 
    textTransform: 'lowercase'
};

// --- DATA: THE 3-STEP PROTOCOL ---
const STEPS = [
    {
        step: "01",
        title: "We Triage",
        icon: IconFileUpload,
        color: "#BF5AF2", // Purple
        desc: "You upload the confusing, 50-page syllabus PDF.",
        detail: "The AI scans it, identifies high-yield topics, calculates the time remaining, and ruthlessly cuts the fluff."
    },
    {
        step: "02",
        title: "We Architect",
        icon: IconCpu,
        color: "#22d3ee", // Cyan
        desc: "We build the entire resource stack instantly.",
        detail: "No Googling. The system generates textbook-quality notes and curates the exact YouTube lectures you need for every single topic."
    },
    {
        step: "03",
        title: "You Conquer",
        icon: IconFocus2,
        color: "#34C759", // Green
        desc: "You log in and just study.",
        detail: "No planning fatigue. No 'where do I start' anxiety. You just execute the mission in front of you."
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
                        THE PROTOCOL
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
                        We handle the <span style={{ ...serifItalic, color: '#86868B' }}>meta-work.</span><br/>
                        You handle the learning.
                    </Title>
                </Stack>

                {/* --- THE PIPELINE GRID --- */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 60, md: 40 }}>
                    {STEPS.map((item, index) => {
                        const isLast = index === STEPS.length - 1;
                        return (
                            <Box key={index} style={{ position: 'relative' }}>
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
                                            position: 'relative', zIndex: 10
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

                                        {/* Micro-Visuals for context */}
                                        {index === 1 && (
                                            <Group mt="auto" pt="lg" gap="xs">
                                                <Badge size="xs" variant="outline" color="gray" leftSection={<IconBook size={10}/>}>AI Notes</Badge>
                                                <Badge size="xs" variant="outline" color="gray" leftSection={<IconBrandYoutube size={10}/>}>Lectures</Badge>
                                            </Group>
                                        )}
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