'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPendingAuth, getStoredSession } from '@/lib/byok/storage.js';
import { handleOAuthCallback } from '@/lib/byok/auth.js';

// Guard against React Strict Mode double-mount consuming single-use authorization codes twice in dev mode
const handledCodes = new Set();

function resolveOpenerTargetOrigin() {
  if (typeof window === 'undefined') return '';
  try {
    if (window.opener?.location?.origin) {
      return window.opener.location.origin;
    }
  } catch (_) {
    // Cross-origin opener (e.g. callback is 127.0.0.1 while opener is localhost on same port)
    if (window.location.hostname === '127.0.0.1') {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `${window.location.protocol}//localhost${port}`;
    }
  }
  return window.location.origin;
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const postedRef = useRef(false);

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [hasOpener, setHasOpener] = useState(false);
  const [exchangedDirectly, setExchangedDirectly] = useState(false);

  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';
  const clientId = searchParams.get('client_id') || searchParams.get('clientId') || '';
  const error = searchParams.get('error') || '';
  const errorDescription = searchParams.get('error_description') || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openerExists = Boolean(window.opener);
    setHasOpener(openerExists);

    const pendingAuth = getPendingAuth();

    // If OpenAI's COOP: same-origin severed window.opener AND the user launched Connect from localhost:<port>
    // (while redirect_uri required 127.0.0.1:<port>), perform a one-way loopback handoff to localhost so
    // localStorage pendingAuth (PKCE verifier + state) matches cleanly on the originating origin.
    if (
      !openerExists &&
      !pendingAuth &&
      (code || error) &&
      window.location.hostname === '127.0.0.1'
    ) {
      const targetUrl = new URL(window.location.href);
      targetUrl.hostname = 'localhost';
      window.location.replace(targetUrl.toString());
      return;
    }

    // Validate CSRF state against stored pending authorization
    let stateMismatch = false;
    if (pendingAuth?.state && pendingAuth?.state !== state) {
      stateMismatch = true;
    }

    if (error || stateMismatch) {
      setStatus('error');
      const desc = stateMismatch
        ? 'Security validation failed: State parameter mismatch (possible CSRF attack).'
        : errorDescription || error || 'Authentication was declined or failed.';
      setErrorMessage(desc);

      if (window.opener && !postedRef.current) {
        postedRef.current = true;
        try {
          window.opener.postMessage(
            {
              type: 'BYOK_OAUTH_CALLBACK',
              code: null,
              clientId: clientId || pendingAuth?.clientId || null,
              state,
              error: stateMismatch ? 'state_mismatch' : error,
              errorDescription: desc,
            },
            resolveOpenerTargetOrigin()
          );
        } catch (e) {
          console.error('[BYOK Callback] postMessage error:', e);
        }
      }
      return;
    }

    if (code) {
      // Path 1: Opener survived (same-session script/test or permissive browser) -> notify opener
      if (window.opener && !postedRef.current) {
        postedRef.current = true;
        setStatus('success');
        try {
          window.opener.postMessage(
            {
              type: 'BYOK_OAUTH_CALLBACK',
              code,
              clientId: clientId || pendingAuth?.clientId || 'dynamic_agent_client',
              state,
              error: null,
            },
            resolveOpenerTargetOrigin()
          );

          setTimeout(() => {
            try {
              window.close();
            } catch (_) {}
          }, 800);
        } catch (e) {
          console.error('[BYOK Callback] postMessage error:', e);
        }
        return;
      }

      // Path 2: Opener was severed by auth.openai.com COOP: same-origin header (normal browser behavior)
      // Exchange code directly on this loopback origin if pendingAuth exists in localStorage
      if (pendingAuth?.codeVerifier) {
        if (handledCodes.has(code)) {
          if (getStoredSession()?.accessToken) {
            setExchangedDirectly(true);
            setStatus('success');
          }
          return;
        }
        handledCodes.add(code);

        setStatus('processing');
        handleOAuthCallback({
          code,
          state,
          clientId: clientId || pendingAuth.clientId,
          redirectUri: pendingAuth.redirectUri,
        })
          .then(() => {
            setExchangedDirectly(true);
            setStatus('success');
            setTimeout(() => {
              try {
                window.close();
              } catch (_) {}
            }, 900);
          })
          .catch((err) => {
            setStatus('error');
            setErrorMessage(err?.message || 'Failed to complete ChatGPT token exchange.');
          });
        return;
      }

      // Path 3: Neither opener nor pendingAuth present -> show full callback URL fallback for manual copy
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage('No authorization code was found in the callback request.');
    }
  }, [code, state, clientId, error, errorDescription]);

  const handleCopyRedirectUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (_) {}
  };

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {status === 'processing' && (
          <div>
            <div style={spinnerStyle} />
            <h2 style={titleStyle}>Completing Authentication...</h2>
            <p style={subtitleStyle}>Exchanging authorization code with OpenAI ChatGPT.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={iconCircleSuccess}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={titleStyle}>Authentication Successful!</h2>
            <p style={subtitleStyle}>
              {hasOpener || exchangedDirectly
                ? 'Your ChatGPT account is connected. You can close this tab or return to KalPad Settings.'
                : 'Copy this redirect URL below and paste it into the manual fallback box in KalPad.'}
            </p>

            {!hasOpener && !exchangedDirectly && code && (
              <div style={fallbackContainerStyle}>
                <label style={labelStyle}>Redirect URL (Manual Fallback):</label>
                <div style={inputGroupStyle}>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : code}
                    style={inputStyle}
                    aria-label="Redirect URL"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRedirectUrl}
                    style={copyButtonStyle}
                  >
                    {copiedUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleClose}
                style={primaryButtonStyle}
              >
                Close Window
              </button>
              <Link href="/settings" style={secondaryLinkStyle}>
                Return to Settings
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={iconCircleError}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={titleStyle}>Authentication Failed</h2>
            <p style={{ ...subtitleStyle, color: '#f87171' }}>{errorMessage}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleClose}
                style={primaryButtonStyle}
              >
                Close Window
              </button>
              <Link href="/settings" style={secondaryLinkStyle}>
                Return to Settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div style={spinnerStyle} />
            <h2 style={titleStyle}>Loading authorization...</h2>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '1.5rem',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const cardStyle = {
  width: '100%',
  maxWidth: '460px',
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  padding: '2rem',
  textAlign: 'center',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
};

const titleStyle = {
  fontSize: '1.35rem',
  fontWeight: '600',
  margin: '1rem 0 0.5rem 0',
  color: '#f8fafc',
};

const subtitleStyle = {
  fontSize: '0.9rem',
  color: '#94a3b8',
  lineHeight: '1.5',
  margin: '0 0 1.5rem 0',
};

const iconCircleSuccess = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
};

const iconCircleError = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '3px solid #334155',
  borderTop: '3px solid #6366f1',
  borderRadius: '50%',
  margin: '0 auto',
};

const fallbackContainerStyle = {
  marginTop: '1.5rem',
  marginBottom: '1.5rem',
  textAlign: 'left',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  color: '#94a3b8',
  marginBottom: '0.4rem',
  fontWeight: '500',
};

const inputGroupStyle = {
  display: 'flex',
  gap: '0.5rem',
};

const inputStyle = {
  flex: '1',
  padding: '0.55rem 0.75rem',
  fontSize: '0.82rem',
  fontFamily: 'monospace',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  outline: 'none',
};

const copyButtonStyle = {
  padding: '0.55rem 0.9rem',
  fontSize: '0.82rem',
  fontWeight: '500',
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const primaryButtonStyle = {
  width: '100%',
  padding: '0.7rem 1rem',
  fontSize: '0.9rem',
  fontWeight: '600',
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  marginTop: '0.25rem',
  transition: 'background-color 0.15s ease',
};

const secondaryLinkStyle = {
  display: 'inline-block',
  width: '100%',
  padding: '0.6rem 1rem',
  fontSize: '0.85rem',
  fontWeight: '500',
  color: '#cbd5e1',
  textDecoration: 'none',
  borderRadius: '10px',
  border: '1px solid #334155',
};
