// src/components/landing/personality/Hero.jsx
"use client";

import { useRef, useState } from 'react';
import { Container, Title, Text, Box, Group, Badge } from '@mantine/core';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { IconArrowRight, IconFileText, IconBattery1, IconClock, IconBrain, IconDownload } from '@tabler/icons-react';
import Link from 'next/link';

// --- UTILITY: DYNAMIC FILM GRAIN ---
function NoiseOverlay() {
    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            opacity: 0.4, mixBlendMode: 'overlay',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
    );
}

// --- UTILITY: MAGNETIC BUTTON WRAPPER ---
function MagneticButton({ children, href, primary = true }) {
    const ref = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouse = (e) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
    };

    const reset = () => setPosition({ x: 0, y: 0 });

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            style={{ position: 'relative', zIndex: 100 }}
        >
            <Link href={href} style={{ textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        background: primary ? 'linear-gradient(135deg, rgba(191, 90, 242, 1) 0%, rgba(94, 92, 230, 1) 100%)' : 'rgba(255,255,255,0.05)',
                        padding: '16px 32px',
                        borderRadius: '999px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: primary ? '0 15px 30px -10px rgba(191, 90, 242, 0.5), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none',
                        border: primary ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    {children}
                </motion.div>
            </Link>
        </motion.div>
    );
}

// --- UTILITY: FLOATING CHAOS ELEMENTS ---
function FloatingThreat({ icon: Icon, text, x, y, delay, duration, rotate, blur = false }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: y + 50 }}
            animate={{ 
                // Cycle opacity and physical position
                opacity: [0, 1, 0], 
                y: [y, y - 40, y],
                rotate: [rotate, rotate + 10, rotate - 5, rotate],
                // THE FIX: Cycle the blur filter from blurry -> sharp -> blurry
                filter: blur ? ['blur(8px)', 'blur(0px)', 'blur(8px)'] : ['blur(0px)', 'blur(0px)', 'blur(0px)']
            }}
            transition={{ duration: duration, repeat: Infinity, delay: delay, ease: "easeInOut" }}
            style={{
                position: 'absolute', top: `${y}%`, left: `${x}%`,
                zIndex: 100, // THE FIX: Brought to the absolute top layer
                pointerEvents: 'none',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px',
                background: 'rgba(20, 20, 25, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
            }}
            className="hidden md:flex"
        >
            <Icon size={16} color="#FF3B30" />
            <Text size="xs" fw={600} c="white" style={{ fontFamily: 'monospace' }}>{text}</Text>
        </motion.div>
    );
}

// --- UTILITY: THE SCREENSHOT SLICER ---
function ScreenshotSlicer() {
    return (
        <motion.div
            initial={{ opacity: 0, rotateX: 40, y: 200, scale: 0.9 }}
            animate={{ opacity: 1, rotateX: 12, y: 0, scale: 1 }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
            style={{
                width: '100%', maxWidth: '1100px', margin: '0 auto',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(191, 90, 242, 0.4)', 
                borderBottom: 'none',
                boxShadow: '0 -40px 100px -20px rgba(191, 90, 242, 0.25), 0 0 0 1px rgba(255,255,255,0.05) inset',
                overflow: 'hidden', position: 'relative', zIndex: 40,
                transformPerspective: 1200, transformStyle: 'preserve-3d',
                backgroundColor: '#111113' // Fallback behind image
            }}
        >
            {/* 
                THE FIX: Actual Image Tag 
                Ensure you place your dashboard screenshot in the public folder as 'dashboard-screenshot.png' (or update the src).
            */}
            <img 
                src="/dashboard-screenshot.png" 
                alt="KalPad OS Dashboard"
                style={{ 
                    width: '100%', 
                    height: 'auto', 
                    display: 'block', 
                    objectFit: 'cover', 
                    objectPosition: 'top' 
                }}
                onError={(e) => {
                    // Fallback visual if image isn't found yet
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML += '<div style="padding: 100px; text-align: center; color: #888; font-family: monospace;">[ Replace with /public/dashboard-screenshot.png ]</div>';
                }}
            />

            {/* Glossy overlay to enhance the 3D screen effect */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)', pointerEvents: 'none' }} />
            
            {/* Scanner line animation */}
           
        </motion.div>
    );
}


export function Hero() {
    // Volumetric Spotlight Tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
    const bgPositionX = useTransform(springX, v => `${v}px`);
    const bgPositionY = useTransform(springY, v => `${v}px`);

    const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        mouseX.set(clientX - innerWidth / 2);
        mouseY.set(clientY - innerHeight / 2);
    };

    return (
        <Box
            onMouseMove={handleMouseMove}
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between', 
                overflow: 'hidden',
                backgroundColor: '#05050500', 
            }}
        >
            

            {/* --- THE VOLUMETRIC SPOTLIGHT --- */}
            <motion.div
                style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '120vw', height: '120vw',
                    x: bgPositionX, y: bgPositionY,
                    translateX: '-50%', translateY: '-50%',
                    background: 'radial-gradient(circle, rgba(191, 90, 242, 0.08) 0%, rgba(52, 199, 89, 0.02) 40%, transparent 60%)',
                    filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none'
                }}
            />

            {/* --- THE CHAOS LAYER (Floating Threats - Now Z-Index 100) --- */}
            <FloatingThreat icon={IconFileText} text="Syllabus_v4_FINAL.pdf" x={12} y={25} delay={0} duration={8} rotate={-12} blur />
            <FloatingThreat icon={IconClock} text="72:00:00 Remaining" x={75} y={15} delay={2} duration={9} rotate={8} blur />
            <FloatingThreat icon={IconBattery1} text="Focus < 10%" x={15} y={55} delay={4} duration={7} rotate={-5} blur />
            <FloatingThreat icon={IconBrain} text="Cognitive Overload" x={82} y={50} delay={1} duration={8} rotate={15} blur />

            {/* --- MAIN TYPOGRAPHY & CTA (Center Stage) --- */}
            <Container size="xl" style={{ position: 'relative', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '22vh', flex: 1 }}>
                
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <Group justify="center" mb="lg">
                        {/* THE FIX: Shorter, punchier badge */}
                        <Badge variant="outline" size="sm" style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#86868B', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', letterSpacing: '0.15em', padding: '14px 20px' }}>
                            THE ACADEMIC CHEAT CODE
                        </Badge>
                    </Group>

                    {/* THE FIX: Overlapping Editorial Typography */}
                    <Title 
                        style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            fontSize: 'clamp(3.5rem, 10vw, 8.5rem)', 
                            fontWeight: 900, 
                            lineHeight: 0.85, // Extremely tight line height
                            letterSpacing: '-0.04em',
                            color: '#F5F5F7',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-lexend)'
                        }}
                    >
                        <span style={{ zIndex: 1 }}>Survive the</span>
                        <span style={{ 
                            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', 
                            fontStyle: 'italic', 
                            fontWeight: 400, 
                            textTransform: 'lowercase',
                            color: '#BF5AF2',
                            marginTop: '-0.25em', // THE FIX: Physical overlap
                            zIndex: 2,           // Pulls "chaos" in front of "Survive"
                            textShadow: '0 10px 30px rgba(191, 90, 242, 0.4)'
                        }}>
                            chaos.
                        </span>
                    </Title>

                    <Text size="xl" c="gray.4" mt="xl" mb={40} maw={550} mx="auto" style={{ fontFamily: 'var(--font-inter)', lineHeight: 1.6 }}>
                        You are out of time and out of focus. KalPad is an AI OS that ingests your mess and outputs a ruthless, tactical timeline.
                    </Text>

                    {/* THE FIX: Split CTAs */}
                    <Group justify="center" gap="md">
                        <MagneticButton href="/guest-plan" primary={true}>
                            <Text size="md" fw={700} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>Guest Mode</Text>
                            <IconArrowRight size={18} color="white" />
                        </MagneticButton>

                        <MagneticButton href="https://github.com/nerd-Codes/kalpad-app/releases/download/Android/KalPad-1-0-0.apk" primary={false}>
                            <IconDownload size={18} color="white" />
                            <Text size="md" fw={600} c="white" style={{ fontFamily: 'var(--font-lexend)' }}>Get App</Text>
                        </MagneticButton>
                    </Group>
                </motion.div>
            </Container>

            {/* --- THE REVEAL (Actual Screenshot slicing in) --- */}
            <Box style={{ width: '100%', position: 'relative', zIndex: 40, marginTop: '40px' }}>
                <ScreenshotSlicer />
                
                {/* Bottom Fade to mask the sharp edge and blend into the next section */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, #000, transparent)', zIndex: 50, pointerEvents: 'none' }} />
            </Box>

        </Box>
    );
}
