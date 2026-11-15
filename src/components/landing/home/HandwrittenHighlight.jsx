// src/components/landing/home/HandwrittenHighlight.jsx
"use client";

import { motion } from 'framer-motion';
import styles from './LandingVibe.module.css';

export function HandwrittenHighlight({
  children,
  strokeColor = '#111317',
  textColor,
  className = '',
  underlineOffset = '-4px',
}) {
  return (
    <span
      className={`${styles.handwrittenHighlight} ${className}`}
      style={textColor ? { color: textColor } : undefined}
    >
      <span className={styles.handwrittenWord}>{children}</span>
      <svg
        className={styles.handStrokeUnderline}
        viewBox="0 0 160 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        preserveAspectRatio="none"
        style={{ bottom: underlineOffset }}
      >
        {/* Natural dual-pass hand-drawn marker underline drawing in on scroll */}
        <motion.path
          d="M3 11C42 4 108 5 157 9"
          stroke={strokeColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.8 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        <motion.path
          d="M12 14C55 10 102 9 148 13"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
          initial={{ pathLength: 0, opacity: 0.5 }}
          whileInView={{ pathLength: 1, opacity: 0.8 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </svg>
    </span>
  );
}
