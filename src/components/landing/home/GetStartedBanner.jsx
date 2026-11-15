// src/components/landing/home/GetStartedBanner.jsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import styles from './LandingVibe.module.css';

export function GetStartedBanner() {
  return (
    <section className={styles.sectionWrapper} style={{ paddingTop: '40px', paddingBottom: '70px' }}>
      <div className={styles.contentContainer}>
        <motion.div
          className={styles.getStartedBannerCard}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Left: Transparent Illustration sitting flush on bottom edge of banner */}
          <motion.div
            className={styles.bannerImageCol}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/Warm Chalkboard Tutoring Scene.png"
              alt="Academic Mentorship and Concept Breakdown"
              className={styles.transparentBannerImg}
              loading="eager"
            />
          </motion.div>

          {/* Right: Call to action content */}
          <div className={styles.bannerContentCol}>
            <h3 className={styles.bannerTitle}>
              Ready to replace cram panic with calm mastery?
            </h3>

            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: 'rgba(17, 19, 23, 0.84)',
                marginBottom: '26px',
                maxWidth: '480px',
                fontFamily: 'var(--font-kp-sans), sans-serif',
              }}
            >
              Start studying with your AI topper friend today. Turn your course syllabus into
              your custom master study plan immediately.
            </p>

            <div>
              <Link
                href="/sign-up"
                className={styles.primaryPillButton}
                id="banner-start-free-cta"
              >
                <span>Start Free</span>
                <IconArrowRight size={18} stroke={2.5} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
