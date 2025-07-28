// src/components/landing/ShimmerButton.jsx
"use client";
import { Button } from '@mantine/core';
import classes from './ShimmerButton.module.css';

export function ShimmerButton({ children, ...props }) {
    return (
        // The Mantine Button is the container
        <Button className={classes.shimmerButton} {...props}>
            {/* The shimmer is a separate element inside */}
            <span className={classes.shimmerEffect} />
            {/* The content sits on top */}
            <span style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </span>
        </Button>
    );
}