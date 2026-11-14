// src/components/landing/Footer.jsx
"use client";

import { Container, Group, Text, Stack, Divider, SimpleGrid, Box, ActionIcon } from '@mantine/core';
import Link from 'next/link';
import { IconBrandDiscord, IconBrandWhatsapp, IconBrandTwitter } from '@tabler/icons-react';

function FooterLink({ href, label }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Text size="sm" c="rgba(255, 255, 255, 0.72)" style={{ cursor: 'pointer', fontWeight: 500 }}>
        {label}
      </Text>
    </Link>
  );
}

function ColumnHeader({ title }) {
  return (
    <Text
      size="xs"
      fw={700}
      c="#FFFFFF"
      mb="sm"
      style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-kp-mono)' }}
    >
      {title}
    </Text>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#121518',
        color: '#FFFFFF',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <Container size="xl" py={{ base: 48, md: 68 }}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={40} verticalSpacing={36}>
          {/* COL 1: BRAND (Pure Wordmark, no icon) */}
          <Stack gap="sm">
            <Box>
              <div
                style={{
                  fontFamily: 'var(--font-kp-mono), monospace',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#FFFFFF',
                }}
              >
                KalPad
              </div>
              <Text size="xs" c="#F4B942" mt={4} fw={600}>
                Your AI Topper Friend.
              </Text>
            </Box>
            <Text size="sm" c="rgba(255, 255, 255, 0.68)" lh={1.6} maw={280}>
              Turning late-night syllabus panic into calm, structured mastery. Designed for focused students.
            </Text>
            <Group gap="xs" mt={4}>
              <ActionIcon
                component="a"
                href="https://discord.gg/KmTCWwsD5u"
                target="_blank"
                variant="subtle"
                radius={10}
                size="md"
                style={{
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
                aria-label="KalPad on Discord"
              >
                <IconBrandDiscord size={17} />
              </ActionIcon>
              <ActionIcon
                component="a"
                href="https://chat.whatsapp.com/EMN3fzJCBWNFwDT25qWxq2?mode=ac_t"
                target="_blank"
                variant="subtle"
                radius={10}
                size="md"
                style={{
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
                aria-label="KalPad on WhatsApp"
              >
                <IconBrandWhatsapp size={17} />
              </ActionIcon>
              <ActionIcon
                component="a"
                href="https://twitter.com"
                target="_blank"
                variant="subtle"
                radius={10}
                size="md"
                style={{
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
                aria-label="KalPad on Twitter"
              >
                <IconBrandTwitter size={17} />
              </ActionIcon>
            </Group>
          </Stack>

          {/* COL 2: PRODUCT & FEATURES (No guest mode, no pricing) */}
          <Stack align="flex-start" gap="xs">
            <ColumnHeader title="Product" />
            <FooterLink href="/sign-up" label="Create Account" />
            <FooterLink href="#how-it-works" label="Syllabus Deconstruction" />
            <FooterLink href="#product-showcase" label="Textbook Notes & Proofs" />
            <FooterLink href="#product-showcase" label="1-Page A4 Cram Sheets" />
            <FooterLink href="/android/KalPad.apk" label="Android APK Download" />
          </Stack>

          {/* COL 3: COMPANY & STORY */}
          <Stack align="flex-start" gap="xs">
            <ColumnHeader title="Company" />
            <FooterLink href="/about" label="Hansraj College DU Origin" />
            <FooterLink href="/terms" label="Terms of Service" />
            <FooterLink href="/privacy" label="Privacy & Token Safety" />
            <FooterLink href="/refund-policy" label="Refund Policy" />
          </Stack>

          {/* COL 4: SUPPORT */}
          <Stack align="flex-start" gap="xs">
            <ColumnHeader title="Contact" />
            <FooterLink href="/contact" label="Student Support" />
            <FooterLink href="mailto:srijalgupta123@gmail.com" label="srijalgupta123@gmail.com" />
            <Text size="xs" c="rgba(255, 255, 255, 0.55)" mt="xs" lh={1.5}>
              Incubated at MHCIIE<br />Hansraj College, University of Delhi
            </Text>
          </Stack>
        </SimpleGrid>

        <Divider my={36} color="rgba(255, 255, 255, 0.1)" />

        <Group justify="space-between" align="center">
          <Text size="xs" c="rgba(255, 255, 255, 0.6)">
            © {new Date().getFullYear()} KalPad. Built for students with genuine academic ambition.
          </Text>
          <Text size="xs" c="#F4B942" fw={600}>
            Turn &ldquo;Kal Padhunga&rdquo; into today&apos;s win.
          </Text>
        </Group>
      </Container>
    </footer>
  );
}
