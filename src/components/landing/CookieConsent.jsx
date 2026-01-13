"use client";

import { useState, useEffect } from 'react';
import { Group, Text, Button, Box } from '@mantine/core';
import { IconCookie } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/GlassCard';

export function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Check if user has already decided
        const hasConsent = localStorage.getItem('kalpad_cookie_consent');
        if (!hasConsent) {
            // Delay appearance for smoothness
            setTimeout(() => setVisible(true), 1500);
        }
    }, []);

    const handleDecision = (decision) => {
        localStorage.setItem('kalpad_cookie_consent', decision);
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '24px',
                        zIndex: 9999,
                        maxWidth: '400px',
                        width: 'calc(100% - 48px)'
                    }}
                >
                    <GlassCard p="md" style={{ 
                        backgroundColor: 'rgba(20, 20, 25, 0.8)', 
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                    }}>
                        <Group align="flex-start" wrap="nowrap">
                            <IconCookie size={24} color="#BF5AF2" style={{ marginTop: 2, flexShrink: 0 }} />
                            <Box>
                                <Text size="sm" c="white" fw={600} mb={4}>Cookie Policy</Text>
                                <Text size="xs" c="dimmed" lh={1.5} mb="md">
                                    We use cookies to ensure the "Brain" works smoothly. No tracking for ads, just pure functionality.
                                </Text>
                                <Group gap="xs">
                                    <Button 
                                        size="xs" variant="filled" color="gray" radius="xl" 
                                        onClick={() => handleDecision('rejected')}
                                        styles={{ root: { backgroundColor: 'rgba(255,255,255,0.1)' } }}
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        size="xs" variant="gradient" gradient={{ from: '#BF5AF2', to: '#5E5CE6' }} radius="xl"
                                        onClick={() => handleDecision('accepted')}
                                    >
                                        Accept All
                                    </Button>
                                </Group>
                            </Box>
                        </Group>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>
    );
}