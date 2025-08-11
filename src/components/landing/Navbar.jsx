// src/components/landing/Navbar.jsx
"use client";

import { Container, Group, Button, Title } from '@mantine/core';
import { ShimmerButton } from './ShimmerButton';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useLoading } from '@/context/LoadingContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';

export function Navbar() {
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const [session, setSession] = useState(null);
    
    // This hook is now used to get the session state, not just for redirection
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    const handleNavigation = (path) => {
        setIsLoading(true);
        router.push(path);
    };

    return (
        <header style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            backgroundColor: 'rgba(10, 10, 20, 0.5)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--mantine-color-dark-5)',
        }}>
            <Container size="xl" h={70}>
                <Group justify="space-between" h="100%">
                    <Title 
                        order={3} 
                        ff="Lexend, sans-serif" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleNavigation('/')}
                    >
                        KalPad
                    </Title>
                    
                    {/* --- FIX #1: Auth-Aware Buttons --- */}
                    {session ? (
                        // User is LOGGED IN
                        <ShimmerButton 
                            onClick={() => handleNavigation('/dashboard')}
                            size="sm" 
                            color="brandGreen" 
                            radius="xl"
                        >
                           Go to Dashboard
                        </ShimmerButton>
                    ) : (
                        // User is LOGGED OUT
                        <Group>
                            <Button 
                                component="a" // Use a standard anchor tag for simple navigation
                                href="/sign-in"
                                variant="subtle" 
                                color="gray"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavigation('/sign-in');
                                }}
                            >
                                Sign In
                            </Button>
                            <ShimmerButton 
                                component="a"
                                href="/sign-up"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavigation('/sign-up');
                                }}
                                size="sm" 
                                color="brandPurple" 
                                radius="xl"
                            >
                                Get Started Free
                            </ShimmerButton>
                        </Group>
                    )}
                </Group>
            </Container>
        </header>
    );
}