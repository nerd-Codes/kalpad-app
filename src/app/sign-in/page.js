// src/app/sign-in/page.js
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

// Mantine & UI Imports
import { Container, Title, Text, TextInput, PasswordInput, Button, Group, Divider, Alert, Anchor } from '@mantine/core';
import { IconMail, IconLock, IconBrandGoogle } from '@tabler/icons-react';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { GlassCard } from '@/components/GlassCard';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const [forgotModalOpened, { open: openForgotModal, close: closeForgotModal }] = useDisclosure(false);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <Container size="xs" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <Title ta="center">Welcome Back</Title>
        <Text c="dimmed" ta="center" mt="xs" mb={30}>
            Don't have an account?{' '}
            <Anchor component={Link} href="/sign-up">Create one now</Anchor>
        </Text>

        <GlassCard>
            {error && <Alert color="red" title="Login Failed" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>}

            <form onSubmit={handleEmailSignIn}>
                <TextInput leftSection={<IconMail size={16} />} label="Email" placeholder="you@kalpad.ai" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <PasswordInput leftSection={<IconLock size={16} />} label="Password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} mt="md" required />
                <Group justify="flex-end" mt="sm">
                    <Anchor component="button" type="button" size="xs" onClick={openForgotModal}>Forgot password?</Anchor>
                </Group>
                <ShimmerButton type="submit" fullWidth mt="xl" size="md" color="brandPurple" loading={loading}>
                    Sign In
                </ShimmerButton>
            </form>

            <ForgotPasswordModal opened={forgotModalOpened} onClose={closeForgotModal} />

            <Divider label="Or" labelPosition="center" my="lg" />

            <Button fullWidth variant="default" leftSection={<IconBrandGoogle size={18} />} onClick={handleGoogleSignIn}>
                Sign in with Google
            </Button>
        </GlassCard>
    </Container>
  );
}