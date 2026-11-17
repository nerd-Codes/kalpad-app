// src/components/kalpad/KalPadShell.jsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDeviceDesktop,
  IconLayoutDashboard,
  IconList,
  IconMoon,
  IconPlus,
  IconSun,
  IconUser,
} from '@tabler/icons-react';
import { LayoutGroup, motion } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';
import supabase from '@/lib/supabaseClient';
import { useLoading } from '@/context/LoadingContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePerformance } from '@/context/PerformanceContext';
import { useKalPadTheme } from '@/context/KalPadThemeContext';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import onboardingSteps from '@/lib/onboardingSteps';
import { OnboardingTour } from '@/components/OnboardingTour';
import { UpgradeModal } from '@/components/payment/UpgradeModal';
import { TransactionStatusModal } from '@/components/payment/TransactionStatusModal';
import { FounderWelcomeModal } from '@/components/payment/FounderWelcomeModal';
import TemporaryChatModal from '@/components/chat/TemporaryChatModal';
import { ChatGPTConnectModal } from '@/components/byok/ChatGPTConnectModal';
import { getStoredSession } from '@/lib/byok/auth';
import classes from './KalPadShell.module.css';

const SIDEBAR_STORAGE_KEY = 'kalpad_sidebar_collapsed';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/dashboard', icon: IconLayoutDashboard },
  { key: 'create', label: 'Create', href: '/new-plan', icon: IconPlus, id: 'new-plan-button' },
  { key: 'plans', label: 'Plans', href: '/plans', icon: IconList },
  { key: 'profile', label: 'Profile', href: '/settings', icon: IconUser },
];

const DESKTOP_RAIL_ITEMS = NAV_ITEMS.filter((item) => item.key !== 'profile');

const THEME_MODES = [
  { key: 'light', label: 'Light theme', icon: IconSun },
  { key: 'dark', label: 'Dark theme', icon: IconMoon },
  { key: 'system', label: 'System theme', icon: IconDeviceDesktop },
];

export default function KalPadShell({
  children,
  session,
  maxWidth = '1320px',
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsLoading } = useLoading();
  const { profile, isLoading: isProfileLoading, startTour } = useOnboarding();
  const { isLiteMode } = usePerformance();
  const { themeMode, resolvedTheme, setThemeMode } = useKalPadTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [founderModalOpened, setFounderModalOpened] = useState(false);
  const [upgradeOpened, { open: openUpgrade, close: closeUpgrade }] = useDisclosure(false);
  const [byokChatOpen, setByokChatOpen] = useState(false);
  const [byokConnectOpened, setByokConnectOpened] = useState(false);

  // Auto-prompt BYOK connection if user is signed in to KalPad but ChatGPT isn't connected on this device
  useEffect(() => {
    if (!session?.user) return;
    try {
      const stored = getStoredSession();
      const dismissed = sessionStorage.getItem('kalpad_byok_prompt_dismissed');
      if (!stored?.accessToken && !dismissed) {
        const timer = setTimeout(() => {
          setByokConnectOpened(true);
        }, 750);
        return () => clearTimeout(timer);
      }
    } catch (_) {}
  }, [session]);

  // Global event listener to trigger BYOK Connect modal from any button
  useEffect(() => {
    const handleOpenConnect = () => setByokConnectOpened(true);
    window.addEventListener('open-byok-connect', handleOpenConnect);
    return () => window.removeEventListener('open-byok-connect', handleOpenConnect);
  }, []);

  const { failedTransaction, setFailedTransaction } = usePaymentStatus(session);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === 'true') {
        setCollapsed(true);
      } else if (saved === 'false') {
        setCollapsed(false);
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  useEffect(() => {
    if (!session) return;
    let active = true;
    const fetchTier = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('tier, founder_notified')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (active && data?.tier === 'founder' && data.founder_notified === false) {
        setFounderModalOpened(true);
      }
    };
    fetchTier();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (searchParams?.get('payment') === 'success') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleOpenUpgrade = () => openUpgrade();
    window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
    return () => window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
  }, [openUpgrade]);

  useEffect(() => {
    const handleOpenByokChat = () => setByokChatOpen(true);
    window.addEventListener('open-byok-chat', handleOpenByokChat);
    return () => window.removeEventListener('open-byok-chat', handleOpenByokChat);
  }, []);

  useEffect(() => {
    const firstStep = onboardingSteps[0];
    if (
      typeof window !== 'undefined' &&
      window.innerWidth >= 768 &&
      !isProfileLoading &&
      profile &&
      !profile.has_completed_onboarding &&
      pathname === firstStep.route
    ) {
      const timer = setTimeout(() => startTour(), 1000);
      return () => clearTimeout(timer);
    }
  }, [isProfileLoading, profile, startTour, pathname]);

  const handleNavigate = (href) => {
    if (!href || pathname === href) return;
    window.dispatchEvent(new CustomEvent('kalpad-onboarding-advance'));
    setIsLoading(true);
    router.push(href);
  };

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    setThemeMode(next);
  };

  const activeKey = pathname?.startsWith('/new-plan')
    ? 'create'
    : pathname?.startsWith('/plans') ||
        pathname?.startsWith('/plan/') ||
        pathname?.startsWith('/cram-sheet')
      ? 'plans'
      : pathname?.startsWith('/settings')
        ? 'profile'
        : pathname?.startsWith('/dashboard')
          ? 'home'
          : 'home';

  const ThemeCycleIcon =
    themeMode === 'dark' ? IconMoon : themeMode === 'system' ? IconDeviceDesktop : IconSun;

  return (
    <div className={`kp-app-shell ${classes.shell}`}>
      {failedTransaction && (
        <TransactionStatusModal
          transaction={failedTransaction}
          onClose={() => setFailedTransaction(null)}
        />
      )}

      <OnboardingTour />
      <UpgradeModal opened={upgradeOpened} onClose={closeUpgrade} />
      <FounderWelcomeModal
        opened={founderModalOpened}
        onClose={() => setFounderModalOpened(false)}
      />
      <TemporaryChatModal
        opened={byokChatOpen}
        onClose={() => setByokChatOpen(false)}
      />
      <ChatGPTConnectModal
        opened={byokConnectOpened}
        onClose={() => setByokConnectOpened(false)}
      />

      {/* Fluid Collapsible Left Sidebar (>= 640px) */}
      <LayoutGroup id="kp-navigation">
        <aside
          aria-label="Primary navigation"
          className={`${classes.railWrap} ${collapsed ? classes.railWrapCollapsed : ''}`}
        >
          <div>
            {/* Brand + Collapse Toggle Header */}
            <div className={classes.railHeader}>
              {!collapsed && (
                <Link href="/dashboard" className={classes.brandCluster} title="KalPad Home">
                  <span className={classes.brandTitle}>KalPad</span>
                </Link>
              )}

              <button
                type="button"
                onClick={toggleCollapsed}
                className={classes.collapseBtn}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <IconChevronRight size={16} stroke={2.1} />
                ) : (
                  <IconChevronLeft size={16} stroke={2.1} />
                )}
              </button>
            </div>

            {/* Fluid Cutout Nav Items (Home, Create, Plans; Profile lives in bottom avatar) */}
            <nav className={classes.railItems}>
              {DESKTOP_RAIL_ITEMS.map((item) => {
                const Icon = item.icon;
                const selected = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    id={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    aria-current={selected ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`${classes.railItem} ${selected ? classes.railItemSelected : ''}`}
                  >
                    {selected && (
                      <motion.div
                        layoutId={collapsed ? 'kp-rail-circle' : 'kp-rail-cutout'}
                        className={collapsed ? classes.railActiveCircle : classes.railActiveCutout}
                        transition={
                          isLiteMode
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                      />
                    )}
                    <span className={classes.railItemInner}>
                      <Icon size={20} stroke={selected ? 2.1 : 1.75} style={{ flexShrink: 0 }} />
                      {!collapsed && <span className={classes.railLabel}>{item.label}</span>}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Controls: 3-Way Icon Theme Switch + Profile Avatar Button */}
          <div className={classes.railFooter}>
            {collapsed ? (
              <>
                <button
                  type="button"
                  className={classes.themeIconBtn}
                  onClick={cycleTheme}
                  title={`Theme: ${themeMode} (${resolvedTheme})`}
                  aria-label={`Switch theme, current is ${themeMode}`}
                >
                  <ThemeCycleIcon size={18} stroke={1.8} />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/settings')}
                  aria-current={activeKey === 'profile' ? 'page' : undefined}
                  aria-label={`Profile (${session?.user?.email ? session.user.email.split('@')[0] : 'Guest'})`}
                  title={`Profile · ${session?.user?.email ? session.user.email.split('@')[0] : 'Guest'}`}
                  className={`${classes.profileAvatarBtn} ${
                    activeKey === 'profile' ? classes.profileAvatarBtnSelected : ''
                  }`}
                >
                  {session?.user?.email ? (
                    session.user.email.slice(0, 1).toUpperCase()
                  ) : (
                    <IconUser size={18} stroke={1.9} />
                  )}
                </button>
              </>
            ) : (
              <>
                <div className={classes.themeSegmented} role="group" aria-label="Theme mode">
                  {THEME_MODES.map((mode) => {
                    const ModeIcon = mode.icon;
                    const isModeActive = themeMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setThemeMode(mode.key)}
                        aria-label={mode.label}
                        aria-pressed={isModeActive}
                        title={mode.label}
                        className={`${classes.themeSegBtn} ${
                          isModeActive ? classes.themeSegBtnActive : ''
                        }`}
                      >
                        {isModeActive && (
                          <motion.span
                            layoutId="kp-theme-pill"
                            className={classes.themeSegPill}
                            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          />
                        )}
                        <span className={classes.themeSegIcon}>
                          <ModeIcon size={15} stroke={1.9} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigate('/settings')}
                  aria-current={activeKey === 'profile' ? 'page' : undefined}
                  aria-label="Open profile and settings"
                  className={`${classes.profileFooterBtn} ${
                    activeKey === 'profile' ? classes.profileFooterBtnSelected : ''
                  }`}
                >
                  <span className={classes.profileAvatar}>
                    {session?.user?.email ? (
                      session.user.email.slice(0, 1).toUpperCase()
                    ) : (
                      <IconUser size={16} stroke={1.9} />
                    )}
                  </span>
                  <span className={classes.profileMeta}>
                    <span className={classes.profileName}>
                      {session?.user?.email ? session.user.email.split('@')[0] : 'Guest'}
                    </span>
                    <span className={classes.profileRole}>
                      {session ? 'Profile & settings' : 'Sign in / settings'}
                    </span>
                  </span>
                  <IconChevronRight size={15} stroke={1.8} style={{ opacity: 0.65, flexShrink: 0 }} />
                </button>
              </>
            )}
          </div>
        </aside>
      </LayoutGroup>

      {/* Main Responsive Page Canvas with Smooth Route Transition */}
      <main className={`${classes.main} ${collapsed ? classes.mainCollapsed : ''}`}>
        <motion.div
          key={pathname}
          className={classes.contentColumn}
          style={{ maxWidth }}
          initial={isLiteMode ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            isLiteMode
              ? { duration: 0 }
              : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
          }
        >
          {children}
        </motion.div>
      </main>

      {/* Floating Bottom Capsule Navigation (< 640px) */}
      <div className={classes.bottomBarWrap}>
        <LayoutGroup id="kp-bottom-nav">
          <nav className={classes.bottomBar} aria-label="Bottom navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  aria-label={selected ? item.label : `${item.label} tab`}
                  aria-current={selected ? 'page' : undefined}
                  className={`${classes.bottomItem} ${selected ? classes.bottomItemSelected : ''}`}
                >
                  {selected && (
                    <motion.div
                      layoutId="kp-bottom-active-bg"
                      className={classes.bottomActiveBg}
                      transition={
                        isLiteMode
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 440, damping: 32 }
                      }
                    />
                  )}
                  <span className={classes.bottomItemContent}>
                    <Icon size={20} stroke={selected ? 2.1 : 1.75} style={{ flexShrink: 0 }} />
                    {selected && <span className={classes.bottomLabel}>{item.label}</span>}
                  </span>
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </div>
    </div>
  );
}
