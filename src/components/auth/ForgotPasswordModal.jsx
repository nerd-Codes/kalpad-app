// src/components/auth/ForgotPasswordModal.jsx
"use client";

import { useState } from 'react';
import { IconCheck, IconMail, IconX } from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';

export function ForgotPasswordModal({ opened, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!opened) return null;

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onClose?.();
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(
        'If an account exists for this email, a password reset link has been sent.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reset your password"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3500,
        backgroundColor: 'rgba(17, 19, 23, 0.54)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '20px',
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border-strong)',
          color: 'var(--kp-ink)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-kp-mono)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--kp-ink)',
            }}
          >
            Reset password
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close reset password dialog"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

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
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--kp-secondary)' }}>
              Enter your account email and we will send you a link to set a new password.
            </p>

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
                    height: '46px',
                    borderRadius: '14px',
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

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--kp-error-subtle)',
                  color: 'var(--kp-error-ink)',
                  fontSize: '12px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="kp-tactile"
              style={{
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: 'var(--kp-primary)',
                color: 'var(--kp-on-primary)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
