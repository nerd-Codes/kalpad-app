// src/components/landing/Features.jsx
"use client";
import { Container, SimpleGrid, Paper, Text } from '@mantine/core';
// --- FIX: Corrected icon imports ---
import { IconBrain, IconBolt, IconClock, IconTrendingUp } from '@tabler/icons-react';
import { HoverCard } from './HoverCard'

const features = [
  {
    icon: IconBrain,
    title: 'AI-Powered Analysis',
    description: 'Feeling overwhelmed? Our AI reads your syllabus and study PDFs to find the high-yield topics, so you don’t have to.',
  },
  {
    icon: IconBolt, // <-- FIX: Was Zap
    title: 'Smart Planning',
    description: 'Procrastinating on making a plan? KalPad builds a dynamic schedule in seconds that adapts to your pace and exam dates.',
  },
  {
    icon: IconClock, // <-- FIX: Was Clock
    title: 'Beat Procrastination',
    description: 'The "I\'ll do it tomorrow" excuse ends now. Get actionable, daily tasks that make it easy to start and stay consistent.',
  },
  {
    icon: IconTrendingUp, // <-- FIX: Was TrendingUp
    title: 'Maximize Your ROI',
    description: 'Don\'t waste time on low-impact topics. We focus your energy on what truly matters for your exams.',
  },
];

export function Features() {
  return (
    <Container size="lg" py="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
        {features.map((feature) => {

         
          const Icon = feature.icon;
          return (
             <HoverCard key={feature.title}>
            <Paper
              key={feature.title}
              p="md" radius="lg"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Icon size={36} color="var(--mantine-color-brandPurple-4)" />
              <Text fw={700} mt="md">{feature.title}</Text>
              <Text c="dimmed" size="sm" mt="xs">{feature.description}</Text>
            </Paper>
            </HoverCard>
          );
          
        })}
      </SimpleGrid>
    </Container>
  );
}