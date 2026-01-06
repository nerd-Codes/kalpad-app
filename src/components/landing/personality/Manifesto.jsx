"use client";

import { useRef } from 'react';
import { Container, Title, Text, Stack, Box, Badge, Group, SimpleGrid } from '@mantine/core';
import { motion, useScroll, useTransform } from 'framer-motion';
import { IconFileText, IconClock, IconAlertTriangle, IconBriefcase } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard';

// --- SUB-COMPONENT: FLOATING DEBRIS (Unchanged) ---
function Debris({ icon: Icon, label, x, y, rotate, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: y + 100 }}
            whileInView={{ 
                opacity: [0, 0.3, 0], 
                y: [y + 50, y, y - 50],
                rotate: rotate 
            }}
            transition={{ 
                duration: 10, 
                repeat: Infinity, 
                delay: delay,
                ease: "linear"
            }}
            viewport={{ once: false }}
            style={{
                position: 'absolute',
                left: x,
                zIndex: 0,
                filter: 'blur(3px)', 
                pointerEvents: 'none'
            }}
        >
            <Box 
                p="xs" 
                style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: 'rgba(255,255,255,0.2)',
                    transform: `scale(0.8) rotate(${rotate}deg)`
                }}
            >
                <Group gap="xs">
                    <Icon size={14} />
                    <Text size="xs" fw={700} tt="uppercase">{label}</Text>
                </Group>
            </Box>
        </motion.div>
    );
}

export function Manifesto() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [50, -50]); // Subtle shift
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    return (
        <Box
            ref={containerRef}
            py={{ base: 100, md: 180 }}
            style={{
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* --- LAYER 1: THE MENTAL FOG --- */}
            <Box style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                <Debris icon={IconFileText} label="Syllabus_Final.pdf" x="5%" y={100} rotate={-10} delay={0} />
                <Debris icon={IconClock} label="11:59 Deadline" x="85%" y={300} rotate={15} delay={2} />
                <Debris icon={IconBriefcase} label="Internship App" x="15%" y={500} rotate={5} delay={4} />
                <Debris icon={IconAlertTriangle} label="Attendance < 75%" x="75%" y={600} rotate={-5} delay={1} />
            </Box>

            {/* --- LAYER 2: THE CLARITY (Content) --- */}
            <Container size="lg" style={{ position: 'relative', zIndex: 10 }}>
                <motion.div style={{ y, opacity }}>
                    <GlassCard 
                        p={{ base: 'xl', md: 60 }}
                        style={{
                            backgroundColor: 'rgba(10, 10, 12, 0.7)', 
                            backdropFilter: 'blur(40px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)'
                        }}
                    >
                        {/* --- THE EDITORIAL GRID --- */}
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60}>
                            
                            {/* COLUMN 1: THE HOOK */}
                            <Stack justify="center" gap="xl" style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }}>
                                <Box>
                                    <Badge 
                                        variant="outline" 
                                        color="gray" 
                                        size="md" 
                                        mb="md"
                                        style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}
                                    >
                                        THE MANIFESTO
                                    </Badge>

                                    <Title 
                                        order={2} 
                                        style={{ 
                                            fontFamily: 'var(--font-lexend)', 
                                            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
                                            fontWeight: 800,
                                            lineHeight: 1.1,
                                            letterSpacing: '-0.03em',
                                            color: 'white'
                                        }}
                                    >
                                        You are living two lives. <br/>
                                        <span style={{ color: '#86868B' }}>And it’s exhausting.</span>
                                    </Title>
                                </Box>
                                <Text size="lg" c="dimmed" lh={1.6} style={{ fontFamily: 'var(--font-inter)' }}>
                                    There’s the student who attends every lecture and loves the coursework. Then there’s the <span style={{ color: 'white', fontWeight: 600 }}>real you</span>.
                                </Text>
                            </Stack>

                            {/* COLUMN 2: THE NARRATIVE */}
                            <Stack justify="center" gap="xl">
                                <Text size="lg" c="dimmed" lh={1.7}>
                                    The intern. The hacker. The creator. The one building a career in a world that moves at 100mph. 
                                    Your "real" education happens at 2 AM on GitHub, not in a 9 AM lecture.
                                </Text>

                                {/* The "Insight" Box */}
                                <Box 
                                    p="lg" 
                                    style={{ 
                                        borderLeft: '3px solid #BF5AF2', 
                                        background: 'linear-gradient(90deg, rgba(191, 90, 242, 0.05) 0%, transparent 100%)',
                                    }}
                                >
                                    <Text size="md" fs="italic" c="rgba(255,255,255,0.9)" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1.6 }}>
                                        "The problem isn't the work. We want to learn. The problem is the friction. The staring contest with a 50-page PDF when your brain is already fried."
                                    </Text>
                                </Box>

                                <Box>
                                    <Text size="xl" c="white" fw={700} style={{ letterSpacing: '-0.02em' }}>
                                        KalPad isn't a magic wand. It's a weapon.
                                    </Text>
                                    <Text size="md" c="dimmed" mt="xs">
                                        Designed to turn a stressful 7.0 into a confident 8.5, simply by clearing the path so you can walk it yourself.
                                    </Text>
                                </Box>
                            </Stack>

                        </SimpleGrid>
                    </GlassCard>
                </motion.div>
            </Container>
        </Box>
    );
}