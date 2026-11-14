// src/components/landing/home/HowItWorksSection.jsx
"use client";

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
          <div>
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
                <div key={idx} className={styles.journeyStepItem}>
                  <div className={styles.stepNumberCircle}>{step.num}</div>
                  <div>
                    <Text size="md" fw={800} c="#111317">
                      {step.title}
                    </Text>
                    <Text size="xs" c="#5A5E6D" mt={3} lh={1.5}>
                      {step.desc}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Transparent Scene Illustration */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/Hands Holding Educational Smartphone.png"
              alt="Effortless Mobile and Web Study"
              className={styles.transparentSceneImg}
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
