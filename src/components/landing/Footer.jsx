// src/components/landing/Footer.jsx
"use client";
import { Container, Group, Anchor, Text } from '@mantine/core';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '4rem' }}>
      <Container size="xl" py="xl">
        <Group justify="space-between">
          <div>
            <Text fw={700} size="lg">KalPad</Text>
            <Text c="dimmed" size="sm">© {new Date().getFullYear()} KalPad. Transforming study habits with AI.</Text>
          </div>
          <Group gap="md">
            {/* Replace '#' with actual links later */}
            <Anchor href="#" c="dimmed" size="sm">Privacy Policy</Anchor>
            <Anchor href="#" c="dimmed" size="sm">Terms of Service</Anchor>
            <Anchor href="#" c="dimmed" size="sm">Contact</Anchor>
          </Group>
        </Group>
      </Container>
    </footer>
  );
}