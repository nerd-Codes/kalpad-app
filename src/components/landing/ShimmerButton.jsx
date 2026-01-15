// src/components/landing/ShimmerButton.jsx
"use client";

import { UnstyledButton, Loader } from '@mantine/core';
import classes from './ShimmerButton.module.css';

// --- HELPER: Hex to RGBA for the glow effect ---
const hexToRgba = (hex, alpha = 0.5) => {
    let r = 0, g = 0, b = 0;
    // Remove hash if present
    hex = hex.replace('#', '');
    
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        return `rgba(124, 58, 237, ${alpha})`; // Fallback purple
    }
    return `rgba(${r},${g},${b},${alpha})`;
};

// --- PRESETS ---
const GRADIENTS = {
    'brandPurple': 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #4c1d95 100%)',
    'violet': 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #4c1d95 100%)',
    'blue': 'linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)',
    'cyan': 'linear-gradient(135deg, #22d3ee 0%, #0891b2 50%, #155e75 100%)',
    'teal': 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #115e59 100%)',
    'green': 'linear-gradient(135deg, #4ade80 0%, #16a34a 50%, #14532d 100%)',
    'orange': 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #78350f 100%)',
    'red': 'linear-gradient(135deg, #f87171 0%, #dc2626 50%, #7f1d1d 100%)',
    'pink': 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #831843 100%)',
    'gray': 'linear-gradient(135deg, #9ca3af 0%, #4b5563 50%, #1f2937 100%)',
    'dark': 'linear-gradient(135deg, #4b5563 0%, #1f2937 50%, #000000 100%)',
};

const SHADOWS = {
    'brandPurple': 'rgba(124, 58, 237, 0.5)',
    'violet': 'rgba(124, 58, 237, 0.5)',
    'blue': 'rgba(37, 99, 235, 0.5)',
    'cyan': 'rgba(8, 145, 178, 0.5)',
    'teal': 'rgba(13, 148, 136, 0.5)',
    'green': 'rgba(22, 163, 74, 0.5)',
    'orange': 'rgba(217, 119, 6, 0.5)',
    'red': 'rgba(220, 38, 38, 0.5)',
    'pink': 'rgba(219, 39, 119, 0.5)',
    'gray': 'rgba(75, 85, 99, 0.5)',
    'dark': 'rgba(0, 0, 0, 0.5)',
};

export function ShimmerButton({ 
    children, 
    color = 'brandPurple', 
    size, 
    style, 
    loading, 
    disabled, 
    fullWidth,
    ...props 
}) {
    
    // --- DYNAMIC COLOR RESOLUTION ---
    let bgGradient;
    let shadowColor;

    if (GRADIENTS[color]) {
        // 1. Use Preset
        bgGradient = GRADIENTS[color];
        shadowColor = SHADOWS[color];
    } else if (color.startsWith('#') || color.startsWith('rgb')) {
        // 2. Use Custom Hex/RGB
        // We create a subtle gradient from the color to itself to maintain the component structure
        bgGradient = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
        
        // Auto-generate the glow shadow from the hex
        if (color.startsWith('#')) {
            shadowColor = hexToRgba(color, 0.5);
        } else {
            shadowColor = color; // Fallback for RGB strings
        }
    } else {
        // 3. Fallback to default
        bgGradient = GRADIENTS['brandPurple'];
        shadowColor = SHADOWS['brandPurple'];
    }

    const height = size === 'xl' ? '60px' : size === 'lg' ? '54px' : size === 'sm' ? '36px' : '44px';
    const fontSize = size === 'xl' ? '1.2rem' : size === 'lg' ? '1.1rem' : size === 'sm' ? '0.85rem' : '1rem';
    const padding = size === 'xl' ? '0 48px' : size === 'lg' ? '0 32px' : size === 'sm' ? '0 16px' : '0 24px';

    return (
        <UnstyledButton
            className={classes.buttonRoot}
            disabled={disabled || loading}
            style={{
                height,
                padding,
                fontSize,
                width: fullWidth ? '100%' : 'auto', 
                display: fullWidth ? 'flex' : 'inline-flex',
                '--shadow-color': shadowColor, 
                // Apply the dynamic shadow
                boxShadow: disabled ? 'none' : `0 4px 15px -3px ${shadowColor}`, 
                ...style
            }}
            {...props}
        >
            {/* The Gradient Surface */}
            <div 
                className={classes.surface} 
                style={{ background: bgGradient }} 
            />

            {/* The Shimmer Effect */}
            <div className={classes.shimmer} />

            {/* The Content */}
            <div className={classes.content}>
                {loading ? <Loader color="white" size="xs" /> : children}
            </div>
        </UnstyledButton>
    );
}