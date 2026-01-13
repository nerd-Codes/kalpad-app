// src/app/sign-up/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { IconCloudUpload } from '@tabler/icons-react'; // Add IconCloudUpload

// Mantine & UI Imports
import { Container, Title, Text, TextInput, PasswordInput, Button, Group, Divider, Alert, Anchor, Popover, Progress, Box, Stack, Checkbox } from '@mantine/core';
import { IconMail, IconLock, IconUser, IconBrandGoogle, IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { PasswordRequirement } from '@/components/auth/PasswordRequirement';
import { useGuest } from '@/context/GuestContext'; // Integration for Guest Mode

// --- PASSWORD LOGIC ---
const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

function getStrength(password) {
  let multiplier = password.length > 7 ? 0 : 1;
  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) { multiplier += 1; }
  });
  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
}

// --- SUB-COMPONENT: BACKGROUND (Shared aesthetic) ---
function AuthBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#050505' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, #1a1025 0%, #000000 70%)' }} />
            <motion.div
                animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.2, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', bottom: '-20%', right: '-10%',
                    width: '60vw', height: '60vw', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15), transparent 70%)', // Subtle Green hint for "New"
                    filter: 'blur(80px)'
                }}
            />
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'linear-gradient(to top, black, transparent)'
            }} />
        </div>
    );
}

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { guestArtifact, clearGuestArtifact } = useGuest(); // Guest Context

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [popoverOpened, setPopoverOpened] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isAndroidApp, setIsAndroidApp] = useState(false);

    const [termsAccepted, setTermsAccepted] = useState(false);

    // --- 3D TILT PHYSICS ---
    const x = useMotionValue(200);
    const y = useMotionValue(200);
    const rotateX = useTransform(y, [0, 600], [5, -5]); // Slightly reduced intensity for taller card
    const rotateY = useTransform(x, [0, 400], [-5, 5]);

    function handleMouse(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
    }

    // --- INITIALIZATION ---
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.userAgent.includes('KalPad-Android-App')) {
            setIsAndroidApp(true);
        }
    }, []);

    // --- GUEST SYNC LOGIC ---
    useEffect(() => {
        const syncGuestData = async () => {
            const hasIntent = searchParams.get('intent') === 'guest_sync';
            if (hasIntent && guestArtifact) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setLoading(true);
                    try {
                        const res = await fetch('/api/sync-guest-data', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(guestArtifact)
                        });
                        if (res.ok) {
                            const data = await res.json();
                            clearGuestArtifact();
                            router.push(`/plan/${data.planId}`);
                        } else {
                            throw new Error("Sync failed");
                        }
                    } catch (e) {
                        console.error("Sync error:", e);
                        router.push('/dashboard');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        };
        syncGuestData();
    }, [searchParams, guestArtifact]);

    // --- HANDLERS ---
    const checks = requirements.map((requirement, index) => (
        <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(password)} />
    ));
    const strength = getStrength(password);
    const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

    const handleEmailSignUp = async (e) => {
        e.preventDefault();

        if (!termsAccepted) {
            setError("You must agree to the Terms & Privacy Policy.");
            return;
        }

        if (strength !== 100) {
            setError("Password does not meet all requirements.");
            return;
        }
        setLoading(true);
        setError('');
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    emailRedirectTo: `${window.location.origin}/sign-in`,
                    // Metadata to track source
                    data: { source: 'guest_conversion' }
                }
            });

            if (error) throw error;

            // --- CRITICAL FIX: Check if session was created immediately ---
            if (data.session) {
                // User is signed in! (Email confirmation might be off or auto-confirmed)
                // Trigger the sync logic directly.
                await performGuestSync(data.session);
            } else {
                // Standard flow: Email verification required
                setSuccess("Success! Please check your email to verify your account.");
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };
  
    const handleGoogleSignIn = async () => {

        if (!termsAccepted) {
            setError("You must agree to the Terms & Privacy Policy.");
            return;
        }
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
    };

    const performGuestSync = async (currentSession) => {
        const hasIntent = searchParams.get('intent') === 'guest_sync';
        
        if (hasIntent && guestArtifact) {
            try {
                const res = await fetch('/api/sync-guest-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(guestArtifact)
                });
                
                if (res.ok) {
                    const data = await res.json();
                    clearGuestArtifact();
                    router.push(`/plan/${data.planId}`);
                    return;
                }
            } catch (e) {
                console.error("Sync error:", e);
            }
        }
        
        // Fallback or No Guest Data
        router.push('/dashboard');
    };

    // --- STYLES ---
    const inputStyles = {
        input: { 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderRadius: '12px',
            padding: '24px 16px 24px 50px', // Corrected padding for icons
            transition: 'all 0.2s ease',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            '&:focus': {
                borderColor: '#BF5AF2',
                boxShadow: '0 0 0 1px #BF5AF2, inset 0 2px 4px rgba(0,0,0,0.5)'
            }
        },
        label: { color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontSize: '0.9rem' }
    };

    return (
        <Box 
            style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            onMouseMove={handleMouse}
        >
            <AuthBackground />

            <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 20 }}>
                <Interactive>
                    <Link href="/" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconArrowLeft size={20} /> <Text size="sm">Back to Base</Text>
                    </Link>
                </Interactive>
            </div>

            <Container size="xs" style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10, perspective: 1000 }}>
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
                            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.7)'
                        }}
                    >
                        {/* --- NEW: GUEST PLAN CONTEXT --- */}
                        {guestArtifact && (
                            <Alert 
                                variant="light" 
                                color="teal" 
                                icon={<IconCloudUpload size={16} />} 
                                title="Save Your Progress"
                                mb="xl"
                                styles={{ 
                                    root: { backgroundColor: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)' },
                                    message: { color: '#2dd4bf' },
                                    title: { color: '#5eead4', fontFamily: 'var(--font-lexend)' }
                                }}
                            >
                                Create an account using Email to permanently save your <strong>{guestArtifact.examName}</strong> strategy.
                            </Alert>
                        )}
                        <Stack gap="xl">
                            {/* Header */}
                            <div className="text-center">
                                <Title order={2} className="apple-text-gradient" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>
                                    Initialize Identity
                                </Title>
                                <Text c="dimmed" size="sm" mt={4}>
                                    Create your secure profile.
                                </Text>
                            </div>

                            {error && <Alert color="red" variant="light" title="Registration Failed" withCloseButton onClose={() => setError('')} icon={<IconX/>}>{error}</Alert>}
                            {success && <Alert color="green" variant="light" title="Verify Email" icon={<IconCheck/>}>{success}</Alert>}

                            {!success && (
                                <form onSubmit={handleEmailSignUp}>
                                    <Stack gap="md">
                                        <TextInput 
                                            label="Full Name (Optional)" 
                                            placeholder="Your name" 
                                            leftSection={<IconUser size={18} color="gray" />}
                                            styles={inputStyles}
                                        />
                                        <TextInput 
                                            label="Email Credentials" 
                                            placeholder="you@kalpad.ai" 
                                            leftSection={<IconMail size={18} color="gray" />}
                                            value={email} onChange={(e) => setEmail(e.target.value)} 
                                            required 
                                            styles={inputStyles}
                                        />
                                        
                                        <Popover opened={popoverOpened} position="bottom" width="target" transitionProps={{ transition: 'pop' }}>
                                            <Popover.Target>
                                                <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
                                                    <PasswordInput
                                                        label="Passcode"
                                                        placeholder="Create password"
                                                        leftSection={<IconLock size={18} color="gray" />}
                                                        value={password}
                                                        onChange={(event) => setPassword(event.currentTarget.value)}
                                                        required
                                                        styles={inputStyles}
                                                    />
                                                </div>
                                            </Popover.Target>
                                            <Popover.Dropdown style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }}>
                                                <Progress color={color} value={strength} size={6} mb="sm" radius="xl" />
                                                <PasswordRequirement label="At least 8 chars" meets={password.length > 7} />
                                                {checks}
                                            </Popover.Dropdown>
                                        </Popover>

                                        <Checkbox
                                            checked={termsAccepted}
                                            onChange={(event) => setTermsAccepted(event.currentTarget.checked)}
                                            label={
                                                <Text size="xs" c="dimmed" lh={1.4}>
                                                    I agree to the <Anchor href="/terms" target="_blank" c="brandPurple">Terms of Service</Anchor> and <Anchor href="/privacy" target="_blank" c="brandPurple">Privacy Policy</Anchor>.
                                                </Text>
                                            }
                                            color="violet"
                                            size="xs"
                                            styles={{ 
                                                label: { paddingLeft: 8 },
                                                input: { cursor: 'pointer', borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' }
                                            }}
                                        />

                                        <Interactive>
                                            <ShimmerButton type="submit" fullWidth size="lg" radius="xl" loading={loading} style={{ marginTop: 8 }}>
                                                Create Account
                                            </ShimmerButton>
                                        </Interactive>
                                    </Stack>
                                </form>
                            )}

                            {!isAndroidApp && !success && (
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
                                            Sign up with Google
                                        </Button>
                                    </Interactive>
                                </>
                            )}

                            <Text c="dimmed" size="xs" ta="center">
                                Already have an identity? {' '}
                                <Anchor component={Link} href="/sign-in" c="brandPurple" fw={600}>
                                    Access Terminal
                                </Anchor>
                            </Text>
                        </Stack>
                    </GlassCard>
                </motion.div>
            </Container>
        </Box>
    );
}