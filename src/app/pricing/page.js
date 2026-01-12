"use client";

import { Container, Title, Text, Stack, Box, Badge, Group, ThemeIcon, SimpleGrid, Button, List, Divider } from '@mantine/core';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '@/components/landing/ShimmerButton';
import Link from 'next/link';
import { 
    IconCheck, IconX, IconRocket, IconDiamond, 
    IconCrown, IconUser, IconInfoCircle, IconBolt
} from '@tabler/icons-react';

// --- DATA CONFIGURATION ---
const TIERS = [
    {
        name: 'Free Tier',
        price: '₹0',
        duration: 'Forever',
        color: 'gray',
        icon: IconUser,
        description: 'For casual students exploring the system.',
        features: [
            { text: '1 Active Study Plan', included: true },
            { text: 'Note Generation (Today Only)', included: true },
            { text: 'Basic Quiz Credits (Limited)', included: true },
            { text: 'Basic Doubt Solving (Limited)', included: true },
            { text: 'Archive Access', included: false },
            { text: 'Lecture Scout', included: false },
        ]
    },
    {
        name: 'The Sprint',
        price: '₹49',
        duration: '/ 15 Days',
        color: '#CD7F32', // Bronze
        icon: IconRocket,
        description: 'Perfect for last-minute exam prep.',
        features: [
            { text: 'Unlimited Active Plans', included: true },
            { text: 'Unlimited Note Generation', included: true },
            { text: 'Higher Quiz & Doubt Credits', included: true },
            { text: 'Plan Regeneration', included: true },
            { text: 'Unlimited Archive', included: true },
            { text: 'Lecture Scout', included: false },
        ]
    },
    {
        name: 'The Marathon',
        price: '₹79',
        duration: '/ 30 Days',
        color: '#E0E0E0', // Silver
        icon: IconDiamond,
        description: 'For consistent, month-long mastery.',
        features: [
            { text: 'Everything in Sprint', included: true },
            { text: 'Unlimited Smart Quizzes', included: true },
            { text: 'Unlimited Doubt Solver', included: true },
            { text: 'Priority Plan Generation', included: true },
            { text: 'PDF Exports', included: true },
            { text: 'Lecture Scout', included: false },
        ]
    },
    {
        name: 'The Semester',
        price: '₹129',
        duration: '/ 3 Months',
        color: '#FFD700', // Gold
        icon: IconCrown,
        recommended: true,
        description: 'The ultimate academic weapon.',
        features: [
            { text: 'Everything in Marathon', included: true },
            { text: 'Long-term Plan Strategy', included: true },
            { text: 'Early Access: Lecture Scout', included: true },
            { text: 'Early Access: Custom Tools', included: true },
            { text: 'Priority Support', included: true },
            { text: 'Best Value (Save 45%)', included: true },
        ]
    }
];

// Reusing the Infinite Void Background
function Background() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, #1e1b4b 0%, #000000 60%)' }} />
            <div style={{ 
                position: 'absolute', inset: 0, opacity: 0.3,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }} />
        </div>
    );
}

export default function PricingPage() {
    return (
        <>
            <Background />
            <Navbar />
            
            <main style={{ position: 'relative', zIndex: 1, paddingTop: '120px', paddingBottom: '80px' }}>
                <Container size="xl">
                    <Stack gap={80}>

                        {/* --- HEADER --- */}
                        <Stack align="center" ta="center">
                            <Badge variant="outline" color="yellow" size="lg" style={{ borderColor: 'rgba(253, 224, 71, 0.2)', color: 'rgba(253, 224, 71, 0.8)', letterSpacing: '0.1em' }}>
                                INVESTMENT
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
                                Simple, Transparent Pricing.
                            </Title>
                            <Text c="dimmed" size="lg">Invest in your brain. It pays the best interest.</Text>
                        </Stack>

                        {/* --- PRICING GRID --- */}
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                            {TIERS.map((tier, index) => {
                                const isRec = tier.recommended;
                                return (
                                    <Interactive key={index} className="h-full">
                                        <GlassCard 
                                            p="xl" 
                                            h="100%"
                                            style={{ 
                                                position: 'relative',
                                                backgroundColor: isRec ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255,255,255,0.02)',
                                                border: isRec ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                boxShadow: isRec ? '0 0 40px -10px rgba(255, 215, 0, 0.15)' : 'none',
                                                display: 'flex', flexDirection: 'column'
                                            }}
                                        >
                                            {isRec && (
                                                <Badge 
                                                    variant="filled" color="yellow" size="sm" 
                                                    style={{ position: 'absolute', top: 12, right: 12 }}
                                                >
                                                    BEST VALUE
                                                </Badge>
                                            )}

                                            <Stack gap="md" style={{ flex: 1 }}>
                                                <Group>
                                                    <ThemeIcon size="xl" radius="md" variant="light" color={tier.color}>
                                                        <tier.icon size={22} />
                                                    </ThemeIcon>
                                                    <Box>
                                                        <Text size="sm" fw={700} c="dimmed" tt="uppercase">{tier.name}</Text>
                                                    </Box>
                                                </Group>

                                                <Box>
                                                    <Text component="span" size="3rem" fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)', lineHeight: 1 }}>{tier.price}</Text>
                                                    <Text component="span" size="sm" c="dimmed">{tier.duration}</Text>
                                                </Box>
                                                
                                                <Text size="sm" c="gray.4" lh={1.4} style={{ minHeight: '40px' }}>{tier.description}</Text>

                                                <Divider color="rgba(255,255,255,0.1)" />

                                                <List spacing="xs" size="sm" center>
                                                    {tier.features.map((feat, i) => (
                                                        <List.Item 
                                                            key={i} 
                                                            icon={
                                                                <ThemeIcon 
                                                                    color={feat.included ? tier.color : 'gray'} 
                                                                    size={16} radius="xl" variant="transparent"
                                                                >
                                                                    {feat.included ? <IconCheck size={14} /> : <IconX size={14} style={{ opacity: 0.3 }} />}
                                                                </ThemeIcon>
                                                            }
                                                        >
                                                            <Text size="xs" c={feat.included ? 'gray.3' : 'dimmed'} style={{ opacity: feat.included ? 1 : 0.5 }}>
                                                                {feat.text}
                                                            </Text>
                                                        </List.Item>
                                                    ))}
                                                </List>
                                            </Stack>

                                            <Button 
                                                component={Link} 
                                                href={tier.name === 'Free Tier' ? '/sign-up' : '/sign-in'} // Redirects to app
                                                fullWidth 
                                                mt="xl" 
                                                radius="xl"
                                                variant={isRec ? 'gradient' : 'default'}
                                                gradient={{ from: '#FFD700', to: '#F59E0B', deg: 135 }}
                                                style={!isRec ? { backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' } : { color: 'black' }}
                                            >
                                                {tier.name === 'Free Tier' ? 'Start Free' : 'Choose Plan'}
                                            </Button>
                                        </GlassCard>
                                    </Interactive>
                                );
                            })}
                        </SimpleGrid>

                        {/* --- FOUNDER TIER (SPECIAL) --- */}
                        <GlassCard p={{ base: 'xl', md: 50 }} style={{ border: '1px solid #BF5AF2', backgroundColor: 'rgba(191, 90, 242, 0.05)' }}>
                            <Stack align="center" ta="center" gap="lg">
                                <Group gap="xs">
                                    <IconCrown size={24} color="#BF5AF2" />
                                    <Text fw={700} c="brandPurple" tt="uppercase" style={{ letterSpacing: '0.1em' }}>Exclusive Status</Text>
                                </Group>
                                <Title order={2} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>The Founder's Tier</Title>
                                <Text c="gray.3" maw={700}>
                                    A lifetime, unlimited access pass granted exclusively to our earliest adopters who believed in KalPad before it was cool. 
                                    <br/><strong>No future costs. No limits. Forever.</strong>
                                </Text>
                                <Badge variant="outline" color="grape" size="lg" radius="md">INVITE ONLY</Badge>
                            </Stack>
                        </GlassCard>

                        {/* --- COMPLIANCE FOOTER --- */}
                        <Box pt={40} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                            <Group justify="center" gap="lg">
                                <Text component={Link} href="/refund-policy" size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>Refund Policy</Text>
                                <Text component={Link} href="/terms" size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>Terms of Service</Text>
                                <Text component={Link} href="/contact" size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>Contact Support</Text>
                            </Group>
                            <Group justify="center" gap="xs" mt="sm">
                                <IconInfoCircle size={14} color="gray" />
                                <Text size="xs" c="dimmed">Payments are processed securely via PayU. We do not store card details.</Text>
                            </Group>
                        </Box>

                    </Stack>
                </Container>
            </main>
            <Footer />
        </>
    );
}