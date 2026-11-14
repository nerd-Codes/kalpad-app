// src/components/auth/KalPadAuthLayout.jsx
"use client";

import Link from 'next/link';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { HandwrittenHighlight } from '@/components/landing/home/HandwrittenHighlight';
import { IllustrationPlaceholder } from '@/components/landing/IllustrationPlaceholder';
import styles from './KalPadAuthLayout.module.css';

export function KalPadAuthLayout({
  mode = 'sign-in', // 'sign-in' | 'sign-up' | 'reset'
  title,
  subtitle,
  children,
}) {
  const isSignUp = mode === 'sign-up';
  const isReset = mode === 'reset';

  // Config for Left Showcase Panel based on auth mode
  const showcaseConfig = isSignUp
    ? {
        highlightWord: 'Panic',
        titlePrefix: 'Turn exam',
        titleSuffix: 'into calm daily mastery.',
        subtitle:
          'Turn 400-page textbooks and sudden syllabi into bite-sized daily topics, deep textbook-grade proofs, and 1-page printable cram sheets.',
        imageSrc: '/sign-up.png',
        imageAlt: 'The Master Study Blueprint',
        placeholderId: 'sign-up-roadmap-desk',
        placeholderTitle: 'Sign Up Hero: The Master Study Blueprint',
        prompt:
          'A whimsical editorial line-art illustration of a motivated university student triumphantly unrolling a large glowing master study plan roadmap across a wooden study table. Stacks of chaotic, messy textbooks and scattered papers transform into neat, orderly daily milestone cards with little stars and checkmarks. In the scene, the student holds a yellow highlighter with an excited, confident expression, accompanied by floating stationery: an A4 formula cram sheet, a mechanical tomato study timer, colorful sticky flags, and a small potted succulent',
        characterDetails:
          'An enthusiastic student with rolled-up sleeves, smiling with genuine relief and ambition, holding a study roadmap that turns syllabus chaos into academic clarity.',
        paletteDetails:
          'Warm honey yellow (#F4B942), vanilla cream (#FFFDF7), charcoal ink (#111317), bright amber (#F59E0B), mint green (#10B981), celestial blue (#3B82F6)',
        styleKeywords:
          'Whimsical editorial line-art illustration, loose black ink outlines, flat gouache color blocking, clean minimalist background, warm cozy study atmosphere, no text, no watermark',
      }
    : isReset
      ? {
          highlightWord: 'Keys',
          titlePrefix: 'Restore your',
          titleSuffix: 'with confidence.',
          subtitle:
            'Set a fresh, secure password to protect your customized academic roadmaps, generated chapter notes, and exam cram sheets.',
          imageSrc: null,
          imageAlt: null,
          placeholderId: 'reset-password-keys',
          placeholderTitle: 'Reset Password Hero: Restoring the Study Keys',
          prompt:
            'A friendly editorial line-art illustration of a student unlocking a cozy wooden study desk with a golden brass key. Above the desk, a safe lock opens to reveal organized study flashcards, a neatly bound notebook, and a small glowing lightbulb. Warm honey yellow (#F4B942) background, cream paper tones (#FFFDF7), clean black ink line-art (#111317), reassuring and secure aesthetic',
          characterDetails:
            'A college student smiling with relief as they turn a key into an organized desk drawer containing their study notes.',
          paletteDetails:
            'Warm honey yellow (#F4B942), cream paper (#FFFDF7), brass gold (#D97706), soft ink outline (#111317)',
          styleKeywords:
            'Whimsical editorial line-art illustration, loose black ink outlines, flat gouache color blocking, clean minimalist background, warm cozy study atmosphere, no text, no watermark',
        }
      : {
          highlightWord: 'Syllabus',
          titlePrefix: 'Pick up your',
          titleSuffix: 'right where you left off.',
          subtitle:
            'Log in to view your personalized daily roadmap, textbook-grade chapter explanations, and 1-page printable cram sheets.',
          imageSrc: '/sign-in.png',
          imageAlt: 'The Returning Scholar',
          placeholderId: 'sign-in-scholar-nook',
          placeholderTitle: 'Sign In Hero: The Returning Scholar',
          prompt:
            'A charming editorial line-art illustration of a university student happily returning to their cozy, sunlit study desk. On the warm wooden desk sits an open textbook with neat handwritten margin notes, a laptop displaying an organized checklist with crisp green checkmarks, a steaming ceramic mug of tea, and neatly stacked hardcover notebooks. Floating gently around the desk are playful study doodles: a folded paper airplane, subtle glowing mathematical symbols (integral signs, sigma, delta), and colorful sticky notes',
          characterDetails:
            'A young college student in a comfortable knit sweater and wire-rim glasses, resting chin on hand with a relaxed, confident smile, looking at their study screen with calm focus.',
          paletteDetails:
            'Warm honey yellow (#F4B942), warm paper cream (#FFFDF7), deep ink black (#111317), terracotta orange (#E67E22), soft pastel sage (#2ECC71), warm cobalt blue (#3498DB)',
          styleKeywords:
            'Whimsical editorial line-art illustration, loose black ink outlines, flat gouache color blocking, clean minimalist background, warm cozy study atmosphere, no text, no watermark',
        };

  return (
    <div className={styles.authShell} data-kalpad-landing="true">
      {/* =================================================================== */}
      {/* LEFT SHOWCASE PANEL (DESKTOP HERO)                                 */}
      {/* =================================================================== */}
      <div className={styles.showcasePanel}>
        {/* Ambient top right doodle */}
        <svg
          className={styles.ambientDoodle}
          width="110"
          height="70"
          viewBox="0 0 110 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M8 18C28 6 65 6 85 22C105 38 60 65 40 52C20 40 38 12 75 14C95 14 105 28 102 48"
            stroke="#111317"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Top bar with wordmark & home link */}
        <div className={styles.showcaseTopNav}>
          <Link href="/" className={styles.brandWordmark}>
            KalPad
          </Link>
          <Link href="/" className={styles.backHomePill}>
            <IconArrowLeft size={15} stroke={2.5} />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Center content: Headline, Subtitle & Hero Illustration Placeholder */}
        <div className={styles.showcaseBody}>
          <h1 className={styles.showcaseTitle}>
            {showcaseConfig.titlePrefix}{' '}
            <HandwrittenHighlight strokeColor="#111317">
              {showcaseConfig.highlightWord}
            </HandwrittenHighlight>{' '}
            {showcaseConfig.titleSuffix}
          </h1>

          <p className={styles.showcaseSubtitle}>{showcaseConfig.subtitle}</p>

          <div className={styles.showcaseIllustrationContainer}>
            {showcaseConfig.imageSrc ? (
              <img
                src={showcaseConfig.imageSrc}
                alt={showcaseConfig.imageAlt}
                className={styles.showcaseHeroImg}
                loading="eager"
              />
            ) : (
              <IllustrationPlaceholder
                id={showcaseConfig.placeholderId}
                title={showcaseConfig.placeholderTitle}
                prompt={showcaseConfig.prompt}
                characterDetails={showcaseConfig.characterDetails}
                paletteDetails={showcaseConfig.paletteDetails}
                styleKeywords={showcaseConfig.styleKeywords}
                aspectRatio="16/10"
                maxHeight="320px"
              />
            )}
          </div>
        </div>

        {/* Bottom perks strip */}
        <div className={styles.showcasePerksStrip}>
          <div className={styles.perkBadge}>
            <IconCheck size={14} stroke={3} color="#111317" />
            <span>100% Free Forever</span>
          </div>
          <div className={styles.perkBadge}>
            <IconCheck size={14} stroke={3} color="#111317" />
            <span>Direct ChatGPT BYOK</span>
          </div>
          <div className={styles.perkBadge}>
            <IconCheck size={14} stroke={3} color="#111317" />
            <span>Offline Ready</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT FORM PANEL                                                   */}
      {/* =================================================================== */}
      <div className={styles.formPanel}>
        {/* Mobile top navigation */}
        <div className={styles.mobileTopNav}>
          <Link href="/" className={styles.brandWordmark}>
            KalPad
          </Link>
          <Link href="/" className={styles.backHomePill}>
            <IconArrowLeft size={14} stroke={2.5} />
            <span>Home</span>
          </Link>
        </div>

        {/* Centered Auth Form Card */}
        <div className={styles.formCard}>
          {/* Segmented Mode Toggle (Sign In vs Sign Up) */}
          {!isReset && (
            <div className={styles.modeToggle}>
              <Link
                href="/sign-in"
                className={`${styles.modeToggleTab} ${
                  mode === 'sign-in' ? styles.modeToggleTabActive : ''
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={`${styles.modeToggleTab} ${
                  mode === 'sign-up' ? styles.modeToggleTabActive : ''
                }`}
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Form Header */}
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{title}</h2>
            {subtitle && <p className={styles.formSubtitle}>{subtitle}</p>}
          </div>

          {/* Form Content / Children */}
          {children}

          {/* Footer legal disclaimer */}
          <div className={styles.legalNotice}>
            By signing in, you agree to KalPad’s{' '}
            <Link href="/terms" className={styles.legalLink}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className={styles.legalLink}>
              Privacy Policy
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
