// src/components/DatePicker.jsx
"use client";
import { Group, ActionIcon, Text, Box } from '@mantine/core'; // Using ActionIcon for a cleaner look
import { eachDayOfInterval, addDays, subDays, format, isSameDay } from 'date-fns';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export function DatePicker({ selectedDate, setSelectedDate, examDates = [] }) {
  // Show a 7-day week centered on the selected date
  const week = eachDayOfInterval({
    start: subDays(selectedDate, 3),
    end: addDays(selectedDate, 3),
  });

  return (
    <Box mb="xl">
      {/* --- Month and Year Header --- */}
      <Text ta="center" fw={700} size="lg" mb="md">{format(selectedDate, "MMMM yyyy")}</Text>

      {/* --- Day Scroller --- */}
      <Group justify="center" align="center" gap="xs">
        <ActionIcon variant="transparent" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
          <IconChevronLeft size={20} />
        </ActionIcon>

        {week.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isExamDay = examDates.some(examDate => isSameDay(new Date(examDate), day));

          return (
            <Box
              key={day.toString()}
              onClick={() => setSelectedDate(day)}
              style={{
                borderRadius: 'var(--mantine-radius-lg)',
                padding: '8px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--mantine-color-brandPurple-6)' : 'transparent',
                border: isExamDay ? `2px solid var(--mantine-color-red-6)` : 'none',
                color: isSelected ? 'white' : 'inherit',
                transition: 'background-color 0.2s ease',
              }}
            >
              {/* --- FIX: Weekday above Date --- */}
              <Text size="xs" c={isSelected ? 'white' : 'dimmed'}>{format(day, 'E')}</Text>
              <Text size="lg" fw={700}>{format(day, 'd')}</Text>
            </Box>
          );
        })}

        <ActionIcon variant="transparent" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>
    </Box>
  );
}