// src/components/dashboard/WeekRibbon.jsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { LayoutGroup, motion } from 'framer-motion';
import classes from './Dashboard.module.css';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekRibbon({
  selectedDate,
  scheduledDates = new Set(),
  onOpenDatePicker,
  onPick,
}) {
  const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(selectedDate));

  useEffect(() => {
    setViewedMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const monthDays = useMemo(() => {
    const mStart = startOfMonth(viewedMonth);
    const mEnd = endOfMonth(viewedMonth);
    const gStart = startOfWeek(mStart, { weekStartsOn: 1 });
    const gEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gStart, end: gEnd });
  }, [viewedMonth]);

  const today = useMemo(() => new Date(), []);
  const showTodayShortcut = !isSameMonth(viewedMonth, today) || !isSameDay(selectedDate, today);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const rangeLabel = sameMonth
    ? `${format(weekStart, 'd')}–${format(weekEnd, 'd MMM')}`
    : `${format(weekStart, 'd MMM')}–${format(weekEnd, 'd MMM')}`;

  return (
    <section aria-label="Study schedule calendar">
      {/* Compact 7-day strip on mobile/tablet (< 1024px) */}
      <div className={classes.weekStripOnly}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              lineHeight: 1.35,
            }}
          >
            {format(selectedDate, 'MMMM yyyy')}
          </h2>

          <button
            type="button"
            onClick={onOpenDatePicker}
            aria-label={`Choose week, current range ${rangeLabel}`}
            style={{
              appearance: 'none',
              border: 'none',
              backgroundColor: 'transparent',
              padding: '6px 10px',
              minHeight: '40px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: 'var(--kp-ink)',
            }}
          >
            <IconCalendar size={17} stroke={1.8} />
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              {rangeLabel}
            </span>
          </button>
        </div>

        <LayoutGroup id="kp-week-ribbon">
          <div
            role="tablist"
            aria-label="Study week"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '4px',
            }}
          >
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              const iso = format(day, 'yyyy-MM-dd');
              const hasPlan = scheduledDates.has(iso);

              return (
                <button
                  key={iso}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={format(day, 'EEEE, d MMMM')}
                  onClick={() => onPick(day)}
                  className={`${classes.dayCell} ${active ? classes.dayCellActive : classes.dayCellInactive}`}
                >
                  {active && (
                    <motion.div
                      layoutId="kp-week-pill"
                      className={classes.dayCellPill}
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    />
                  )}
                  <div className={classes.dayCellContent}>
                    <span
                      style={{
                        paddingTop: '12px',
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: active ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                        opacity: active ? 0.78 : 1,
                      }}
                    >
                      {format(day, 'EEE').slice(0, 1)}
                    </span>

                    <span
                      style={{
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '17px',
                        fontWeight: active ? 700 : 500,
                        color: active ? 'var(--kp-on-primary)' : 'var(--kp-ink)',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.2,
                      }}
                    >
                      {format(day, 'd')}
                    </span>

                    <span
                      style={{
                        marginBottom: '11px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '20px',
                        backgroundColor: hasPlan
                          ? active
                            ? 'var(--kp-active-dot)'
                            : 'var(--kp-orange)'
                          : 'transparent',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Full Month Calendar on Desktop (>= 1024px) */}
      <div className={classes.monthCalendarWrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
                lineHeight: 1.3,
              }}
            >
              {format(viewedMonth, 'MMMM yyyy')}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showTodayShortcut && (
              <button
                type="button"
                className={classes.monthTodayBtn}
                onClick={() => {
                  const now = new Date();
                  setViewedMonth(startOfMonth(now));
                  onPick(now);
                }}
              >
                Today
              </button>
            )}
            <button
              type="button"
              className={classes.monthNavBtn}
              aria-label="Previous month"
              onClick={() => setViewedMonth((m) => subMonths(m, 1))}
            >
              <IconChevronLeft size={16} stroke={1.9} />
            </button>
            <button
              type="button"
              className={classes.monthNavBtn}
              aria-label="Next month"
              onClick={() => setViewedMonth((m) => addMonths(m, 1))}
            >
              <IconChevronRight size={16} stroke={1.9} />
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '4px',
          }}
        >
          {WEEKDAYS_SHORT.map((wd) => (
            <div
              key={wd}
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--kp-secondary)',
                padding: '2px 0',
              }}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Full Month Day Grid */}
        <LayoutGroup id="kp-month-calendar">
          <div
            role="grid"
            aria-label={`${format(viewedMonth, 'MMMM yyyy')} calendar`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '4px',
            }}
          >
            {monthDays.map((day) => {
              const inMonth = isSameMonth(day, viewedMonth);
              const selected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const iso = format(day, 'yyyy-MM-dd');
              const hasPlan = scheduledDates.has(iso);

              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={format(day, 'EEEE, d MMMM yyyy')}
                  aria-pressed={selected}
                  onClick={() => {
                    if (!inMonth) setViewedMonth(startOfMonth(day));
                    onPick(day);
                  }}
                  className={`${classes.monthDayCell} ${selected ? classes.monthDaySelected : ''} ${
                    isToday ? classes.monthDayToday : ''
                  }`}
                  style={{ opacity: inMonth ? 1 : 0.38 }}
                >
                  {selected && (
                    <motion.div
                      layoutId="kp-month-pill"
                      className={classes.monthDayPill}
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    />
                  )}
                  <div className={classes.monthDayInner}>
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '13px',
                        fontWeight: selected || isToday ? 700 : 500,
                        fontVariantNumeric: 'tabular-nums',
                        color: selected ? 'var(--kp-on-primary)' : 'var(--kp-ink)',
                        lineHeight: 1.1,
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '999px',
                        backgroundColor: hasPlan
                          ? selected
                            ? 'var(--kp-active-dot)'
                            : 'var(--kp-orange)'
                          : 'transparent',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
