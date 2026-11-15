// src/components/landing/home/ProductShowcaseSection.jsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Group, Text, Badge } from '@mantine/core';
import {
  IconCalendarEvent,
  IconBook2,
  IconPrinter,
  IconArrowRight,
  IconCheck,
  IconClock,
} from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import { LatexBlock } from './LatexBlock';
import styles from './LandingVibe.module.css';

export function ProductShowcaseSection() {
  return (
    <section className={styles.darkShowcaseSection} id="product-showcase">
      <div className={styles.contentContainer}>
        <motion.div
          style={{ textAlign: 'center', marginBottom: '48px' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className={styles.darkShowcaseSectionTitle}>
            What KalPad{' '}
            <HandwrittenHighlight strokeColor="#F4B942">
              Builds
            </HandwrittenHighlight>{' '}
            For You
          </h2>

          <p className={styles.darkShowcaseSectionSubtitle}>
            Instead of a generic chatbot, KalPad builds three structured academic tools tailored
            to your exact syllabus.
          </p>
        </motion.div>

        {/* 3 Showcase Cards on High-Contrast Black Canvas */}
        <div className={styles.showcaseCardsGrid}>
          {/* CARD 1: ADAPTIVE TIMELINE PLAN */}
          <motion.div
            className={styles.showcaseCard}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className={styles.showcaseCardHeader}>
              <Group gap="xs">
                <IconCalendarEvent size={18} color="#D97706" />
                <Text size="xs" fw={700} c="#111317">
                  Study Plan & Timeline
                </Text>
              </Group>
              <Badge size="xs" color="yellow" variant="light">
                Adaptive
              </Badge>
            </div>

            <div className={styles.showcaseCardBody}>
              <Text size="sm" fw={800} c="#111317">
                5-Day Calculus & Linear Algebra
              </Text>
              <Text size="xs" c="#5A5E6D">
                Syllabus partitioned into bite-sized daily topics with automated rest buffers.
              </Text>

              {/* Mini Interactive Timeline Simulation */}
              <div
                style={{
                  backgroundColor: '#F7F3E8',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#EAF5EE',
                    color: '#176B45',
                    fontWeight: 600,
                  }}
                >
                  <Group gap="6px">
                    <IconCheck size={13} />
                    <span>Day 1: Limits & Continuity</span>
                  </Group>
                  <span>Done ✓</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFDF7',
                    border: '1.5px solid #D97706',
                    color: '#111317',
                    fontWeight: 700,
                  }}
                >
                  <Group gap="6px">
                    <IconClock size={13} color="#D97706" />
                    <span>Day 2: Derivatives & Chain Rule</span>
                  </Group>
                  <span style={{ color: '#D97706' }}>Active · 2h</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFDF7',
                    color: '#5A5E6D',
                    fontWeight: 500,
                  }}
                >
                  <span>Day 3: Integrals & Area Under Curve</span>
                  <span>Tomorrow</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFDF7',
                    color: '#5A5E6D',
                    fontWeight: 500,
                  }}
                >
                  <span>Day 4: Diagnostic Quiz & Buffer</span>
                  <span>Rest / Revise</span>
                </div>
              </div>
            </div>

            <div className={styles.showcaseCardFooter}>
              <Link
                href="/sign-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#111317',
                }}
              >
                <span>Explore Sample Timeline</span>
                <IconArrowRight size={15} />
              </Link>
            </div>
          </motion.div>

          {/* CARD 2: DEEP TEXTBOOK NOTE (GENUINE KATEX MATH) */}
          <motion.div
            className={styles.showcaseCard}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className={styles.showcaseCardHeader}>
              <Group gap="xs">
                <IconBook2 size={18} color="#3A7BD5" />
                <Text size="xs" fw={700} c="#111317">
                  Textbook Note
                </Text>
              </Group>
              <Badge size="xs" color="blue" variant="light">
                Pedagogical
              </Badge>
            </div>

            <div className={styles.showcaseCardBody}>
              <Text size="sm" fw={800} c="#111317">
                Electromagnetism: Gauss&apos;s Law
              </Text>
              <Text size="xs" c="#5A5E6D">
                Deep explanation with genuine KaTeX LaTeX proofs, intuitive analogies, and active recall cues.
              </Text>

              {/* Note Preview Box with KaTeX Rendered Math */}
              <div
                style={{
                  backgroundColor: '#F7F3E8',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFDF7',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    borderLeft: '3px solid #3A7BD5',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#111317', fontSize: '11px', marginBottom: '4px' }}>
                    Core Integral Equation
                  </div>
                  {/* Genuine KaTeX LaTeX Math Rendering */}
                  <LatexBlock
                    math={String.raw`\oint_{\mathcal{S}} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enclosed}}}{\varepsilon_0}`}
                    displayMode={true}
                    style={{ color: '#1E40AF', fontSize: '13px' }}
                  />
                </div>

                <div style={{ color: '#4B5563', lineHeight: 1.4 }}>
                  <strong>Mental Model:</strong> Think of electric flux as water flowing through a closed
                  butterfly net. Only charges enclosed inside the surface contribute to net outward flux.
                </div>

                <div
                  style={{
                    backgroundColor: '#FFF7DC',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    color: '#873600',
                    fontWeight: 600,
                  }}
                >
                  ⚡ Exam Trap: Net flux is 0 if dipole is completely inside!
                </div>
              </div>
            </div>

            <div className={styles.showcaseCardFooter}>
              <Link
                href="/sign-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#111317',
                }}
              >
                <span>Read Full Chapter Proof</span>
                <IconArrowRight size={15} />
              </Link>
            </div>
          </motion.div>

          {/* CARD 3: 1-PAGE PRINTABLE CRAM SHEET */}
          <motion.div
            className={styles.showcaseCard}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.27, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className={styles.showcaseCardHeader}>
              <Group gap="xs">
                <IconPrinter size={18} color="#176B45" />
                <Text size="xs" fw={700} c="#111317">
                  Printable Cram Sheet
                </Text>
              </Group>
              <Badge size="xs" color="teal" variant="light">
                A4 Portrait
              </Badge>
            </div>

            <div className={styles.showcaseCardBody}>
              <Text size="sm" fw={800} c="#111317">
                High-Yield Exam Summary
              </Text>
              <Text size="xs" c="#5A5E6D">
                Crisp 1-page condensed formula sheet designed for morning-of-exam review.
              </Text>

              {/* Cram Sheet Preview Box */}
              <div
                style={{
                  backgroundColor: '#FFFDF7',
                  border: '1px solid #D1D5DB',
                  borderRadius: '10px',
                  padding: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E5E7EB',
                    paddingBottom: '4px',
                    fontWeight: 800,
                  }}
                >
                  <span>ORGANIC CHEMISTRY SUMMARY</span>
                  <span style={{ color: '#D97706' }}>A4 SHEET</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 700 }}>SN1 vs SN2</div>
                    <div style={{ color: '#6B7280' }}>SN1: Polar protic solvent</div>
                    <div style={{ color: '#6B7280' }}>SN2: Inversion of config</div>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 700 }}>Markovnikov Rule</div>
                    <div style={{ color: '#6B7280' }}>H+ adds to C with more H</div>
                    <div style={{ color: '#6B7280' }}>Peroxide: Anti-Markovnikov</div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    color: '#991B1B',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Top Exam Trap: Carbocation rearrangement occurs in SN1, never SN2!
                </div>
              </div>
            </div>

            <div className={styles.showcaseCardFooter}>
              <Link
                href="/sign-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#111317',
                }}
              >
                <span>View Printable Cram Sheet</span>
                <IconArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
