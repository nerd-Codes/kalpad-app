// src/components/landing/personality/Devlog.jsx
"use client";

import { Container, Title, Text, Stack, Divider } from '@mantine/core';
import ReactMarkdown from 'react-markdown';

// The markdown component remains the same
const markdownComponents = {
    strong: ({ children }) => <Text component="span" fw={700} c="white">{children}</Text>,
};

export function Devlog() {
    // --- MODIFICATION: The new story of the "Mentor Engine" ---
    const latestUpdateText = "Our AI mentor just evolved. It's not one-size-fits-all anymore; it's a squad of specialists. Choose your weapon: the **'Balanced' Strategist** for a ruthless, high-ROI plan, or the **'Hardcore' Drill Sergeant** for a relentless 100% coverage march. And we gave the entire crew a new secret weapon: the **AI Doubt Solver.** Highlight any sentence in your notes, and our new Groq-powered tutor will give you a brutally honest explanation in a fraction of a second. The genius just got faster.";
    // --- MODIFICATION: Setting the stage for the Notes V2 overhaul ---
    const upNextText = "The engine is built. Now, we're putting it in your pocket. The native **Android App** is being forged in the fires of Mount Doom, designed from the ground up to be the Mission Control for your entire academic life. And to make sure you're battle-ready from day one, we're designing a new **'First Mission' onboarding experience.** No boring tooltips. Just a fast, interactive tutorial that helps you launch your first plan and unleash the full power of your new AI co-founder.";
    return (
        <div style={{
            position: 'relative',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
        }}>
            <Container size="md" py={{ base: 80, md: 120 }}>
                <Stack align="center" ta="center">
                    <Title order={2} ff="Lexend, sans-serif" fz={{ base: '2rem', sm: '2.5rem' }}>
                        A feature so new, it still has that "new bug" smell.
                    </Title>
                    
                    <Stack mt={60} gap={50} w="100%">
                        {/* --- LATEST UPDATE SECTION --- */}
                        <Stack align="center" ta="center">
                            <Text fz={60}>🧠</Text>
                            {/* --- MODIFICATION: New headline for the update --- */}
                            <Title order={3} ff="Lexend, sans-serif">Now Live: The Mentor Engine Upgrade</Title>
                            <Text c="dimmed" size="lg" lh={1.7}>
                                <ReactMarkdown components={markdownComponents}>
                                    {latestUpdateText}
                                </ReactMarkdown>
                            </Text>
                        </Stack>

                        <Divider
                            my="xl"
                            variant="dashed"
                            labelPosition="center"
                            label={
                                <Text fz={40}>👇</Text>
                            }
                        />

                        {/* --- UP NEXT SECTION --- */}
                        <Stack align="center" ta="center">
                            <Text fz={60}>🛠️</Text>
                            <Title order={3} ff="Lexend, sans-serif">Being Forged in the Fires of Mount Doom</Title>
                             <Text c="dimmed" size="lg" lh={1.7}>
                                <ReactMarkdown components={markdownComponents}>
                                    {upNextText}
                                </ReactMarkdown>
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Container>
        </div>
    );
}