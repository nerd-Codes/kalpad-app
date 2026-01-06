// src/app/sign-in/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { useDisclosure, useMove } from '@mantine/hooks';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';

// Mantine & UI Imports
import { Container, Title, Text, TextInput, PasswordInput, Button, Group, Divider, Alert, Anchor, Box, Stack } from '@mantine/core';
import { IconMail, IconLock, IconBrandGoogle, IconArrowLeft } from '@tabler/icons-react';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { GlassCard } from '@/components/GlassCard';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { Interactive } from '@/components/Interactive';

// --- SUB-COMPONENT: BACKGROUND ---
function AuthBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#050505' }}>
            {/* Deep Gradient */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #1a1025 0%, #000000 70%)' }} />
            
            {/* The Nebula (Breathing) */}
            <motion.div
                animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.1, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '60vw', height: '60vw', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15), transparent 70%)',
                    filter: 'blur(80px)'
                }}
            />

            {/* Stars */}
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'linear-gradient(to bottom, black, transparent)'
            }} />
        </div>
    );
}

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAndroidApp, setIsAndroidApp] = useState(false);
    const [forgotModalOpened, { open: openForgotModal, close: closeForgotModal }] = useDisclosure(false);

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

    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.userAgent.includes('KalPad-Android-App')) {
            setIsAndroidApp(true);
        }
    }, []);

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
    };

    // --- CUSTOM INPUT STYLES (The "Cutout" Look) ---
    const inputStyles = {
        input: { 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderRadius: '12px',
            padding: '24px 16px 24px 35px', // Added 50px left padding to clear the icon
            transition: 'all 0.2s ease',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', // Inner shadow for depth
            '&:focus': {
                borderColor: '#BF5AF2',
                boxShadow: '0 0 0 1px #BF5AF2, inset 0 2px 4px rgba(0,0,0,0.5)'
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

            {/* Back Button (Floating) */}
            <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 20 }}>
                <Interactive>
                    <Link href="/" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconArrowLeft size={20} /> <Text size="sm">Back to Base</Text>
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
                            backgroundColor: 'rgba(20, 20, 25, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <Stack gap="xl">
                            {/* Header */}
                            <div className="text-center">
                                <Title order={2} className="apple-text-gradient" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>
                                    Access Terminal
                                </Title>
                                <Text c="dimmed" size="sm" mt={4}>
                                    Authenticate to continue your session.
                                </Text>
                            </div>

                            {error && (
                                <Alert color="red" variant="light" title="Access Denied" withCloseButton onClose={() => setError('')}>
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={handleEmailSignIn}>
                                <Stack gap="md">
                                    <TextInput 
                                        label="Email Credentials" 
                                        placeholder="student@university.edu" 
                                        leftSection={<IconMail size={18} color="gray" />}
                                        value={email} onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                        styles={inputStyles}
                                    />
                                    <PasswordInput 
                                        label="Passcode" 
                                        placeholder="••••••••" 
                                        leftSection={<IconLock size={18} color="gray" />}
                                        value={password} onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        styles={inputStyles}
                                    />
                                    
                                    <Group justify="flex-end">
                                        <Anchor component="button" type="button" size="xs" c="dimmed" onClick={openForgotModal}>
                                            Forgot passcode?
                                        </Anchor>
                                    </Group>

                                    <Interactive>
                                        <ShimmerButton type="submit" fullWidth size="lg" radius="xl" loading={loading}>
                                            Initialize Session
                                        </ShimmerButton>
                                    </Interactive>
                                </Stack>
                            </form>

                            {!isAndroidApp && (
                                <>
                                    <Divider label="OR" labelPosition="center" color="rgba(255,255,255,0.1)" />
                                    <Interactive>
                                        <Button 
                                            fullWidth 
                                            variant="default" 
                                            size="lg" 
                                            radius="xl"
                                            leftSection={<IconBrandGoogle size={20} />} 
                                            onClick={handleGoogleSignIn}
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'white'
                                            }}
                                        >
                                            Sign in with Google
                                        </Button>
                                    </Interactive>
                                </>
                            )}

                            <Text c="dimmed" size="xs" ta="center">
                                No account found? {' '}
                                <Anchor component={Link} href="/sign-up" c="brandPurple" fw={600}>
                                    Create Identity
                                </Anchor>
                            </Text>
                        </Stack>
                    </GlassCard>
                </motion.div>
            </Container>

            <ForgotPasswordModal opened={forgotModalOpened} onClose={closeForgotModal} />
        </Box>
    );
}