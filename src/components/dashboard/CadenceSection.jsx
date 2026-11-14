// src/components/dashboard/CadenceSection.jsx
"use client";

import { useMemo } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import classes from './Dashboard.module.css';

function CompletionGrid({ completions = {} }) {
  const weeks = useMemo(() => {
    const today = new Date();
    const first = subDays(today, 83);
    return Array.from({ length: 12 }, (_, weekIdx) =>
      Array.from({ length: 7 }, (_, dayIdx) => {
        const d = addDays(first, weekIdx * 7 + dayIdx);
        const iso = format(d, 'yyyy-MM-dd');
        const count = completions[iso] || 0;
        return {
          iso,
          count,
          label: `${count} completed on ${format(d, 'd MMM')}`,
        };
      })
    );
  }, [completions]);

  const getCellColor = (count) => {
    if (count >= 4) return 'var(--kp-success-ink)';
    if (count >= 2) return 'var(--kp-mint)';
    if (count === 1) return 'var(--kp-accent-ink)';
    return 'var(--kp-border-strong)';
  };

  return (
    <div className={classes.completionWeeks} role="img" aria-label="12-week study completion grid">
      {weeks.map((week, wIdx) => (
        <div key={wIdx} className={classes.completionRow}>
          {week.map((cell) => (
            <div
              key={cell.iso}
              title={cell.label}
              aria-label={cell.label}
              className={classes.completionCell}
              style={{
                backgroundColor: getCellColor(cell.count),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CadenceSection({ stats }) {
  const statBlocks = [
    {
      value: String(stats.currentStreak || 0),
      label: 'day rhythm',
      bg: 'var(--kp-apricot)',
    },
    {
      value: String(stats.weeklyCompleted || 0),
      label: 'steps this week',
      bg: 'var(--kp-mint)',
    },
    {
      value: String(stats.plansCreated || 0),
      label: 'plans created',
      bg: 'var(--kp-periwinkle)',
    },
  ];

  const hasCompletions = Object.keys(stats.completions || {}).length > 0;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-kp-sans)',
          fontSize: '20px',
          lineHeight: '26px',
          fontWeight: 700,
          color: 'var(--kp-ink)',
        }}
      >
        Progress has its own rhythm.
      </h2>

      <div className={classes.statGrid}>
        {statBlocks.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.24,
              delay: idx * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -2 }}
            style={{
              borderRadius: '20px',
              backgroundColor: stat.bg,
              border: '1px solid var(--kp-border)',
              padding: '15px 12px',
              transition: 'box-shadow 180ms ease',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                marginTop: '5px',
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '10px',
                lineHeight: '13px',
                color: 'var(--kp-secondary)',
              }}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {hasCompletions && (
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'var(--kp-raised)',
            border: '1px solid var(--kp-border)',
            padding: '17px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              A little, often.
            </h3>
            <span
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.35px',
                color: 'var(--kp-secondary)',
              }}
            >
              LAST 12 WEEKS
            </span>
          </div>

          <CompletionGrid completions={stats.completions} />
        </div>
      )}
    </section>
  );
}
