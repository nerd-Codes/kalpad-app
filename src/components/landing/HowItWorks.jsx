// src/components/landing/HowItWorks.jsx
"use client";
import { Container, Title, Text, Paper, ThemeIcon, Flex } from '@mantine/core';
import { IconUpload, IconCpu, IconSchool } from '@tabler/icons-react';
import { HoverCard } from './HoverCard';

export function HowItWorks() {
  return (
    <Container size="lg" py="xl" my="xl">
      <Title order={2} ta="center">How It Works</Title>
      <Text c="dimmed" ta="center" mt="sm">Three simple steps to academic clarity.</Text>
      
      <Flex
        mt="xl"
        gap="xl"
        justify="center"
        align="stretch" // This tells the direct children (HoverCard) to be the same height
        direction={{ base: 'column', sm: 'row' }}
      >
        {/* Card 1 */}
        <HoverCard style={{ flex: 1 }}>
          <Paper p="xl" radius="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', height: '29vh' }}>
            <ThemeIcon size={60} radius="lg" variant="gradient" gradient={{ from: 'brandPurple', to: 'indigo' }}>
              <IconUpload size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700} mt="lg">1. Upload Materials</Text>
            <Text c="dimmed" mt="sm">Drop in your syllabus and any study PDFs. The more you give our AI, the smarter your plan will be.</Text>
          </Paper>
        </HoverCard>

        {/* Card 2 */}
        <HoverCard style={{ flex: 1 }}>
          <Paper p="xl" radius="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', height: '29vh' }}>
            <ThemeIcon size={60} radius="lg" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
              <IconCpu size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700} mt="lg">2. AI Analysis</Text>
            <Text c="dimmed" mt="sm">KalPad reads, connects, and prioritizes everything, creating a personalized, high-ROI study schedule.</Text>
          </Paper>
        </HoverCard>
        
        {/* Card 3 */}
        <HoverCard style={{ flex: 1 }}>
          <Paper p="xl" radius="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', height: '29vh' }}>
            <ThemeIcon size={60} radius="lg" variant="gradient" gradient={{ from: 'cyan', to: 'brandGreen' }}>
              <IconSchool size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700} mt="lg">3. Start Learning</Text>
            <Text c="dimmed" mt="sm">Follow your daily plan, check off topics, and generate AI-powered notes to conquer every subject.</Text>
          </Paper>
        </HoverCard>
      </Flex>
    </Container>
  );
}