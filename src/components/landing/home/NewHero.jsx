// src/components/landing/home/NewHero.jsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

export function NewHero() {
  return (
    <section className={styles.heroSection}>
      {/* Decorative ambient scribbles */}
      <motion.svg
        className={styles.ambientDoodleTopRight}
        width="120"
        height="80"
        viewBox="0 0 120 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        initial={{ opacity: 0, rotate: -4 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
      >
        <path
          d="M10 20C30 5 70 5 90 25C110 45 60 75 40 60C20 45 40 15 80 15C100 15 115 30 110 55"
          stroke="#111317"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </motion.svg>

      <div className={styles.heroContainer}>
        {/* Left Column: Headline & Action */}
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Sparkle doodle radiating above headline */}
          <motion.div
            className={styles.sparkleDoodle}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg width="44" height="28" viewBox="0 0 44 28" fill="none">
              <path d="M22 2V12" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 8L16 16" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M36 8L28 16" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </motion.div>

          <h1 className={styles.heroTitle}>
            Master your{' '}
            <HandwrittenHighlight strokeColor="#111317">
              Syllabus
            </HandwrittenHighlight>{' '}
            Faster without Panic
          </h1>

          <p className={styles.heroSubtitle}>
            Turn messy lecture slides, 400-page textbooks, and looming exam dates into crisp daily study
            topics, deep textbook-grade notes, and 1-page printable cram sheets.
          </p>

          <div className={styles.heroCtaGroup}>
            <Link
              href="/sign-up"
              className={styles.primaryPillButton}
              id="hero-start-free-cta"
              data-testid="hero-start-free-cta"
            >
              Start Free
              <IconArrowRight size={18} stroke={2.5} />
            </Link>

            <a
              href="#product-showcase"
              className={styles.secondaryPillButton}
              id="hero-see-how-cta"
            >
              See Product In Action ↓
            </a>
          </div>

          <div className={styles.trustMicroCopy}>
            <span>✓ Free forever</span>
            <span>✓ No credit card required</span>
            <span>✓ Offline ready</span>
          </div>
        </motion.div>

        {/* Right Column: Transparent Hero Scene Illustration sitting flush on bottom edge */}
        <motion.div
          className={styles.heroImageWrapper}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src="/Multivariable Calculus Study Desk.png"
            alt="The Master Study Desk"
            className={styles.transparentHeroImg}
            loading="eager"
          />
        </motion.div>
      </div>
    </section>
  );
}
