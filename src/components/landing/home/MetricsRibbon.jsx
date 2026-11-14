// src/components/landing/home/MetricsRibbon.jsx
"use client";

import styles from './LandingVibe.module.css';

const METRICS = [
  {
    value: '94%',
    label: 'Syllabus Retention',
    sub: 'Active recall vs passive video lectures',
  },
  {
    value: '< 30s',
    label: 'Plan Generation',
    sub: 'Raw syllabus to personalized daily roadmap',
  },
  {
    value: '1-Page',
    label: 'High-Yield Sheets',
    sub: 'Printable A4 cram sheets before exams',
  },
  {
    value: '100% Free',
    label: 'Zero Subscriptions',
    sub: 'Runs on your device · 100% free to study',
  },
];

export function MetricsRibbon() {
  return (
    <section className={styles.metricsRibbon} aria-label="Key Performance Metrics">
      <div className={styles.metricsContainer}>
        {METRICS.map((item, idx) => (
          <div key={idx} className={styles.metricItem}>
            <div className={styles.metricValue}>{item.value}</div>
            <div className={styles.metricLabel}>{item.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--kp-muted, #717684)', marginTop: '2px' }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
