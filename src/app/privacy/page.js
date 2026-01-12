"use client";

import { Container, Title, Text, Stack, Box, Badge, Divider, Group, List, ThemeIcon } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { 
    IconShieldLock, IconDatabase, IconServer, IconMail, 
    IconUser, IconEye, IconCreditCard, IconGavel 
} from '@tabler/icons-react';

// Reusing the Infinite Void Background
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #0b1a2e 0%, #000000 70%)' }} />
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
function SectionHeader({ icon: Icon, title }) {
    return (
        <Group mb="sm">
            <ThemeIcon variant="light" color="gray" size="md" radius="xl">
                <Icon size={16} />
            </ThemeIcon>
            <Title order={3} c="white" size="h4" ff="Lexend">{title}</Title>
        </Group>
    );
}

export default function PrivacyPage() {
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
                                DATA PROTOCOL
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
                                Privacy Policy
                            </Title>
                            <Text c="dimmed">Last Updated: {today}</Text>
                        </Stack>

                        {/* --- THE POLICY --- */}
                        <GlassCard p={{ base: 'xl', md: 60 }} style={{ backgroundColor: 'rgba(15, 20, 25, 0.6)' }}>
                            <Stack gap={40}>
                                <Text size="md" c="gray.3" lh={1.6}>
                                    This Privacy Policy describes how <strong>KalPad</strong> (operated by Srijal Kumar) collects, uses, and discloses your personal information when you visit or use our website (kalpad-app.vercel.app) and services.
                                </Text>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 1. Information We Collect */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconDatabase} title="1. Information We Collect" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We collect information to provide better services to all our users.
                                    </Text>
                                    <List 
                                        spacing="sm" 
                                        size="sm" 
                                        center
                                        icon={<ThemeIcon color="cyan" size={6} radius="xl"><div /></ThemeIcon>}
                                        style={{ color: 'var(--mantine-color-gray-4)', paddingLeft: '1rem' }}
                                    >
                                        <List.Item><strong>Personal Information:</strong> When you sign up, we collect personal details such as your name and email address.</List.Item>
                                        <List.Item><strong>Academic Data:</strong> To generate study plans and notes, we collect the syllabus files, exam dates, and study preferences you upload or input.</List.Item>
                                        <List.Item><strong>Usage Data:</strong> We may collect information on how the service is accessed and used (e.g., page views, time spent, browser type).</List.Item>
                                    </List>
                                </Stack>

                                {/* 2. How We Use Your Information */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconEye} title="2. How We Use Your Information" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We use the collected data for various purposes:
                                    </Text>
                                    <List 
                                        spacing="sm" 
                                        size="sm" 
                                        type="ordered"
                                        style={{ color: 'var(--mantine-color-gray-4)', paddingLeft: '1.5rem' }}
                                    >
                                        <List.Item>To provide, operate, and maintain our Service (e.g., generating your personalized study plans).</List.Item>
                                        <List.Item>To notify you about changes to our Service.</List.Item>
                                        <List.Item>To allow you to participate in interactive features when you choose to do so.</List.Item>
                                        <List.Item>To provide customer support.</List.Item>
                                        <List.Item>To monitor the usage of the Service and detect technical issues.</List.Item>
                                    </List>
                                </Stack>

                                {/* 3. Data Storage and Security */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconShieldLock} title="3. Data Storage and Security" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        <strong>Storage:</strong> Your data, including uploaded documents and generated content, is stored securely using <strong>Supabase</strong> services.
                                    </Text>
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        <strong>Security:</strong> The security of your data is important to us. We use commercially acceptable means to protect your Personal Data, but remember that no method of transmission over the Internet is 100% secure.
                                    </Text>
                                </Stack>

                                {/* 4. Third-Party Services */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconServer} title="4. Third-Party Services" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), such as:
                                    </Text>
                                    <List 
                                        spacing="sm" 
                                        size="sm" 
                                        style={{ color: 'var(--mantine-color-gray-4)', paddingLeft: '1rem' }}
                                    >
                                        <List.Item><strong>AI Providers:</strong> Google Vertex AI and Groq (for generating content).</List.Item>
                                        <List.Item><strong>Payment Processors:</strong> PayU (for processing payments). We do not store your credit card details; they are processed directly by our third-party payment processors.</List.Item>
                                    </List>
                                </Stack>

                                {/* 5. Disclosure of Data */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconGavel} title="5. Disclosure of Data" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We may disclose your personal information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
                                    </Text>
                                </Stack>

                                {/* 6. Your Rights */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconUser} title="6. Your Rights" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        You have the right to access, update, or delete the information we have on you. Whenever made possible, you can access, update, or request deletion of your Personal Data directly within your account settings section. If you are unable to perform these actions yourself, please contact us to assist you.
                                    </Text>
                                </Stack>

                                {/* 7. Changes to Policy */}
                                <Stack gap="xs">
                                    <SectionHeader icon={IconServer} title="7. Changes to This Privacy Policy" />
                                    <Text size="md" c="gray.4" lh={1.6}>
                                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                                    </Text>
                                </Stack>

                                <Divider color="rgba(255,255,255,0.1)" />

                                {/* 8. Contact Us */}
                                <Box p="lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Stack gap="md">
                                        <Title order={4} c="white" ff="Lexend">8. Contact Us</Title>
                                        <Text size="sm" c="gray.4">
                                            If you have any questions about this Privacy Policy, please contact us:
                                        </Text>
                                        <Group gap="xs">
                                            <IconMail size={16} color="gray" />
                                            <Text component="a" href="mailto:srijalgupta123@gmail.com" c="cyan" style={{ textDecoration: 'underline' }}>
                                                srijalgupta123@gmail.com
                                            </Text>
                                        </Group>
                                        <Text size="sm" c="gray.5">
                                            <strong>Operator Address:</strong> Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503
                                        </Text>
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