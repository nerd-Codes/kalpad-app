// src/app/reset-password/page.js
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertTriangle, IconCheck, IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';
import { KalPadAuthLayout } from '@/components/auth/KalPadAuthLayout';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess('Password updated. Redirecting you to sign in...');
      setTimeout(() => router.push('/sign-in'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KalPadAuthLayout
      mode="reset"
      title="Choose a new password."
      subtitle="Set fresh credentials for your KalPad study desk."
    >
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
          }}
        >
          <IconAlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {success ? (
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
      ) : (
        <form
          onSubmit={handlePasswordReset}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
              New password
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
                placeholder="Enter a new password"
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
            }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </KalPadAuthLayout>
  );
}
