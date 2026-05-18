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
        y: -2, 
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      whileTap={{ 
        scale: 0.96, 
        transition: { type: "spring", stiffness: 400, damping: 10 } 
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
