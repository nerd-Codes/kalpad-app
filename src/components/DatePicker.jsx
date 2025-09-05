// src/components/DatePicker.jsx
"use client";

import { useState } from 'react';
import { Group, ActionIcon, Text, Box, Stack } from '@mantine/core';
import { eachDayOfInterval, addDays, subDays, format, isSameDay, isToday as isTodayFns } from 'date-fns';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import classes from './DatePicker.module.css';

export function DatePicker({ selectedDate, setSelectedDate, examDates = [] }) {
  const [direction, setDirection] = useState(0);

  const week = eachDayOfInterval({
    start: subDays(selectedDate, 3),
    end: addDays(selectedDate, 3),
  });

  const handlePrev = () => {
    setDirection(-1);
    setSelectedDate(subDays(selectedDate, 1));
  };
  const handleNext = () => {
    setDirection(1);
    setSelectedDate(addDays(selectedDate, 1));
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <Box mb="xl">
      <Text ta="center" ff="Lexend, sans-serif" fw={600} size="xl" mb="md">
        {format(selectedDate, "MMMM yyyy")}
      </Text>

      <Group justify="center" align="center" gap="xs" wrap="nowrap">
        <ActionIcon variant="transparent" c="dimmed" onClick={handlePrev}>
          <IconChevronLeft size={24} />
        </ActionIcon>
        
        <Box style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={selectedDate.toString()} // Animate when the date changes
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
                    style={{ display: 'flex', width: '100%' }}
                >
                    {week.map((day, index) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isExamDay = examDates.some(examDate => isSameDay(new Date(examDate), day));
                      
                      // Calculate distance from center for opacity
                      const distanceFromCenter = Math.abs(index - 3);
                      const opacity = Math.max(1 - distanceFromCenter * 0.25, 0.2);
                      
                      return (
                        <div
                          key={day.toString()}
                          onClick={() => setSelectedDate(day)}
                          className={`${classes.day} ${isExamDay ? classes.isExamDay : ''}`}
                          style={{ opacity: isSelected ? 1 : opacity }}
                        >
                          {isSelected && (
                            <motion.div
                                layoutId="selectedDayHighlight"
                                className={classes.highlight}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Stack gap={0} align="center">
                              <Text className={classes.weekday}>{format(day, 'E')}</Text>
                              <Text className={classes.date} c={isSelected ? 'white' : 'inherit'}>
                                  {format(day, 'd')}
                              </Text>
                          </Stack>
                        </div>
                      );
                    })}
                </motion.div>
            </AnimatePresence>
        </Box>

        <ActionIcon variant="transparent" c="dimmed" onClick={handleNext}>
          <IconChevronRight size={24} />
        </ActionIcon>
      </Group>
    </Box>
  );
}