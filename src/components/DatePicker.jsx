// src/components/DatePicker.jsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Group, ActionIcon, Text, Box, Stack } from "@mantine/core";
import {
  eachDayOfInterval,
  addDays,
  subDays,
  format,
  isSameDay,
  differenceInCalendarDays,
} from "date-fns";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { motion, useAnimation } from "framer-motion";
import classes from "./DatePicker.module.css";

export function DatePicker({ selectedDate, setSelectedDate, examDates = [] }) {
  const [displayStartDate, setDisplayStartDate] = useState(
    subDays(selectedDate, 3)
  ); // the currently rendered window's start date (7 days window)
  const [direction, setDirection] = useState(0);
  const slideControls = useAnimation();
  const slideRef = useRef(null);
  const [colWidth, setColWidth] = useState(0);

  // compute the 7-day window from displayStartDate (this is the DOM content)
  const week = eachDayOfInterval({
    start: displayStartDate,
    end: addDays(displayStartDate, 6),
  });

  // measure column width (recompute on resize)
  useEffect(() => {
    const measure = () => {
      if (!slideRef.current) return;
      const width = slideRef.current.offsetWidth;
      setColWidth(width / 7);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (slideRef.current) ro.observe(slideRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // when selectedDate prop changes, animate the slide just enough to put it center
  useEffect(() => {
    // center date of the currently displayed window:
    const currentCenter = addDays(displayStartDate, 3);
    const diff = differenceInCalendarDays(selectedDate, currentCenter); // positive if selectedDate is to the right (future)
    if (diff === 0 || colWidth === 0) {
      // just ensure highlight exists; no slide needed
      return;
    }

    // compute required translation: we want to move the week by -diff * colWidth
    const translateX = -diff * colWidth;

    // animate the translation, then update the displayed window to be recentered and reset transform
    (async () => {
      setDirection(Math.sign(diff));
      await slideControls.start({
        x: translateX,
        transition: { type: "spring", stiffness: 350, damping: 32 },
      });

      // after animation, recenter the window so selectedDate is the center (no animation)
      const nextStart = subDays(selectedDate, 3);
      setDisplayStartDate(nextStart);

      // snap back the transform to zero instantly (content updated to be centered)
      slideControls.set({ x: 0 });
      setDirection(0);
    })();
  }, [selectedDate, colWidth, displayStartDate, slideControls]);

  const handlePrev = useCallback(() => {
    setSelectedDate((prev) => subDays(prev, 1));
  }, [setSelectedDate]);

  const handleNext = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, [setSelectedDate]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext]);

  const getOpacityForIndex = (index) => {
    const centerIndex = 3;
    const distance = Math.abs(index - centerIndex);
    return Math.max(1 - distance * 0.18, 0.28);
  };

  return (
    <Box mb="xl" className={classes.wrapper}>
      <Text ta="center" ff="Lexend, sans-serif" fw={600} size="xl" mb="md">
        {format(selectedDate, "MMMM yyyy")}
      </Text>

      <Group justify="center" align="center" gap="xs" wrap="nowrap">
        <ActionIcon
          variant="transparent"
          c="dimmed"
          onClick={handlePrev}
          aria-label="Previous day"
        >
          <IconChevronLeft size={24} />
        </ActionIcon>

        <div className={classes.viewport} role="group" aria-label="Date picker">
          {/* motion.div controlled by slideControls — we animate x to slide by N columns, then recenter */}
          <motion.div
            ref={slideRef}
            className={classes.slide}
            animate={slideControls}
            style={{ x: 0 }}
          >
            {week.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isExamDay = examDates.some((d) => isSameDay(new Date(d), day));

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`${classes.day} ${isSelected ? classes.selected : ""}`}
                  aria-pressed={isSelected}
                  aria-label={format(day, "eeee, do MMMM yyyy")}
                  style={{ opacity: isSelected ? 1 : getOpacityForIndex(idx) }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="dateHighlight"
                      className={classes.highlight}
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      aria-hidden
                    />
                  )}

                  <Stack gap={0} align="center" className={classes.dayContent}>
                    <Text className={classes.weekday}>{format(day, "E")}</Text>
                    <Text className={classes.date}>{format(day, "d")}</Text>
                  </Stack>

                  {isExamDay && <span className={classes.examDot} aria-hidden />}
                </button>
              );
            })}
          </motion.div>
        </div>

        <ActionIcon
          variant="transparent"
          c="dimmed"
          onClick={handleNext}
          aria-label="Next day"
        >
          <IconChevronRight size={24} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
