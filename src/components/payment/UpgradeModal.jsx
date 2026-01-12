// src/components/payment/UpgradeModal.jsx
"use client";

import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Title, Text, Box, Badge, SimpleGrid, ThemeIcon, List, Button } from '@mantine/core';
import { IconCheck, IconDiamond, IconRocket, IconCrown, IconLockOpen, IconBug, IconUser, IconAlertTriangle } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { PayURedirector } from './PayURedirector';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';

// --- CONFIGURATION ---
const TIERS = [
    {
        id: 'pro_15',
        name: 'The Sprint',
        duration: '15 Days',
        price: '₹49',
        icon: IconRocket,
        color: '#CD7F32', // Bronze
        glow: 'rgba(205, 127, 50, 0.2)',
        features: ['Unlimited Active Plans', 'Unlimited Note Generation', '15 Days Full Access']
    },
    {
        id: 'pro_30',
        name: 'The Marathon',
        duration: '30 Days',
        price: '₹79',
        icon: IconDiamond,
        color: '#E0E0E0', // Silver
        glow: 'rgba(224, 224, 224, 0.2)',
        features: ['Everything in Sprint', 'Unlimited AI Doubt Solver', 'Unlimited Smart Quizzes']
    },
    {
        id: 'pro_90',
        name: 'The Semester',
        duration: '3 Months',
        price: '₹129',
        icon: IconCrown,
        color: '#FFD700', // Gold
        glow: 'rgba(255, 215, 0, 0.3)',
        features: ['Early Access to YouTube Lecture Finder', 'Long-term Plan Support', 'Early Access to new Features'],
        recommended: true
    }
];

// --- MODAL STYLES ---
const glassModalStyles = {
    content: { 
        backgroundColor: '#0F0F10', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px',
        boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.8)',
    },
    header: { backgroundColor: 'transparent', paddingBottom: 0 },
    body: { padding: '24px' },
    title: { fontFamily: 'var(--font-lexend)', fontWeight: 600, color: 'white' },
    close: { color: 'gray', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' } }
};

export function UpgradeModal({ opened, onClose }) {
    const [selectedPlan, setSelectedPlan] = useState('pro_90'); // Default to best value
    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const isMobile = useMediaQuery('(max-width: 48em)');

    // --- HANDLER: INITIATE PAYMENT ---
    const handlePurchase = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payment/initiate-payu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: selectedPlan })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Payment initiation failed");
            }

            const data = await response.json();
            
            // This triggers the PayURedirector to take over
            setPaymentData(data);

        } catch (error) {
            console.error(error);
            notifications.show({
                title: 'Gateway Error',
                message: error.message,
                color: 'red'
            });
            setLoading(false);
        }
    };

    return (
        <>
            <Modal 
                opened={opened} 
                onClose={onClose} 
                title={<Group gap="xs"><IconLockOpen size={20} color="#BF5AF2"/><Text inherit>Unlock Full Potential</Text></Group>} 
                size="xl" 
                centered 
                fullScreen={isMobile}
                zIndex={7000}
                styles={glassModalStyles}
                overlayProps={{ blur: 10, opacity: 0.8 }}
            >
                <Stack gap="xl">
                     <GlassCard p="md" style={{ border: '1px solid rgba(255, 59, 48, 0.2)', backgroundColor: 'rgba(255, 59, 48, 0.05)' }}>
                                <Group align="flex-start" wrap="nowrap">
                                    <ThemeIcon variant="light" color="red" size="lg" radius="md">
                                        <IconUser size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text size="sm" fw={700} c="white" tt="uppercase" mb={4}>Current Plan: Free Tier</Text>
                                        <List 
                                            size="xs" 
                                            spacing={4} 
                                            center 
                                            icon={<ThemeIcon color="red" size={12} radius="xl" variant="transparent"><IconAlertTriangle size={12} /></ThemeIcon>}
                                        >
                                            <List.Item><Text c="dimmed" size="xs">Limited to 1 Active Study Plan</Text></List.Item>
                                            <List.Item><Text c="dimmed" size="xs">Note Generation: Today Only</Text></List.Item>
                                            <List.Item><Text c="dimmed" size="xs">Restricted Quiz & Doubt Credits</Text></List.Item>
                                        </List>
                                    </Box>
                                </Group>
                            </GlassCard>

                            <Text c="dimmed" size="sm" ta="center">
                                Select a pass to remove all limits instantly.
                            </Text>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                        {TIERS.map((tier) => {
                            const isSelected = selectedPlan === tier.id;
                            const isRec = tier.recommended;

                            return (
                                <Interactive key={tier.id} onClick={() => setSelectedPlan(tier.id)} className="h-full">
                                    <GlassCard 
                                        p="lg" 
                                        h="100%"
                                        style={{ 
                                            position: 'relative',
                                            backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                            border: isSelected ? `2px solid ${tier.color}` : '1px solid rgba(255,255,255,0.05)',
                                            boxShadow: isSelected ? `0 0 30px ${tier.glow}` : 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                            transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                    >
                                        {isRec && (
                                            <Badge 
                                                variant="filled" 
                                                color="yellow" 
                                                size="xs" 
                                                style={{ position: 'absolute', top: 12, right: 12, boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}
                                            >
                                                BEST VALUE
                                            </Badge>
                                        )}

                                        <Stack align="center" gap="md">
                                            <ThemeIcon 
                                                size={50} 
                                                radius="100%" 
                                                variant="light" 
                                                color={tier.color} 
                                                style={{ backgroundColor: tier.glow, color: tier.color }}
                                            >
                                                <tier.icon size={24} />
                                            </ThemeIcon>

                                            <Box ta="center">
                                                <Text size="sm" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em' }}>{tier.name}</Text>
                                                <Text size="2.5rem" fw={800} style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1, color: 'white' }}>
                                                    {tier.price}
                                                </Text>
                                                <Text size="xs" c="dimmed">{tier.duration}</Text>
                                            </Box>

                                            <List 
                                                spacing="xs" 
                                                size="sm" 
                                                center
                                                icon={<ThemeIcon color="green" size={16} radius="xl" variant="filled"><IconCheck size={10} /></ThemeIcon>}
                                            >
                                                {tier.features.map((feat, i) => (
                                                    <List.Item key={i}><Text size="xs" c="gray.3">{feat}</Text></List.Item>
                                                ))}
                                            </List>
                                        </Stack>
                                    </GlassCard>
                                </Interactive>
                            );
                        })}
                    </SimpleGrid>

                    <Box p="md" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Group justify="space-between" align="center">
                             <Stack gap={0}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Due</Text>
                                <Text size="xl" fw={700} c="white">{TIERS.find(t => t.id === selectedPlan)?.price}</Text>
                             </Stack>
                             
                             <ShimmerButton 
                                onClick={handlePurchase} 
                                loading={loading}
                                size="lg"
                                radius="xl"
                                style={{ padding: '0 40px', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
                             >
                                Secure Checkout
                             </ShimmerButton>
                        </Group>
                    </Box>
                </Stack>
            </Modal>

            {/* --- THE SILENT LAUNCHER --- */}
            {/* When paymentData is set, this component mounts and auto-submits the form */}
            <PayURedirector paymentData={paymentData} />
        </>
    );
}