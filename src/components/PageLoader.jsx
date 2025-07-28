// src/components/PageLoader.jsx
"use client";
import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Text } from '@mantine/core';
import { wittyFacts } from '@/lib/loadingFacts';
import classes from './PageLoader.module.css';

export function PageLoader({ isLoading }) {
  const [factIndex, setFactIndex] = useState(0);
  const intervalRef = useRef(null);

  // --- THIS IS THE FIX ---
  // This effect is responsible for starting and stopping the timer.
  useEffect(() => {
    // If the loader becomes visible, start the interval
    if (isLoading) {
      // Set an initial random fact
      setFactIndex(Math.floor(Math.random() * wittyFacts.length));
      
      intervalRef.current = setInterval(() => {
        // Just update the index. The text will be derived from this.
        setFactIndex(prevIndex => (prevIndex + 1) % wittyFacts.length);
      }, 2500); // Change fact every 2.5 seconds
    } else {
      // If the loader is hidden, clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup function to clear the interval when the component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading]); // This effect depends ONLY on the isLoading prop

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
            <div className={classes.logo}>
              KalPad
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={fact} // The key now correctly changes, triggering the animation
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.4, ease: 'easeIn' } }}
              >
                <Text c="dimmed" ta="center">{fact}</Text>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}