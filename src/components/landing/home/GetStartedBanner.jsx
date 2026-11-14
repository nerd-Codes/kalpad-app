// src/components/landing/home/GetStartedBanner.jsx
"use client";

import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import styles from './LandingVibe.module.css';

export function GetStartedBanner() {
  return (
    <section className={styles.sectionWrapper} style={{ paddingTop: '40px', paddingBottom: '70px' }}>
      <div className={styles.contentContainer}>
        <div className={styles.getStartedBannerCard}>
          {/* Left: Transparent Illustration sitting flush on bottom edge of banner */}
          <div className={styles.bannerImageCol}>
            <img
              src="/Warm Chalkboard Tutoring Scene.png"
              alt="Academic Mentorship and Concept Breakdown"
              className={styles.transparentBannerImg}
              loading="eager"
            />
          </div>

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
        </div>
      </div>
    </section>
  );
}
