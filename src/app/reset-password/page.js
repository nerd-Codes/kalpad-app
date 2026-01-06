// src/app/reset-password/page.js
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';

// Mantine & UI Imports
import { Container, Title, Text, PasswordInput, Group, Alert, Anchor, Box, Stack } from '@mantine/core';
import { IconLock, IconCheck, IconX, IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';

// --- SUB-COMPONENT: BACKGROUND (Cyan/Blue Theme for "Reset") ---
function AuthBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#050505' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #0f172a 0%, #000000 70%)' }} />
            
            <motion.div
                animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.2, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '60vw', height: '60vw', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15), transparent 70%)', // Cyan Glow
                    filter: 'blur(80px)'
                }}
            />

            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'linear-gradient(to bottom, black, transparent)'
            }} />
        </div>
    );
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- 3D TILT PHYSICS ---
    const x = useMotionValue(200);
    const y = useMotionValue(200);
    const rotateX = useTransform(y, [0, 400], [5, -5]);
    const rotateY = useTransform(x, [0, 400], [-5, 5]);

    function handleMouse(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess("Security override successful. Redirecting to terminal...");
            setTimeout(() => router.push('/sign-in'), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- CUSTOM INPUT STYLES ---
    const inputStyles = {
        input: { 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderRadius: '12px',
            padding: '24px 16px 24px 50px', // Left padding for icon
            transition: 'all 0.2s ease',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            '&:focus': {
                borderColor: '#22d3ee', // Cyan focus color
                boxShadow: '0 0 0 1px #22d3ee, inset 0 2px 4px rgba(0,0,0,0.5)'
            }
        },
        label: {
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '8px',
            fontSize: '0.9rem'
        }
    };

    return (
        <Box 
            style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            onMouseMove={handleMouse}
        >
            <AuthBackground />

            {/* Back Button */}
            <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 20 }}>
                <Interactive>
                    <Link href="/sign-in" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconArrowLeft size={20} /> <Text size="sm">Abort Sequence</Text>
                    </Link>
                </Interactive>
            </div>

            <Container size="xs" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10, perspective: 1000 }}>
                <motion.div
                    style={{ rotateX, rotateY }}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                    <GlassCard 
                        p={40}
                        style={{
                            backdropFilter: 'blur(40px) saturate(150%)',
                            backgroundColor: 'rgba(20, 25, 30, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <Stack gap="xl">
                            {/* Header */}
                            <div className="text-center">
                                <Group justify="center" mb="sm">
                                    <IconRefresh size={48} color="#22d3ee" style={{ opacity: 0.8 }} stroke={1.5} />
                                </Group>
                                <Title order={2} style={{ fontFamily: 'var(--font-lexend)', fontSize: '2rem', letterSpacing: '-0.03em', color: 'white' }}>
                                    System Override
                                </Title>
                                <Text c="dimmed" size="sm" mt={4}>
                                    Establish new security credentials.
                                </Text>
                            </div>

                            {error && (
                                <Alert color="red" variant="light" title="Override Failed" withCloseButton onClose={() => setError('')} icon={<IconX/>}>
                                    {error}
                                </Alert>
                            )}

                            {success ? (
                                <Alert color="teal" variant="light" title="Success" icon={<IconCheck/>}>
                                    {success}
                                </Alert>
                            ) : (
                                <form onSubmit={handlePasswordReset}>
                                    <Stack gap="md">
                                        <PasswordInput 
                                            label="New Credentials" 
                                            placeholder="Enter new password" 
                                            leftSection={<IconLock size={18} color="gray" />}
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            required 
                                            styles={inputStyles}
                                        />
                                        
                                        <Interactive>
                                            <ShimmerButton 
                                                type="submit" 
                                                fullWidth 
                                                size="lg" 
                                                radius="xl" 
                                                loading={loading}
                                                style={{
                                                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan Gradient
                                                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
                                                }}
                                            >
                                                Update Credentials
                                            </ShimmerButton>
                                        </Interactive>
                                    </Stack>
                                </form>
                            )}
                        </Stack>
                    </GlassCard>
                </motion.div>
            </Container>
        </Box>
    );
}