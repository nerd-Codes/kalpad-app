// src/components/StatCard.jsx
"use client";
import { Paper, Text } from '@mantine/core';
import { GlassCard } from './GlassCard'; // We'll reuse our glowing border card

export function StatCard({ icon: Icon, title, value, color }) {
  return (
    <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
      {/* The Big Faded Icon in the Background */}
      <Icon
        size={100}
        color={color || 'gray'}
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          opacity: 0.1,
          zIndex: 1,
        }}
        strokeWidth={1.5}
      />
      
      {/* The actual content, with a higher z-index to appear on top */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Text size="sm" c="dimmed">{title}</Text>
        <Text component="div" fw={700} fz="2.25rem" c={color || 'white'} mt="xs">
          {value}
        </Text>
      </div>
    </GlassCard>
  );
}