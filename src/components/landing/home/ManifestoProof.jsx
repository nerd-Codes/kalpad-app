// src/components/landing/home/ManifestoProof.jsx
"use client";

import { motion } from 'framer-motion';
import { IconSchool, IconQuote } from '@tabler/icons-react';
import { sectionReveal } from './motionTokens';
import styles from './LandingHome.module.css';

const STUDENT_NOTES = [
  {
    bg: 'var(--kp-mint)',
    tag: 'DU ELECTRONICS · INTERNAL WEEK',
    headline: 'Turned a 11 PM panic over 4 PDFs into Day 1 solved in 45 minutes.',
    body: 'Instead of reading slide 1 of 52 linearly, the strategy card isolated the three Poisson & Hall derivations that actually carry marks.',
    author: 'Aarav M. · 3rd Year B.Sc (H) Electronics',
  },
  {
    bg: 'var(--kp-periwinkle)',
    tag: 'INTERNSHIP + MIDTERM OVERLAP',
    headline: 'Stopped pretending I had 6 hours a night.',
    body: 'Setting honest 2.5h/day availability let KalPad trim filler history chapters upfront instead of slapping red overdue alerts on me.',
    author: 'Riya S. · Computer Science Undergraduate',
  },
  {
    bg: 'var(--kp-surface)',
    tag: 'GATE + SEMESTER BALANCING',
    headline: 'Notes + diagrams in the same tab ended my 12-tab browser chaos.',
    body: 'Having formulas, explanations, and follow-up chat in one sidebar kept me focused past the hardest chapters.',
    author: 'Karan V. · Final Year ECE',
  },
];

export function ManifestoProof() {
  return (
    <section
      id="proof"
      style={{ scrollMarginTop: '68px', borderTop: '1px solid var(--kp-border)' }}
    >
      <div className={styles.sectionWrap}>
        <div className={styles.twoColSplit} style={{ marginBottom: '28px' }}>
          {/* Origin Manifesto */}
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-kp-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#D97706',
              }}
            >
              03 / ORIGIN STORY &amp; PROOF
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.75rem, 3.2vw, 2.45rem)',
                lineHeight: 1.14,
                letterSpacing: '-0.03em',
                fontWeight: 800,
                color: 'var(--kp-ink)',
              }}
            >
              Built to end the &ldquo;Kal Padhunga&rdquo; cycle.
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: '15.5px',
                lineHeight: 1.65,
                color: 'var(--kp-secondary)',
              }}
            >
              KalPad started in a Delhi University dorm when living two lives — coding side-projects
              and building startups by day, facing dense semester PDFs at 11 PM — broke every
              generic calendar app. Using an early prototype to ruthlessly triage syllabi lifted
              a stressed <strong style={{ color: 'var(--kp-ink)' }}>7.5 CGPA to 8.5</strong> without
              giving up the work that actually mattered outside class.
            </p>
          </motion.div>

          {/* MHCIIE Hansraj Incubation Card */}
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            style={{
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              borderRadius: '22px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--kp-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  padding: '6px',
                }}
              >
                <img
                  src="/mchiie.avif"
                  alt="MHCIIE Hansraj College"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#D97706',
                    marginBottom: '2px',
                  }}
                >
                  INSTITUTIONAL INCUBATION
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                  MHCIIE · Hansraj College
                </div>
                <div style={{ fontSize: '13px', color: 'var(--kp-secondary)' }}>
                  University of Delhi Entrepreneurship Hub
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: '14px',
                backgroundColor: 'var(--kp-butter)',
                padding: '14px 16px',
                border: '1px solid var(--kp-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <IconSchool size={18} color="var(--kp-accent-ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--kp-ink)', fontWeight: 500 }}>
                Stress-tested across real DU internals, B.Tech concurrency midterms, and working
                students balancing internships alongside semester exams.
              </div>
            </div>
          </motion.div>
        </div>

        {/* Grounded Peer Notes */}
        <div className={styles.threeColBento}>
          {STUDENT_NOTES.map((item) => (
            <motion.div
              key={item.tag}
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              style={{
                backgroundColor: item.bg,
                border: '1px solid var(--kp-border)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--kp-accent-ink)',
                    }}
                  >
                    {item.tag}
                  </span>
                  <IconQuote size={16} color="var(--kp-secondary)" />
                </div>

                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    lineHeight: 1.32,
                    color: 'var(--kp-ink)',
                  }}
                >
                  &ldquo;{item.headline}&rdquo;
                </div>

                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--kp-secondary)' }}>
                  {item.body}
                </p>
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--kp-ink)',
                  borderTop: '1px solid var(--kp-border)',
                  paddingTop: '10px',
                }}
              >
                {item.author}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
