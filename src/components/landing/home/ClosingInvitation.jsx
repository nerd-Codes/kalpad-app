// src/components/landing/home/ClosingInvitation.jsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight, IconShieldCheck } from '@tabler/icons-react';
import { sectionReveal } from './motionTokens';
import styles from './LandingHome.module.css';

const PLEDGE_POINTS = [
  {
    code: '01',
    title: 'Zero Fake Gamification',
    desc: 'No countdown fireworks or guilt streaks when an exam week collides with an internship.',
  },
  {
    code: '02',
    title: 'Zero Subscription Traps',
    desc: 'Try your first complete syllabus plan and textbook note on the guest desk before creating an account.',
  },
  {
    code: '03',
    title: 'Only the Desk & The Work',
    desc: 'Calm paper surfaces, high-contrast typography, and one AI tutor anchored right beside your page.',
  },
];

export function ClosingInvitation() {
  return (
    <section style={{ borderTop: '1px solid var(--kp-border)' }}>
      <div className={styles.sectionWrap}>
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          style={{
            backgroundColor: 'var(--kp-surface)',
            border: '1.5px solid var(--kp-border-strong)',
            borderRadius: '26px',
            padding: '32px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#D97706',
                  marginBottom: '10px',
                }}
              >
                <IconShieldCheck size={16} />
                04 / THE &ldquo;NOTHING&rdquo; PHILOSOPHY
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.7rem, 3.3vw, 2.5rem)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  fontWeight: 800,
                  color: 'var(--kp-ink)',
                }}
              >
                Brutally honest study software.{' '}
                <span style={{ color: 'var(--kp-secondary)', fontWeight: 500 }}>
                  Your next exam starts tonight, not tomorrow.
                </span>
              </h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <a href="#hero-sandbox" className={styles.heroSecondaryBtn}>
                Back to live sandbox
              </a>
              <Link href="/guest-plan" className={styles.heroPrimaryBtn}>
                Start Day 1 free
                <IconArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className={styles.threeColBento}>
            {PLEDGE_POINTS.map((item) => (
              <div
                key={item.code}
                style={{
                  backgroundColor: 'var(--kp-canvas)',
                  border: '1px solid var(--kp-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#D97706',
                  }}
                >
                  {item.code}
                </span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                  {item.title}
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
