"use client";

import { Container, Title, Text, SimpleGrid, Stack, Box, Group, ThemeIcon, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconBrain, IconFileText, IconRadar2, IconCpu, IconBolt, IconSearch } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 
import { Interactive } from '@/components/Interactive';

// --- SUB-COMPONENT: THE SYSTEM CARD ---
function SystemCard({ icon: Icon, label, title, description, accentColor, delay }) {
    return (
        <Interactive className="h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: delay }}
                viewport={{ once: true }}
                style={{ height: '100%' }}
            >
                <GlassCard 
                    p="xl" 
                    h="100%"
                    style={{ 
                        backgroundColor: 'rgba(20, 20, 25, 0.6)',
                        border: `1px solid rgba(255,255,255,0.05)`,
                        // Dynamic glow on hover handled by Interactive wrapper, 
                        // but we add a static subtle glow here
                        boxShadow: `0 0 0 1px ${accentColor}10, inset 0 0 20px ${accentColor}05`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header: Tech Label */}
                    <Group justify="space-between" mb="xl">
                        <Badge 
                            variant="outline" 
                            color="gray" 
                            size="sm" 
                            styles={{ root: { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-lexend)' } }}
                        >
                            {label}
                        </Badge>
                        <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3] }} 
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                        </motion.div>
                    </Group>

                    {/* Icon Core */}
                    <Box mb="lg">
                        <ThemeIcon 
                            size={60} 
                            radius="md" 
                            variant="gradient" 
                            gradient={{ from: `${accentColor}20`, to: `${accentColor}05`, deg: 145 }}
                            style={{ border: `1px solid ${accentColor}30` }}
                        >
                            <Icon size={30} color={accentColor} stroke={1.5} />
                        </ThemeIcon>
                    </Box>

                    {/* Content */}
                    <Stack gap="md" style={{ flex: 1 }}>
                        <Title order={3} ff="Lexend, sans-serif" size="h3" c="white">
                            {title}
                        </Title>
                        <Text c="dimmed" size="md" lh={1.6}>
                            {description}
                        </Text>
                    </Stack>

                    {/* Footer: Tech Specs (Visual Filler) */}
                    <Group mt="xl" gap="xs" style={{ opacity: 0.3 }}>
                        <IconCpu size={14} />
                        <Text size="10px" ff="monospace">v2.5.0</Text>
                        <Box style={{ width: 1, height: 10, backgroundColor: 'white' }} />
                        <IconBolt size={14} />
                        <Text size="10px" ff="monospace">LATENCY: 40ms</Text>
                    </Group>
                </GlassCard>
            </motion.div>
        </Interactive>
    );
}

export function Arsenal() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            <Container size="lg">
                
                {/* --- SECTION HEADER --- */}
                <Stack align="center" ta="center" gap="md" mb={80}>
                    <Badge 
                        variant="filled" 
                        color="dark" 
                        size="lg" 
                        radius="sm"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', letterSpacing: '0.1em' }}
                    >
                        SYSTEM ARCHITECTURE
                    </Badge>
                    <Title 
                        order={2} 
                        className="apple-text-gradient"
                        style={{ 
                            fontFamily: 'var(--font-lexend)', 
                            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', 
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1
                        }}
                    >
                        Three engines. One objective.
                    </Title>
                    <Text c="dimmed" size="xl" maw={600}>
                        We didn't just wrap ChatGPT. We engineered a dedicated workflow for academic dominance.
                    </Text>
                </Stack>

                {/* --- THE GRID --- */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
                    
                    <SystemCard 
                        icon={IconBrain}
                        label="ENGINE 01"
                        title="The Strategist"
                        description="Uses Chain-of-Thought reasoning to ruthlessly triage your syllabus. It identifies high-ROI topics and cuts the fluff before you even start studying."
                        accentColor="#34d399" // Emerald Teal
                        delay={0}
                    />

                    <SystemCard 
                        icon={IconFileText}
                        label="ENGINE 02"
                        title="Context-Aware RAG"
                        description="Upload your chaotic PDFs. Our engine vectorizes them into a semantic knowledge base, generating textbook-quality notes that actually reference your professor's slides."
                        accentColor="#818cf8" // Indigo
                        delay={0.2}
                    />

                    <SystemCard 
                        icon={IconRadar2} // Or IconSearch
                        label="ENGINE 03"
                        title="The Lecture Scout"
                        description="A multi-agent crawler that navigates the noise of YouTube. It finds, verifies, and curates the single best explanation for every concept in your plan."
                        accentColor="#f472b6" // Pink
                        delay={0.4}
                    />

                </SimpleGrid>
            </Container>
        </Box>
    );
}