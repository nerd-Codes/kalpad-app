"use client";

import { Container, Title, Text, Stack, Box, Badge, Group, ThemeIcon, SimpleGrid, Button } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { 
    IconMail, IconPhone, IconMapPin, IconBrandDiscord, IconMessageCircle 
} from '@tabler/icons-react';

// Reusing the Infinite Void Background
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #172554 0%, #000000 70%)' }} />
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }} />
        </div>
    );
}

// Sub-component for Contact Tiles
function ContactTile({ icon: Icon, label, value, href, color }) {
    return (
        <Interactive className="h-full">
            <GlassCard 
                component="a"
                href={href}
                p="xl" 
                h="100%"
                style={{ 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                }}
            >
                <ThemeIcon size={60} radius="100%" variant="light" color={color}>
                    <Icon size={30} />
                </ThemeIcon>
                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                        {label}
                    </Text>
                    <Text size="lg" fw={600} c="white" mt={4}>
                        {value}
                    </Text>
                </Box>
            </GlassCard>
        </Interactive>
    );
}

export default function ContactPage() {
    return (
        <>
            <Background />
            <Navbar />
            
            <main style={{ position: 'relative', zIndex: 1, paddingTop: '120px', paddingBottom: '80px' }}>
                <Container size="md">
                    <Stack gap={60}>

                        {/* --- HEADER --- */}
                        <Stack align="center" ta="center">
                            <Badge variant="outline" color="blue" size="lg" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', color: 'rgba(59, 130, 246, 0.8)', letterSpacing: '0.1em' }}>
                                SUPPORT CHANNELS
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
                                Get in Touch
                            </Title>
                            <Text c="dimmed" size="lg" maw={600}>
                                Have a question about your plan, a feature request, or a business inquiry? We're here to help.
                            </Text>
                        </Stack>

                        {/* --- DIRECT CONTACT GRID --- */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                            <ContactTile 
                                icon={IconMail} 
                                label="Email Support" 
                                value="srijalgupta123@gmail.com" 
                                href="mailto:srijalgupta123@gmail.com"
                                color="blue"
                            />
                            <ContactTile 
                                icon={IconPhone} 
                                label="Phone Support" 
                                value="+91 92348 88384" 
                                href="tel:+919234888384"
                                color="green"
                            />
                        </SimpleGrid>

                        {/* --- COMMUNITY SUPPORT (Soft CTA) --- */}
                        <GlassCard p="xl" style={{ backgroundColor: 'rgba(88, 101, 242, 0.1)', border: '1px solid rgba(88, 101, 242, 0.2)' }}>
                            <Group justify="space-between" align="center" wrap="wrap" gap="lg">
                                <Box>
                                    <Title order={3} c="white" size="h4" ff="Lexend">Join the War Room</Title>
                                    <Text size="sm" c="gray.3" mt={4} maw={500}>
                                        For faster responses, debugging, and feature requests, join our active student community on Discord.
                                    </Text>
                                </Box>
                                <Button 
                                    component="a" 
                                    href="https://discord.gg/KmTCWwsD5u" 
                                    target="_blank"
                                    color="indigo" 
                                    radius="xl"
                                    leftSection={<IconBrandDiscord size={20} />}
                                >
                                    Join Discord
                                </Button>
                            </Group>
                        </GlassCard>

                        {/* --- OPERATOR DETAILS (Compliance) --- */}
                        <Box pt={40} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Stack gap="md" align="center" ta="center">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                                    Operator Details
                                </Text>
                                <Stack gap={4}>
                                    <Text size="sm" c="gray.4">
                                        This platform is operated by <strong style={{ color: 'white' }}>Srijal Kumar</strong>.
                                    </Text>
                                    <Group justify="center" gap="xs" c="gray.5">
                                        <IconMapPin size={16} />
                                        <Text size="sm">Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503</Text>
                                    </Group>
                                </Stack>
                            </Stack>
                        </Box>

                    </Stack>
                </Container>
            </main>

            <Footer />
        </>
    );
}