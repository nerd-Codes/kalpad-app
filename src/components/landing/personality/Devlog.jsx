// src/components/landing/personality/Devlog.jsx
"use client";

import { Container, Title, Text, Stack, Divider } from '@mantine/core';
import ReactMarkdown from 'react-markdown';

// The markdown component remains the same
const markdownComponents = {
    strong: ({ children }) => <Text component="span" fw={700} c="white">{children}</Text>,
};

export function Devlog() {
    const latestUpdateText = "**Latest Update:** The AI Lecture Scout is LIVE! Our AI crew now does your YouTube homework. Also, I had to delete the entire project last week because I broke something important. But like a good Bollywood hero, we are back, stronger and with a better backstory.";
    
    const upNextText = "**Up Next:** A fully integrated chat assistant that knows your plan inside and out. Plus, the full \"Doodle in the Margin\" redesign is coming to kill the corporate vibe for good. And yes, the mobile app is being forged in the fires of Mount Doom. It will be ready when it's ready.";

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
                            <Text fz={60}>🚀</Text>
                            <Title order={3} ff="Lexend, sans-serif">Now Live: The AI Lecture Scout</Title>
                            <Text c="dimmed" size="lg" lh={1.7}>
                                <ReactMarkdown components={markdownComponents}>
                                    {latestUpdateText.replace('**Latest Update:** ', '')}
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
                                    {upNextText.replace('**Up Next:** ', '')}
                                </ReactMarkdown>
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Container>
        </div>
    );
}