// src/app/reset-password/page.js
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { Container, Title, Text, PasswordInput, Button, Alert } from '@mantine/core';
import { GlassCard } from '@/components/GlassCard';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            // Supabase automatically reads the reset token from the URL
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess("Your password has been reset successfully! You can now sign in.");
            // Optional: redirect after a few seconds
            setTimeout(() => router.push('/sign-in'), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="xs" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
            <Title ta="center">Set a New Password</Title>
            <Text c="dimmed" ta="center" mt="xs" mb={30}>
                Enter your new password below.
            </Text>
            <GlassCard>
                {error && <Alert color="red" title="Error">{error}</Alert>}
                {success && <Alert color="green" title="Success">{success}</Alert>}

                {!success && (
                    <form onSubmit={handlePasswordReset}>
                        <PasswordInput 
                            label="New Password" 
                            placeholder="Enter your new password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" fullWidth mt="xl" color="brandPurple" loading={loading}>
                            Update Password
                        </Button>
                    </form>
                )}
            </GlassCard>
        </Container>
    );
}