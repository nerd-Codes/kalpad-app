// src/components/payment/PayURedirector.jsx
"use client";

import { useEffect, useRef } from 'react';
import { Box, Loader, Text, Stack } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { motion } from 'framer-motion';

export function PayURedirector({ paymentData }) {
    const formRef = useRef(null);

    useEffect(() => {
        if (paymentData && formRef.current) {
            // Auto-submit the form immediately upon rendering
            formRef.current.submit();
        }
    }, [paymentData]);

    if (!paymentData) return null;

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(5, 5, 10, 0.95)', // Deep void
                backdropFilter: 'blur(20px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Stack align="center" gap="lg">
                {/* Visual Feedback */}
                <div style={{ position: 'relative' }}>
                    <Loader size="xl" color="green" type="dots" />
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            position: 'absolute', inset: -20,
                            borderRadius: '50%',
                            border: '2px solid #34C759'
                        }}
                    />
                </div>
                
                <Stack align="center" gap={4}>
                    <Group gap="xs" c="green">
                        <IconLock size={20} />
                        <Text fw={600} tt="uppercase" size="sm" style={{ letterSpacing: '0.1em' }}>
                            Securing Channel
                        </Text>
                    </Group>
                    <Text c="dimmed" size="sm">Redirecting to PayU Secure Gateway...</Text>
                </Stack>
            </Stack>

            {/* The Invisible Form */}
            <form 
                ref={formRef} 
                action={paymentData.action} 
                method="POST" 
                style={{ display: 'none' }}
            >
                {/* Dynamically render all required PayU parameters */}
                {Object.entries(paymentData.params).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                ))}
            </form>
        </Box>
    );
}

// Helper component for layout structure
import { Group } from '@mantine/core';