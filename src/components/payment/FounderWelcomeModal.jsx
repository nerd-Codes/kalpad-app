// src/components/payment/FounderWelcomeModal.jsx
"use client";

import { Modal, Stack, Title, Text, Box, ThemeIcon, Group } from '@mantine/core';
import { IconCrown, IconHeartHandshake } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { ShimmerButton } from '@/components/landing/ShimmerButton';

const glassModalStyles = {
    content: { 
        backgroundColor: '#0F0F10', 
        border: '1px solid #BF5AF2', 
        borderRadius: '24px',
        boxShadow: '0 40px 100px -10px rgba(191, 90, 242, 0.6)',
        overflow: 'hidden'
    },
    header: { display: 'none' }, // Completely custom body
    body: { padding: '40px 32px' }
};

export function FounderWelcomeModal({ opened, onClose }) {
    
    const handleClaim = async () => {
        onClose();
        await fetch('/api/payment/dismiss-founder', { method: 'POST' });
    };

    return (
        <Modal opened={opened} onClose={handleClaim} centered size="md" styles={glassModalStyles} withCloseButton={false} overlayProps={{ blur: 15 }}>
            <Stack align="center" gap="lg" style={{ position: 'relative', zIndex: 2 }}>
                
                {/* Glowing Crown Animation */}
                <Box style={{ position: 'relative' }}>
                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                        <ThemeIcon size={80} radius="100%" variant="gradient" gradient={{ from: '#BF5AF2', to: '#5E5CE6', deg: 135 }} style={{ boxShadow: '0 0 40px rgba(191,90,242,0.5)' }}>
                            <IconCrown size={40} />
                        </ThemeIcon>
                    </motion.div>
                </Box>

                <Box ta="center">
                    <Title order={2} className="apple-text-gradient" style={{ fontSize: '2.2rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        A Promise Kept.
                    </Title>
                    <Text fw={700} c="brandPurple" mt="xs" tt="uppercase" style={{ letterSpacing: '0.1em' }}>You are a Founder</Text>
                </Box>

                <Text c="dimmed" size="sm" ta="center" lh={1.6}>
                    To sustain our AI costs, KalPad is moving to a free/paid model today. But you were here when it all started. 
                </Text>

                <Box p="md" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                    <Group align="flex-start" wrap="nowrap">
                        <IconHeartHandshake size={20} color="#34C759" />
                        <Text size="sm" c="white" lh={1.5}>
                            <span style={{ fontWeight: 700, color: '#34C759' }}>Your Gift:</span> You have been permanently upgraded to the <strong>Founder's Edition</strong>. Lifetime Pro access, zero limits, zero cost.
                        </Text>
                    </Group>
                </Box>

                <ShimmerButton onClick={handleClaim} size="lg" radius="xl" style={{ width: '100%', background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}>
                    Accept Founder Badge
                </ShimmerButton>
            </Stack>
        </Modal>
    );
}