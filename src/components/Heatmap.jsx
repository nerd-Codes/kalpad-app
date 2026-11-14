// src/components/Heatmap.jsx
"use client";

import { Group, Tooltip, Box } from '@mantine/core';
import { eachDayOfInterval, subDays, format } from 'date-fns';

export function Heatmap({ data = {} }) {
  const today = new Date();
  // Display 77 days (11 columns x 7 days)
  const days = eachDayOfInterval({ start: subDays(today, 76), end: today });

  const getColor = (count) => {
    if (count === 0) return 'var(--apple-gray-2, #232325)';
    if (count <= 2) return 'rgba(217, 119, 6, 0.25)';
    if (count <= 4) return 'rgba(217, 119, 6, 0.50)';
    if (count <= 6) return 'rgba(217, 119, 6, 0.75)';
    return 'var(--accent-amber, #D97706)';
  };

  return (
    <Group 
        gap={3} 
        style={{ 
            display: 'grid', 
            gridTemplateRows: 'repeat(7, 1fr)', 
            gridAutoFlow: 'column',
            justifyContent: 'flex-start',
            width: 'fit-content'
        }}
    >
      {days.map((day, index) => {
        const dateString = format(day, 'yyyy-MM-dd');
        const count = data[dateString] || 0;
        
        return (
          <Tooltip 
            key={index} 
            label={count > 0 ? `${count} ${count === 1 ? 'topic' : 'topics'} on ${format(day, 'MMM d')}` : `No topics on ${format(day, 'MMM d')}`} 
            withArrow
            position="top"
            styles={{
              tooltip: {
                backgroundColor: 'var(--apple-gray-2, #232325)',
                color: 'var(--apple-text-primary, #ededed)',
                border: '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))',
                fontSize: 11,
                borderRadius: 6
              }
            }}
          >
            <Box
              w={13}
              h={13}
              bg={getColor(count)}
              style={{ 
                borderRadius: 2,
                transition: 'background-color 150ms ease',
                outline: count > 0 ? '1px solid rgba(217, 119, 6, 0.2)' : 'none'
              }}
            />
          </Tooltip>
        );
      })}
    </Group>
  );
}
