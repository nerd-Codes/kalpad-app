// src/components/AppLayout.jsx
"use client";

import { AppShell, Burger, Group, NavLink, Text, Menu, Avatar, rem, UnstyledButton, ActionIcon, Stack, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import supabase from '@/lib/supabaseClient';
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

// --- SUB-COMPONENT: UserButton ---
function UserButton({ user, desktopOpened, onSignOut }) {
    const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'KP';

    return (
        <Menu shadow="md" width={220} position="top-end" withArrow>
            <Menu.Target>
                <UnstyledButton
                    style={(theme) => ({
                        display: 'block',
                        width: '100%',
                        padding: theme.spacing.md,
                        color: theme.colors.dark[0],
                        borderRadius: theme.radius.md,
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
                <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}>
                    <Text c ="dimmed">Profile</Text>
                </Menu.Item>
                 <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}>
                    <Text c ="dimmed">Settings</Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    color="red"
                    leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                    onClick={onSignOut}
                >
                    Sign Out
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

// --- SUB-COMPONENT: MainNavbar ---
function MainNavbar({ desktopOpened, toggleDesktop, onNavigate }) {
    const pathname = usePathname();
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: IconFileText, label: 'All Plans', href: '/plans' },
        { icon: IconPlus, label: 'New Plan', href: '/new-plan' },
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
                        key={link.label + (desktopOpened ? '-full' : '-mini')}
                        label={desktopOpened ? link.label : null}
                        leftSection={<link.icon size="1.25rem" stroke={1.5} />}
                        onClick={() => onNavigate(link.href)}
                        active={pathname === link.href}
                        disabled={link.disabled}
                        variant="filled"
                        styles={(theme) => ({
                            root: {
                                borderRadius: theme.radius.md,
                                padding: rem(12),
                                justifyContent: desktopOpened ? 'flex-start' : 'center',
                                '&[dataActive': {
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

// --- MAIN LAYOUT COMPONENT ---
export default function AppLayout({ children, session }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const pathname = usePathname();

  const handleNavigation = (path) => {
    if (pathname === path || path === '#') return;
    setIsLoading(true);
    router.push(path);
    if(mobileOpened) toggleMobile();
  };
  
  const handleSignOut = () => {
      supabase.auth.signOut().then(() => handleNavigation('/'));
  };

  const headerGlass = {
    backgroundColor: 'rgba(23, 24, 28, 0.6)',
    backdropFilter: 'blur(16px)',
    border: 'none',
  };
  
  const navbarGlass = {
    backgroundColor: 'rgba(37, 38, 43, 0.5)', 
    backdropFilter: 'blur(16px)',
    borderRight: '1px solid var(--mantine-color-dark-5)',
    transition: 'width 200ms ease-in-out',
  };

  // --- DEFINITIVE FIX: Conditionally define the navbar configuration ---
  // If there is no session, the entire navbar object is null, so it will not be rendered.
  const navbarConfig = session ? { 
    width: desktopOpened ? 280 : 80, 
    breakpoint: 'sm', 
    collapsed: { mobile: !mobileOpened } 
  } : null;

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={navbarConfig} // Pass the conditional config object here
      padding="md"
    >
      <AppShell.Header style={headerGlass}>
        <Group h="100%" px="lg">
          {/* The Burger is now only rendered if a session exists, preventing a useless button */}
          {session && <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />}
          <Title order={2} ff="Lexend, sans-serif">KalPad</Title>
        </Group>
      </AppShell.Header>

      {/* Conditionally render the entire Navbar component */}
      {session && (
        <AppShell.Navbar p="md" style={navbarGlass}>
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
      )}

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}