"use client";

import { Container, Title, Text, Stack, Box, Badge, Divider, Group, ThemeIcon, List } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { 
    IconReceiptRefund, IconBan, IconInfoCircle, 
    IconMail, IconMapPin, IconCalendarTime 
} from '@tabler/icons-react';

// Reusing the Infinite Void Background for consistency
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #2e1065 0%, #000000 70%)' }} />
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }} />
        </div>
    );
}

// Sub-component for section headers
function SectionHeader({ icon: Icon, title, color }) {
    return (
        <Group mb="sm">
            <ThemeIcon variant="light" color={color} size="md" radius="xl">
                <Icon size={16} />
            </ThemeIcon>
            <Title order={3} c="white" size="h4" ff="Lexend">{title}</Title>
        </Group>
    );
}

export default function RefundPolicyPage() {
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <>
            <Background />
            <Navbar />
            
            <main style={{ position: 'relative', zIndex: 1, paddingTop: '120px', paddingBottom: '80px' }}>
                <Container size="md">
                    <Stack gap="xl">

                        {/* --- HEADER --- */}
                        <Stack align="center" ta="center">
                            <Badge variant="outline" color="pink" size="lg" style={{ borderColor: 'rgba(236, 72, 153, 0.2)', color: 'rgba(236, 72, 153, 0.8)', letterSpacing: '0.1em' }}>
                                FINANCIAL POLICY
                            </Badge>
                            <Title 
                                order={1} 
                                className="apple-text-gradient"
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.03em'
                                }}
                            >
                                Refund & Cancellation
                            </Title>
                            <Text c="dimmed">Last Updated: {today}</Text>
                        </Stack>

                        {/* --- THE POLICY --- */}
                        <GlassCard p={{ base: 'xl', md: 60 }} style={{ backgroundColor: 'rgba(25, 20, 25, 0.6)' }}>
                            <Stack gap={40}>
                                <Text size="md" c="gray.3" lh={1.6}>
                                    At <strong>KalPad</strong>, we strive to provide the best AI-powered academic assistance. However, we understand that circumstances change. This policy outlines the terms for cancellations and refunds.
                                </Text>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 1. Cancellation Policy */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconBan} title="1. Cancellation Policy" color="orange" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        You may cancel your KalPad premium subscription at any time.
                                    </Text>
                                    <List 
                                        spacing="sm" 
                                        size="sm" 
                                        style={{ color: 'var(--mantine-color-gray-4)', paddingLeft: '1rem', marginTop: '8px' }}
                                    >
                                        <List.Item><strong>How to Cancel:</strong> Cancellations can be performed directly through your account settings dashboard or by contacting our support team at <span style={{ color: 'white' }}>srijalgupta123@gmail.com</span>.</List.Item>
                                        <List.Item><strong>Effect of Cancellation:</strong> Upon cancellation, your subscription will remain active until the end of the current billing cycle. You will not be charged for the subsequent cycle. No further charges will be applied to your account.</List.Item>
                                    </List>
                                </Stack>

                                {/* 2. Refund Policy */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconReceiptRefund} title="2. Refund Policy" color="pink" />
                                    
                                    {/* Insight Box about AI Costs */}
                                    <Box p="md" mb="sm" style={{ backgroundColor: 'rgba(236, 72, 153, 0.05)', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.1)' }}>
                                        <Group align="flex-start" gap="xs">
                                            <IconInfoCircle size={18} color="#ec4899" style={{ marginTop: 2 }} />
                                            <Text size="sm" c="gray.3" lh={1.5}>
                                                Due to the digital nature of our product and the immediate costs incurred (AI compute resources) upon usage, we generally <strong>do not offer refunds</strong> for partial months or unused services once a payment has been processed.
                                            </Text>
                                        </Group>
                                    </Box>

                                    <Text size="md" c="gray.4" lh={1.6}>
                                        <strong>Free Tier:</strong> We offer a robust Free Tier that allows users to test the core functionality of KalPad (Plan Generation, basic Note Generation) before committing to a purchase. We encourage all users to utilize this free tier to ensure the service meets their needs.
                                    </Text>

                                    <Text size="md" c="gray.4" lh={1.6}>
                                        <strong>Exceptions:</strong> Refunds may be considered on a case-by-case basis if there was a technical error that prevented you from accessing the service (e.g., a double charge). To request a refund under these circumstances, please contact us within <strong>7 days</strong> of the transaction.
                                    </Text>
                                </Stack>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 3. Contact Us */}
                                <Box p="lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Stack gap="md">
                                        <SectionHeader icon={IconMail} title="3. Contact Us" color="gray" />
                                        <Text size="sm" c="gray.4">
                                            If you have any questions concerning our return and refund policy, please contact us:
                                        </Text>
                                        <Group gap="xl">
                                            <Group gap="xs">
                                                <IconMail size={16} color="gray" />
                                                <Text component="a" href="mailto:srijalgupta123@gmail.com" c="pink" style={{ textDecoration: 'underline' }}>
                                                    srijalgupta123@gmail.com
                                                </Text>
                                            </Group>
                                        </Group>
                                        <Group gap="xs" align="flex-start">
                                            <IconMapPin size={16} color="gray" style={{ marginTop: 4 }} />
                                            <Text size="sm" c="gray.5">
                                                <strong>Address:</strong> Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503
                                            </Text>
                                        </Group>
                                    </Stack>
                                </Box>

                            </Stack>
                        </GlassCard>

                    </Stack>
                </Container>
            </main>

            <Footer />
        </>
    );
}