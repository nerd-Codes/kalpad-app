// src/components/landing/Footer.jsx
"use client";

import { Container, Group, Text, Stack, Title, Divider, SimpleGrid, Box, ThemeIcon, ActionIcon } from '@mantine/core';
import Link from 'next/link';
import { IconBrandDiscord, IconBrandWhatsapp, IconBrandTwitter, IconHeart } from '@tabler/icons-react';
import { Interactive } from '@/components/Interactive';

// --- SUB-COMPONENT: FOOTER LINK ---
function FooterLink({ href, label }) {
    return (
        <Link href={href} style={{ textDecoration: 'none' }}>
            <Text 
                size="sm" 
                c="dimmed" 
                style={{ 
                    transition: 'color 0.2s ease', 
                    cursor: 'pointer' 
                }}
                className="hover:text-white"
            >
                {label}
            </Text>
        </Link>
    );
}

// --- SUB-COMPONENT: COLUMN HEADER ---
function ColumnHeader({ title }) {
    return (
        <Text size="xs" fw={700} c="white" tt="uppercase" mb="sm" style={{ letterSpacing: '0.05em', opacity: 0.9 }}>
            {title}
        </Text>
    );
}

export function Footer() {
    return (
        <footer style={{
            backgroundColor: '#000',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            zIndex: 10
        }}>
            <Container size="xl" py={{ base: 60, md: 80 }}>
                
                {/* --- TOP SECTION: THE GRID --- */}
                <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={50} verticalSpacing={50}>
                    
                    {/* COL 1: BRAND IDENTITY */}
                    <Stack gap="lg">
                        <Box>
                            <Title order={3} className="apple-text-gradient" style={{ fontFamily: 'var(--font-lexend)', letterSpacing: '-0.02em' }}>
                                KalPad
                            </Title>
                            <Text size="xs" c="dimmed" mt={4} fw={500} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                Genius OS
                            </Text>
                        </Box>
                        <Text size="sm" c="dimmed" lh={1.6} maw={250}>
                            The AI strategist that turns academic chaos into a winning streak.
                        </Text>
                        <Group gap="xs">
                            <Interactive>
                                <ActionIcon component="a" href="https://discord.gg/KmTCWwsD5u" target="_blank" variant="subtle" color="gray" radius="xl" size="lg">
                                    <IconBrandDiscord size={20} />
                                </ActionIcon>
                            </Interactive>
                            <Interactive>
                                <ActionIcon component="a" href="https://chat.whatsapp.com/EMN3fzJCBWNFwDT25qWxq2?mode=ac_t" target="_blank" variant="subtle" color="gray" radius="xl" size="lg">
                                    <IconBrandWhatsapp size={20} />
                                </ActionIcon>
                            </Interactive>
                            <Interactive>
                                <ActionIcon component="a" href="https://twitter.com" target="_blank" variant="subtle" color="gray" radius="xl" size="lg">
                                    <IconBrandTwitter size={20} />
                                </ActionIcon>
                            </Interactive>
                        </Group>
                    </Stack>

                    {/* COL 2: PRODUCT */}
                    <Stack align="flex-start" gap="xs">
                        <ColumnHeader title="Know More" />
                        <FooterLink href="/about" label="About Us" />
                        <FooterLink href="/guest-plan" label="Guest Mode" />
                        <FooterLink href="/pricing" label="Pricing" />
                    </Stack>

                    {/* COL 3: LEGAL & COMPLIANCE (TRANSPARENT) */}
                    <Stack align="flex-start" gap="xs">
                        <ColumnHeader title="Legal & Policy" />
                        <FooterLink href="/terms" label="Terms of Service" />
                        <FooterLink href="/privacy" label="Privacy Policy" />
                        <FooterLink href="/refund-policy" label="Refund & Cancellation" />
                        <FooterLink href="/shipping-policy" label="Shipping & Delivery" />
                    </Stack>

                    {/* COL 4: SUPPORT */}
                    <Stack align="flex-start" gap="xs">
                        <ColumnHeader title="Connect" />
                        <FooterLink href="/contact" label="Contact Support" />
                        <FooterLink href="/contact" label="+91 92348 88384" />
                        <FooterLink href="mailto:srijalgupta123@gmail.com" label="srijalgupta123@gmail.com" />
                        <Text size="xs" c="dimmed" mt="md">
                            Patna, Bihar, India 🇮🇳
                        </Text>
                    </Stack>

                </SimpleGrid>

                <Divider my={60} color="rgba(255,255,255,0.1)" />

                {/* --- BOTTOM SECTION: COPYRIGHT --- */}
                <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed">
                        © {new Date().getFullYear()} KalPad Inc. All rights reserved.
                    </Text>
                    <Group gap="xs">
                        <Text size="xs" c="dimmed">Built with</Text>
                        <IconHeart size={12} color="#BF5AF2" fill="#BF5AF2" />
                        <Text size="xs" c="dimmed">by Srijal Kumar</Text>
                    </Group>
                </Group>

            </Container>
        </footer>
    );
}