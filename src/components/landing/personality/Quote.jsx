// src/components/landing/personality/Quote.jsx
"use client";

import { Container, Text, Stack, Box, Title } from '@mantine/core';

export function Quote() {
    return (
        <Box 
            // --- FIX #1: Increased vertical space for more cinematic feel ---
            py={{ base: 100, md: 160 }}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
            }}
        >
            <Text
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    transform: 'translateY(-50%)',
                    fontSize: 'clamp(20rem, 40vw, 40rem)',
                    color: 'rgba(255, 255, 255, 0.03)',
                    userSelect: 'none',
                    zIndex: 0,
                    lineHeight: 1,
                }}
                ff="Lexend, sans-serif"
            >
                “
            </Text>

            <Container size="md" style={{ position: 'relative', zIndex: 1 }}>
                <Stack align="center" ta="center" gap="xl">
                    {/* --- FIX #2 & #3: Massive font scale with refined hierarchy --- */}
                    <Title
                        order={1} // Use a Title component for semantic importance
                        ff="Lexend, sans-serif"
                        fz={{ base: '2.5rem', sm: '4rem', lg: '5rem' }} // Increased font size
                        fw={800}
                        lts={-1.5}
                        lh={1.1}
                    >
                        "The greatest minds didn't waste their cognitive budget on menial tasks. They built systems to crush them."
                    </Title>
                    <Text size="xl" c="dimmed" fw={500} style={{ alignSelf: 'flex-end' }}>
                        — Probably a Topper Who Had Better Things to Do.
                    </Text>
                </Stack>
            </Container>
        </Box>
    );
}