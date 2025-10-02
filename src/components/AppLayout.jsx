// src/components/AppLayout.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { AppShell, Burger, Group, NavLink, Text, Menu, Avatar, rem, UnstyledButton, ActionIcon, Stack, Title, Paper, SimpleGrid, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import supabase from '@/lib/supabaseClient';
import { useOnboarding } from '@/context/OnboardingContext';
import { OnboardingTour } from './OnboardingTour';
import { AnimatePresence, motion } from 'framer-motion'; // <-- DEFINITIVE ADDITION #1: Import animation tools
import { 
    IconLayoutDashboard, 
    IconFileText, 
    IconPlus, 
    IconUser, 
    IconLogout,
    IconChevronRight,
    IconChevronLeft,
    IconSettings,
    IconChartBar,
} from '@tabler/icons-react';

import onboardingSteps from '@/lib/onboardingSteps';

// --- SUB-COMPONENT: UserButton (Unchanged) ---
function UserButton({ user, desktopOpened, onSignOut }) {
    // ... (This component's code is unchanged)
    const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'KP';
    return (
        <Menu shadow="md" width={220} position="top-end" withArrow>
            <Menu.Target>
                <UnstyledButton
                    style={(theme) => ({
                        display: 'block', width: '100%', padding: theme.spacing.md,
                        color: theme.colors.dark[0], borderRadius: theme.radius.md,
                        '&:hover': { backgroundColor: theme.colors.dark[5] },
                    })}
                >
                    <Group>
                        <Avatar color="brandPurple" radius="xl">{userInitials}</Avatar>
                        {desktopOpened && (
                            <div style={{ flex: 1 }}>
                                <Text size="sm" fw={500}>{user?.email?.split('@')[0]}</Text>
                                <Text c="dimmed" size="xs">Student</Text>
                            </div>
                        )}
                    </Group>
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />} disabled>Profile</Menu.Item>
                <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />} disabled>Settings</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />} onClick={onSignOut}>Sign Out</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

// --- SUB-COMPONENT: MainNavbar for Sidebar (Unchanged) ---
function MainNavbar({ desktopOpened, toggleDesktop, onNavigate }) {
    // ... (This component's code is unchanged)
    const pathname = usePathname();
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: IconFileText, label: 'All Plans', href: '/plans' },
        { icon: IconPlus, label: 'New Plan', href: '/new-plan', id: 'new-plan-button' },
        { icon: IconChartBar, label: 'Analytics', href: '#', disabled: true },
    ];
    return (
        <Stack justify="space-between" h="100%">
            <Stack>
                <Group justify={desktopOpened ? 'space-between' : 'center'}>
                    {desktopOpened && <Text size="xs" fw={700} c="dimmed">NAVIGATION</Text>}
                    <ActionIcon onClick={toggleDesktop} variant="default" size="lg" visibleFrom="sm">
                        {desktopOpened ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
                    </ActionIcon>
                </Group>
                {navLinks.map((link) => (
                    <NavLink
                        id={link.id}
                        key={link.label + (desktopOpened ? '-full' : '-mini')}
                        label={desktopOpened ? link.label : null}
                        leftSection={<link.icon size="1.25rem" stroke={1.5} />}
                        onClick={() => {
                            // Dispatch the event before navigating
                            window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));
                            onNavigate(link.href);
                        }}
                        active={pathname === link.href}
                        disabled={link.disabled}
                        variant="filled"
                        styles={(theme) => ({
                            root: { borderRadius: theme.radius.md, padding: rem(12), justifyContent: desktopOpened ? 'flex-start' : 'center',
                                '&[data-active]': {
                                   backgroundColor: theme.colors.brandPurple[6],
                                   color: 'white',
                                   '&:hover': { backgroundColor: theme.colors.brandPurple[6] }
                                },
                             },
                            label: { fontSize: theme.fontSizes.md, fontWeight: 500, fontFamily: 'var(--font-lexend)' },
                        })}
                    />
                ))}
            </Stack>
        </Stack>
    );
}

// --- DEFINITIVE ADDITION: THE RE-ARCHITECTED BOTTOM NAVIGATION BAR ---
function BottomNavbar({ user, onNavigate, onSignOut }) {
    const pathname = usePathname();
    const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'KP';
    
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: IconPlus, label: 'New Plan', href: '/new-plan', id: 'new-plan-button' },
        { icon: IconFileText, label: 'All Plans', href: '/plans' },
    ];

    return (
        <Paper 
            p="xs" shadow="xl" radius={0}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(37, 38, 43, 0.8)', backdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--mantine-color-dark-5)', zIndex: 1000,
            }}
            hiddenFrom="sm"
        >
            <SimpleGrid cols={4} spacing={0}>
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <UnstyledButton id={link.id} key={link.label} onClick={() => onNavigate(link.href)}>
                            {/* --- DEFINITIVE FIX #1: The "Purple Pill" --- */}
                            <Box 
                                style={{
                                    borderRadius: 'var(--mantine-radius-md)',
                                    padding: 'var(--mantine-spacing-xs)',
                                    backgroundColor: isActive ? 'var(--mantine-color-brandPurple-6)' : 'transparent',
                                    transition: 'background-color 0.2s ease',
                                }}
                            >
                                <Stack align="center" gap={2}>
                                    <link.icon 
                                        size="1.5rem" 
                                        stroke={1.5} 
                                        color={isActive ? 'white' : 'var(--mantine-color-gray-5)'}
                                    />
                                    <Text 
                                        size="xs" 
                                        c={isActive ? 'white' : 'gray.5'}
                                    >
                                        {link.label}
                                    </Text>
                                </Stack>
                            </Box>
                        </UnstyledButton>
                    );
                })}
                {/* Profile Menu Button (Unchanged) */}
                <Menu shadow="md" width={220} position="top-end" withArrow>
                    <Menu.Target>
                        <UnstyledButton>
                            <Box style={{ borderRadius: 'var(--mantine-radius-md)', padding: 'var(--mantine-spacing-xs)' }}>
                                <Stack align="center" gap={2}>
                                    <Avatar color="brandPurple" radius="xl" size="sm">{userInitials}</Avatar>
                                    <Text size="xs" c="gray.5">Profile</Text>
                                </Stack>
                            </Box>
                        </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />} disabled>Profile</Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />} onClick={onSignOut}>Sign Out</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </SimpleGrid>
        </Paper>
    );
}

// --- MAIN LAYOUT COMPONENT (RE-ARCHITECTED FOR ANIMATIONS) ---
export default function AppLayout({ children, session }) {
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const pathname = usePathname();

    const { profile, isLoading: isProfileLoading, startTour } = useOnboarding();

// REPLACE the useEffect in AppLayout.jsx with this
useEffect(() => {
    const firstStep = onboardingSteps[0];
    // --- DEFINITIVE FIX: Add a check for the current pathname ---
    if (
        !isProfileLoading && 
        profile && 
        !profile.has_completed_onboarding &&
        pathname === firstStep.route // Only start the tour if we are on the correct starting page
    ) {
        const timer = setTimeout(() => {
            startTour();
        }, 1000);
        return () => clearTimeout(timer);
    }
}, [isProfileLoading, profile, startTour, pathname]); // Add pathname to dependency array

    const handleNavigation = (path) => {
        if (pathname === path || path === '#') return;
        setIsLoading(true);
        router.push(path);
    };
    
    const handleSignOut = () => {
        supabase.auth.signOut().then(() => handleNavigation('/'));
    };

    const headerGlass = { backgroundColor: 'rgba(23, 24, 28, 0.6)', backdropFilter: 'blur(16px)', border: 'none' };
    const navbarGlass = { backgroundColor: 'rgba(37, 38, 43, 0.5)', backdropFilter: 'blur(16px)', borderRight: '1px solid var(--mantine-color-dark-5)', transition: 'width 200ms ease-in-out' };

    if (!session) {
      // Non-logged-in layout is unchanged
      return (
          <AppShell header={{ height: 70 }} padding="md">
              <AppShell.Header style={headerGlass}>
                  <Group h="100%" px="lg"><Title order={2} ff="Lexend, sans-serif">KalPad</Title></Group>
              </AppShell.Header>
              <AppShell.Main>{children}</AppShell.Main>
          </AppShell>
      );
  }

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: desktopOpened ? 280 : 80, breakpoint: 'sm', collapsed: { mobile: true, desktop: false } }}
      padding="md"
      style={{ paddingBottom: '80px' }}
    >
      <AppShell.Header style={headerGlass}>
        <Group h="100%" px="lg"><Title order={2} ff="Lexend, sans-serif">KalPad</Title></Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={navbarGlass} visibleFrom="sm">
          <MainNavbar 
              desktopOpened={desktopOpened}
              toggleDesktop={toggleDesktop}
              onNavigate={handleNavigation}
          />
          <UserButton 
              user={session?.user} 
              desktopOpened={desktopOpened}
              onSignOut={handleSignOut}
          />
      </AppShell.Navbar>

      <OnboardingTour /> 

      <AppShell.Main>
          {/* --- DEFINITIVE FIX #2: PAGE TRANSITION ANIMATIONS --- */}
          <AnimatePresence mode="wait">
              <motion.div
                  key={pathname} // This key is critical for AnimatePresence to detect page changes
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                  {children}
              </motion.div>
          </AnimatePresence>
      </AppShell.Main>

      <BottomNavbar 
          user={session?.user}
          onNavigate={handleNavigation}
          onSignOut={handleSignOut}
      />
    </AppShell>
  );
}