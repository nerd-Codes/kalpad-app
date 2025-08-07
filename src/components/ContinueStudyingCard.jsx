// src/components/ContinueStudyingCard.jsx
"use client";

import { Title, Text, Group, Progress, Stack, List, ThemeIcon, Box } from '@mantine/core';
import { IconArrowRight, IconCircleDashed } from '@tabler/icons-react';
import { ShimmerButton } from './landing/ShimmerButton';
import { GlassCard } from './GlassCard';

// The component now accepts the 'onJumpBackIn' function as a prop
export function ContinueStudyingCard({ plan, progress, todaysTopic, onJumpBackIn }) {
    
    // Fallback view for users with no active plans
    if (!plan) {
        return (
            <GlassCard p="xl" style={{ backgroundColor: 'rgba(var(--mantine-color-brandPurple-raw), 0.15)'}}>
                <Title order={2} ff="Lexend, sans-serif">Start Your Next Quest</Title>
                <Text c="dimmed" mt="xs" mb="lg">You have no active study plans. Let's create one and begin your journey to success.</Text>
                {/* This button correctly uses Link as it doesn't need a loader */}
                <ShimmerButton component={require('next/link')} href="/new-plan" size="md" color="brandPurple">
                    Create a New Plan
                </ShimmerButton>
            </GlassCard>
        );
    }

    // Logic to find the next two UNCHECKED sub-tasks for today
    const uncheckedSubTasks = todaysTopic?.sub_topics?.filter(task => !task.completed) || [];
    const nextTwoUncheckedTasks = uncheckedSubTasks.slice(0, 2);
    const remainingUncheckedCount = Math.max(0, uncheckedSubTasks.length - 2);
    
    return (
        <GlassCard p="xl" style={{ backgroundColor: 'rgba(var(--mantine-color-brandPurple-raw), 0.15)'}}>
            <Stack justify="space-between" h="100%">
                
                {/* --- TOP SECTION: Title and Next Actions --- */}
                <Stack>
                    <Title order={2} ff="Lexend, sans-serif" fw={600}>
                        {plan.exam_name}
                    </Title>

                    <Box maw={300}>

                        <Stack>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Overall Progress</Text>
                                <Text size="sm" fw={700} c="brandGreen">{progress}%</Text>
                            </Group>
                            <Progress value={progress} color="brandGreen" size="sm" radius="xl" />
                        </Stack>
                    </Box>
                        
                    <Stack gap="sm" mt="md">
                        
                        <Title order={4} ff="Lexend, sans-serif" fw={500}>
                            {todaysTopic?.topic_name ? "Today's Next Steps" : "Nothing scheduled for today"}
                        </Title>
                        {nextTwoUncheckedTasks.length > 0 ? (
                            <List spacing="xs" size="sm">
                                {nextTwoUncheckedTasks.map((task, index) => (
                                     <List.Item key={index} icon={
                                        <ThemeIcon color="gray" variant="light" size={20} radius="xl">
                                            <IconCircleDashed style={{ width: '70%', height: '70%' }} />
                                        </ThemeIcon>
                                    }>
                                        {task.text}
                                    </List.Item>
                                ))}
                                {remainingUncheckedCount > 0 && <Text size="xs" c="dimmed" ml={32} mt={4}>+ {remainingUncheckedCount} more...</Text>}
                            </List>
                        ) : (
                             <Text size="sm" c="dimmed">
                                {todaysTopic ? "All tasks for today are complete. Well done!" : "Enjoy your break or get ahead on your plan."}
                             </Text>
                        )}
                    </Stack>
                </Stack>
                
                {/* --- BOTTOM SECTION: Constrained Width for Progress & Button --- */}
                <Box mt="xl" maw={300}> 
                    <Stack gap="lg">
                        {/* Progress Bar is now inside the constrained Box */}
                        
                        
                        {/* Button is compact, left-aligned, and uses the new handler */}
                        <ShimmerButton
                            onClick={() => onJumpBackIn(plan.id)}
                            color="brandPurple"
                            rightSection={<IconArrowRight size={16} />}
                            radius="xl"
                            style={{ alignSelf: 'flex-start' }}
                        >
                            Jump Back In
                        </ShimmerButton>
                    </Stack>
                </Box>
            </Stack>
        </GlassCard>
    );
}