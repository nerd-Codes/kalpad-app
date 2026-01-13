// src/app/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatePresence, motion } from 'framer-motion';

import { PageLoader } from '@/components/PageLoader';
import supabase from '@/lib/supabaseClient';

// --- SECTIONS ---
import { Hero } from "@/components/landing/personality/Hero";
import { Manifesto } from "@/components/landing/personality/Manifesto";
import { Arsenal } from "@/components/landing/personality/Arsenal"; 
import { Playground } from "@/components/landing/personality/Playground"; 
import { Devlog } from "@/components/landing/personality/Devlog"; 
import { Community } from "@/components/landing/personality/Community"; 
import { RealQuestion } from "@/components/landing/personality/RealQuestion"; 
import { GoldPass } from "@/components/landing/personality/GoldPass";
import { CookieConsent } from "@/components/landing/CookieConsent";

// --- GLOBAL BACKGROUND: THE INFINITE VOID (FIXED) ---
function InfiniteVoid() {
    // REMOVED: useScroll and useTransform. The background is now static relative to viewport.
    
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', backgroundColor: '#000' }}>
            {/* Deep Space Gradient */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, #0a0a0f 0%, #000000 70%)' }} />

            {/* The Aurora (Living Color - Still animates locally, but fixed position) */}
            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1],
                    background: [
                        'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.2), transparent 70%)', // Purple
                        'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.2), transparent 70%)', // Blue
                        'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.2), transparent 70%)'   // Green
                    ]
                }}
                transition={{ duration: 15, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                style={{ position: 'absolute', inset: '-50%', filter: 'blur(100px)', zIndex: 0 }}
            />

            {/* Starfield (Fixed - No Parallax) */}
            <div style={{ 
                position: 'absolute', inset: 0, zIndex: 1, opacity: 0.5,
                width: '100%', height: '100%',
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }} />
        </div>
    );
}

export default function LandingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isApp, setIsApp] = useState(false);
    const [showGoldPass, setShowGoldPass] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const initialize = async () => {
            const userAgent = navigator.userAgent;
            if (userAgent.includes('KalPad-Android-App')) {
                setIsApp(true);
                const { data: { session } } = await supabase.auth.getSession();
                router.replace(session ? '/dashboard' : '/sign-up');
            } else {
                setIsApp(false);
                setTimeout(() => setIsLoading(false), 2000); 
            }
        };
        initialize();
    }, [router]);

    useEffect(() => {
        if (!isLoading && !isApp) {
            const timer = setTimeout(() => setShowGoldPass(true), 8000); 
            return () => clearTimeout(timer);
        }
    }, [isLoading, isApp]);

    const handleClaimPass = () => {
        const communitySection = document.getElementById('community-section');
        if (communitySection) communitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowGoldPass(false);
    };

    if (isLoading || isApp) return <PageLoader isLoading={true} />;

    return (
        <>
            <InfiniteVoid />
            
            {/* Navbar is rendered here, but its styling handles the positioning */}
            <Navbar />
            
            <main style={{ position: 'relative', zIndex: 1 }}>
                <Hero />
                <Manifesto />
                <Arsenal />
                <Playground />
                <Devlog />
                <Community />
                <RealQuestion />
            </main>
            
            <Footer />
            
            <AnimatePresence>
                {showGoldPass && <GoldPass onClaim={handleClaimPass} />}
            </AnimatePresence>
            <CookieConsent />
        </>
    );
}