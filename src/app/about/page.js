"use client";

import { Container, Title, Text, Stack, Box, SimpleGrid, ThemeIcon, Avatar, Group, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconBrain, IconBolt, IconMapPin, IconMail } from '@tabler/icons-react';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassCard } from '@/components/GlassCard';
import { Interactive } from '@/components/Interactive';

// Reuse the Infinite Void for consistency
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

export default function AboutPage() {
    return (
        <>
            <Background />
            <Navbar />
            
            <main style={{ position: 'relative', zIndex: 1, paddingTop: '120px', paddingBottom: '80px' }}>
                <Container size="md">
                    <Stack gap={100}>

                        {/* --- SECTION 1: THE ORIGIN STORY --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Stack align="center" ta="center" mb="xl">
                                <Badge variant="outline" color="gray" size="lg" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
                                    THE ORIGIN
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
                                    The "Kal Padhunga" Problem.
                                </Title>
                            </Stack>

                            <GlassCard p={{ base: 'xl', md: 60 }} style={{ backgroundColor: 'rgba(20, 20, 25, 0.6)' }}>
                                <Stack gap="lg">
                                    <Text size="lg" c="gray.3" lh={1.7}>
                                        My name is <span style={{ color: 'white', fontWeight: 600 }}>Srijal</span>, and I'm a student at Hansraj College. Like most of you, my academic life was a constant battle between ambition and chaos.
                                    </Text>
                                    <Text size="lg" c="gray.3" lh={1.7}>
                                        I was juggling internships, hackathons, and societies. But every night at 11 PM, I'd face the same enemy: a 50-page syllabus PDF and a mountain of unstructured notes. The problem wasn't that I didn't want to study. The problem was the sheer <strong>'meta-work'</strong> of figuring out <em>where to start</em>.
                                    </Text>
                                    <Text size="lg" c="gray.3" lh={1.7}>
                                        That paralysis usually ended with the same lie: <em>'Kal Padhunga'</em> (I'll study tomorrow). I realized the system was broken. So, I built a weapon to fix it.
                                    </Text>
                                </Stack>
                            </GlassCard>
                        </motion.div>

                        {/* --- SECTION 2: THE PHILOSOPHY --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} verticalSpacing={40}>
                                {/* Left: The Visual Metaphor */}
                                <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <GlassCard p={0} style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(191, 90, 242, 0.05)', border: '1px solid rgba(191, 90, 242, 0.2)' }}>
                                        <ThemeIcon size={120} radius="100%" variant="gradient" gradient={{ from: '#BF5AF2', to: '#5E5CE6', deg: 135 }} style={{ boxShadow: '0 0 60px rgba(191, 90, 242, 0.4)' }}>
                                            <IconBrain size={60} />
                                        </ThemeIcon>
                                    </GlassCard>
                                </Box>

                                {/* Right: The Text */}
                                <Stack justify="center" gap="lg">
                                    <Title order={2} ff="Lexend" c="white" style={{ fontSize: '2.5rem' }}>
                                        Strategist. Mentor. <br/> <span style={{ color: '#BF5AF2' }}>Co-Founder.</span>
                                    </Title>
                                    <Text size="lg" c="gray.3" lh={1.6}>
                                        KalPad isn't just another app. It's a philosophy. We believe that technology shouldn't just give you answers; it should build the scaffolding for you to find them yourself.
                                    </Text>
                                    <Text size="lg" c="gray.3" lh={1.6}>
                                        We are not a corporate tool built in a boardroom. We are a student-led movement built in a dorm room. Our mission is to eliminate the anxiety of planning so you can focus on the joy of learning.
                                    </Text>
                                </Stack>
                            </SimpleGrid>
                        </motion.div>

                        {/* --- SECTION 3: THE TEAM --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Stack align="center" gap="xl">
                                <Title order={2} ff="Lexend" ta="center">Built by a Student, For Students.</Title>
                                
                                <GlassCard p="xl" style={{ display: 'inline-block', minWidth: '300px' }}>
                                    <Stack align="center" gap="md">
                                        <div style={{ padding: '4px', background: 'linear-gradient(135deg, #BF5AF2, #5E5CE6)', borderRadius: '50%' }}>
                                            <Avatar 
                                                src="/srijal.jpg" // Ensure you have this image or it falls back to initials
                                                alt="Srijal Kumar" 
                                                size={120} 
                                                radius="120px"
                                                style={{ border: '4px solid #1a1a1a' }}
                                            >
                                                SK
                                            </Avatar>
                                        </div>
                                        <Box ta="center">
                                            <Title order={3} size="h3" c="white">Srijal Kumar</Title>
                                            <Badge variant="light" color="violet" mt={4}>Founder & Lead Engineer</Badge>
                                        </Box>
                                        <Text ta="center" c="gray.3" size="sm" maw={300}>
                                            Electronics student at Hansraj College. Obsessed with AI, design, and solving the problems that keep students awake at night.
                                        </Text>
                                    </Stack>
                                </GlassCard>
                            </Stack>
                        </motion.div>

                        {/* --- SECTION 4: COMPLIANCE FOOTER --- */}
                        <Box 
                            mt={60} 
                            pt={40} 
                            style={{ 
                                borderTop: '1px solid rgba(255,255,255,0.1)', 
                                textAlign: 'center' 
                            }}
                        >
                            <Text size="xs" fw={700} c="gray.3" tt="uppercase" mb="md" style={{ letterSpacing: '0.1em' }}>
                                Operator Details
                            </Text>
                            <Stack gap="xs" c="gray.3" size="sm" style={{ opacity: 0.7 }}>
                                <Text>This website is operated by <span style={{ color: 'white' }}>Srijal Kumar</span>.</Text>
                                <Group justify="center" gap="xs">
                                    <IconMapPin size={14} />
                                    <Text>Near Sanjay Watch Co., Sadar Bazar, Danapur Cantt, Patna, Bihar, 801503</Text>
                                </Group>
                                <Group justify="center" gap="xs">
                                    <IconMail size={14} />
                                    <Text component="a" href="mailto:srijalgupta123@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                        srijalgupta123@gmail.com
                                    </Text>
                                </Group>
                            </Stack>
                        </Box>

                    </Stack>
                </Container>
            </main>

            <Footer />
        </>
    );
}