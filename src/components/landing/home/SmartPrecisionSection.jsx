// src/components/landing/home/SmartPrecisionSection.jsx
"use client";

import { motion } from 'framer-motion';
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
          <motion.div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/Cozy Evening Study Nook.png"
              alt="The Focused Study Setup"
              className={styles.transparentSceneImg}
              loading="eager"
            />
          </motion.div>

          {/* Right: Narrative Story & Value Propositions */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
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
              <motion.div
                className={styles.featureBullet}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
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
              </motion.div>

              <motion.div
                className={styles.featureBullet}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
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
              </motion.div>

              <motion.div
                className={styles.featureBullet}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
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
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
