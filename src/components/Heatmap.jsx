// src/components/Heatmap.jsx
"use client";

import { Group, Tooltip, Box } from '@mantine/core';
import { eachDayOfInterval, subDays, format } from 'date-fns';

export function Heatmap({ data }) {
  const today = new Date();
  // --- FIX: Display 77 days (11 columns) instead of 90 ---
  const days = eachDayOfInterval({ start: subDays(today, 76), end: today });

  const getColor = (count) => {
    if (count === 0) return 'var(--mantine-color-dark-6)';
    if (count <= 2) return 'var(--mantine-color-brandGreen-8)';
    if (count <= 4) return 'var(--mantine-color-brandGreen-6)';
    if (count <= 6) return 'var(--mantine-color-brandGreen-4)';
    return 'var(--mantine-color-brandGreen-2)';
  };

  return (
    // --- FIX: The title is removed, and the root is just the Group ---
    <Group 
        gap={3} 
        style={{ 
            display: 'grid', 
            gridTemplateRows: 'repeat(7, 1fr)', 
            gridAutoFlow: 'column',
            justifyContent: 'center' // Ensures it looks centered if space allows
        }}
    >
      {days.map((day, index) => {
        const dateString = format(day, 'yyyy-MM-dd');
        const count = data[dateString] || 0;
        
        return (
          <Tooltip 
            key={index} 
            label={count > 0 ? `${count} topics on ${format(day, 'MMM d')}` : `No activity`} 
            withArrow
            position="top"
          >
            <Box
              w={14}
              h={14}
              bg={getColor(count)}
              style={{ borderRadius: '2px' }}
            />
          </Tooltip>
        );
      })}
    </Group>
  );
}