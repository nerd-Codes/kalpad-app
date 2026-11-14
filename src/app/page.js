// src/app/page.js
"use client";

import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { MotionConfig, motion, useScroll, useSpring } from 'framer-motion';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { CookieConsent } from '@/components/landing/CookieConsent';
import { NewHero } from '@/components/landing/home/NewHero';
import { MetricsRibbon } from '@/components/landing/home/MetricsRibbon';
import { SmartPrecisionSection } from '@/components/landing/home/SmartPrecisionSection';
import { ProductShowcaseSection } from '@/components/landing/home/ProductShowcaseSection';
import { HowItWorksSection } from '@/components/landing/home/HowItWorksSection';
import { GetStartedBanner } from '@/components/landing/home/GetStartedBanner';
import { MobileShowcaseSection } from '@/components/landing/home/MobileShowcaseSection';
import { FaqSection } from '@/components/landing/home/FaqSection';
import styles from '@/components/landing/home/LandingVibe.module.css';

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const spineScaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 32,
    restDelta: 0.001,
  });

  // Strict landing page isolation: Force light theme and warm paper background
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevTheme = document.documentElement.getAttribute('data-kalpad-theme');
    const prevMantineScheme = document.documentElement.getAttribute('data-mantine-color-scheme');
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyColor = document.body.style.color;

    document.documentElement.setAttribute('data-kalpad-theme', 'light');
    document.documentElement.setAttribute('data-mantine-color-scheme', 'light');
    document.body.style.backgroundColor = '#F7F3E8';
    document.body.style.color = '#111317';

    return () => {
      try {
        const saved = window.localStorage.getItem('kalpad_theme_mode');
        if (saved) {
          document.documentElement.setAttribute('data-kalpad-theme', saved);
          document.documentElement.setAttribute('data-mantine-color-scheme', saved === 'dark' ? 'dark' : 'light');
        }
      } catch (_) {}
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.color = prevBodyColor;
    };
  }, []);

  return (
    <MantineProvider defaultColorScheme="light" forceColorScheme="light">
      <MotionConfig reducedMotion="user">
        <div
          className={`kp-app-shell ${styles.pageWrapper}`}
          data-kalpad-landing="true"
          data-kalpad-theme="light"
          data-mantine-color-scheme="light"
        >
          {/* Subtle reading progress spine at top */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(17, 19, 23, 0.06)',
              zIndex: 101,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <motion.div
              style={{
                height: '100%',
                backgroundColor: '#111317',
                transformOrigin: '0%',
                scaleX: spineScaleX,
              }}
            />
          </div>

          <Navbar />

          <main id="main-content">
            {/* 1. Hero with warm honey palette and scene illustration */}
            <NewHero />

            {/* 2. Key Metrics & Social Proof Ribbon */}
            <MetricsRibbon />

            {/* 3. We Provide Smart Study Precision (Split Layout) */}
            <SmartPrecisionSection />

            {/* 4. What KalPad Builds For You (Showcase of Real Outputs on Black Background) */}
            <ProductShowcaseSection />

            {/* 5. It's Easy to Start Studying (3-Step Journey) */}
            <HowItWorksSection />

            {/* 7. Ready to Replace Cram Panic Banner Card */}
            <GetStartedBanner />

            {/* 8. Study Anywhere on Mobile & Offline */}
            <MobileShowcaseSection />

            {/* 9. Clear & Transparent FAQ */}
            <FaqSection />
          </main>

          <Footer />
          <CookieConsent />
        </div>
      </MotionConfig>
    </MantineProvider>
  );
}
