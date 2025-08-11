// src/components/landing/personality/Hero.jsx
"use client";

import { Container, Title, Text, Box } from '@mantine/core';
import { ShimmerButton } from '../ShimmerButton';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence
import { useState, useEffect } from 'react'; // Import hooks

export function Hero() {
    const handleGetStarted = useAuthRedirect();
    
    // --- State to control which background text is visible ---
    const [backgroundTextKey, setBackgroundTextKey] = useState('procrastination');

    useEffect(() => {
        // This interval will toggle the key between our two states
        const interval = setInterval(() => {
            setBackgroundTextKey(current => 
                current === 'procrastination' ? 'solution' : 'procrastination'
            );
        }, 8000); // Switch every 4 seconds

        return () => clearInterval(interval);
    }, []);

    const backgroundTextVariants = {
        procrastination: {
            text: 'Kal\n\nPadhunga',
            opacity: 0.03,
        },
        solution: {
            text: '\n\nKalPad',
            opacity: 0.05,
        }
    };

    return (
        <Box
            style={{
                position: 'relative',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(25, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
            }}
        >
            {/* --- Animated Background Text --- */}
            <AnimatePresence>
                <motion.div
                    key={backgroundTextKey} // The key change triggers the fade in/out
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 0,
                    }}
                >
                    <Title
                        order={1}
                        style={{
                            fontSize: 'clamp(8rem, 20vw, 20rem)',
                            color: 'rgba(255, 255, 255, 1)',
                            userSelect: 'none',
                            letterSpacing: '-0.05em',
                            lineHeight: 0.9, // Preserves the tight, multi-line spacing
                            whiteSpace: 'pre-line', // Allows '\n' to create line breaks
                            opacity: backgroundTextVariants[backgroundTextKey].opacity,
                        }}
                        ff="Lexend, sans-serif"
                    >
                        {backgroundTextVariants[backgroundTextKey].text}
                    </Title>
                </motion.div>
            </AnimatePresence>

            {/* Main content with a higher z-index */}
            <Container size="md" style={{ position: 'relative', zIndex: 1 }}>
                <Title
                    order={1}
                    ff="Lexend, sans-serif"
                    fz={{ base: '2.5rem', sm: '4rem' }}
                    fw={800}
                >
                    Your syllabus has a plan.
                    <br />
                    To make you <span style={{ color: 'var(--mantine-color-red-5)', textShadow: '0 0 15px var(--mantine-color-red-5)'}}>panic.</span>
                </Title>
                <Text size="lg" c="dimmed" mt="xl" maw={600} mx="auto">
                    Let's be real. It's a 50-page villain origin story designed to make you stare at the wall. I got tired of losing that staring contest. So I built an AI that fights back.
                </Text>
                <ShimmerButton
                    size="lg"
                    mt={40}
                    onClick={() => handleGetStarted()}
                    radius="xl"
                >
                    Build My Escape Plan →
                </ShimmerButton>
            </Container>
        </Box>
    );
}