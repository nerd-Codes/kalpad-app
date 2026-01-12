"use client";

import { Container, Title, Text, Stack, Box, Badge, Divider, Group } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { IconMapPin, IconMail, IconUser } from '@tabler/icons-react';

// Reusing the Infinite Void Background
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #1a0b2e 0%, #000000 70%)' }} />
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }} />
        </div>
    );
}

// Sub-component for contact details
function InfoRow({ icon: Icon, label, value }) {
    return (
        <Group align="flex-start" wrap="nowrap">
            <Icon size={18} style={{ marginTop: 2, color: '#BF5AF2', flexShrink: 0 }} />
            <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
                <Text size="sm" c="white">{value}</Text>
            </Box>
        </Group>
    );
}

export default function TermsPage() {
    // Format today's date
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
                            <Badge variant="outline" color="gray" size="lg" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
                                LEGAL DOCKET
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
                                Terms & Conditions
                            </Title>
                            <Text c="dimmed">Last Updated: {today}</Text>
                        </Stack>

                        {/* --- THE CONTRACT --- */}
                        <GlassCard p={{ base: 'xl', md: 60 }} style={{ backgroundColor: 'rgba(20, 20, 25, 0.6)' }}>
                            <Stack gap={40}>
                                <Text size="md" c="gray.3" lh={1.6}>
                                    Welcome to KalPad. By accessing or using our website and services, you agree to be bound by these Terms and Conditions. Please read them carefully.
                                </Text>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 1. General Information */}
                                <Stack gap="md">
                                    <Title order={3} c="white" size="h4" ff="Lexend">1. General Information</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        This website (kalpad-app.vercel.app) is operated by <strong>Srijal Kumar</strong>. Throughout the site, the terms “we”, “us” and “our” refer to KalPad and its operator.
                                    </Text>
                                    
                                    {/* Business Card Box */}
                                    <Box p="lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Stack gap="md">
                                            <InfoRow icon={IconUser} label="Operator Name" value="Srijal Kumar" />
                                            <InfoRow icon={IconMapPin} label="Registered Address" value="Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503" />
                                            <InfoRow icon={IconMail} label="Contact Email" value="srijalgupta123@gmail.com" />
                                        </Stack>
                                    </Box>
                                </Stack>

                                {/* 2. Services */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">2. Services</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        KalPad is an AI-powered academic strategist platform providing study planning, note generation, and educational assistance tools. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time without notice.
                                    </Text>
                                </Stack>

                                {/* 3. User Accounts */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">3. User Accounts</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        To access certain features, you must create an account. You agree to provide accurate, current, and complete information during the registration process and to keep your account information updated. You are responsible for safeguarding your password and for all activities that occur under your account.
                                    </Text>
                                </Stack>

                                {/* 4. Payments and Pricing */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">4. Payments and Pricing</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We offer both free and paid subscription plans.
                                    </Text>
                                    <Stack gap="xs" pl="md" style={{ borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                        <Text size="sm" c="dimmed"><strong>Pricing:</strong> All prices are listed in Indian Rupees (INR) and are subject to change without notice.</Text>
                                        <Text size="sm" c="dimmed"><strong>Payment Processing:</strong> Payments are processed securely via third-party gateways (PayU). By purchasing a subscription, you agree to their terms of service.</Text>
                                    </Stack>
                                </Stack>

                                {/* 5. Intellectual Property */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">5. Intellectual Property</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        All content included on this site, such as text, graphics, logos, images, and software, is the property of KalPad or its content suppliers and is protected by Indian and international copyright laws. The “KalPad” name and logo are trademarks of Srijal Kumar.
                                    </Text>
                                </Stack>

                                {/* 6. Limitation of Liability */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">6. Limitation of Liability</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        KalPad is an educational tool designed to assist with study planning. We do not guarantee specific academic results (e.g., grades, admissions). To the fullest extent permitted by law, Srijal Kumar and KalPad shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service.
                                    </Text>
                                </Stack>

                                {/* 7. Termination */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">7. Termination</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We reserve the right to terminate or suspend your account and access to the services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
                                    </Text>
                                </Stack>

                                {/* 8. Governing Law */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">8. Governing Law</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        These Terms shall be governed and construed in accordance with the laws of <strong>India</strong>, without regard to its conflict of law provisions. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in <strong>Patna, Bihar</strong>.
                                    </Text>
                                </Stack>

                                {/* 9. Changes to Terms */}
                                <Stack gap="xs">
                                    <Title order={3} c="white" size="h4" ff="Lexend">9. Changes to Terms</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                                    </Text>
                                </Stack>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* Contact Footer */}
                                <Stack gap="md">
                                    <Title order={3} c="white" size="h4" ff="Lexend">Contact Us</Title>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        If you have any questions about these Terms, please contact us at:
                                    </Text>
                                    <Group gap="xl">
                                        <Group gap="xs">
                                            <IconMail size={16} color="gray" />
                                            <Text component="a" href="mailto:srijalgupta123@gmail.com" c="brandPurple" style={{ textDecoration: 'underline' }}>
                                                srijalgupta123@gmail.com
                                            </Text>
                                        </Group>
                                    </Group>
                                    <Group gap="xs" align="flex-start">
                                        <IconMapPin size={16} color="gray" style={{ marginTop: 4 }} />
                                        <Text size="sm" c="dimmed">Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503</Text>
                                    </Group>
                                </Stack>

                            </Stack>
                        </GlassCard>

                    </Stack>
                </Container>
            </main>

            <Footer />
        </>
    );
}