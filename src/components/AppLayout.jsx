// src/components/AppLayout.jsx
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Avatar, Group, Stack, Box, Menu, SimpleGrid, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import supabase from '@/lib/supabaseClient';
import { useOnboarding } from '@/context/OnboardingContext';
import { OnboardingTour } from './OnboardingTour';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    IconLayoutDashboard, 
    IconFileText, 
    IconPlus, 
    IconUser, 
    IconLogout,
    IconChartBar,
    IconSettings,
} from '@tabler/icons-react';
import onboardingSteps from '@/lib/onboardingSteps';

// --- IMPORTS ---
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';

// --- 1. THE FLOATING SIDEBAR (DESKTOP) ---
function FloatingSidebar({ user, onNavigate, onSignOut }) {
    const pathname = usePathname();
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: IconFileText, label: 'All Plans', href: '/plans' },
        { icon: IconPlus, label: 'New Plan', href: '/new-plan', id: 'new-plan-button' },
        { icon: IconChartBar, label: 'Analytics', href: '#', disabled: true },
    ];

    return (
        <GlassCard 
            className="fixed left-4 top-4 bottom-4 w-64 flex flex-col z-50 hidden md:flex"
            style={{ 
                position: 'fixed', left: '16px', top: '16px', bottom: '16px', width: '260px',
                display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 50 
            }}
            animate={false} // Static container
        >
            {/* Logo Area - TEXT ONLY as requested */}
            <Box mb={40} px={8} pt={8}>
                <Title order={2} className="apple-text-gradient" style={{ letterSpacing: '-0.03em', fontSize: '1.75rem' }}>
                    KalPad
                </Title>
                <Text size="xs" c="dimmed" fw={500} style={{ letterSpacing: '0.1em' }} tt="uppercase">
                    
                </Text>
            </Box>

            {/* Navigation Links */}
            <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="xs" fw={600} c="dimmed" px={12} mb={4} tt="uppercase" style={{ letterSpacing: '0.05em' }}>Menu</Text>
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Interactive key={link.label} onClick={() => {
                            if (link.disabled) return;
                            window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));
                            onNavigate(link.href);
                        }}>
                            <Box
                                id={link.id}
                                py={10} px={12}
                                style={{
                                    borderRadius: '12px',
                                    backgroundColor: isActive ? 'rgba(191, 90, 242, 0.15)' : 'transparent', // Purple tint
                                    color: isActive ? '#BF5AF2' : 'var(--apple-text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    transition: 'color 0.2s ease',
                                    opacity: link.disabled ? 0.5 : 1,
                                    cursor: link.disabled ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <link.icon size={20} stroke={isActive ? 2 : 1.5} />
                                <Text size="sm" fw={isActive ? 600 : 500}>{link.label}</Text>
                            </Box>
                        </Interactive>
                    );
                })}
            </Stack>

            {/* User Profile (Bottom) */}
            <Menu shadow="md" width={220} position="top-start" withArrow>
                <Menu.Target>
                    <Box pt={16} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <Interactive>
                            <Group style={{ cursor: 'pointer', padding: '8px', borderRadius: '12px' }}>
                                <Avatar color="violet" radius="xl" size="md">{user?.email?.substring(0, 2).toUpperCase()}</Avatar>
                                <div style={{ flex: 1 }}>
                                    <Text size="sm" fw={600} c="var(--apple-text-primary)" truncate>{user?.email?.split('@')[0]}</Text>
                                    <Text size="xs" c="dimmed">Student</Text>
                                </div>
                                <IconSettings size={16} color="var(--apple-text-secondary)" />
                            </Group>
                        </Interactive>
                    </Box>
                </Menu.Target>
                <Menu.Dropdown style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }}>
                    <Menu.Item leftSection={<IconUser size={14} />} disabled>Profile</Menu.Item>
                    <Menu.Divider color="#2C2C2E" />
                    <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={onSignOut}>Sign Out</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </GlassCard>
    );
}

// --- 2. THE FLUID BOTTOM SHEET (MOBILE) ---
// Reverted to fixed bottom, full width, but upgraded materials
function MobileNavbar({ user, onNavigate, onSignOut }) {
    const pathname = usePathname();
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Home', href: '/dashboard' },
        { icon: IconPlus, label: 'Create', href: '/new-plan', id: 'new-plan-button' },
        { icon: IconFileText, label: 'Plans', href: '/plans' },
    ];

    return (
        <Box
            style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(28, 28, 30, 0.85)', // Deep, substantial dark glass
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '12px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))', // Respect iOS Home Indicator
                paddingLeft: '16px', paddingRight: '16px',
                zIndex: 1000
            }}
        >
            <SimpleGrid cols={4} spacing={0}>
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Interactive key={link.label} onClick={() => onNavigate(link.href)}>
                            <Stack align="center" gap={4} id={link.id} style={{ padding: '8px' }}>
                                {/* The Fluid Active Indicator (Purple Glow) */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '6px 20px',
                                        borderRadius: '20px', // Soft Pill shape
                                        backgroundColor: isActive ? 'rgba(191, 90, 242, 0.2)' : 'transparent',
                                        transition: 'background-color 0.3s ease'
                                    }}
                                >
                                    <link.icon 
                                        size={22} 
                                        stroke={isActive ? 2 : 1.5} 
                                        color={isActive ? '#BF5AF2' : 'var(--apple-text-secondary)'} 
                                    />
                                </Box>
                                <Text size="10px" fw={600} c={isActive ? 'white' : 'dimmed'}>
                                    {link.label}
                                </Text>
                            </Stack>
                        </Interactive>
                    );
                })}

                {/* Mobile Profile Menu */}
                {/* Mobile Profile Menu */}
                <Menu shadow="xl" width={200} position="top-end" withArrow offset={10}>
                    <Menu.Target>
                        {/* FIX: Replaced <Interactive> with <UnstyledButton> to pass the ref correctly for positioning */}
                        <UnstyledButton style={{ cursor: 'pointer' }}>
                            <Stack align="center" gap={4} style={{ padding: '8px' }}>
                                <Box style={{ padding: '6px 20px' }}>
                                    <Avatar 
                                        color="violet" 
                                        radius="xl" 
                                        size={22} 
                                        style={{ border: '1.5px solid rgba(255,255,255,0.2)' }}
                                    >
                                        {user?.email?.substring(0, 2).toUpperCase()}
                                    </Avatar>
                                </Box>
                                <Text size="10px" fw={600} c="dimmed">Profile</Text>
                            </Stack>
                        </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E', marginBottom: '10px' }}>
                        <Menu.Item leftSection={<IconUser size={14} />} disabled>Profile</Menu.Item>
                        <Menu.Divider color="#2C2C2E" />
                        <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={onSignOut}>Sign Out</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </SimpleGrid>
        </Box>
    );
}

// --- 3. MAIN LAYOUT ---
export default function AppLayout({ children, session, isGuest }) {
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const pathname = usePathname();
    const { profile, isLoading: isProfileLoading, startTour } = useOnboarding();
    const isDesktop = useMediaQuery('(min-width: 768px)'); 

    // Tour Logic (Unchanged)
    useEffect(() => {
        const firstStep = onboardingSteps[0];
        if (!isProfileLoading && profile && !profile.has_completed_onboarding && pathname === firstStep.route && isDesktop) {
            const timer = setTimeout(() => { startTour(); }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isProfileLoading, profile, startTour, pathname, isDesktop]);

    const handleNavigation = (path) => {
        if (pathname === path || path === '#') return;
        setIsLoading(true);
        router.push(path);
    };
    
    const handleSignOut = () => {
        supabase.auth.signOut().then(() => handleNavigation('/'));
    };

    // Guest Mode: Simple Wrapper
    if (isGuest) {
        return (
            <Box style={{ minHeight: '100vh', padding: '24px' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</motion.div>
            </Box>
        );
    }

    if (!session) return <Box p="md">{children}</Box>;

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>
            {/* Desktop Sidebar (Floating) */}
            {isDesktop && (
                 <FloatingSidebar user={session.user} onNavigate={handleNavigation} onSignOut={handleSignOut} />
            )}

            <OnboardingTour />

            {/* Main Content Area */}
            <main style={{ 
                flex: 1, 
                marginLeft: isDesktop ? '300px' : '0', // Offset for sidebar
                padding: isDesktop ? '32px' : '16px',
                paddingBottom: isDesktop ? '32px' : '120px', // Extra padding for mobile navbar
                maxWidth: '1600px', 
                marginRight: 'auto'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.99 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Apple-style easing
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Mobile Navbar (Fixed Bottom) */}
            {!isDesktop && (
                <MobileNavbar user={session.user} onNavigate={handleNavigation} onSignOut={handleSignOut} />
            )}
        </div>
    );
}