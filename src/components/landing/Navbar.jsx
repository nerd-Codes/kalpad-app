// src/components/landing/Navbar.jsx
"use client";

import { useState, useEffect } from 'react';
import { Box, Burger, Group, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowRight } from '@tabler/icons-react';
import supabase from '@/lib/supabaseClient';

export function Navbar() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      setSession(activeSession);
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    close();
    router.refresh();
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '60px',
        zIndex: 100,
        backgroundColor: 'rgba(244, 185, 66, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(17, 19, 23, 0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          height: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 1. Pure KalPad Wordmark (No icon next to wordmark) */}
        <Link
          href="/"
          onClick={close}
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-kp-mono), monospace',
              fontSize: '21px',
              fontWeight: 800,
              color: '#111317',
              letterSpacing: '-0.03em',
            }}
          >
            KalPad
          </span>
        </Link>

        {/* 2. Desktop Navigation Anchors */}
        <Group gap="28px" visibleFrom="sm" component="nav" aria-label="Main Navigation">
          <a
            href="#how-it-works"
            style={{
              color: '#111317',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              opacity: 0.85,
              transition: 'opacity 150ms ease',
            }}
          >
            How it works
          </a>
          <a
            href="#product-showcase"
            style={{
              color: '#111317',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              opacity: 0.85,
              transition: 'opacity 150ms ease',
            }}
          >
            What KalPad Builds
          </a>
          <a
            href="#faq"
            style={{
              color: '#111317',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              opacity: 0.85,
              transition: 'opacity 150ms ease',
            }}
          >
            FAQ
          </a>
        </Group>

        {/* 3. Action Buttons (No dark mode toggle) */}
        <Group gap="14px" visibleFrom="xs">
          {!session ? (
            <>
              <Link
                href="/sign-in"
                style={{
                  color: '#111317',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '6px 12px',
                }}
              >
                Sign in
              </Link>

              <Link
                href="/sign-up"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  backgroundColor: '#111317',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  transition: 'transform 150ms ease, background-color 150ms ease',
                }}
                id="nav-start-free-cta"
              >
                <span>Get Started</span>
                <IconArrowRight size={14} stroke={2.5} />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '38px',
                  padding: '0 18px',
                  borderRadius: '999px',
                  backgroundColor: '#111317',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Dashboard
              </Link>
              <Button
                size="xs"
                variant="subtle"
                onClick={handleSignOut}
                styles={{
                  root: {
                    color: '#111317',
                    height: '38px',
                    borderRadius: '999px',
                    fontWeight: 700,
                  },
                }}
              >
                Sign out
              </Button>
            </>
          )}
        </Group>

        {/* 4. Mobile Burger */}
        <Burger
          opened={opened}
          onClick={toggle}
          size="sm"
          color="#111317"
          hiddenFrom="sm"
          aria-label="Toggle navigation"
        />
      </div>

      {/* Mobile Drawer */}
      {opened && (
        <Box
          hiddenFrom="sm"
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            backgroundColor: '#FFFDF7',
            borderBottom: '1px solid var(--kp-border)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
          }}
        >
          <a
            href="#how-it-works"
            onClick={close}
            style={{ color: '#111317', fontSize: '16px', fontWeight: 700, textDecoration: 'none' }}
          >
            How it works
          </a>
          <a
            href="#product-showcase"
            onClick={close}
            style={{ color: '#111317', fontSize: '16px', fontWeight: 700, textDecoration: 'none' }}
          >
            What KalPad Builds
          </a>
          <a
            href="#faq"
            onClick={close}
            style={{ color: '#111317', fontSize: '16px', fontWeight: 700, textDecoration: 'none' }}
          >
            FAQ
          </a>

          <div style={{ height: '1px', backgroundColor: 'rgba(17, 19, 23, 0.1)' }} />

          {!session ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/sign-in"
                onClick={close}
                style={{
                  color: '#111317',
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '8px 0',
                }}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={close}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '46px',
                  width: '100%',
                  borderRadius: '999px',
                  backgroundColor: '#111317',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>Get Started</span>
                <IconArrowRight size={16} stroke={2.5} />
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/dashboard"
                onClick={close}
                style={{ color: '#111317', fontSize: '16px', fontWeight: 700, textDecoration: 'none' }}
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5A5E6D',
                  fontSize: '15px',
                  textAlign: 'left',
                  padding: '6px 0',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </Box>
      )}
    </header>
  );
}
