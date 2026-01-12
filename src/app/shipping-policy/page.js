"use client";

import { Container, Title, Text, Stack, Box, Badge, Divider, Group, ThemeIcon, List } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { 
    IconTruckDelivery, IconCloudDownload, IconAlertTriangle, 
    IconMail, IconMapPin, IconBolt 
} from '@tabler/icons-react';

// Reusing the Infinite Void Background
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #0f172a 0%, #000000 70%)' }} />
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

export default function ShippingPolicyPage() {
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
                            <Badge variant="outline" color="cyan" size="lg" style={{ borderColor: 'rgba(34, 211, 238, 0.2)', color: 'rgba(34, 211, 238, 0.8)', letterSpacing: '0.1em' }}>
                                LOGISTICS PROTOCOL
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
                                Shipping & Delivery
                            </Title>
                            <Text c="dimmed">Last Updated: {today}</Text>
                        </Stack>

                        {/* --- THE POLICY --- */}
                        <GlassCard p={{ base: 'xl', md: 60 }} style={{ backgroundColor: 'rgba(20, 25, 30, 0.6)' }}>
                            <Stack gap={40}>
                                <Text size="md" c="gray.3" lh={1.6}>
                                    <strong>KalPad</strong> is a Software-as-a-Service (SaaS) platform. We do not sell or ship physical goods. All services are delivered digitally.
                                </Text>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 1. Digital Delivery */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconCloudDownload} title="1. Digital Delivery" color="blue" />
                                    
                                    <Box p="md" mb="sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                        <Group align="flex-start" gap="xs">
                                            <IconBolt size={18} color="#3b82f6" style={{ marginTop: 2 }} />
                                            <Text size="sm" c="gray.3" lh={1.5}>
                                                <strong>Instant Access:</strong> Upon successful registration or purchase of a premium subscription, your access to KalPad’s services is activated immediately.
                                            </Text>
                                        </Group>
                                    </Box>

                                    <Text size="md" c="gray.4" lh={1.6}>
                                        <strong>No Physical Shipping:</strong> Since our products are entirely digital tools and content, there is no physical shipping involved, and no shipping charges apply.
                                    </Text>
                                </Stack>

                                {/* 2. Access Issues */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconAlertTriangle} title="2. Access Issues" color="orange" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        If you have successfully completed a payment but are unable to access premium features, please contact our support team immediately. We will resolve the issue as a priority.
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Please include your <strong>Transaction ID</strong> or registered email address when contacting support.
                                    </Text>
                                </Stack>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 3. Contact Us */}
                                <Box p="lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Stack gap="md">
                                        <SectionHeader icon={IconMail} title="3. Contact Us" color="gray" />
                                        <Text size="sm" c="gray.4">
                                            For any questions regarding service delivery, please contact us:
                                        </Text>
                                        <Group gap="xl">
                                            <Group gap="xs">
                                                <IconMail size={16} color="gray" />
                                                <Text component="a" href="mailto:srijalgupta123@gmail.com" c="cyan" style={{ textDecoration: 'underline' }}>
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