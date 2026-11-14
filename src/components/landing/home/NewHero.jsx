// src/components/landing/home/NewHero.jsx
"use client";

import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

export function NewHero() {
  return (
    <section className={styles.heroSection}>
      {/* Decorative ambient scribbles */}
      <svg
        className={styles.ambientDoodleTopRight}
        width="120"
        height="80"
        viewBox="0 0 120 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10 20C30 5 70 5 90 25C110 45 60 75 40 60C20 45 40 15 80 15C100 15 115 30 110 55"
          stroke="#111317"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={styles.heroContainer}>
        {/* Left Column: Headline & Action */}
        <div className={styles.heroContent}>
          {/* Sparkle doodle radiating above headline */}
          <div className={styles.sparkleDoodle} aria-hidden="true">
            <svg width="44" height="28" viewBox="0 0 44 28" fill="none">
              <path d="M22 2V12" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 8L16 16" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M36 8L28 16" stroke="#111317" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

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
        </div>

        {/* Right Column: Transparent Hero Scene Illustration sitting flush on bottom edge */}
        <div className={styles.heroImageWrapper}>
          <img
            src="/Multivariable Calculus Study Desk.png"
            alt="The Master Study Desk"
            className={styles.transparentHeroImg}
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
