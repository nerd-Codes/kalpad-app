// src/components/HeroTile.jsx
"use client";

import { Title, Text, Group, Stack, Box, RingProgress, ThemeIcon, Button } from '@mantine/core';
import { IconArrowRight, IconTargetArrow, IconPlayerPlay } from '@tabler/icons-react';
import { GlassCard } from './GlassCard';
import { Interactive } from './Interactive';
import Link from 'next/link';

export function HeroTile({ plan, progress, todaysTopic, onJumpBackIn }) {
    
    if (!plan) {
        return (
            <GlassCard p="xl" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <ThemeIcon size={64} radius="xl" color="gray" variant="light" mb="lg">
                    <IconTargetArrow size={32} />
                </ThemeIcon>
                <Title order={2} ta="center" className="apple-text-gradient">No Active Quest</Title>
                <Text c="dimmed" ta="center" mt="xs" mb="xl" maw={400}>
                    Your command center is empty. Initialize a new study plan to begin tracking.
                </Text>
                <Interactive>
                    <Button 
                        component={Link} 
                        href="/new-plan" 
                        size="lg" 
                        radius="xl"
                        color="white"
                        variant="white"
                        c="black"
                    >
                        Initialize Plan
                    </Button>
                </Interactive>
            </GlassCard>
        );
    }

    const nextTask = todaysTopic?.sub_topics?.find(t => !t.completed);

    return (
        <GlassCard 
            p={0} 
            style={{ 
                minHeight: '320px', 
                display: 'flex', 
                flexDirection: 'column', 
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Ambient Background Gradient */}
            <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(191, 90, 242, 0.15) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(40px)', zIndex: 0
            }} />

            <Box p={{ base: 'lg', sm: 'xl' }} style={{ flex: 1, zIndex: 1 }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap="xs" style={{ flex: 1 }}>
                        <Text tt="uppercase" c="dimmed" size="xs" fw={700} style={{ letterSpacing: '0.1em' }}>
                            Current Objective
                        </Text>
                        <Title order={1} style={{ fontSize: '2.5rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                            {plan.exam_name}
                        </Title>
                        <Group gap="xs" mt="xs">
                            <ThemeIcon variant="light" color="gray" radius="xl" size="sm">
                                <IconTargetArrow size={12} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" fw={500}>
                                {todaysTopic ? "Today's Mission Active" : "No mission scheduled today"}
                            </Text>
                        </Group>
                    </Stack>

                    {/* Progress Ring */}
                    <Box visibleFrom="xs">
                        <RingProgress
                            size={100}
                            thickness={8}
                            roundCaps
                            sections={[{ value: progress, color: '#BF5AF2' }]} // Apple Purple
                            label={
                                <Text ta="center" size="sm" fw={700} c="white">
                                    {progress}%
                                </Text>
                            }
                        />
                    </Box>
                </Group>

                {/* The "Next Step" Context */}
                <Box mt={48}>
                    <Text size="sm" c="dimmed" mb="xs">NEXT ACTION</Text>
                    <Text size="xl" fw={500} lineClamp={2} style={{ maxWidth: '90%' }}>
                        {nextTask ? nextTask.text : "All tasks completed for today. Review or rest."}
                    </Text>
                </Box>
            </Box>

            {/* Bottom Action Bar */}
            <Box 
                p="md" 
                style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: 'rgba(0,0,0,0.2)'
                }}
            >
                <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                        {todaysTopic?.sub_topics?.filter(t => t.completed).length || 0} / {todaysTopic?.sub_topics?.length || 0} Tasks Done
                    </Text>
                    <Interactive onClick={() => onJumpBackIn(plan.id)}>
                        <Button 
                            rightSection={<IconPlayerPlay size={16} fill="currentColor" />}
                            radius="xl"
                            color="white"
                            variant="white"
                            c="black"
                            styles={{ root: { paddingLeft: 24, paddingRight: 20 } }}
                        >
                            Resume
                        </Button>
                    </Interactive>
                </Group>
            </Box>
        </GlassCard>
    );
}