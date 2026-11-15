// src/components/landing/home/FaqSection.jsx
"use client";

import { motion } from 'framer-motion';
import { Accordion } from '@mantine/core';
import styles from './LandingVibe.module.css';

const FAQS = [
  {
    q: 'How does KalPad work?',
    a: 'Instead of expensive subscriptions, KalPad lets you connect your own ChatGPT account and uses your existing quota. Everything runs smoothly on your own device, your notes are completely yours, and KalPad is free to use.',
  },
  {
    q: 'Can I print my notes and cram sheets for offline revision?',
    a: 'Yes! Every note and 1-page cram sheet features clean print layouts (A4 portrait) with crisp vector KaTeX equations, high-contrast black ink, and protected formula breaks so you get book-quality prints.',
  },
  {
    q: 'What types of courses and exams does KalPad support?',
    a: 'KalPad is designed for any structured syllabus: university semester courses (Engineering, Medical, Physics, Chemistry, Math, Economics, Humanities) and competitive exams (GATE, JEE, NEET, UPSC).',
  },
  {
    q: 'How does KalPad ensure accuracy in formulas and math?',
    a: 'Unlike generic chatbots that summarize text into shallow paragraphs, KalPad uses an academic pipeline that extracts formal definitions, step-by-step proofs, edge cases, and memory hooks, rendering all mathematics cleanly via KaTeX.',
  },
  {
    q: 'Can I study on my phone while offline?',
    a: 'Yes. KalPad offers a native Android APK and offline web app support. Once your study plan and notes are generated, you can review them offline in libraries, flights, or classrooms.',
  },
];

export function FaqSection() {
  return (
    <section className={styles.sectionWrapper} id="faq" style={{ backgroundColor: '#FAF5EA' }}>
      <div className={styles.contentContainer}>
        <motion.div
          className={styles.sectionHeaderCenter}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to know about KalPad.
          </p>
        </motion.div>

        <motion.div
          style={{ maxWidth: '780px', margin: '0 auto' }}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Accordion
            variant="separated"
            radius="lg"
            styles={{
              item: {
                backgroundColor: '#FFFDF7',
                border: '1.5px solid rgba(17, 19, 23, 0.12)',
                marginBottom: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              },
              control: {
                padding: '18px 22px',
                fontWeight: 700,
                fontSize: '15px',
                color: '#111317',
                fontFamily: 'var(--font-kp-sans), sans-serif',
              },
              panel: {
                padding: '0 22px 18px 22px',
                color: '#5A5E6D',
                fontSize: '14px',
                lineHeight: 1.6,
                fontFamily: 'var(--font-kp-sans), sans-serif',
              },
            }}
          >
            {FAQS.map((faq, idx) => (
              <Accordion.Item key={idx} value={`faq-${idx}`}>
                <Accordion.Control>{faq.q}</Accordion.Control>
                <Accordion.Panel>{faq.a}</Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
