// src/components/CalendarStrip.jsx
"use client";

import { Group, Text, Box, ActionIcon, Tooltip } from "@mantine/core";
import { addDays, subDays, format, isSameDay } from "date-fns";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Interactive } from "./Interactive";

export function CalendarStrip({ selectedDate, setSelectedDate, examDates = [] }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const daysToShow = isMobile ? 5 : 7;
  const offset = Math.floor(daysToShow / 2);
  const windowStart = subDays(selectedDate, offset); 
  const days = Array.from({ length: daysToShow }).map((_, i) => addDays(windowStart, i));

  return (
    <Box>
        <Group justify="space-between" mb="sm" px={4}>
            <Group gap="xs" align="center">
                <Text fw={500} size="sm" c="var(--apple-text-primary, #ededed)">
                    {format(selectedDate, "MMMM yyyy")}
                </Text>
                <Text ff="monospace" size="11px" c="dimmed">
                    [WEEK VIEW]
                </Text>
            </Group>
            <Group gap={4}>
                <ActionIcon 
                    variant="subtle" 
                    color="gray" 
                    size={28}
                    radius={6}
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                    aria-label="Previous day"
                >
                    <IconChevronLeft size={16} stroke={1.5} />
                </ActionIcon>
                <ActionIcon 
                    variant="subtle" 
                    color="gray" 
                    size={28}
                    radius={6}
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    aria-label="Next day"
                >
                    <IconChevronRight size={16} stroke={1.5} />
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
                                padding: '10px 0',
                                borderRadius: 8,
                                backgroundColor: isSelected 
                                    ? 'var(--apple-gray-2, #232325)' 
                                    : 'rgba(255, 255, 255, 0.02)',
                                border: isSelected 
                                    ? '1px solid rgba(217, 119, 6, 0.5)' 
                                    : '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))',
                                transition: 'all 150ms cubic-bezier(0.22, 1, 0.36, 1)',
                                cursor: 'pointer'
                            }}
                        >
                            <Text size="11px" fw={400} c={isSelected ? 'var(--apple-text-primary, #ededed)' : 'dimmed'}>
                                {format(day, "EEE")}
                            </Text>
                            <Text 
                                size="sm" 
                                fw={500} 
                                mt={2}
                                style={{ 
                                    lineHeight: 1.2, 
                                    fontVariantNumeric: 'tabular-nums',
                                    color: isSelected ? 'var(--accent-amber, #D97706)' : 'var(--apple-text-primary, #ededed)' 
                                }}
                            >
                                {format(day, "d")}
                            </Text>
                            
                            {/* Selected dot indicator */}
                            {isSelected && (
                                <Box 
                                    style={{
                                        position: 'absolute', 
                                        bottom: 4,
                                        width: 4, 
                                        height: 4, 
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--accent-amber, #D97706)'
                                    }} 
                                />
                            )}

                            {/* Today ring indicator if not selected */}
                            {isToday && !isSelected && (
                                <Box 
                                    style={{
                                        position: 'absolute', 
                                        bottom: 4,
                                        width: 4, 
                                        height: 4, 
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--apple-text-muted, #85858b)'
                                    }} 
                                />
                            )}

                            {/* Exam alert dot */}
                            {hasExam && (
                                <Tooltip label="Exam Day" withArrow position="bottom" styles={{ tooltip: { fontSize: 10 } }}>
                                    <Box 
                                        style={{
                                            position: 'absolute', 
                                            top: 4, 
                                            right: 4,
                                            width: 5, 
                                            height: 5, 
                                            borderRadius: '50%',
                                            backgroundColor: '#e5484d'
                                        }} 
                                    />
                                </Tooltip>
                            )}
                        </Box>
                    </Interactive>
                );
            })}
        </Group>
    </Box>
  );
}
