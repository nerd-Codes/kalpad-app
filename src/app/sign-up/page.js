// src/app/sign-up/page.js
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';

// Mantine & UI Imports
import { Container, Title, Text, TextInput, PasswordInput, Button, Group, Divider, Alert, Anchor, Popover, Progress, Box } from '@mantine/core';
import { IconMail, IconLock, IconUser, IconBrandGoogle, IconCheck, IconX } from '@tabler/icons-react';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import { GlassCard } from '@/components/GlassCard';
import { PasswordRequirement } from '@/components/auth/PasswordRequirement';

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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(password)} />
  ));
  const strength = getStrength(password);
  const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (strength !== 100) {
        setError("Password does not meet all requirements.");
        return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/sign-in`,
        }
      });
      if (error) throw error;
      setSuccess("Success! Please check your email to verify your account.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // --- THIS IS THE FIX: The missing Google Sign-In handler ---
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
        <Title ta="center">Create an Account</Title>
        <Text c="dimmed" ta="center" mt="xs" mb={30}>
            Already have an account?{' '}
            <Anchor component={Link} href="/sign-in">Sign in</Anchor>
        </Text>

        <GlassCard>
            {error && <Alert color="red" title="Sign Up Failed" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert color="green" title="Success!" mb="md">{success}</Alert>}

            {!success && (
              <form onSubmit={handleEmailSignUp}>
                  <TextInput leftSection={<IconUser size={16} />} label="Full Name (Optional)" placeholder="Your name" />
                  <TextInput leftSection={<IconMail size={16} />} mt="md" label="Email" placeholder="you@kalpad.ai" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  
                  <Popover opened={popoverOpened} position="bottom" width="target" transitionProps={{ transition: 'pop' }}>
                      <Popover.Target>
                          <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
                              <PasswordInput
                                  leftSection={<IconLock size={16} />}
                                  mt="md"
                                  label="Password"
                                  placeholder="Your password"
                                  value={password}
                                  onChange={(event) => setPassword(event.currentTarget.value)}
                                  required
                              />
                          </div>
                      </Popover.Target>
                      <Popover.Dropdown>
                          <Progress color={color} value={strength} size={5} mb="sm" />
                          <PasswordRequirement label="Has at least 8 characters" meets={password.length > 7} />
                          {checks}
                      </Popover.Dropdown>
                  </Popover>

                  <ShimmerButton type="submit" fullWidth mt="xl" size="md" color="brandPurple" loading={loading}>
                      Create Account
                  </ShimmerButton>
              </form>
            )}

            <Divider label="Or" labelPosition="center" my="lg" />

            <Button fullWidth variant="default" leftSection={<IconBrandGoogle size={18} />} onClick={handleGoogleSignIn}>
                Sign up with Google
            </Button>
        </GlassCard>
    </Container>
  );
}