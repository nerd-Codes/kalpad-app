// src/components/landing/home/motionTokens.js
// Derived from KalPad Motion Personality: Focused Tactile Stationery (Paper + MD3 Decelerate)

export const MOTION_CURVES = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.05, 0.7, 0.1, 1],
  springSettle: [0.22, 1, 0.36, 1],
  exit: [0.3, 0, 1, 1],
};

export const MOTION_DURATIONS = {
  micro: 0.12,
  quick: 0.2,
  standard: 0.32,
  slow: 0.45,
};

export const heroStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
};

export const heroRise = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_CURVES.emphasized,
    },
  },
};

export const sectionReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_CURVES.standard,
    },
  },
};
