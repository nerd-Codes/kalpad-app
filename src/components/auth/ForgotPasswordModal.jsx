// src/components/auth/ForgotPasswordModal.jsx
"use client";
import { useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { Modal, TextInput, Button, Group, Text, Alert } from '@mantine/core';

export function ForgotPasswordModal({ opened, onClose }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`, // <-- Page where user will set a new password
            });
            if (error) throw error;
            setSuccess("Success! If an account exists for this email, a password reset link has been sent.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Reset state when modal is closed
    const handleClose = () => {
        setEmail('');
        setError('');
        setSuccess('');
        onClose();
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Reset Your Password" centered>
            {success ? (
                <Alert color="green" title="Check Your Email">{success}</Alert>
            ) : (
                <form onSubmit={handlePasswordReset}>
                    <Text c="dimmed" size="sm" mb="md">
                        Enter the email address associated with your account, and we'll send you a link to reset your password.
                    </Text>
                    <TextInput 
                        label="Email" 
                        placeholder="you@kalpad.ai" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        type="email"
                    />
                    {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}
                    <Group justify="flex-end" mt="xl">
                        <Button type="submit" color="brandPurple" loading={loading}>
                            Send Reset Link
                        </Button>
                    </Group>
                </form>
            )}
        </Modal>
    );
}