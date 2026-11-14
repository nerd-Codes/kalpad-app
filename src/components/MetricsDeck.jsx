// src/components/MetricsDeck.jsx
"use client";

import { Text, Group, Stack, Box, SimpleGrid } from '@mantine/core';
import { GlassCard } from './GlassCard';
import { Heatmap } from './Heatmap';
import { IconFlame, IconChecklist, IconFolders } from '@tabler/icons-react';

// --- SUB-COMPONENT: Single Metric ---
function StatItem({ label, value, unit, icon: Icon, isHighlight = false }) {
    return (
        <Box 
            p="md" 
            style={{ 
                backgroundColor: isHighlight ? 'var(--accent-amber-subtle, rgba(217, 119, 6, 0.12))' : 'var(--apple-gray-2, #232325)', 
                borderRadius: 8,
                border: isHighlight 
                    ? '1px solid rgba(217, 119, 6, 0.35)' 
                    : '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))',
                cursor: 'default'
            }}
        >
            <Group justify="space-between" align="center" mb={6}>
                <Text size="xs" c="dimmed" style={{ letterSpacing: '0.01em' }}>
                    {label}
                </Text>
                <Icon 
                    size={16} 
                    stroke={1.5} 
                    color={isHighlight ? 'var(--accent-amber, #D97706)' : 'var(--apple-text-muted, #85858b)'} 
                />
            </Group>
            
            <Group align="baseline" gap={4}>
                <Text 
                    size="1.5rem" 
                    fw={500} 
                    style={{ 
                        lineHeight: 1.1, 
                        fontVariantNumeric: 'tabular-nums',
                        color: isHighlight ? 'var(--accent-amber, #D97706)' : 'var(--apple-text-primary, #ededed)'
                    }}
                >
                    {value}
                </Text>
                {unit && (
                    <Text size="xs" c="dimmed">
                        {unit}
                    </Text>
                )}
            </Group>
        </Box>
    );
}

// --- MAIN COMPONENT ---
export function MetricsDeck({ stats }) {
    return (
        <GlassCard p="xl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ZONE 1: OVERVIEW METRICS */}
            <Box>
                <Group justify="space-between" align="center" mb="md">
                    <Text size="sm" fw={500} c="var(--apple-text-primary, #ededed)">
                        Overview
                    </Text>
                    <Text ff="monospace" size="11px" c="dimmed">
                        [METRICS]
                    </Text>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3, lg: 1 }} spacing="sm">
                    <StatItem 
                        label="Study streak" 
                        value={stats.currentStreak} 
                        unit="days"
                        icon={IconFlame} 
                        isHighlight={stats.currentStreak > 0}
                    />
                    <StatItem 
                        label="Weekly topics" 
                        value={stats.weeklyCompleted} 
                        unit="completed"
                        icon={IconChecklist} 
                    />
                    <StatItem 
                        label="Active plans" 
                        value={stats.plansCreated} 
                        unit="syllabi"
                        icon={IconFolders} 
                    />
                </SimpleGrid>
            </Box>

            {/* ZONE 2: ACTIVITY HEATMAP */}
            <Box style={{ borderTop: '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))', paddingTop: 20 }}>
                <Group justify="space-between" align="center" mb="sm">
                    <Text size="sm" fw={500} c="var(--apple-text-primary, #ededed)">
                        Study consistency
                    </Text>
                    <Text ff="monospace" size="11px" c="dimmed">
                        11 weeks
                    </Text>
                </Group>

                <Box style={{ overflowX: 'auto', paddingBottom: 6 }}>
                    <Heatmap data={stats.completions} />
                </Box>

                {/* Quiet Legend */}
                <Group justify="flex-end" align="center" gap={4} mt="xs">
                    <Text size="10px" c="dimmed">Less</Text>
                    <Box w={8} h={8} bg="var(--apple-gray-2, #232325)" style={{ borderRadius: 1 }} />
                    <Box w={8} h={8} bg="rgba(217, 119, 6, 0.25)" style={{ borderRadius: 1 }} />
                    <Box w={8} h={8} bg="rgba(217, 119, 6, 0.50)" style={{ borderRadius: 1 }} />
                    <Box w={8} h={8} bg="rgba(217, 119, 6, 0.75)" style={{ borderRadius: 1 }} />
                    <Box w={8} h={8} bg="var(--accent-amber, #D97706)" style={{ borderRadius: 1 }} />
                    <Text size="10px" c="dimmed">More</Text>
                </Group>
            </Box>
        </GlassCard>
    );
}
