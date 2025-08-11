// src/components/landing/personality/RealQuestion.jsx
"use client";

import { Container, Title, Text, Stack, Box } from '@mantine/core';
import { ShimmerButton } from '../ShimmerButton';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export function RealQuestion() {
    const handleGetStarted = useAuthRedirect();
    
    return (
        <Box
             style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
             }}
        >
            <Container size="md" py={{ base: 100, md: 160 }}>
                <Stack align="center" ta="center" gap="xl">
                    <Title
                        order={1}
                        ff="Lexend, sans-serif"
                        fz={{ base: '3rem', sm: '5rem' }}
                        fw={800}
                        lh={1.1}
                    >
                        So, what are you going to do with all the brainpower you get back?
                    </Title>
                    <Text size="xl" c="dimmed" mt="md" maw={650} mx="auto">
                        Seriously. Think about it. This isn't a magic wand... So go work on that side-hustle. Go build that hackathon project. Go take a nap. We'll stand guard over your syllabus.
                    </Text>
                    <ShimmerButton
                        size="xl"
                        mt={40}
                        onClick={handleGetStarted}
                        radius="xl"
                    >
                        Launch My Escape Plan
                    </ShimmerButton>
                </Stack>
            </Container>
        </Box>
    );
}