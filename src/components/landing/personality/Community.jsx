"use client";

import { Container, Title, Text, Stack, Button, Group, Box, Badge, Avatar, AvatarGroup } from '@mantine/core';
import { IconBrandDiscord, IconBrandWhatsapp, IconUsers, IconActivity } from '@tabler/icons-react';
import { GlassCard } from '../../GlassCard'; 
import { Interactive } from '@/components/Interactive';
import { ShimmerButton } from '../ShimmerButton';

export function Community() {
    return (
        <Box 
            id="community-section" 
            py={{ base: 100, md: 160 }} 
            style={{ position: 'relative', zIndex: 10 }}
        >
            <Container size="md">
                <GlassCard 
                    p={{ base: 'xl', md: 80 }}
                    style={{
                        backgroundColor: 'rgba(15, 15, 20, 0.6)',
                        backdropFilter: 'blur(30px) saturate(150%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 0 100px -20px rgba(124, 58, 237, 0.2)', // Purple glow
                        textAlign: 'center'
                    }}
                >
                    <Stack align="center" gap="xl">
                        
                        {/* 1. Header: Social Proof */}
                        <Group gap="xs" style={{ opacity: 0.8 }}>
                            <AvatarGroup spacing="sm">
                                <Avatar color="cyan" radius="xl">AJ</Avatar>
                                <Avatar color="blue" radius="xl">SK</Avatar>
                                <Avatar color="grape" radius="xl">RK</Avatar>
                            </AvatarGroup>
                            <Text size="sm" c="dimmed" fw={500} ml="xs">
                                +100Students currently deploying strategies
                            </Text>
                        </Group>

                        {/* 2. The Headline */}
                        <Box>
                            <Badge 
                                variant="outline" color="gray" size="lg" mb="md"
                                styles={{ root: { borderColor: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'var(--font-lexend)' } }}
                            >
                                THE INNER CIRCLE
                            </Badge>
                            <Title 
                                order={2} 
                                style={{ 
                                    fontFamily: 'var(--font-lexend)', 
                                    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
                                    lineHeight: 1,
                                    letterSpacing: '-0.04em',
                                    color: 'white'
                                }}
                            >
                                Don't just use the tool. <br/>
                                <span className="apple-text-gradient">Build the weapon.</span>
                            </Title>
                        </Box>

                        {/* 3. The Narrative */}
                        <Text size="xl" c="dimmed" lh={1.6} maw={700}>
                            KalPad is built in public. The roadmap isn't decided in a boardroom; it's decided in our Discord. 
                            Join the "War Room" to report bugs, request features, and roast our code.
                        </Text>

                        {/* 4. The Portals (Buttons) */}
                        <Group mt="lg" gap="lg">
                            <Interactive>
                                <ShimmerButton
                                    component="a"
                                    href="https://discord.gg/KmTCWwsD5u"
                                    target="_blank"
                                    size="xl"
                                    radius="xl"
                                    leftSection={<IconBrandDiscord size={24} />}
                                    color='#5865F2'
                                    style={{
                                        backgroundColor: '#5865F2',
                                        color: 'white',
                                        boxShadow: '0 10px 30px rgba(88, 101, 242, 0.4)',
                                        border: 'none',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    <IconBrandDiscord size={24} /> Join Discord
                                </ShimmerButton>
                            </Interactive>
                            <Interactive>
                                <ShimmerButton
                                    component="a"
                                    href="https://chat.whatsapp.com/EMN3fzJCBWNFwDT25qWxq2?mode=ac_t"
                                    target="_blank"
                                    size="xl"
                                    radius="xl"
                                    variant="default"
                                    color='#25D366'
                                >
                                   <IconBrandWhatsapp size={24} /> WhatsApp
                                </ShimmerButton>
                            </Interactive>
                        </Group>

                        {/* 5. System Status Footer */}
                        <Box 
                            mt="xl" 
                            pt="lg" 
                            style={{ 
                                width: '100%', 
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', justifyContent: 'center' 
                            }}
                        >
                            <Group gap="xl" c="dimmed" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                <Group gap={6}>
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>SYSTEM: ONLINE</span>
                                </Group>
                                <Group gap={6}>
                                    <IconUsers size={14} />
                                    <span>MEMBERS: 100+</span>
                                </Group>
                                <Group gap={6}>
                                    <IconActivity size={14} />
                                    <span>UPTIME: 99.9%</span>
                                </Group>
                            </Group>
                        </Box>

                    </Stack>
                </GlassCard>
            </Container>
        </Box>
    );
}