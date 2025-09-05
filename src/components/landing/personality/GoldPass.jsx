// src/components/landing/personality/GoldPass.jsx
"use client";

import { motion } from 'framer-motion';
import classes from './GoldPass.module.css';
import { IconTicket } from '@tabler/icons-react';
import { Group } from '@mantine/core';

export function GoldPass({ onClaim }) {
    return (
        <motion.div
            style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                translateX: '-50%',
                zIndex: 1000, // High z-index to be on top of everything
            }}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
            <button className={classes.goldButton} onClick={onClaim}>
                <Group gap="xs" align="center">
                    {/* --- DEFINITIVE FIX: WRAP THE ICON --- */}
                    <span className={classes.iconWrapper}>
                        {/* The static `size` prop is now REMOVED */}
                        <IconTicket />
                    </span>
                    Claim your Gold Pass
                </Group>
            </button>
        </motion.div>
    );
}