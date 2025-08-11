// src/components/landing/personality/Battle.jsx
"use client";

import { Container, Title, Text, Stack, Grid } from '@mantine/core';
import { GlassCard } from '../../GlassCard';

// This is a reusable sub-component for each "fighter"
function FighterCard({ emoji, title, pitch, glowColor }) {
    return (
        <GlassCard 
            p="xl" 
            h="100%"
            style={{
                // The new, subtle glow effect
                boxShadow: `0px 0px 30px 0px ${glowColor}`,
            }}
        >
            <Stack align="center" ta="center" gap="lg">
                <Text fz={80} lh={1}>{emoji}</Text>
                <Title order={3} ff="Lexend, sans-serif">{title}</Title>
                <Text c="dimmed" lh={1.6}>
                    "{pitch}"
                </Text>
            </Stack>
        </GlassCard>
    );
}

export function Battle() {
    return (
        <Container size="lg" py={{ base: 80, md: 120 }}>
            <Stack align="center" ta="center">
                <Title order={2} ff="Lexend, sans-serif" fz={{ base: '2rem', sm: '2.5rem' }}>
                    Choose Your Fighter: A Civil War is Raging in Your Study Plan.
                </Title>

                <Grid mt={60} gutter="xl" align="stretch">
                    {/* Left Column: Team Professor */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <FighterCard 
                            emoji="✍️"
                            title="The Professor"
                            pitch="Look, let's be logical. Watching someone talk about a topic is inefficient. It's a diluted, second-hand experience. I provide pure, unadulterated knowledge, directly from the source material. It's for those who prefer to actually read and build deep, foundational understanding. Why watch the movie when you can read the book?"
                            // Pen Ink Blue glow
                            glowColor="rgba(70, 130, 255, 0.2)"
                        />
                    </Grid.Col>

                    {/* Right Column: Team Scout */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <FighterCard 
                            emoji="🎬"
                            title="The Scout"
                            pitch="Respectfully, who has time to read a 50-page wall of text? The human brain is wired for visuals. I find you world-class teachers who can explain a concept in 10 minutes that would take you an hour to decode from a dry PDF. It's about working smarter, not harder. Why read the boring manual when you can get a masterclass?"
                            // Highlighter Yellow glow
                            glowColor="rgba(255, 230, 70, 0.2)"
                        />
                    </Grid.Col>
                </Grid>

                <Text ta="center" fst="italic" c="dimmed" mt={50} size="lg">
                    *Whoever wins, you get smarter.*
                </Text>
            </Stack>
        </Container>
    );
}