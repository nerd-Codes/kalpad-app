// src/components/Interactive.jsx
"use client";
import { motion } from 'framer-motion';

export function Interactive({ children, className, onClick, style, fullWidth = false, ...props }) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      {...props}
      whileHover={{ 
        y: -1, 
        transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } 
      }}
      whileTap={{ 
        scale: 0.98, 
        transition: { duration: 0.1, ease: [0.22, 1, 0.36, 1] } 
      }}
      style={{
        cursor: 'pointer',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : 'auto',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
