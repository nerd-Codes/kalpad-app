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
    const latestUpdateText = "Our AI just got a personality transplant. It now runs on a **'Brutal Honesty First'** constitution. Tell it you can study 12 hours a day, and it will gently tell you to get some sleep and build a realistic plan that won't lead to burnout. It now gives you a **daily 'Mission Briefing'** with difficulty ratings, so you're never flying blind. Most importantly, we built a zero-tolerance **'Integrity Filter'**— a layer of code that guarantees with 100% certainty that the AI's words and its actions are one. It keeps its promises.";
    
    // --- MODIFICATION: Setting the stage for the Notes V2 overhaul ---
    const upNextText = "**The Professor is getting a promotion.** We're doing a full overhaul of the Notes Generation engine, with a beautiful full-screen experience and properly formatted PDF exports. After that, the full **'Doodle in the Margin'** redesign will kill the corporate vibe for good. And yes, the mobile app is still being forged in the fires of Mount Doom.";

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