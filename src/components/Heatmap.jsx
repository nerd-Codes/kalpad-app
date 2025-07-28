// src/components/Heatmap.jsx
"use client";
import { Group, Tooltip, Box, Text } from '@mantine/core';
import { eachDayOfInterval, subDays, format } from 'date-fns';

export function Heatmap({ data }) {
  // --- THE FIX: Show a rolling 90-day period ---
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 89), end: today });

  const getColor = (count) => {
    if (count === 0) return 'var(--mantine-color-dark-6)'; // Empty day color
    if (count <= 2) return 'var(--mantine-color-brandGreen-8)';
    if (count <= 4) return 'var(--mantine-color-brandGreen-6)';
    if (count <= 6) return 'var(--mantine-color-brandGreen-4)';
    return 'var(--mantine-color-brandGreen-2)'; // Most active day color
  };

  return (
    <div>
      <Text size="sm" fw={500} mb="sm">Last 90 Days of Activity</Text>
      <Group gap={3} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
        {days.map((day, index) => {
          const dateString = format(day, 'yyyy-MM-dd');
          const count = data[dateString] || 0;
          
          return (
            <Tooltip 
              key={index} 
              label={count > 0 ? `${count} topics on ${format(day, 'MMM d, yyyy')}` : `No activity on ${format(day, 'MMM d, yyyy')}`} 
              withArrow
              position="top"
            >
              <Box
                w={14} // Small, square cell
                h={14} // Small, square cell
                bg={getColor(count)}
                style={{ borderRadius: '2px' }}
              />
            </Tooltip>
          );
        })}
      </Group>
    </div>
  );
}