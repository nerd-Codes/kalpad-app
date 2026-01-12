// src/components/landing/Navbar.jsx
"use client";

import { useState, useEffect } from 'react';
import { Group, Button, Title, Box, Burger, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconLogin, IconLayoutDashboard, IconLogout, IconUser } from '@tabler/icons-react';
import { Interactive } from '@/components/Interactive';
import supabase from '@/lib/supabaseClient';

export function Navbar() {
    const [opened, { toggle }] = useDisclosure(false);
    const [session, setSession] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
        };
        getSession();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        router.refresh();
    };

    return (
        <Box 
            style={{ 
                position: 'fixed', 
                top: '20px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 1000,
                width: 'auto',
                maxWidth: '90vw'
            }}
        >
            <Interactive>
                <Box
                    px="md"
                    py={8}
                    style={{
                        backgroundColor: 'rgba(20, 20, 25, 0.75)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '999px',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '32px'
                    }}
                >
                    {/* 1. Wordmark */}
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <Title 
                            order={4} 
                            className="apple-text-gradient"
                            style={{ 
                                fontFamily: 'var(--font-lexend)', 
                                letterSpacing: '-0.02em',
                                fontSize: '1.2rem',
                                paddingLeft: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            KalPad
                        </Title>
                    </Link>

                    {/* 2. Desktop Links */}
                    <Group gap="xs" visibleFrom="sm">
                        <Button 
                            component={Link} href="/about" 
                            variant="subtle" color="gray" size="compact-sm" radius="xl"
                            style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            About
                        </Button>
                        <Button 
                            component={Link} href="/pricing" 
                            variant="subtle" color="gray" size="compact-sm" radius="xl"
                            style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            Pricing
                        </Button>
                        <Button 
                            component={Link} href="/contact" 
                            variant="subtle" color="gray" size="compact-sm" radius="xl"
                            style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            Contact Us
                        </Button>
                    </Group>

                    {/* 3. Action Area (Auth Aware) */}
                    <Group gap="xs">
                        {!session ? (
                            // --- GUEST STATE ---
                            <>
                                <Button 
                                    component={Link} 
                                    href="/sign-in" 
                                    variant="subtle" 
                                    size="sm" 
                                    radius="xl"
                                    visibleFrom="xs"
                                    style={{ color: 'white', fontWeight: 500 }}
                                >
                                    Sign In
                                </Button>
                                
                                <Button 
                                    component={Link} 
                                    href="/sign-up" 
                                    variant="gradient" 
                                    gradient={{ from: '#BF5AF2', to: '#5E5CE6', deg: 135 }}
                                    size="sm" 
                                    radius="xl"
                                    style={{ 
                                        boxShadow: '0 4px 15px rgba(191, 90, 242, 0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    Get Started
                                </Button>
                            </>
                        ) : (
                            // --- LOGGED IN STATE ---
                            <Button 
                                component={Link} 
                                href="/dashboard" 
                                variant="gradient" 
                                gradient={{ from: '#BF5AF2', to: '#5E5CE6', deg: 135 }}
                                size="sm" 
                                radius="xl"
                                leftSection={<IconLayoutDashboard size={16} />}
                                style={{ 
                                    boxShadow: '0 4px 15px rgba(191, 90, 242, 0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                Dashboard
                            </Button>
                        )}

                        {/* Mobile/Profile Menu */}
                        
                    </Group>
                </Box>
            </Interactive>
        </Box>
    );
}