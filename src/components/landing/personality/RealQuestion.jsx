"use client";

import { Container, Title, Text, Box } from '@mantine/core';
import { motion } from 'framer-motion';

export function RealQuestion() {
    return (
        <Box 
            py={{ base: 80, md: 120 }} 
            style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}
        >
            <Container size="md">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    viewport={{ once: true }}
                >
                    <Text 
                        c="dimmed" 
                        size="sm" 
                        tt="uppercase" 
                        fw={700} 
                        style={{ letterSpacing: '0.2em', opacity: 0.5 }}
                        mb="xl"
                    >
                        End of Transmission
                    </Text>

                    <Title
                        order={2}
                        style={{
                            fontFamily: 'var(--font-lexend)',
                            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                            fontWeight: 400,
                            color: 'white',
                            lineHeight: 1.4,
                            letterSpacing: '-0.02em'
                        }}
                    >
                        The syllabus is 50 pages long.<br />
                        <span className="apple-text-gradient" style={{ fontWeight: 600 }}>That's a bluff.</span>
                    </Title>

                    <Text 
                        size="xl" 
                        c="dimmed" 
                        mt="xl" 
                        maw={600} 
                        mx="auto"
                        style={{ fontFamily: 'var(--font-inter)', lineHeight: 1.6 }}
                    >
                        Call it.
                    </Text>
                </motion.div>
            </Container>
        </Box>
    );
}