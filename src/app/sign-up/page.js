// src/app/sign-up/page.js
"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconAlertTriangle,
  IconBrandGoogle,
  IconCheck,
  IconCloudUpload,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';
import { useGuest } from '@/context/GuestContext';
import { KalPadAuthLayout } from '@/components/auth/KalPadAuthLayout';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';

const REQUIREMENTS = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

function getStrength(password) {
  let multiplier = password.length > 7 ? 0 : 1;
  REQUIREMENTS.forEach((req) => {
    if (!req.re.test(password)) multiplier += 1;
  });
  return Math.max(100 - (100 / (REQUIREMENTS.length + 1)) * multiplier, 0);
}

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { guestArtifact, clearGuestArtifact } = useGuest();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAndroidApp, setIsAndroidApp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.userAgent.includes('KalPad-Android-App')) {
      setIsAndroidApp(true);
    }
  }, []);

  useEffect(() => {
    const syncGuestData = async () => {
      const hasIntent = searchParams?.get('intent') === 'guest_sync';
      if (hasIntent && guestArtifact) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setLoading(true);
          try {
            const res = await fetch('/api/sync-guest-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(guestArtifact),
            });
            if (res.ok) {
              const data = await res.json();
              clearGuestArtifact();
              router.push(`/plan/${data.planId}`);
            } else {
              throw new Error('Sync failed');
            }
          } catch (e) {
            console.error('Sync error:', e);
            router.push('/dashboard');
          } finally {
            setLoading(false);
          }
        }
      }
    };
    syncGuestData();
  }, [searchParams, guestArtifact, clearGuestArtifact, router]);

  const strength = Math.round(getStrength(password));
  const strengthColor =
    strength === 100
      ? 'var(--kp-success-ink)'
      : strength > 50
        ? 'var(--kp-warning-ink)'
        : 'var(--kp-error-ink)';

  const performGuestSync = async () => {
    const hasIntent = searchParams?.get('intent') === 'guest_sync';
    if (hasIntent && guestArtifact) {
      try {
        const res = await fetch('/api/sync-guest-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestArtifact),
        });
        if (res.ok) {
          const data = await res.json();
          clearGuestArtifact();
          router.push(`/plan/${data.planId}`);
          return;
        }
      } catch (e) {
        console.error('Guest sync failed:', e);
      }
    }
    router.push('/dashboard');
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (strength !== 100) {
      setError('Password does not meet all security requirements yet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/sign-in`,
          data: {
            source: 'guest_conversion',
            ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        await performGuestSync();
      } else {
        setSuccess('Account created. Check your email to verify your address before signing in.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy first.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <KalPadAuthLayout
      mode="sign-up"
      title="Make room for what matters."
      subtitle="Build a steady study path around the time you have."
    >
      {guestArtifact && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: 'var(--kp-mint)',
            border: '1px solid var(--kp-border)',
            color: 'var(--kp-ink)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '9px',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <IconCloudUpload
            size={16}
            color="var(--kp-success-ink)"
            style={{ flexShrink: 0, marginTop: '2px' }}
          />
          <span>
            Create an account to save your <strong>{guestArtifact.examName}</strong> plan.
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: 'var(--kp-error-subtle)',
            color: 'var(--kp-error-ink)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '13px',
            lineHeight: 1.45,
          }}
        >
          <IconAlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '14px',
            borderRadius: '14px',
            backgroundColor: 'var(--kp-mint)',
            color: 'var(--kp-success-ink)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <IconCheck size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{success}</span>
        </div>
      )}

      {!success && (
        <form
          onSubmit={handleEmailSignUp}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
              Name (optional)
            </span>
            <div style={{ position: 'relative' }}>
              <IconUser
                size={17}
                color="var(--kp-muted)"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-canvas)',
                  color: 'var(--kp-ink)',
                  padding: '0 14px 0 42px',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
              Email address
            </span>
            <div style={{ position: 'relative' }}>
              <IconMail
                size={17}
                color="var(--kp-muted)"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-canvas)',
                  color: 'var(--kp-ink)',
                  padding: '0 14px 0 42px',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
              Password
            </span>
            <div style={{ position: 'relative' }}>
              <IconLock
                size={17}
                color="var(--kp-muted)"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '16px',
                  border: '1px solid var(--kp-border)',
                  backgroundColor: 'var(--kp-canvas)',
                  color: 'var(--kp-ink)',
                  padding: '0 44px 0 42px',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--kp-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </label>

          {/* Inline PasswordStrengthPanel matching AuthScreen.kt */}
          {password.length > 0 && (
            <div
              style={{
                borderRadius: '16px',
                backgroundColor: 'var(--kp-canvas)',
                border: '1px solid var(--kp-border)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--kp-ink)' }}>Password strength</span>
                <span style={{ fontFamily: 'var(--font-kp-mono)', color: strengthColor }}>
                  {strength}%
                </span>
              </div>
              <KalPadProgress value={strength} height={4} color={strengthColor} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                {[
                  { label: 'At least 8 characters', met: password.length > 7 },
                  ...REQUIREMENTS.map((r) => ({ label: r.label, met: r.re.test(password) })),
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '12px',
                      color: item.met ? 'var(--kp-success-ink)' : 'var(--kp-error-ink)',
                    }}
                  >
                    {item.met ? <IconCheck size={13} /> : <IconAlertTriangle size={13} />}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '9px',
              cursor: 'pointer',
              fontSize: '12px',
              lineHeight: 1.45,
              color: 'var(--kp-secondary)',
              marginTop: '2px',
            }}
          >
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: '2px', accentColor: 'var(--kp-primary)', cursor: 'pointer' }}
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" style={{ color: 'var(--kp-accent-ink)', fontWeight: 600 }}>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" style={{ color: 'var(--kp-accent-ink)', fontWeight: 600 }}>
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="kp-tactile"
            style={{
              height: '52px',
              borderRadius: '18px',
              border: 'none',
              backgroundColor: 'var(--kp-primary)',
              color: 'var(--kp-on-primary)',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '2px',
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      )}

      {!isAndroidApp && !success && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--kp-border)' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--kp-muted)',
                letterSpacing: '0.06em',
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--kp-border)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="kp-tactile"
            style={{
              height: '48px',
              borderRadius: '16px',
              border: '1px solid var(--kp-border-strong)',
              backgroundColor: 'var(--kp-surface)',
              color: 'var(--kp-ink)',
              fontFamily: 'var(--font-kp-sans)',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              cursor: 'pointer',
            }}
          >
            <IconBrandGoogle size={18} stroke={1.9} />
            <span>Sign up with Google</span>
          </button>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--kp-secondary)' }}>
        Already have an account?{' '}
        <Link
          href="/sign-in"
          style={{ color: 'var(--kp-accent-ink)', fontWeight: 700, textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </div>
    </KalPadAuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="kp-app-shell" style={{ minHeight: '100vh' }} />}>
      <SignUpInner />
    </Suspense>
  );
}
