// src/components/CalendarStrip.jsx
"use client";

import { Group, Text, Box, ActionIcon } from "@mantine/core";
import { addDays, subDays, format, isSameDay } from "date-fns";
import { useMediaQuery } from "@mantine/hooks"; // Added for responsive check
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import { Interactive } from "./Interactive";

export function CalendarStrip({ selectedDate, setSelectedDate, examDates = [] }) {

  const isMobile = useMediaQuery('(max-width: 768px)');
  const daysToShow = isMobile ? 5 : 7;
  const offset = Math.floor(daysToShow / 2); // Centers the selected date
  // Show 5 days on desktop to fit the column better, or keep 7 but tight
  const windowStart = subDays(selectedDate, offset); 
  const days = Array.from({ length: daysToShow }).map((_, i) => addDays(windowStart, i));

  return (
    <Box>
        <Group justify="space-between" mb="md" px="xs">
            <Text ff="Lexend" fw={600} size="lg">
                {format(selectedDate, "MMMM yyyy")}
            </Text>
            <Group gap={0}>
                <ActionIcon variant="subtle" color="gray" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                    <IconChevronLeft size={18} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="gray" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                    <IconChevronRight size={18} />
                </ActionIcon>
            </Group>
        </Group>

        <Group justify="space-between" gap="xs" grow>
            {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasExam = examDates.some(d => isSameDay(new Date(d), day));

                return (
                    <Interactive key={day.toString()} onClick={() => setSelectedDate(day)} className="flex-1">
                        <Box
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderRadius: '14px',
                                backgroundColor: isSelected ? '#BF5AF2' : 'rgba(255,255,255,0.03)',
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                color: isSelected ? 'white' : 'var(--apple-text-secondary)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <Text size="xs" fw={600} tt="uppercase" style={{ opacity: 0.7 }}>
                                {format(day, "EEE")}
                            </Text>
                            <Text size="lg" fw={700} style={{ lineHeight: 1.2 }}>
                                {format(day, "d")}
                            </Text>
                            
                            {hasExam && (
                                <div style={{
                                    position: 'absolute', bottom: 6,
                                    width: 4, height: 4, borderRadius: '50%',
                                    backgroundColor: isSelected ? 'white' : '#FF3B30'
                                }} />
                            )}
                        </Box>
                    </Interactive>
                );
            })}
        </Group>
    </Box>
  );
}