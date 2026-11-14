// src/components/HeroTile.jsx
"use client";

import { Title, Text, Group, Stack, Box, RingProgress, Button } from '@mantine/core';
import { IconArrowRight, IconBook, IconCalendarEvent, IconPlayerPlay } from '@tabler/icons-react';
import { GlassCard } from './GlassCard';
import { Interactive } from './Interactive';
import Link from 'next/link';

export function HeroTile({ plan, progress, todaysTopic, onJumpBackIn }) {
    if (!plan) {
        return (
            <GlassCard p="xl" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Stack gap="md" align="flex-start" maw={520}>
                    <Group gap="xs" align="center">
                        <Box
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                backgroundColor: 'var(--apple-gray-2, #232325)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--apple-text-muted, #85858b)'
                            }}
                        >
                            <IconBook size={16} stroke={1.5} />
                        </Box>
                        <Text ff="monospace" size="xs" c="dimmed" style={{ letterSpacing: '0.04em' }}>
                            [PLANNER · IDLE]
                        </Text>
                    </Group>

                    <Stack gap={4}>
                        <Title order={2} style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--apple-text-primary, #ededed)' }}>
                            No active study plan
                        </Title>
                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                            Create a study plan to organize your syllabus topics, balance review days, and track daily progress.
                        </Text>
                    </Stack>

                    <Interactive>
                        <Button 
                            component={Link} 
                            href="/new-plan" 
                            size="sm" 
                            radius={8}
                            color="white"
                            variant="white"
                            c="#141415"
                            rightSection={<IconArrowRight size={14} stroke={1.5} />}
                            style={{ fontWeight: 500, height: 36, paddingLeft: 16, paddingRight: 16 }}
                        >
                            Create study plan
                        </Button>
                    </Interactive>
                </Stack>
            </GlassCard>
        );
    }

    const nextTask = todaysTopic?.sub_topics?.find(t => !t.completed);
    const completedCount = todaysTopic?.sub_topics?.filter(t => t.completed).length || 0;
    const totalCount = todaysTopic?.sub_topics?.length || 0;

    return (
        <GlassCard 
            p={0} 
            style={{ 
                minHeight: '260px', 
                display: 'flex', 
                flexDirection: 'column', 
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box p={{ base: 'md', sm: 'xl' }} style={{ flex: 1 }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="xs" align="center">
                            <Text ff="monospace" size="xs" c="dimmed" style={{ letterSpacing: '0.04em' }}>
                                [ACTIVE SYLLABUS]
                            </Text>
                            <span style={{ color: 'var(--apple-text-muted, #85858b)', fontSize: 11 }}>•</span>
                            <Text size="xs" c="dimmed">
                                {todaysTopic ? "Today's schedule active" : "No schedule today"}
                            </Text>
                        </Group>

                        <Title order={2} style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--apple-text-primary, #ededed)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            {plan.exam_name}
                        </Title>

                        <Group gap="xs" mt={2}>
                            <IconCalendarEvent size={14} stroke={1.5} color="var(--apple-text-muted, #85858b)" />
                            <Text size="xs" c="dimmed">
                                {plan.exam_date ? `Target date: ${plan.exam_date}` : 'Ongoing plan'}
                            </Text>
                        </Group>
                    </Stack>

                    {/* Progress Ring with Warm Amber Accent */}
                    <Box visibleFrom="xs">
                        <RingProgress
                            size={76}
                            thickness={6}
                            roundCaps={false}
                            rootColor="var(--apple-gray-2, #232325)"
                            sections={[{ value: progress, color: 'var(--accent-amber, #D97706)' }]}
                            label={
                                <Text ta="center" size="xs" fw={500} c="var(--apple-text-primary, #ededed)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {progress}%
                                </Text>
                            }
                        />
                    </Box>
                </Group>

                {/* The "Up Next" Context */}
                <Box mt={28}>
                    <Text size="xs" c="dimmed" mb={4}>
                        Up next
                    </Text>
                    <Text size="md" fw={500} c="var(--apple-text-primary, #ededed)" lineClamp={2} style={{ maxWidth: '90%' }}>
                        {nextTask ? nextTask.text : "All scheduled topics completed for today."}
                    </Text>
                </Box>
            </Box>

            {/* Bottom Action Bar */}
            <Box 
                px="xl"
                py="sm"
                style={{ 
                    borderTop: '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))',
                    backgroundColor: 'rgba(0,0,0,0.15)'
                }}
            >
                <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {completedCount} of {totalCount} topics completed today
                    </Text>
                    <Interactive onClick={() => onJumpBackIn(plan.id)}>
                        <Button 
                            rightSection={<IconPlayerPlay size={14} stroke={1.5} />}
                            radius={8}
                            color="white"
                            variant="white"
                            c="#141415"
                            size="xs"
                            style={{ fontWeight: 500, height: 32, paddingLeft: 14, paddingRight: 12 }}
                        >
                            Continue study
                        </Button>
                    </Interactive>
                </Group>
            </Box>
        </GlassCard>
    );
}
