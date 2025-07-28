// src/components/AppLayout.jsx
"use client";
import { AppShell, Burger, Group, NavLink, Text, Menu, Avatar, rem, UnstyledButton, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation'; // <-- Import useRouter
import { useLoading } from '@/context/LoadingContext'; // <-- Import our loading hook
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

export default function AppLayout({ children, session }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const pathname = usePathname();
  const router = useRouter(); // <-- For navigation
  const { setIsLoading } = useLoading(); // <-- To trigger the loader

  const user = session?.user;
  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'KP';

  // --- NEW: A helper function to handle animated navigation ---
  const handleNavigation = (path) => {
    // If we're already on the page, do nothing
    if (pathname === path) return;
    
    setIsLoading(true);
    router.push(path);
    if(mobileOpened) toggleMobile(); // Close mobile menu on navigation
  };

  const navLinks = [
    { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: IconFileText, label: 'All Plans', href: '/plans' },
    { icon: IconPlus, label: 'New Plan', href: '/new-plan' },
    { icon: IconChartBar, label: 'Analytics', href: '#', disabled: true },
    { icon: IconSettings, label: 'Settings', href: '#', disabled: true },
  ];

  const glassStyle = {
    backgroundColor: 'rgba(37, 38, 43, 0.5)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: desktopOpened ? 280 : 80, 
        breakpoint: 'sm', 
        collapsed: { mobile: !mobileOpened } 
      }}
      padding="md"
    >
      <AppShell.Header style={{...glassStyle, borderBottom: '1px solid rgba(255, 255, 255, 0.1)'}}>
        <Group h="100%" px="md">
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Text fw={700} size="xl">KalPad</Text>
        </Group>
      </AppShell.Header>

      {/* --- FIX: The Sidebar is now Glassy --- */}
      <AppShell.Navbar p="md" style={{...glassStyle, borderRight: '1px solid rgba(255, 255, 255, 0.1)'}}>
        <Group justify={desktopOpened ? 'space-between' : 'center'} mb="lg">
            {desktopOpened && <Text fw={500} size="sm" >NAVIGATION</Text>}
            <ActionIcon onClick={toggleDesktop} variant="default" size="lg" visibleFrom="sm">
                {desktopOpened ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
            </ActionIcon>
        </Group>

        {navLinks.map((link) => (
            <NavLink
                key={link.label}
                label={desktopOpened ? link.label : ''}
                leftSection={<link.icon size="1.2rem" />}
                
                // --- FIX: Use onClick for animated navigation ---
                onClick={() => handleNavigation(link.href)}
                
                active={pathname === link.href}
                disabled={link.disabled}
                
                // --- FIX: Style the active link to be white with black text ---
                variant="filled" // This is key to making the background color apply
                styles={(theme) => ({
                    root: { 
                        borderRadius: theme.radius.md,
                        // Override the default active/filled styles
                        '&[data-active]': {
                           backgroundColor: 'white',
                           color: 'black',
                           '&:hover': {
                                backgroundColor: 'white',
                           }
                        },
                    },
                    label: { fontSize: theme.fontSizes.sm },
                })}
            />
        ))}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--mantine-color-dark-5)', paddingTop: 'var(--mantine-spacing-md)' }}>
            <Menu shadow="md" width={200} position="right-end" withArrow>
                <Menu.Target>
                    <UnstyledButton style={{ width: '100%' }}>
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
                    <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}>Profile</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                        color="red"
                        leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                        onClick={() => supabase.auth.signOut().then(() => handleNavigation('/'))}
                    >
                        Sign Out
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}