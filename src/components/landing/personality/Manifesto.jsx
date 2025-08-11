// src/components/landing/personality/Manifesto.jsx
"use client";

import { Container, Title, Text, Stack, Box } from '@mantine/core';

export function Manifesto() {
    return (
        <Box
            style={{
                position: 'relative',
                overflow: 'hidden',
                // This creates the subtle background color
            }}
        >
            {/* --- FIX #2: The subtle, diagonal gradient overlay --- */}
            <Box
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(var(--mantine-color-brandPurple-raw), 0.1) 0%, rgba(var(--mantine-color-brandGreen-raw), 0.05) 100%)',
                    zIndex: 0,
                }}
            />
            
            <Container size="md" py={100} style={{ position: 'relative', zIndex: 1 }}>
                <Stack align="center" ta="center">
                    <Title 
                        order={2} 
                        ff="Lexend, sans-serif" 
                        fz={{ base: '2rem', sm: '2.5rem' }}
                    >
                        First, a reality check. 🤔
                    </Title>
                    
                    {/* --- FIX #1: The copy is now structurally separated into two distinct blocks --- */}
                    <Text c="dimmed" size="lg" maw={750} mt="lg">
                        If you've already got a perfect 10 CGPA system, attend every class, and your notes are a work of art... honestly, this probably isn't for you. I have immense respect for you, but KalPad was born from a different struggle.
                    </Text>

                    {/* --- FIX #3: Typographic hierarchy and spacing are refined --- */}
                    <Text size="xl" maw={750} mt="xl" lh={1.7}>
                        This is for the rest of us. The jugglers, the ambitious 7.5's, the ones building a career and a degree at the same time. This is a tool for the student who knows they can be great, if they could just get the chaos out of the way. 
                        <Text component="span" fw={700} c="white">
                           This isn't a magic wand; it's a weapon.
                        </Text>
                    </Text>
                </Stack>
            </Container>
        </Box>
    );
}