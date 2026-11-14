// src/components/dashboard/DashboardGreeting.jsx
"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { IconFlame } from '@tabler/icons-react';

function getGreetingForHour(hour) {
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 16) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardGreeting({ selectedDate, streak = 0 }) {
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    setGreeting(getGreetingForHour(new Date().getHours()));
  }, []);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const dateLabel = format(selectedDate, 'EEEE · d MMMM');

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '1px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-kp-sans)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--kp-secondary)',
            lineHeight: 1.35,
          }}
        >
          {greeting}
        </span>

        <div style={{ position: 'relative', overflow: 'hidden', minHeight: '27px' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={dateKey}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '20px',
                lineHeight: '27px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
                margin: 0,
              }}
            >
              {dateLabel}
            </motion.h1>
          </AnimatePresence>
        </div>
      </div>

      {streak > 0 && (
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'var(--kp-apricot)',
            border: '1px solid var(--kp-border)',
            padding: '9px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <IconFlame size={16} stroke={1.8} color="var(--kp-accent-ink)" />
          <span
            style={{
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {streak} {streak === 1 ? 'day' : 'days'}
          </span>
        </div>
      )}
    </header>
  );
}
