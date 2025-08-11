// src/components/landing/personality/Hacks.jsx
"use client";

import { Container, Title, Text, SimpleGrid, Stack, ThemeIcon } from '@mantine/core';
import { IconBrain, IconRepeat, IconArrowUpRight } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; // Import GlassCard

const hacks = [
    {
        icon: IconBrain,
        title: 'The AI Whisperer',
        description: 'Treat the AI like a brilliant intern. Use phrases like "Explain this to me like I\'m 10" or "Re-plan this, but focus only on practicals." The more conversational your feedback, the smarter it gets.'
    },
    {
        icon: IconRepeat,
        title: 'The Brainwashing Technique',
        description: 'Generate AI notes for a tough chapter. Read them once. Then, hit "regenerate" a few times. Seeing the same core concepts explained in slightly different ways is the fastest way to build deep intuition.'
    },
    {
        icon: IconArrowUpRight,
        title: 'The Failure-to-Success Pipeline',
        description: 'Fallen behind? Don\'t just start over. Use the "Regenerate Plan" feature. It analyzes your missed topics and builds a new, realistic schedule to get you back on track without the guilt.'
    }
];

export function Hacks() {
    return (
        <Container size="lg" py={80}>
            <Stack align="center" ta="center" gap="xs" mb={50}>
                 <Title order={2} ff="Lexend, sans-serif" fz={{ base: '2rem', sm: '2.5rem' }}>
                    Three "God Mode" Tricks I Probably Shouldn't Be Telling You. 🤫
                </Title>
                {/* --- FIX #2: Added the sub-headline --- */}
                <Text size="lg" c="dimmed">
                    I built it, so I know the hacks.
                </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing={40}>
                {hacks.map((hack) => (
                    // --- FIX #1: Replaced Paper with GlassCard ---
                     <GlassCard key={hack.title} p="xl" h="100%">
                        <Stack>
                            <ThemeIcon size={50} radius="md" variant="light" color="brandPurple">
                                <hack.icon size={28} />
                            </ThemeIcon>
                            <Title order={4} ff="Lexend, sans-serif" mt="md">{hack.title}</Title>
                            <Text c="dimmed">{hack.description}</Text>
                        </Stack>
                     </GlassCard>
                ))}
            </SimpleGrid>
        </Container>
    );
}