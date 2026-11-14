// src/components/GlassCard.jsx
"use client";
import { Paper } from '@mantine/core';
import { motion } from 'framer-motion';
import { usePerformance } from '@/context/PerformanceContext';

export function GlassCard({ children, style, className, animate = true, ...props }) {
  const { isLiteMode } = usePerformance(); 
  
  const cardStyle = {
    // Quiet Graphite Card Surface (Unslop design tokens)
    backgroundColor: 'var(--apple-gray-1, #19191b)',
    border: '1px solid var(--glass-border, rgba(237, 237, 237, 0.08))',
    boxShadow: 'inset 0 1px 0 0 var(--glass-shine, rgba(255, 255, 255, 0.04))',
    borderRadius: '12px',
    color: 'var(--apple-text-primary, #ededed)',
    ...style,
  };

  const Content = (
    <Paper 
      p="xl" 
      radius="md"
      style={cardStyle} 
      className={className} 
      {...props}
    >
      {children}
    </Paper>
  );

  if (!animate || isLiteMode) return Content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {Content}
    </motion.div>
  );
}