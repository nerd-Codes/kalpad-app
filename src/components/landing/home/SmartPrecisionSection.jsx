// src/components/landing/home/SmartPrecisionSection.jsx
"use client";

import { Text } from '@mantine/core';
import { IconTarget, IconBrain, IconCalendarEvent } from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

export function SmartPrecisionSection() {
  return (
    <section className={styles.sectionWrapper} id="how-it-works">
      <div className={styles.contentContainer}>
        <div className={styles.splitGrid}>
          {/* Left: Transparent Study Scene Illustration */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/Cozy Evening Study Nook.png"
              alt="The Focused Study Setup"
              className={styles.transparentSceneImg}
              loading="eager"
            />
          </div>

          {/* Right: Narrative Story & Value Propositions */}
          <div>
            <h2 className={styles.sectionTitle}>
              We Provide{' '}
              <HandwrittenHighlight strokeColor="#D97706">
                Smart
              </HandwrittenHighlight>{' '}
              Study Precision
            </h2>

            <p className={styles.sectionSubtitle}>
              Studying shouldn&apos;t feel like drowning in 50 open browser tabs, 3-hour lecture recordings,
              and late-night panic. KalPad turns your course syllabus into clear daily milestones, deep textbook
              notes with intuitive proofs, and high-yield cram sheets for the morning of your exam.
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureBullet}>
                <div className={styles.bulletIconWrapper}>
                  <IconTarget size={18} color="#D97706" />
                </div>
                <div>
                  <Text size="sm" fw={700} c="#111317">
                    Direct Syllabus Deconstruction
                  </Text>
                  <Text size="xs" c="#5A5E6D" mt={2}>
                    Paste your university syllabus, lecture topics, or PDF. KalPad analyzes prerequisites
                    and schedules high-weight modules first.
                  </Text>
                </div>
              </div>

              <div className={styles.featureBullet}>
                <div className={styles.bulletIconWrapper}>
                  <IconBrain size={18} color="#D97706" />
                </div>
                <div>
                  <Text size="sm" fw={700} c="#111317">
                    Textbook-Grade Explanations
                  </Text>
                  <Text size="xs" c="#5A5E6D" mt={2}>
                    Deep, chapter-by-chapter notes complete with step-by-step proofs, formulas rendered in KaTeX,
                    common trap alerts, and active recall checkpoints.
                  </Text>
                </div>
              </div>

              <div className={styles.featureBullet}>
                <div className={styles.bulletIconWrapper}>
                  <IconCalendarEvent size={18} color="#D97706" />
                </div>
                <div>
                  <Text size="sm" fw={700} c="#111317">
                    Zero Cramming Guilt
                  </Text>
                  <Text size="xs" c="#5A5E6D" mt={2}>
                    Set realistic daily study hours with automated revision checkpoints and rest days,
                    so you stay energized through finals week.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
