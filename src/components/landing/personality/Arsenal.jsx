"use client";

import { Container, Title, Text, SimpleGrid, Stack, Box, Group, Badge, ThemeIcon, ActionIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCpu, IconBolt, IconLock, IconFileText, IconDatabase, IconVideo, IconCheck, IconX, IconBrain, IconRadar2 } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 
import { Interactive } from '@/components/Interactive';
import { IconTargetArrow, IconRotateClockwise, IconSwords, IconTools } from '@tabler/icons-react';
import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { useRef } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const MODES = [
    { id: 'default', label: 'Balanced', persona: 'The Smart Gambler', desc: 'Optimizes ROI. Cuts low-yield topics to save sanity.', icon: IconTargetArrow, color: '#34d399' },
    { id: 'revision', label: 'Revision', persona: 'The Sweeper', desc: 'Breadth-first. Rapid recall focus. No new learning.', icon: IconRotateClockwise, color: '#60a5fa' },
    { id: 'hardcore', label: 'Hardcore', persona: 'The Drill Sergeant', desc: '100% Coverage. Increases study hours if behind.', icon: IconSwords, color: '#ef4444' },
    { id: 'sprint', label: 'Sprint', persona: 'The Sniper', desc: 'High Stakes. Only the 20% of topics that yield 80% marks.', icon: IconBolt, color: '#fbbf24' },
    { id: 'skill', label: 'Skill Build', persona: 'The Architect', desc: 'Project-based. Inverted dependency tree.', icon: IconTools, color: '#a78bfa' },
];

function ModeSelector() {
    const [active, setActive] = useState(2); // Default to Hardcore
    const isMobile = useMediaQuery('(max-width: 48em)'); // < 768px
    const scrollRef = useRef(null);

    // Mobile Scroll Handler
    const handleScroll = (dir) => {
        if (scrollRef.current) {
            const scrollAmount = dir === 'left' ? -320 : 320;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // --- SCROLL LISTENER (AUTO-HIGHLIGHT) ---
    const handleScrollUpdate = () => {
        if (!scrollRef.current || !isMobile) return;
        
        const container = scrollRef.current;
        const centerPoint = container.scrollLeft + (container.clientWidth / 2);
        
        // Find the card closest to the center
        let closestIndex = 0;
        let minDistance = Infinity;

        // Iterate through children (the motion.divs)
        Array.from(container.children).forEach((child, index) => {
            const childCenter = child.offsetLeft + (child.clientWidth / 2);
            const distance = Math.abs(childCenter - centerPoint);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== active) setActive(closestIndex);
    };

    return (
        <Stack gap="xl" mt={100}>
            <Group justify="center">
                <Badge variant="outline" color="gray" size="md" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'white', letterSpacing: '0.1em' }}>
                    ADAPTIVE INTELLIGENCE
                </Badge>
            </Group>
            <Title order={3} className="apple-text-gradient" ta="center" style={{ fontFamily: 'var(--font-lexend)' }}>
                One Architect. Five Personalities.
            </Title>

            <Box style={{ position: 'relative' }}>
                {/* --- MOBILE NAVIGATION ARROWS --- */}
                {isMobile && (
                    <>
                        <ActionIcon 
                            variant="default" radius="xl" size="lg" 
                            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => handleScroll('left')}
                        >
                            <IconChevronLeft size={20} />
                        </ActionIcon>
                        <ActionIcon 
                            variant="default" radius="xl" size="lg" 
                            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => handleScroll('right')}
                        >
                            <IconChevronRight size={20} />
                        </ActionIcon>
                    </>
                )}

                {/* --- THE CONTAINER --- */}
                <Box 
                    ref={scrollRef}
                    onScroll={handleScrollUpdate}
                    style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        height: '280px', // Slightly taller for mobile content
                        width: '100%',
                        maxWidth: '1000px',
                        margin: '0 auto',
                        // SCROLL LOGIC
                        overflowX: isMobile ? 'auto' : 'hidden', // Scroll on mobile, lock on desktop
                        scrollSnapType: isMobile ? 'x mandatory' : 'none',
                        padding: isMobile ? '0 10px' : '0', // Breathing room on mobile
                        scrollbarWidth: 'none' // Hide scrollbar
                    }}
                >
                    {MODES.map((mode, index) => {
                        const isActive = active === index;
                        // On mobile, card is always "active/expanded" visually, but we keep state for consistency
                        const isExpanded = isMobile || isActive;

                        return (
                            <motion.div
                                key={mode.id}
                                onHoverStart={() => !isMobile && setActive(index)}
                                onClick={() => isMobile && setActive(index)}
                                animate={{ flex: isExpanded ? 3 : 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                style={{
                                    // Base Layout
                                    position: 'relative',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    border: isActive ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.05)',
                                    backgroundColor: isActive ? `${mode.color}10` : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    // Mobile Sizing
                                    minWidth: isMobile ? '85vw' : 'auto', // Full width cards on mobile
                                    scrollSnapAlign: 'center'
                                }}
                            >
                                {/* Background Glow */}
                                {isActive && (
                                    <motion.div 
                                        layoutId="glow"
                                        style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, ${mode.color}20 0%, transparent 70%)` }} 
                                    />
                                )}

                                <Stack align="center" gap="md" style={{ position: 'relative', zIndex: 10, padding: '20px', width: '100%' }}>
                                    <ThemeIcon 
                                        size={isExpanded ? 60 : 40} 
                                        radius="100%" 
                                        variant={isActive ? "filled" : "light"}
                                        color={isActive ? "dark" : "gray"}
                                        style={{ 
                                            backgroundColor: isActive ? mode.color : 'rgba(255,255,255,0.05)',
                                            color: isActive ? 'black' : 'gray',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <mode.icon size={isExpanded ? 30 : 20} />
                                    </ThemeIcon>

                                    <Box ta="center">
                                        <Text 
                                            size={isExpanded ? "lg" : "xs"} 
                                            fw={700} 
                                            c={isActive ? "white" : "dimmed"}
                                            tt="uppercase"
                                            style={{ 
                                                writingMode: isExpanded ? 'horizontal-tb' : 'vertical-rl', 
                                                textOrientation: 'mixed', 
                                                letterSpacing: '0.1em' 
                                            }}
                                        >
                                            {mode.label}
                                        </Text>
                                        
                                        {/* Description is always visible on mobile if card is in view (handled by width) */}
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                <Text size="sm" c={mode.color} fw={600} mt={4} mb={8}>"{mode.persona}"</Text>
                                                <Text size="sm" c="dimmed" lh={1.4} style={{ maxWidth: '250px', margin: '0 auto' }}>
                                                    {mode.desc}
                                                </Text>
                                            </motion.div>
                                        )}
                                    </Box>
                                </Stack>
                            </motion.div>
                        );
                    })}
                </Box>
            </Box>
        </Stack>
    );
}

// --- VISUAL CONSTANTS ---
const ACCENT_TEAL = '#34d399';
const ACCENT_INDIGO = '#818cf8';
const ACCENT_ORANGE = '#fb923c';
const ACCENT_RED = '#ef4444';

// --- ANIMATION 1: STRATEGIST (The Triage Engine) ---
function StrategistAnim() {
    return (
        <Box style={{ width: '100%', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {/* The Decision Line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }} />

            {[0, 1, 2].map((i) => {
                // Logic: 0=Keep, 1=Discard, 2=Keep
                const isKeep = i !== 1;
                return (
                    <motion.div
                        key={i}
                        initial={{ y: -40, opacity: 0, scale: 0.8 }}
                        animate={{ 
                            y: [ -40, 0, 40 ], // Move down
                            x: [ 0, 0, isKeep ? 60 : -60 ], // Split left/right
                            opacity: [ 0, 1, isKeep ? 1 : 0 ], // Discard fades out
                            backgroundColor: [ 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)', isKeep ? ACCENT_TEAL : ACCENT_RED ]
                        }}
                        transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            delay: i * 1, // Stagger the stream
                            times: [0, 0.4, 1],
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            width: '80px', height: '8px', borderRadius: '4px',
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: isKeep ? 'flex-end' : 'flex-start',
                            padding: '0 4px'
                        }}
                    >
                        {/* Icon Indicator */}
                        <motion.div 
                            animate={{ opacity: [0, 0, 1] }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 1, times: [0, 0.4, 0.5] }}
                        >
                            {isKeep ? <IconCheck size={6} color="black" /> : <IconX size={6} color="black" />}
                        </motion.div>
                    </motion.div>
                );
            })}
            
            <Text size="8px" c="dimmed" style={{ position: 'absolute', bottom: 10 }}>TRIAGE PROTOCOL ACTIVE</Text>
        </Box>
    );
}

// --- ANIMATION 2: RAG (Text to Vector) ---
function RagAnim() {
    return (
        <Box style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
            
            {/* 1. The Source Document */}
            <Box style={{ position: 'relative', width: 40, height: 50, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <IconFileText size={20} color="gray" />
            </Box>

            {/* 2. The Data Stream */}
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    initial={{ x: -40, width: 20, height: 2, opacity: 0, borderRadius: 2 }}
                    animate={{ 
                        x: [ -40, 0, 40 ], // Move across
                        width: [ 20, 20, 6 ], // Shrink from line to dot
                        height: [ 2, 2, 6 ],  // Grow to dot
                        borderRadius: [ 2, 2, 50 ], // Rect to Circle
                        backgroundColor: [ '#fff', ACCENT_INDIGO, ACCENT_INDIGO ],
                        opacity: [ 0, 1, 0 ] // Fade into DB
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "linear" }}
                    style={{ position: 'absolute', left: '50%', marginLeft: -10 }} // Center anchor
                />
            ))}

            {/* 3. The Vector Database */}
            <Box style={{ position: 'relative', width: 40, height: 50 }}>
                {/* Database Stack */}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', border: `2px solid ${ACCENT_INDIGO}`, borderRadius: 4, opacity: 0.5 }} />
                {/* Filling Effect */}
                <motion.div 
                    animate={{ height: ['0%', '100%', '0%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    style={{ 
                        position: 'absolute', bottom: 0, width: '100%', 
                        background: `linear-gradient(to top, ${ACCENT_INDIGO}40, ${ACCENT_INDIGO}90)`,
                        borderRadius: 4
                    }} 
                />
                <IconDatabase size={20} color={ACCENT_INDIGO} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </Box>

        </Box>
    );
}

// --- ANIMATION 3: SCOUT (Carousel Scan) ---
function ScoutAnim() {
    return (
        <Box style={{ width: '100%', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            
            {/* The Reticle (Scanner) */}
            <div style={{ 
                position: 'absolute', width: 50, height: 50, 
                border: `2px solid ${ACCENT_ORANGE}`, borderRadius: 8, zIndex: 10,
                boxShadow: `0 0 20px ${ACCENT_ORANGE}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ width: 40, height: 1, background: ACCENT_ORANGE, opacity: 0.5 }} />
                <div style={{ height: 40, width: 1, background: ACCENT_ORANGE, opacity: 0.5, position: 'absolute' }} />
            </div>

            {/* The Video Stream */}
            <motion.div
                animate={{ x: [80, -80] }} // Scroll left
                transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                style={{ display: 'flex', gap: '20px' }}
            >
                {[0, 1, 2, 3].map(i => {
                    const isMatch = i === 2; // 3rd video is the match
                    return (
                        <motion.div
                            key={i}
                            animate={isMatch ? { 
                                scale: [1, 1, 1.2, 1], // Pulse when hitting center (approx)
                                borderColor: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)', ACCENT_ORANGE, 'rgba(255,255,255,0.1)']
                            } : {}}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            style={{ 
                                width: 50, height: 40, 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <IconVideo size={16} color={isMatch ? ACCENT_ORANGE : 'gray'} style={{ opacity: 0.5 }} />
                        </motion.div>
                    );
                })}
            </motion.div>
            
            <Text size="8px" c="orange.4" style={{ position: 'absolute', bottom: 10 }} fw={700} tt="uppercase">
                SCANNING METADATA...
            </Text>
        </Box>
    );
}

// --- SUB-COMPONENT: SYSTEM CARD ---
function SystemCard({ label, title, description, accentColor, Animation, isBeta }) {
    return (
        <Interactive className="h-full">
            <GlassCard 
                p="xl" 
                h="100%"
                style={{ 
                    backgroundColor: 'rgba(15, 15, 20, 0.7)', 
                    border: `1px solid rgba(255,255,255,0.05)`,
                    boxShadow: isBeta ? 'none' : `0 0 0 1px ${accentColor}10, inset 0 0 30px ${accentColor}05`,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Tech Background Grid */}
                <div style={{ 
                    position: 'absolute', inset: 0, opacity: 0.05, 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', 
                    backgroundSize: '20px 20px', zIndex: 0 
                }} />

                {/* Header */}
                <Group justify="space-between" mb="lg" style={{ position: 'relative', zIndex: 1 }}>
                    <Badge 
                        variant="outline" 
                        color="gray" 
                        size="xs" 
                        radius="sm"
                        styles={{ root: { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' } }}
                    >
                        {label}
                    </Badge>
                    {isBeta ? (
                        <Badge 
                            variant="filled" color="orange" size="xs" radius="sm"
                            leftSection={<IconLock size={10} style={{ marginTop: 2 }} />}
                            styles={{ root: { backgroundColor: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' } }}
                        >
                            CLOSED BETA
                        </Badge>
                    ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                    )}
                </Group>

                {/* The Animation Window */}
                <Box 
                    mb="xl" 
                    style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        zIndex: 1,
                        overflow: 'hidden'
                    }}
                >
                    <Animation />
                </Box>

                {/* Content */}
                <Stack gap="sm" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <Title order={4} ff="Lexend, sans-serif" c="white" style={{ letterSpacing: '-0.02em' }}>
                        {title}
                    </Title>
                    <Text c="dimmed" size="sm" lh={1.6}>
                        {description}
                    </Text>
                </Stack>

                {/* Footer Specs */}
                <Group mt="xl" gap="md" style={{ opacity: 0.3, position: 'relative', zIndex: 1 }}>
                    <Group gap={4}>
                        <IconCpu size={12} />
                        <Text size="9px" ff="monospace">SYS.ACTIVE</Text>
                    </Group>
                    <Box style={{ width: 1, height: 10, backgroundColor: 'white' }} />
                    <Group gap={4}>
                        <IconBolt size={12} />
                        <Text size="9px" ff="monospace">LATENCY: {isBeta ? '---' : '40ms'}</Text>
                    </Group>
                </Group>
            </GlassCard>
        </Interactive>
    );
}

export function Arsenal() {
    return (
        <Box py={{ base: 100, md: 160 }} style={{ position: 'relative', zIndex: 10 }}>
            
            <Container size="lg">
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
                </Stack>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
                    
                    <SystemCard 
                        label="ENGINE 01"
                        title="The Strategist"
                        description="Uses Chain-of-Thought reasoning to ruthlessly triage your syllabus. It identifies high-ROI topics and cuts the fluff before you even start studying."
                        accentColor={ACCENT_TEAL}
                        Animation={StrategistAnim}
                    />

                    <SystemCard 
                        label="ENGINE 02"
                        title="Context-Aware RAG"
                        description="Vectorizes your documents into a semantic knowledge base, generating textbook-quality notes that reference your slides."
                        accentColor={ACCENT_INDIGO}
                        Animation={RagAnim}
                    />

                    <SystemCard 
                        label="ENGINE 03"
                        title="The Lecture Scout"
                        description="A multi-agent crawler that navigates the noise of YouTube. Finds and verifies the single best explanation for every concept."
                        accentColor={ACCENT_ORANGE}
                        Animation={ScoutAnim}
                        isBeta={true}
                    />

                </SimpleGrid>
                <ModeSelector />
            </Container>
        </Box>
    );
}