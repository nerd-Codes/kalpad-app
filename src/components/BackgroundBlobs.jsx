// src/components/BackgroundBlobs.jsx
"use client";

import { usePathname } from 'next/navigation';
import { Box } from '@mantine/core';
import classes from './BackgroundBlobs.module.css';
import { usePerformance } from '@/context/PerformanceContext';

export function BackgroundBlobs() {
  const pathname = usePathname();
  const { isLiteMode } = usePerformance();

  // --- INTELLIGENCE LAYER ---
  // Hide on Landing, Auth, and Print pages
  const isExcluded = 
    isLiteMode ||
    pathname === '/' || 
    pathname.startsWith('/sign-') || 
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/print') ||
    pathname.startsWith('/shared');

  if (isExcluded) return null;

  return (
    <Box className={classes.background}>
      <div className={`${classes.blob} ${classes.blob1}`} />
      <div className={`${classes.blob} ${classes.blob2}`} />
      <div className={`${classes.blob} ${classes.blob3}`} />
    </Box>
  );
}