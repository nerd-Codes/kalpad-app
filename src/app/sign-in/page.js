// src/app/sign-in/page.js
"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconAlertTriangle,
  IconBrandGoogle,
  IconCloudUpload,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';
import { useGuest } from '@/context/GuestContext';
import { KalPadAuthLayout } from '@/components/auth/KalPadAuthLayout';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

function SignInInner() {
  const router = useRouter();
  const { guestArtifact, clearGuestArtifact } = useGuest();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [forgotModalOpened, setForgotModalOpened] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.userAgent.includes('KalPad-Android-App')) {
      setIsAndroidApp(true);
    }
  }, []);

  const performGuestSync = async () => {
    if (guestArtifact) {
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
        console.error('Sync error:', e);
      }
    }
    router.push('/dashboard');
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      await performGuestSync();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <KalPadAuthLayout
      mode="sign-in"
      title="Good to have you back."
      subtitle="Your study plans and notes are ready when you are."
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
            Sign in with email to save <strong>{guestArtifact.examName}</strong> to your study desk.
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

      <form
        onSubmit={handleEmailSignIn}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
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
              placeholder="••••••••"
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

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setForgotModalOpened(true)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: 'var(--kp-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Forgot password?
          </button>
        </div>

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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {!isAndroidApp && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '2px 0',
            }}
          >
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
            <span>Sign in with Google</span>
          </button>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--kp-secondary)' }}>
        New to KalPad?{' '}
        <Link
          href="/sign-up"
          style={{ color: 'var(--kp-accent-ink)', fontWeight: 700, textDecoration: 'none' }}
        >
          Create account
        </Link>
      </div>

      <ForgotPasswordModal opened={forgotModalOpened} onClose={() => setForgotModalOpened(false)} />
    </KalPadAuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="kp-app-shell" style={{ minHeight: '100vh' }} />}>
      <SignInInner />
    </Suspense>
  );
}
