// src/components/landing/Footer.jsx
"use client";

import { Container, Group, Anchor, Text, Stack, Title, Divider } from '@mantine/core';

export function Footer() {
  return (
    <footer style={{
        // --- FIX #1: The seamless, dark gradient background ---
        background: 'radial-gradient(ellipse at 50% 100%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
        borderTop: '1px solid var(--mantine-color-dark-5)',
    }}>
      {/* --- FIX #2: Increased scale and spacing --- */}
      <Container size="lg" py={{ base: 'xl', md: '5rem' }}>
        <Stack align="center">
            <Group justify="space-between" w="100%" align="flex-start">
                <Stack gap={0}>
                    {/* --- FIX #4: Typographic reinforcement --- */}
                    <Title order={3} ff="Lexend, sans-serif">KalPad</Title>
                    <Text c="dimmed" size="sm">© {new Date().getFullYear()} KalPad Inc.</Text>
                </Stack>
            </Group>
            
            <Divider my="xl" w="100%" />

            <Text c="dimmed" size="xs" ta="center">
                Built for the ambitious underdog. This isn't a magic wand; it's a weapon.
            </Text>
        </Stack>
      </Container>
    </footer>
  );
}