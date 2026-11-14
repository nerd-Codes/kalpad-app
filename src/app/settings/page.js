// src/app/settings/page.js
"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconAlarm,
  IconBolt,
  IconBrain,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDeviceDesktop,
  IconDiamond,
  IconFlask,
  IconLogin,
  IconLogout,
  IconMessageChatbot,
  IconMoon,
  IconRefresh,
  IconSun,
  IconUser,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import supabase from '@/lib/supabaseClient';
import { useKalPadTheme } from '@/context/KalPadThemeContext';
import { useLoading } from '@/context/LoadingContext';
import { useChatGPTBYOK } from '@/hooks/useChatGPTBYOK';
import {
  AUTO_MODEL_SLUG,
  GRANULAR_TASK_DEFINITIONS,
  loadModelPreferences,
} from '@/lib/byok/modelPreferences';
import KalPadShell from '@/components/kalpad/KalPadShell';
import classes from '@/components/settings/Settings.module.css';

const STUDY_RHYTHM_KEY = 'kalpad_study_rhythm';
const RESEARCH_BETA_EMAILS = new Set(['khushigarg1718@gmail.com']);

const TIER_PRETTY = {
  free: 'Free',
  pro_15: 'Pro 15d',
  pro_30: 'Pro 30d',
  pro_90: 'Pro 90d',
  founder: 'Founder',
  pro_test: 'Dev',
};

const CADENCE_OPTIONS = [
  {
    key: 'light',
    title: 'Light',
    subtitle: 'Low-frequency check-ins with minimal interruptions',
    icon: IconClock,
  },
  {
    key: 'balanced',
    title: 'Balanced',
    subtitle: 'Standard cadence tailored for consistent progress',
    icon: IconAlarm,
  },
  {
    key: 'intense',
    title: 'Intense',
    subtitle: 'Frequent reminders ahead of imminent exam dates',
    icon: IconBolt,
  },
];

const QUIET_PRESETS = ['22:00-07:00', '23:00-06:30', '00:00-06:00'];

function formatExpiry(rawDate) {
  if (!rawDate) return 'Never';
  try {
    return format(parseISO(rawDate), 'd MMM yyyy');
  } catch {
    return 'Never';
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { themeMode, setThemeMode } = useKalPadTheme();
  const { isAuthenticated: isByokConnected } = useChatGPTBYOK();

  const [session, setSession] = useState(null);
  const [tier, setTier] = useState('free');
  const [expiresAt, setExpiresAt] = useState(null);
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [cadence, setCadence] = useState('balanced');
  const [quietHours, setQuietHours] = useState('22:00-07:00');
  const [customModelCount, setCustomModelCount] = useState(0);

  useEffect(() => {
    const syncModelCount = () => {
      try {
        const prefs = loadModelPreferences();
        const count = GRANULAR_TASK_DEFINITIONS.filter(
          (task) => prefs[task.key] && prefs[task.key] !== AUTO_MODEL_SLUG
        ).length;
        setCustomModelCount(count);
      } catch {
        setCustomModelCount(0);
      }
    };
    syncModelCount();
    window.addEventListener('kalpad-byok-models-changed', syncModelCount);
    window.addEventListener('storage', syncModelCount);
    return () => {
      window.removeEventListener('kalpad-byok-models-changed', syncModelCount);
      window.removeEventListener('storage', syncModelCount);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STUDY_RHYTHM_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cadence) setCadence(parsed.cadence);
        if (parsed.quietHours) setQuietHours(parsed.quietHours);
      }
    } catch {
      // Ignore storage failures
    }
  }, []);

  const persistRhythm = (nextCadence, nextQuietHours) => {
    try {
      window.localStorage.setItem(
        STUDY_RHYTHM_KEY,
        JSON.stringify({ cadence: nextCadence, quietHours: nextQuietHours })
      );
    } catch {
      // Ignore storage failures
    }
  };

  const loadAccountData = useCallback(async () => {
    setSyncing(true);
    setErrorMessage('');
    try {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      setSession(activeSession);

      if (!activeSession?.user?.id) {
        setTier('free');
        setExpiresAt(null);
        setActivePlansCount(0);
        return;
      }

      const [{ data: sub }, { count, error: countError }] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('tier, current_period_end, status')
          .eq('user_id', activeSession.user.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('study_plans')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', activeSession.user.id)
          .eq('is_active', true),
      ]);

      if (countError) throw countError;

      setTier(sub?.tier || 'free');
      setExpiresAt(sub?.current_period_end || null);
      setActivePlansCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      setErrorMessage(err?.message || 'Could not refresh account details.');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  const handleManualSync = async () => {
    setStatusMessage('');
    await loadAccountData();
    setStatusMessage('Account details synced.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsLoading(true);
    router.push('/');
  };

  const user = session?.user;
  const email = user?.email || 'Guest desk';
  const shortId = user?.id ? user.id.slice(0, 8).toUpperCase() : 'LOCAL';
  const prettyTier = TIER_PRETTY[tier] || 'Free';
  const showResearch = Boolean(
    user?.email && RESEARCH_BETA_EMAILS.has(user.email.trim().toLowerCase())
  );

  const themeOptions = [
    { key: 'light', label: 'Light', icon: IconSun },
    { key: 'dark', label: 'Dark', icon: IconMoon },
    { key: 'system', label: 'System', icon: IconDeviceDesktop },
  ];

  const themeDescription =
    themeMode === 'light'
      ? 'Warm paper stays on, even at night.'
      : themeMode === 'dark'
        ? 'Deep, softened surfaces keep late study sessions comfortable.'
        : 'KalPad follows your device appearance.';

  return (
    <KalPadShell session={session} maxWidth="1220px">
      <div className={classes.settingsPage}>
        {/* Header */}
        <header>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: 'clamp(1.65rem, 3vw, 1.95rem)',
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--kp-ink)',
            }}
          >
            Your profile
          </h1>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              lineHeight: '19px',
              color: 'var(--kp-secondary)',
            }}
          >
            Account, appearance, and study rhythm in one place.
          </p>
        </header>

        <div className={classes.settingsGrid}>
          {/* Left Column: Account Overview, Appearance, Actions */}
          <div className={classes.colStack}>
            {/* ProfileCard */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--kp-mint)',
                    border: '2px solid var(--kp-orange)',
                    color: 'var(--kp-accent-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={24} stroke={1.8} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {email}
                  </div>
                  <div
                    style={{
                      marginTop: '3px',
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--kp-muted)',
                    }}
                  >
                    MEMBER ID · {shortId}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'var(--kp-raised)',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    borderRadius: '8px',
                    backgroundColor: 'var(--kp-apricot)',
                    color: 'var(--kp-accent-ink)',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <IconBolt size={13} stroke={2} />
                  <span>{prettyTier} tier</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--kp-muted)' }}>
                  Renews {formatExpiry(expiresAt)}
                </span>
              </div>
            </motion.section>

            {/* PlanAndTierRow */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              <div
                style={{
                  minHeight: '88px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--kp-surface)',
                  border: '1px solid var(--kp-border)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-muted)',
                  }}
                >
                  Active plans
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--kp-accent-ink)',
                    lineHeight: 1.1,
                  }}
                >
                  {activePlansCount}
                </span>
              </div>

              <div
                style={{
                  minHeight: '88px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--kp-surface)',
                  border: '1px solid var(--kp-border)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-muted)',
                  }}
                >
                  Account tier
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--kp-accent-ink)',
                    lineHeight: 1.1,
                  }}
                >
                  {prettyTier}
                </span>
              </div>
            </div>

            {/* AppearanceCard */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                Appearance
              </div>
              <div style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
                Choose the study surface that feels right for your day.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {themeOptions.map((opt) => {
                  const selected = themeMode === opt.key;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setThemeMode(opt.key)}
                      className="kp-tactile"
                      style={{
                        minHeight: '46px',
                        borderRadius: '12px',
                        border: selected
                          ? '1.5px solid var(--kp-accent-ink)'
                          : '1px solid var(--kp-border)',
                        backgroundColor: selected ? 'var(--kp-butter)' : 'var(--kp-raised)',
                        color: selected ? 'var(--kp-accent-ink)' : 'var(--kp-ink)',
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '13px',
                        fontWeight: selected ? 700 : 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '0 6px',
                      }}
                    >
                      {selected ? <IconCheck size={15} stroke={2.2} /> : <Icon size={15} stroke={1.8} />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--kp-muted)' }}>{themeDescription}</div>
            </motion.section>

            {/* App & Account Actions */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                Account actions
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                className={classes.interactiveRow}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-butter)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconDiamond size={15} color="var(--kp-accent-ink)" />
                    <span>Upgrade account</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                    Unlock bulk note creation and future day generation.
                  </div>
                </div>
                <IconChevronRight size={16} color="var(--kp-muted)" style={{ flexShrink: 0 }} />
              </button>

              <button
                type="button"
                id="byok-temporary-chat-trigger"
                onClick={() => window.dispatchEvent(new CustomEvent('open-byok-chat'))}
                className={classes.interactiveRow}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconMessageChatbot size={15} color="var(--kp-primary)" />
                    <span>Temporary Chat (BYOK ChatGPT)</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        backgroundColor: isByokConnected ? 'var(--kp-mint)' : 'var(--kp-butter)',
                        color: 'var(--kp-ink)',
                        marginLeft: '4px',
                      }}
                    >
                      {isByokConnected ? 'Connected' : 'Connect ChatGPT'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                    Test OpenAI Sign in with ChatGPT and plan usage directly
                  </div>
                </div>
                <IconChevronRight size={16} color="var(--kp-muted)" style={{ flexShrink: 0 }} />
              </button>

              <Link
                href="/settings/models"
                id="byok-model-routing-trigger"
                className={classes.interactiveRow}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  textDecoration: 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconBrain size={15} color="var(--kp-accent-ink)" />
                    <span>Model routing (BYOK ChatGPT)</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        backgroundColor: customModelCount > 0 ? 'var(--kp-periwinkle)' : 'var(--kp-butter)',
                        color: 'var(--kp-ink)',
                        marginLeft: '4px',
                      }}
                    >
                      {customModelCount > 0 ? `${customModelCount} custom` : 'All Auto'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                    Assign exact OpenAI models for planner, notes stages, quizzes, doubts &amp; cram sheets
                  </div>
                </div>
                <IconChevronRight size={16} color="var(--kp-muted)" style={{ flexShrink: 0 }} />
              </Link>

              {showResearch && (
                <Link
                  href="/research"
                  className={classes.interactiveRow}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1px solid var(--kp-border)',
                    backgroundColor: 'var(--kp-raised)',
                    color: 'var(--kp-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <IconFlask size={15} />
                      <span>Research lab</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--kp-muted)', marginTop: '2px' }}>
                      Open experimental notebook workflows.
                    </div>
                  </div>
                  <IconChevronRight size={16} color="var(--kp-muted)" style={{ flexShrink: 0 }} />
                </Link>
              )}

              <button
                type="button"
                disabled={syncing}
                onClick={handleManualSync}
                className={classes.interactiveRow}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '12px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-raised)',
                  color: 'var(--kp-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  textAlign: 'left',
                  cursor: syncing ? 'wait' : 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconRefresh size={15} />
                    <span>{syncing ? 'Syncing...' : 'Sync data'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--kp-muted)', marginTop: '2px' }}>
                    Refresh active study plans and subscription status.
                  </div>
                </div>
                <IconChevronRight size={16} color="var(--kp-muted)" style={{ flexShrink: 0 }} />
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={classes.interactiveRow}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: '1px solid var(--kp-border)',
                    backgroundColor: 'var(--kp-error-subtle)',
                    color: 'var(--kp-error-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <IconLogout size={15} />
                      <span>Sign out</span>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                      Sign out and clear local session tokens on this device.
                    </div>
                  </div>
                  <IconChevronRight size={16} style={{ flexShrink: 0 }} />
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="kp-tactile"
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'var(--kp-primary)',
                    color: 'var(--kp-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <IconLogin size={16} />
                  <span>Sign in</span>
                </Link>
              )}
            </motion.section>
          </div>

          {/* Right Column: Study Rhythm & Visual Comfort */}
          <div className={classes.colStack}>
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: '20px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--kp-ink)',
                  }}
                >
                  Study rhythm
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--kp-muted)', marginTop: '3px' }}>
                  Select your preferred check-in cadence and quiet hours.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CADENCE_OPTIONS.map((opt) => {
                  const selected = cadence === opt.key;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setCadence(opt.key);
                        persistRhythm(opt.key, quietHours);
                      }}
                      className={classes.interactiveRow}
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        padding: '11px 12px',
                        textAlign: 'left',
                        backgroundColor: selected ? 'var(--kp-apricot)' : 'var(--kp-raised)',
                        border: `1px solid ${selected ? 'var(--kp-orange)' : 'var(--kp-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon
                        size={16}
                        color={selected ? 'var(--kp-accent-ink)' : 'var(--kp-muted)'}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: selected ? 700 : 600,
                            color: 'var(--kp-ink)',
                          }}
                        >
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--kp-muted)' }}>
                          {opt.subtitle}
                        </div>
                      </div>
                      {selected && (
                        <IconCheck size={15} color="var(--kp-accent-ink)" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--kp-border)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--kp-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span>Quiet hours</span>
                  <input
                    type="text"
                    value={quietHours}
                    onChange={(e) => {
                      setQuietHours(e.target.value);
                      persistRhythm(cadence, e.target.value);
                    }}
                    placeholder="e.g. 22:00-07:00"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      border: '1px solid var(--kp-border)',
                      backgroundColor: 'var(--kp-raised)',
                      color: 'var(--kp-ink)',
                      padding: '0 12px',
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUIET_PRESETS.map((preset) => {
                    const selected = quietHours.trim() === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setQuietHours(preset);
                          persistRhythm(cadence, preset);
                        }}
                        className="kp-tactile"
                        style={{
                          borderRadius: '8px',
                          padding: '6px 10px',
                          backgroundColor: selected ? 'var(--kp-butter)' : 'var(--kp-raised)',
                          border: `1px solid ${
                            selected ? 'var(--kp-accent-ink)' : 'var(--kp-border)'
                          }`,
                          color: selected ? 'var(--kp-accent-ink)' : 'var(--kp-muted)',
                          fontFamily: 'var(--font-kp-mono)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {statusMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--kp-success-subtle)',
                  color: 'var(--kp-success-ink)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--kp-error-subtle)',
                  color: 'var(--kp-error-ink)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </KalPadShell>
  );
}
