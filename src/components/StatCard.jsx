// src/components/StatCard.jsx
"use client";

import { Text, Stack, Title } from '@mantine/core';
import { GlassCard } from './GlassCard';

export function StatCard({ emoji, title, value, color }) {
  return (
    <GlassCard 
      p="lg"
      style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        height: '100%',
      }}
    >
      {/* --- FIX #1: Emoji moved further into the corner --- */}
      <Text
        style={{
          position: 'absolute',
          top: '-15px',
          right: '-15px',
          fontSize: '5rem', // Slightly larger to compensate for clipping
          opacity: 0.15,
          zIndex: 1,
          userSelect: 'none',
        }}
      >
        {emoji}
      </Text>
      
      {/* --- FIX #2: The inner Stack now justifies to the end, placing the text block at the bottom --- */}
      <Stack 
        gap={0} // Tight gap between the value and title
        style={{ 
          position: 'relative', 
          zIndex: 2, 
          height: '100%' 
        }} 
        justify="flex-end"
      >
        {/* --- FIX #2: The order is now reversed --- */}
        <Title order={2} ff="Lexend, sans-serif" fz="2.75rem" c={color || 'white'}>
          {value}
        </Title>
        <Text size="sm" c="dimmed" fw={500}> 
          {title}
        </Text>
      </Stack>
    </GlassCard>
  );
}