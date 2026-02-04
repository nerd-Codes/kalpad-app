// src/components/AppLayout.jsx
"use client";

import { useState, useEffect } from 'react';
import { Title, Text, Avatar, Group, Stack, Box, Menu, SimpleGrid, UnstyledButton, Modal, Button, ThemeIcon, Tooltip } from '@mantine/core';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
    IconSettings,
    IconDiamond,
    IconCrown,
    IconRocket,
    IconCheck, IconBolt,
    IconFlask
} from '@tabler/icons-react';
import onboardingSteps from '@/lib/onboardingSteps';
import { usePerformance } from '@/context/PerformanceContext'; // Add this import

// --- IMPORTS ---
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { UpgradeModal } from './payment/UpgradeModal';
import { ShimmerButton } from './landing/ShimmerButton';

import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { TransactionStatusModal } from './payment/TransactionStatusModal';
import { FounderWelcomeModal } from './payment/FounderWelcomeModal';

// --- CONFIG: TIER VISUALS ---
const TIER_CONFIG = {
    'free': { 
        label: 'Free Tier', 
        color: 'white', 
        icon: IconUser, 
        ring: 'transparent',
        badgeColor: 'gray',
        isSpecial: false 
    },
    'pro_15': { 
        label: 'Pro Sprint', 
        color: '#CD7F32', 
        icon: IconRocket, 
        ring: '#CD7F32', 
        badgeColor: 'orange',
        isSpecial: false 
    },
    'pro_30': { 
        label: 'Pro Marathon', 
        color: '#E0E0E0', 
        icon: IconDiamond, 
        ring: '#E0E0E0', 
        badgeColor: 'gray',
        isSpecial: false 
    },
    'pro_90': { 
        label: 'Pro Semester', 
        color: '#FFD700', 
        icon: IconCrown, 
        ring: '#FFD700', 
        badgeColor: 'yellow',
        isSpecial: true 
    },
    'founder': { 
        label: 'Founder Edition', 
        color: '#BF5AF2', 
        icon: IconCrown, 
        ring: '#BF5AF2', 
        badgeColor: 'grape',
        isSpecial: true // Triggers extra shine
    },
    'pro_test': { label: 'Debug', color: '#F06595', icon: IconCheck, ring: '#F06595', badgeColor: 'pink', isSpecial: false }
};

// --- 1. THE FLOATING SIDEBAR (DESKTOP) ---
function FloatingSidebar({ user, tier, onNavigate, onSignOut }) {
    const pathname = usePathname();
    const config = TIER_CONFIG[tier] || TIER_CONFIG['free'];
    const TierIcon = config.icon;
    
    // Only show Upgrade if Free
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: IconFileText, label: 'All Plans', href: '/plans' },
        { icon: IconPlus, label: 'New Plan', href: '/new-plan', id: 'new-plan-button' },
        // { icon: IconFlask, label: 'Research', href: '/research' }, 
    ];

    if (tier === 'free') {
        navLinks.push({ icon: IconDiamond, label: 'Upgrade', action: 'upgrade', id: 'upgrade-button', color: '#BF5AF2' });
    }

    return (
        <GlassCard 
            className="fixed left-4 top-4 bottom-4 w-64 flex flex-col z-50 hidden md:flex"
            style={{ 
                position: 'fixed', left: '16px', top: '16px', bottom: '16px', width: '260px',
                display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 50 
            }}
            animate={false} 
        >
            {/* Logo & Tier Badge */}
            {/* Logo & Tier Badge */}
            <Box mb={40} px={8} pt={8}>
                {/* Dynamic Wordmark */}
                <Title 
                    order={2} 
                    style={{ 
                        letterSpacing: '-0.03em', 
                        fontSize: '1.75rem',
                        // If free, use white. If paid, use the Tier Color with a slight gradient effect.
                        color: tier === 'free' ? 'white' : 'transparent',
                        backgroundImage: tier !== 'free' ? `linear-gradient(135deg, white 20%, ${config.color} 100%)` : 'none',
                        backgroundClip: tier !== 'free' ? 'text' : 'border-box',
                        WebkitBackgroundClip: tier !== 'free' ? 'text' : 'border-box'
                    }}
                >
                    KalPad
                </Title>
                
                {/* Flashy Tier Badge */}
                <Box mt={6}>
                     {config.isSpecial ? (
                        <Box 
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '4px 10px', borderRadius: '99px',
                                background: `linear-gradient(90deg, ${config.color}20, ${config.color}40)`,
                                border: `1px solid ${config.color}`,
                                boxShadow: `0 0 15px ${config.color}40`
                            }}
                        >
                            <TierIcon size={12} color={config.color} fill={config.color} />
                            <Text size="10px" fw={800} c={config.color} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                {config.label}
                            </Text>
                        </Box>
                     ) : (
                        <Group gap={6}>
                            <TierIcon size={14} color={tier === 'free' ? 'gray' : config.color} />
                            <Text size="xs" c={tier === 'free' ? 'dimmed' : 'white'} fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                {config.label}
                            </Text>
                        </Group>
                     )}
                </Box>
            </Box>

            {/* Navigation Links */}
            <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="xs" fw={600} c="dimmed" px={12} mb={4} tt="uppercase" style={{ letterSpacing: '0.05em' }}>Menu</Text>
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Interactive key={link.label} onClick={() => {
                            if (link.action === 'upgrade') {
                                window.dispatchEvent(new CustomEvent('open-upgrade-modal'));
                            } else {
                                window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));
                                onNavigate(link.href);
                            }
                        }}>
                            <Box
                                id={link.id}
                                py={10} px={12}
                                style={{
                                    borderRadius: '12px',
                                    backgroundColor: isActive ? 'rgba(191, 90, 242, 0.15)' : 'transparent',
                                    color: isActive ? '#BF5AF2' : link.color || 'var(--apple-text-secondary)', 
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    transition: 'color 0.2s ease',
                                    cursor: 'pointer'
                                }}
                            >
                                <link.icon size={20} stroke={isActive ? 2 : 1.5} />
                                <Text size="sm" fw={isActive || link.action === 'upgrade' ? 600 : 500}>{link.label}</Text>
                            </Box>
                        </Interactive>
                    );
                })}
            </Stack>

            {/* User Profile */}
            <Group justify="center" mb="md">
                    <Tooltip label="Reduce animations for slower devices" withArrow position="right">
                        <Button 
                            variant="subtle" 
                            size="xs" 
                            color="gray" 
                            radius="xl"
                            onClick={() => window.dispatchEvent(new CustomEvent('toggle-lite-mode'))}
                            leftSection={<IconBolt size={14} />}
                        >
                            Toggle Lite Mode
                        </Button>
                    </Tooltip>
                </Group>
            <Menu shadow="md" width={220} position="top-start" withArrow>
                <Menu.Target>
                    <Box pt={16} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <Interactive>
                            <Group style={{ cursor: 'pointer', padding: '8px', borderRadius: '12px' }}>
                                <Avatar 
                                    color="violet" radius="xl" size="md"
                                    style={{ border: `2px solid ${config.ring}` }}
                                >
                                    {user?.email?.substring(0, 2).toUpperCase()}
                                </Avatar>
                                <div style={{ flex: 1 }}>
                                    <Text size="sm" fw={600} c="var(--apple-text-primary)" truncate>
                                    {user?.email ? `${user.email.split('@')[0].slice(0, 8)}...` : ''}
                                    </Text>

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
function MobileNavbar({ user, tier, onNavigate, onSignOut, isLiteMode }) {
    const pathname = usePathname();
    const config = TIER_CONFIG[tier] || TIER_CONFIG['free'];
    
    // Upgrade button is REMOVED from grid
    const navLinks = [
        { icon: IconLayoutDashboard, label: 'Home', href: '/dashboard' },
        { icon: IconPlus, label: 'Create', href: '/new-plan', id: 'new-plan-button' },
        { icon: IconFileText, label: 'Plans', href: '/plans' },
        // { icon: IconFlask, label: 'Research', href: '/research' }, 
    ];

    const backgroundStyle = isLiteMode ? {
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 100%)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderTop: 'none'
    } : {
        backgroundColor: 'rgba(28, 28, 30, 0.85)', 
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    };

    return (
        <Box
            style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0,
                ...backgroundStyle,
                paddingTop: '12px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
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
                                <Box
                                    style={{
                                        position: 'relative',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '6px 20px',
                                        borderRadius: '20px',
                                        backgroundColor: isActive ? 'rgba(191, 90, 242, 0.2)' : 'transparent',
                                        transition: 'background-color 0.3s ease'
                                    }}
                                >
                                    <link.icon 
                                        size={26} 
                                        stroke={isActive ? 2 : 1.5} 
                                        color={isActive ? '#BF5AF2' : link.color || 'var(--apple-text-secondary)'} 
                                    />
                                </Box>
                                <Text size="10px" fw={600} c={isActive ? 'white' : 'dimmed'}>
                                    {link.label}
                                </Text>
                            </Stack>
                        </Interactive>
                    );
                })}
                
                {/* Profile Menu (Now includes Upgrade) */}
                <Menu shadow="xl" width={220} position="top-end" withArrow offset={10} zIndex={1001}>
                    <Menu.Target>
                        <UnstyledButton style={{ cursor: 'pointer' }}>
                            <Stack align="center" gap={4} style={{ padding: '8px' }}>
                                <Box style={{ padding: '6px 20px' }}>
                                    <Avatar 
                                        color="violet" radius="xl" size={26} 
                                        style={{ border: `2px solid ${config.ring}` }} // Tier-colored ring
                                    >
                                        {user?.email?.substring(0, 2).toUpperCase()}
                                    </Avatar>
                                </Box>
                                <Text size="10px" fw={600} c="dimmed">Profile</Text>
                            </Stack>
                        </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E', marginBottom: '10px' }}>
                        <Menu.Label>Account: {config.label}</Menu.Label>
                        {/* Mobile Upgrade Item */}
                        {tier === 'free' && (
                            <Menu.Item 
                                leftSection={<IconDiamond size={14} color="#BF5AF2" />} 
                                onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                                style={{ fontWeight: 600, color: 'white' }}
                            >
                                Upgrade to Pro
                            </Menu.Item>
                        )}
                        <Menu.Item 
                            leftSection={<IconBolt size={14} />} 
                            onClick={() => window.dispatchEvent(new CustomEvent('toggle-lite-mode'))}
                        >
                            Toggle Lite Mode
                        </Menu.Item>
                        <Menu.Item leftSection={<IconUser size={14} />} disabled>Settings</Menu.Item>
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
    const searchParams = useSearchParams(); // To check for success param
    const { setIsLoading } = useLoading();
    const pathname = usePathname();
    const { profile, isLoading: isProfileLoading, startTour } = useOnboarding();
    const isDesktop = useMediaQuery('(min-width: 768px)'); 
    

    const [tier, setTier] = useState('free');
    const [upgradeOpened, { open: openUpgrade, close: closeUpgrade }] = useDisclosure(false);
    const [successModalOpened, { open: openSuccess, close: closeSuccess }] = useDisclosure(false);

    const [founderModalOpened, setFounderModalOpened] = useState(false);
    const { toggleMode, isLiteMode } = usePerformance();

    useEffect(() => {
        const handleToggle = () => toggleMode(); // Toggles current state
        window.addEventListener('toggle-lite-mode', handleToggle);
        return () => window.removeEventListener('toggle-lite-mode', handleToggle);
    }, [toggleMode]);

    // --- FETCH TIER & NOTIFICATIONS ---
    useEffect(() => {
        if (!session) return;
        const fetchTier = async () => {
            const { data } = await supabase.from('user_subscriptions')
                .select('tier, founder_notified') // Added founder_notified
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .maybeSingle();
            
            if (data) {
                setTier(data.tier);
                // Trigger modal if they are a founder and haven't seen it yet
                if (data.tier === 'founder' && data.founder_notified === false) {
                    setFounderModalOpened(true);
                }
            }
        };
        fetchTier();
    }, [session]);

    const { failedTransaction, setFailedTransaction } = usePaymentStatus(session);
    // --- FETCH TIER ---
    useEffect(() => {
        if (!session) return;
        const fetchTier = async () => {
            const { data } = await supabase.from('user_subscriptions')
                .select('tier')
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .maybeSingle();
            
            if (data) setTier(data.tier);
        };
        fetchTier();
    }, [session]);

    // --- HANDLE PAYMENT SUCCESS ---
    useEffect(() => {
        if (searchParams.get('payment') === 'success') {
            openSuccess();
            // Clear URL param to prevent reopening on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    // --- LISTENERS & TOURS ---
    useEffect(() => {
        const handleOpenUpgrade = () => openUpgrade();
        window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
        return () => window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
    }, []);

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
            {/* FAILED PAYMENT RESOLUTION MODAL */}
            {failedTransaction && (
                <TransactionStatusModal 
                    transaction={failedTransaction} 
                    onClose={() => setFailedTransaction(null)} 
                />
            )}

            {isDesktop && (
                 <FloatingSidebar user={session.user} tier={tier} onNavigate={handleNavigation} onSignOut={handleSignOut} />
            )}

            <OnboardingTour />
            
            {/* UPGRADE MODAL */}
            <UpgradeModal opened={upgradeOpened} onClose={closeUpgrade} />

            {/* FOUNDER CELEBRATION MODAL */}
            <FounderWelcomeModal 
                opened={founderModalOpened} 
                onClose={() => setFounderModalOpened(false)} 
            />

            {/* SUCCESS MODAL */}
            <Modal 
                opened={successModalOpened} 
                onClose={closeSuccess} 
                withCloseButton={false} 
                centered 
                size="md"
                styles={{ 
                    content: { backgroundColor: 'rgba(20, 20, 25, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid #BF5AF2' }, 
                    body: { padding: '40px' } 
                }}
            >
                <Stack align="center" gap="lg">
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} 
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    >
                        <ThemeIcon size={80} radius="100%" gradient={{ from: '#BF5AF2', to: '#5E5CE6', deg: 135 }} variant="gradient">
                            <IconCrown size={40} />
                        </ThemeIcon>
                    </motion.div>
                    <Box ta="center">
                        <Title order={2} className="apple-text-gradient">Welcome to Pro</Title>
                        <Text c="dimmed" mt="xs">Your account has been upgraded. All limits are removed.</Text>
                    </Box>
                    <ShimmerButton onClick={closeSuccess} size="lg" radius="xl">Start Dominating</ShimmerButton>
                </Stack>
            </Modal>

            <main style={{ 
                flex: 1, 
                marginLeft: isDesktop ? '300px' : '0',
                padding: isDesktop ? '32px' : '16px',
                paddingBottom: isDesktop ? '32px' : '120px',
                maxWidth: '1600px', 
                marginRight: 'auto'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.99 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} 
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {!isDesktop && (
                <MobileNavbar user={session.user} tier={tier} onNavigate={handleNavigation} onSignOut={handleSignOut} isLiteMode={isLiteMode} />
            )}
        </div>
    );
}