// src/components/landing/home/MobileShowcaseSection.jsx
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconBrandAndroid, IconBrowser } from '@tabler/icons-react';
import { HandwrittenHighlight } from './HandwrittenHighlight';
import styles from './LandingVibe.module.css';

export function MobileShowcaseSection() {
  return (
    <section className={styles.mobileAppSection} id="mobile-app">
      <div className={styles.contentContainer}>
        <motion.div
          style={{ maxWidth: '640px', margin: '0 auto' }}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className={styles.sectionTitle}>
            Try Studying Free on{' '}
            <HandwrittenHighlight strokeColor="#D97706">
              Mobile App
            </HandwrittenHighlight>
          </h2>

          <p className={styles.sectionSubtitle}>
            Review your chapter notes and cram sheets offline anywhere—on your morning commute,
            in the library, or between classes. Available as a native Android APK and offline PWA.
          </p>

          <div className={styles.storeBadgeGroup}>
            <motion.a
              href="/android/KalPad.apk"
              download
              className={styles.storeBadgeButton}
              id="download-android-apk-btn"
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
            >
              <IconBrandAndroid size={22} color="#10B981" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Download Direct</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Android APK</div>
              </div>
            </motion.a>

            <motion.div
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              style={{ display: 'inline-flex' }}
            >
              <Link
                href="/sign-up"
                className={styles.storeBadgeButton}
                style={{ backgroundColor: '#F4B942', color: '#111317' }}
                id="launch-web-app-btn"
              >
                <IconBrowser size={22} color="#111317" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(17,19,23,0.7)' }}>Instant Access</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Launch Web App</div>
                </div>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
