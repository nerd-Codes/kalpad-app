// src/components/auth/AuthIllustration.jsx
"use client";
import { Text, Group, Progress } from '@mantine/core';
import { IconFlame, IconTarget, IconKey, IconCheck, IconNotebook } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../GlassCard';

const FloatCard = ({ children, delay = 0, style = {} }) => (
    <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
        style={style}
    >
        <GlassCard withBorder={false} shadow="xl" p="md">
            {children}
        </GlassCard>
    </motion.div>
);

export function AuthIllustration() {
  const backgroundPattern = {
    backgroundImage: `background-color: #DFDBE5;
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23dda900' fill-opacity='0.4'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
};

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* The new background pattern */}
      <div style={{ position: 'absolute', inset: 0, ...backgroundPattern }} />
      
      {/* The floating cards are now more numerous and better positioned */}
      <FloatCard delay={0.5} style={{ position: 'absolute', top: '15%', left: '10%', zIndex: 2, width: '200px' }}>
          <Group>
              <IconFlame size={24} color="var(--mantine-color-orange-5)" />
              <div>
                  <Text size="xs" c="dimmed">Daily Streak</Text>
                  <Text fw={700} size="xl">5 Days</Text>
              </div>
          </Group>
      </FloatCard>

      <FloatCard delay={1.2} style={{ position: 'absolute', top: '35%', right: '5%', zIndex: 3, width: '180px' }}>
          <Text size="xs" c="dimmed">Plan Progress</Text>
          <Progress value={75} color="brandGreen" mt={4} />
          <Group justify="space-between" mt={2}>
              <Text size="xs">75%</Text>
              <IconTarget size={16} />
          </Group>
      </FloatCard>

      <FloatCard delay={0} style={{ position: 'absolute', bottom: '20%', left: '25%', zIndex: 1, width: '250px' }}>
          <Group wrap="nowrap">
              <IconNotebook size={32} color="var(--mantine-color-grape-4)" />
              <div>
                  <Text fw={500}>AI-Powered Notes</Text>
                  <Text size="xs" c="dimmed">Your personal textbook, generated on demand.</Text>
              </div>
          </Group>
      </FloatCard>

       <FloatCard delay={1.5} style={{ position: 'absolute', bottom: '50%', left: '45%', zIndex: 2, width: '190px' }}>
          <Group wrap="nowrap">
              <IconCheck size={24} color="var(--mantine-color-brandGreen-5)" />
              <div>
                  <Text fw={500}>8/10 Correct</Text>
                  <Text size="xs" c="dimmed">Recent Quiz Score</Text>
              </div>
          </Group>
      </FloatCard>
    </div>
  );
}