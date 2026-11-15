// src/components/landing/home/HowItWorksSection.jsx
"use client";

import { motion } from 'framer-motion';
import { Text } from '@mantine/core';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

const STEPS = [
  {
    num: '1',
    title: 'Paste Your Syllabus',
    desc: 'Drop in your course outline, lecture notes, textbook chapters, or upcoming exam date.',
  },
  {
    num: '2',
    title: 'KalPad Maps Your Custom Roadmap',
    desc: 'The engine prioritizes high-weight topics first, weaves in active revision days, and crafts deep chapter notes.',
  },
  {
    num: '3',
    title: 'Study Deep, Quiz, & Ace Your Exam',
    desc: 'Read clear pedagogical explanations, test retention with diagnostic quizzes, and print your 1-page cram sheet.',
  },
];

export function HowItWorksSection() {
  return (
    <section className={styles.sectionWrapper} id="how-it-works-steps" style={{ backgroundColor: '#FAF5EA' }}>
      <div className={styles.contentContainer}>
        <div className={styles.splitGrid}>
          {/* Left Column: Numbered Steps */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className={styles.sectionTitle}>
              It&apos;s easy to start{' '}
              <HandwrittenHighlight strokeColor="#D97706">
                Studying
              </HandwrittenHighlight>
            </h2>

            <p className={styles.sectionSubtitle}>
              No prompt engineering, no complex setup. Three simple steps take you from
              exam dread to structured academic control.
            </p>

            <div className={styles.journeyStepsList}>
              {STEPS.map((step, idx) => (
                <motion.div
                  key={idx}
                  className={styles.journeyStepItem}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <motion.div
                    className={styles.stepNumberCircle}
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.12 }}
                  >
                    {step.num}
                  </motion.div>
                  <div>
                    <Text size="md" fw={800} c="#111317">
                      {step.title}
                    </Text>
                    <Text size="xs" c="#5A5E6D" mt={3} lh={1.5}>
                      {step.desc}
                    </Text>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Transparent Scene Illustration */}
          <motion.div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/Hands Holding Educational Smartphone.png"
              alt="Effortless Mobile and Web Study"
              className={styles.transparentSceneImg}
              loading="eager"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
