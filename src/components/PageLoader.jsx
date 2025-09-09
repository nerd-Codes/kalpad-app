// src/components/PageLoader.jsx
"use client";
import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Text } from '@mantine/core';
import { wittyFacts } from '@/lib/loadingFacts';
import classes from './PageLoader.module.css';

export function PageLoader({ isLoading }) {
  const [factIndex, setFactIndex] = useState(0);
  const [showFact, setShowFact] = useState(false);
  
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      // 1. Immediately reset state and set the initial fact for the cycle
      setShowFact(false);
      setFactIndex(Math.floor(Math.random() * wittyFacts.length));
      
      // 2. Schedule the witty fact to appear after 5 seconds
      timeoutRef.current = setTimeout(() => {
        setShowFact(true);
      }, 5000);

      // 3. Start the interval to cycle through subsequent facts
      intervalRef.current = setInterval(() => {
        setFactIndex(prevIndex => (prevIndex + 1) % wittyFacts.length);
      }, 5000);

    } else {
      // If the loader is hidden early, clear all timers to prevent state updates
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    // Main cleanup function for when the component unmounts
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  const fact = wittyFacts[factIndex];

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
          className={classes.loaderOverlay}
        >
          <div className={classes.content}>
            {/* The floating logo animation appears immediately via CSS */}
            <div className={classes.logo}>
              KalPad
            </div>
            
            {/* This container ensures the layout is stable and reserves space */}
            <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
              <AnimatePresence mode="wait">
                {/* The witty fact is conditionally rendered after 5 seconds */}
                {showFact && (
                  <motion.div
                    key={fact}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.4, ease: 'easeIn' } }}
                  >
                    <Text c="dimmed" ta="center">{fact}</Text>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}