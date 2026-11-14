// src/components/dashboard/WeekDatePickerDialog.jsx
"use client";

import { useEffect, useState } from 'react';
import {
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
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekDatePickerDialog({
  opened,
  initialDate,
  scheduledDates = new Set(),
  title = 'Choose a date',
  confirmLabel = 'Go to week',
  onDismiss,
  onConfirm,
}) {
  const [cursorMonth, setCursorMonth] = useState(startOfMonth(initialDate || new Date()));
  const [draftDate, setDraftDate] = useState(initialDate || new Date());

  useEffect(() => {
    if (opened) {
      const base = initialDate || new Date();
      setDraftDate(base);
      setCursorMonth(startOfMonth(base));
    }
  }, [opened, initialDate]);

  useEffect(() => {
    if (!opened) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [opened, onDismiss]);

  if (!opened) return null;

  const monthStart = startOfMonth(cursorMonth);
  const monthEnd = endOfMonth(cursorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a date"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        backgroundColor: 'rgba(17, 19, 23, 0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Focused Light Surface in BOTH themes per DESIGN.md */}
      <div
        className="kp-date-picker-light"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '372px',
          backgroundColor: '#F7F3E8',
          color: '#111317',
          borderRadius: '20px',
          border: '1px solid rgba(17, 19, 23, 0.16)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.30)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-kp-sans)',
            fontSize: '20px',
            fontWeight: 700,
            color: '#111317',
          }}
        >
          {title}
        </h2>

        {/* Selected preview + month switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(17, 19, 23, 0.12)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#5A5E6D',
              }}
            >
              {format(draftDate, 'yyyy')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '16px',
                fontWeight: 700,
                color: '#111317',
                marginTop: '2px',
              }}
            >
              {format(cursorMonth, 'MMMM yyyy')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setCursorMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid rgba(17, 19, 23, 0.12)',
                backgroundColor: '#FFFDF7',
                color: '#111317',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IconChevronLeft size={18} stroke={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setCursorMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid rgba(17, 19, 23, 0.12)',
                backgroundColor: '#FFFDF7',
                color: '#111317',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IconChevronRight size={18} stroke={1.8} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '4px',
            }}
          >
            {WEEKDAYS.map((wd, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#5A5E6D',
                  padding: '4px 0',
                }}
              >
                {wd}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '4px',
            }}
          >
            {days.map((day) => {
              const inMonth = isSameMonth(day, cursorMonth);
              const selected = isSameDay(day, draftDate);
              const isCurrentDay = isSameDay(day, today);
              const iso = format(day, 'yyyy-MM-dd');
              const hasTopic = scheduledDates.has(iso);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setDraftDate(day);
                    if (!inMonth) setCursorMonth(startOfMonth(day));
                  }}
                  aria-label={format(day, 'EEEE, d MMMM yyyy')}
                  aria-pressed={selected}
                  style={{
                    position: 'relative',
                    height: '42px',
                    borderRadius: '12px',
                    border: selected
                      ? '1px solid rgba(17, 19, 23, 0.28)'
                      : isCurrentDay
                        ? '1px solid #873600'
                        : '1px solid transparent',
                    backgroundColor: selected ? '#FFF7DC' : 'transparent',
                    color: inMonth ? '#111317' : '#5A5E6D',
                    opacity: inMonth ? 1 : 0.55,
                    fontFamily: 'var(--font-kp-sans)',
                    fontSize: '14px',
                    fontWeight: selected || isCurrentDay ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span>{format(day, 'd')}</span>
                  {hasTopic && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '999px',
                        backgroundColor: '#FF5E00',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            paddingTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={onDismiss}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#5A5E6D',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.(draftDate)}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#FFF7DC',
              color: '#111317',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'inset 0 0 0 1px rgba(17, 19, 23, 0.16)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
