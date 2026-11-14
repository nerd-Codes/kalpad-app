// src/components/landing/home/FeatureGridSection.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { IconStarFilled, IconClock, IconCalendarEvent, IconBook2, IconPrinter, IconCheck, IconCopy } from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

const CRAYON_FEATURES = [
  {
    id: 'crayon-timeline',
    title: 'Adaptive Study Timeline',
    rating: '4.9 (High Yield)',
    duration: '2.5 hrs/day',
    desc: 'Converts raw course outlines into realistic daily study bites with automated rest buffers and exam checkpoints.',
    isActive: false,
    loopColor: '#E07A5F',
    iconColor: '#D97706',
    prompt:
      'Charming crayon and colored pencil sketch of a university student happily drawing a colorful study calendar roadmap on a desk, with pastel rulers, geometric graphs, and checklist tags. Soft organic oval loop outline surrounding the character. Playful textured crayon strokes, warm paper texture, honey yellow, sky blue, and sage green colors, minimalist vector aesthetic, white background, no text, no watermark',
  },
  {
    id: 'crayon-notes',
    title: 'Deep Textbook Notes',
    rating: '4.9 (Top Rated)',
    duration: 'Deep Recall',
    desc: 'Multi-layered chapter notes complete with genuine KaTeX math equations, intuitive proofs, and common exam trap alerts.',
    isActive: true,
    loopColor: '#3D5A80',
    iconColor: '#2563EB',
    prompt:
      'Charming crayon and colored pencil sketch of a university student reading an illuminated open golden textbook with floating mathematical symbols, lightbulb ideas, and a small potted desk plant. Soft organic looping circular outline framing the scene. Whimsical textured crayon and wax pastel style, warm honey amber and cobalt blue, cozy academic atmosphere, clean white background, no text, no watermark',
  },
  {
    id: 'crayon-cram',
    title: '1-Page A4 Cram Sheets',
    rating: '4.9 (Print Ready)',
    duration: '1-Page A4',
    desc: 'Ultra-dense, high-yield summary sheets formatted for crisp printing and rapid morning-of-exam review.',
    isActive: false,
    loopColor: '#2A9D8F',
    iconColor: '#059669',
    prompt:
      'Charming crayon and colored pencil sketch of a student holding a colorful high-yield summary sheet with yellow highlight swatches, formula cheat sheets, and colored paper clips. Soft organic oval loop line surrounding the character. Textured wax crayon art style, warm sunny palette, playful and crisp, clean white background, no text, no watermark',
  },
];

export function FeatureGridSection() {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyPrompt = async (id, prompt) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch (_) {}
  };

  return (
    <section className={styles.darkFeaturesSection} id="features">
      <div className={styles.contentContainer}>
        {/* Section Header (No badges, strictly Space Mono heading) */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 className={styles.darkSectionTitle}>
            Our Features{' '}
            <HandwrittenHighlight strokeColor="#F4B942">
              Special
            </HandwrittenHighlight>{' '}
            For You
          </h2>

          <p className={styles.darkSectionSubtitle}>
            Everything required to go from syllabus overload to calm exam readiness in one
            uncluttered, distraction-free study desk.
          </p>
        </div>

        {/* 3 Crayon-Style Cards Grid matching reference */}
        <div className={styles.crayonCardsGrid}>
          {CRAYON_FEATURES.map((feature, idx) => (
            <div key={feature.id} className={styles.crayonCard}>
              {/* 1. Organic Loop Crayon Illustration Holder */}
              <div className={styles.crayonIllustrationHolder}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    borderRadius: '16px',
                    backgroundColor: '#FFFDF7',
                    border: '1.5px dashed rgba(17, 19, 23, 0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Organic Loop SVG drawn like reference */}
                  <svg
                    viewBox="0 0 200 160"
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      right: 4,
                      bottom: 4,
                      width: 'calc(100% - 8px)',
                      height: 'calc(100% - 8px)',
                      pointerEvents: 'none',
                    }}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M25 80 C 20 30, 60 15, 110 18 C 160 22, 185 45, 182 85 C 180 125, 145 145, 95 142 C 45 138, 28 120, 25 80 Z"
                      stroke={feature.loopColor}
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Inner Crayon Mini Scene */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        backgroundColor: '#FFF7DC',
                        border: '2px solid #111317',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    >
                      {idx === 0 && <IconCalendarEvent size={26} color="#D97706" />}
                      {idx === 1 && <IconBook2 size={26} color="#2563EB" />}
                      {idx === 2 && <IconPrinter size={26} color="#059669" />}
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-kp-mono)',
                        fontWeight: 700,
                        color: '#111317',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(17, 19, 23, 0.1)',
                      }}
                    >
                      Crayon Sketch #{idx + 1}
                    </span>
                  </div>

                  {/* Copy Prompt Button directly in card */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPrompt(feature.id, feature.prompt);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: copiedId === feature.id ? '#10B981' : '#111317',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      zIndex: 3,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 150ms ease',
                    }}
                    title="Copy Image Generation Prompt"
                  >
                    {copiedId === feature.id ? (
                      <>
                        <IconCheck size={12} stroke={3} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <IconCopy size={12} />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Rating & Duration Meta Row */}
              <div className={styles.crayonMetaRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#111317' }}>
                  <IconStarFilled size={14} color="#F59E0B" />
                  <span style={{ fontWeight: 700 }}>{feature.rating}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#5A5E6D' }}>
                  <IconClock size={14} />
                  <span>{feature.duration}</span>
                </div>
              </div>

              {/* 3. Title in Space Mono */}
              <h3 className={styles.crayonCardTitle}>{feature.title}</h3>

              {/* 4. Description in Jakarta Sans */}
              <p className={styles.crayonCardDesc}>{feature.desc}</p>

              {/* 5. Pill Button (Amber for active card, outline for others) */}
              <div>
                <Link
                  href="/sign-up"
                  className={
                    feature.isActive
                      ? `${styles.crayonCardButton} ${styles.crayonCardButtonActive}`
                      : styles.crayonCardButton
                  }
                  id={`feature-card-btn-${idx}`}
                >
                  Start Free
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
