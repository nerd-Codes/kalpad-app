// src/components/MetricsDeck.jsx
"use client";

import { Text, Group, Stack, Box, SimpleGrid, ThemeIcon, Divider } from '@mantine/core';
import { GlassCard } from './GlassCard';
import { Heatmap } from './Heatmap';
import { IconFlame, IconTrendingUp, IconTargetArrow, IconCalendarStats } from '@tabler/icons-react';

// --- SUB-COMPONENT: Single Metric ---
function StatItem({ label, value, icon: Icon, color }) {
    return (
        <Box 
            p="md" 
            style={{ 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s ease',
                cursor: 'default'
            }}
        >
            <Group justify="space-between" align="flex-start" mb="xs">
                <ThemeIcon 
                    variant="light" 
                    color={color} 
                    radius="lg" 
                    size="md"
                    style={{ backgroundColor: `color-mix(in srgb, ${color}, transparent 85%)` }}
                >
                    <Icon size={18} stroke={2} />
                </ThemeIcon>
            </Group>
            
            <Stack gap={0}>
                <Text 
                    size="2rem" 
                    fw={700} 
                    style={{ 
                        lineHeight: 1, 
                        letterSpacing: '-0.03em',
                        fontFamily: 'var(--font-lexend)',
                        color: 'var(--apple-text-primary)'
                    }}
                >
                    {value}
                </Text>
                <Text 
                    size="xs" 
                    fw={600} 
                    tt="uppercase" 
                    c="dimmed" 
                    mt={6}
                    style={{ letterSpacing: '0.05em' }}
                >
                    {label}
                </Text>
            </Stack>
        </Box>
    );
}

// --- MAIN COMPONENT ---
export function MetricsDeck({ stats }) {
    return (
        <GlassCard p={0} style={{ overflow: 'hidden' }}>
            {/* The layout splits into two distinct zones */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0}>
                
                {/* ZONE 1: ACTIVITY (The Heatmap) */}
                <Box 
                    p="xl" 
                    style={{ 
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Group mb="lg" align="center">
                        <ThemeIcon variant="transparent" color="gray">
                            <IconCalendarStats size={20} />
                        </ThemeIcon>
                        <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                            Consistency
                        </Text>
                    </Group>
                    
                    <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* We wrap the Heatmap to handle overflow on very small screens */}
                        <Box style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
                            <Heatmap data={stats.completions} />
                        </Box>
                    </Box>
                </Box>

                {/* ZONE 2: PERFORMANCE (The Stats Grid) */}
                <Box p="xl" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <Group mb="lg" align="center">
                        <ThemeIcon variant="transparent" color="gray">
                            <IconTrendingUp size={20} />
                        </ThemeIcon>
                        <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                            Performance
                        </Text>
                    </Group>

                    <SimpleGrid cols={2} spacing="md">
                        <StatItem 
                            label="Day Streak" 
                            value={stats.currentStreak} 
                            icon={IconFlame} 
                            color="#FF9500" // Apple Orange
                        />
                        <StatItem 
                            label="Weekly XP" 
                            value={stats.weeklyCompleted} 
                            icon={IconTrendingUp} 
                            color="#34C759" // Apple Green
                        />
                        <StatItem 
                            label="Active Plans" 
                            value={stats.plansCreated} 
                            icon={IconTargetArrow} 
                            color="#BF5AF2" // Apple Purple
                        />
                        {/* Placeholder or Future Stat */}
                        <Box 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '16px',
                                border: '1px dashed rgba(255,255,255,0.1)'
                            }}
                        >
                            <Text size="xs" c="dimmed" ta="center">More Coming Soon</Text>
                        </Box>
                    </SimpleGrid>
                </Box>

            </SimpleGrid>
        </GlassCard>
    );
}