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
      setShowFact(false);
      setFactIndex(Math.floor(Math.random() * wittyFacts.length));
      
      timeoutRef.current = setTimeout(() => {
        setShowFact(true);
      }, 3000); // Faster initial feedback (3s instead of 5s)

      intervalRef.current = setInterval(() => {
        setFactIndex(prevIndex => (prevIndex + 1) % wittyFacts.length);
      }, 5000);

    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

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
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={classes.loaderOverlay}
        >
            {/* 1. THE BREATHING ORB (Ambient Glow) */}
            <motion.div
                style={{
                    position: 'absolute',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(191, 90, 242, 0.4) 0%, rgba(94, 92, 230, 0.1) 60%, transparent 80%)',
                    filter: 'blur(60px)',
                    zIndex: 1,
                }}
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 2. THE SHIMMERING LOGO */}
            <div className={classes.shimmerText}>
              KalPad
            </div>
            
            {/* 3. THE FACT PILL (Conditional) */}
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, width: '100%' }}>
              <AnimatePresence mode="wait">
                {showFact && (
                  <motion.div
                    key={fact}
                    className={classes.glassPill}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Text 
                        c="dimmed" 
                        size="sm" 
                        fw={500} 
                        style={{ fontFamily: 'var(--font-inter)', color: 'rgba(255,255,255,0.8)' }}
                    >
                        {fact}
                    </Text>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}