// src/components/landing/ShimmerButton.jsx
"use client";
import { Button } from '@mantine/core';
import classes from './ShimmerButton.module.css';

export function ShimmerButton({ children, ...props }) {
    return (
        <Button className={classes.shimmerButton} {...props}>
            <span className={classes.shimmerEffect} />
            <span style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </span>
        </Button>
    );
}