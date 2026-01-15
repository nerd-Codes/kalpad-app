// src/components/GlassCard.jsx
"use client";
import { Paper } from '@mantine/core';
import { motion } from 'framer-motion';
import { usePerformance } from '@/context/PerformanceContext';

export function GlassCard({ children, style, className, animate = true, ...props }) {
  const { isLiteMode } = usePerformance(); 
  
  const cardStyle = {
    // The "Deep Glass" Material
    backgroundColor: 'rgba(30, 30, 32, 0.60)', // Slightly translucent dark gray
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    
    // The "Edge Lighting" Border
    // We use a transparent border color but rely on the box-shadow for the inner rim light
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    
    // Geometry
    borderRadius: '24px', // The Apple "Squircle" approximation
    color: 'var(--apple-text-primary)',
    
    // Merge user styles
    ...style,
  };

  const Content = (
    <Paper 
      p="xl" 
      radius="xl" // Mantine prop, though overridden by style above
      style={cardStyle} 
      className={className} 
      {...props}
    >
      {children}
    </Paper>
  );

  if (!animate) return Content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20, 
        mass: 0.5 
      }}
    >
      {Content}
    </motion.div>
  );
}