// src/components/BackgroundBlobs.jsx
"use client";

import { usePathname } from 'next/navigation';
import { Box } from '@mantine/core';
import classes from './BackgroundBlobs.module.css';
import { usePerformance } from '@/context/PerformanceContext';

export function BackgroundBlobs() {
  const pathname = usePathname();
  const { isLiteMode } = usePerformance();

  // Check if we are in the Research IDE
  const isResearchMode = 0;

  // Logic: Hide on specific pages unless it's research
  const isExcluded = 
    isLiteMode ||
    pathname === '/' || 
    pathname.startsWith('/sign-') || 
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/print') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/research');;

  if (isExcluded && !isResearchMode) return null;

  return (
    <Box className={classes.background}>
      {isResearchMode ? (
        // --- RESEARCH MODE BLOBS (Deep Blue/Indigo) ---
        <>
           <div className={`${classes.blob} ${classes.blobResearch1}`} />
           <div className={`${classes.blob} ${classes.blobResearch2}`} />
        </>
      ) : (
        // --- STANDARD BLOBS (Purple/Green) ---
        <>
          <div className={`${classes.blob} ${classes.blob1}`} />
          <div className={`${classes.blob} ${classes.blob2}`} />
          <div className={`${classes.blob} ${classes.blob3}`} />
        </>
      )}
    </Box>
  );
}