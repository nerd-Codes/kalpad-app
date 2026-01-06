// src/components/Interactive.jsx
"use client";
import { motion } from 'framer-motion';

export function Interactive({ children, className, onClick }) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ 
        y: -2, 
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      whileTap={{ 
        scale: 0.96, 
        transition: { type: "spring", stiffness: 400, damping: 10 } 
      }}
      style={{ cursor: 'pointer', display: 'inline-block', width: 'auto' }}
    >
      {children}
    </motion.div>
  );
}