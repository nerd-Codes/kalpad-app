// src/components/landing/CookieConsent.jsx
"use client";

import { useState, useEffect } from 'react';
import { Group, Text, Button, Box } from '@mantine/core';
import { IconCookie } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasConsent = localStorage.getItem('kalpad_cookie_consent');
    if (!hasConsent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDecision = (decision) => {
    localStorage.setItem('kalpad_cookie_consent', decision);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: 9999,
            maxWidth: '390px',
            width: 'calc(100% - 40px)',
          }}
        >
          <Box
            p="md"
            style={{
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              borderRadius: '16px',
              boxShadow: '0 14px 36px rgba(17, 19, 23, 0.16)',
            }}
          >
            <Group align="flex-start" wrap="nowrap" gap="sm">
              <IconCookie size={20} color="var(--kp-ink)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box style={{ flex: 1 }}>
                <Text size="sm" c="var(--kp-ink)" fw={700} mb={4}>
                  Cookie preferences
                </Text>
                <Text size="xs" c="var(--kp-secondary)" lh={1.5} mb="md">
                  We use essential functional cookies to keep your study sessions and guest previews active. Zero ad tracking.
                </Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    radius={10}
                    onClick={() => handleDecision('rejected')}
                    styles={{
                      root: {
                        color: 'var(--kp-ink)',
                        backgroundColor: 'var(--kp-raised)',
                        border: '1px solid var(--kp-border)',
                        fontWeight: 600,
                      },
                    }}
                  >
                    Essential only
                  </Button>
                  <Button
                    size="xs"
                    radius={10}
                    onClick={() => handleDecision('accepted')}
                    styles={{
                      root: {
                        backgroundColor: '#D97706',
                        color: '#111317',
                        fontWeight: 700,
                        border: 'none',
                      },
                    }}
                  >
                    Accept all
                  </Button>
                </Group>
              </Box>
            </Group>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
