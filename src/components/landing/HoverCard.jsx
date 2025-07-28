// src/components/landing/HoverCard.jsx
"use client";
import { motion } from 'framer-motion';

export function HoverCard({ children, style, ...props }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
      // --- THE FIX ---
      // Apply the height style passed from the parent
      style={{ height: '100%', ...style }} 
      {...props}
    >
      {children}
    </motion.div>
  );
}