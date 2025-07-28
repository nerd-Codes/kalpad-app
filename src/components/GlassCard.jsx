// src/components/GlassCard.jsx
"use client";
import { Paper } from '@mantine/core';

export function GlassCard({ children, style, ...props }) {
  const glassStyle = {
    backgroundColor: 'rgba(37, 38, 43, 0.5)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...style, // Allow passing in additional styles
  };

  return (
    <Paper withBorder shadow="md" p="xl" radius="lg" style={glassStyle} {...props}>
      {children}
    </Paper>
  );
}