// src/app/page.js
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatePresence } from 'framer-motion';

// --- DEFINITIVE ADDITION #1: IMPORT THE PAGE LOADER ---
import { PageLoader } from '@/components/PageLoader';

// Import all your other sections
import { Hero } from "@/components/landing/personality/Hero";
import { Manifesto } from "@/components/landing/personality/Manifesto";
import { Arsenal } from "@/components/landing/personality/Arsenal";
import { Quote } from "@/components/landing/personality/Quote";
import { Playground } from "@/components/landing/personality/Playground";
import { Hacks } from "@/components/landing/personality/Hacks";
import { Devlog } from "@/components/landing/personality/Devlog";
import { RealQuestion } from "@/components/landing/personality/RealQuestion";
import { Battle } from "@/components/landing/personality/Battle";
import { Community } from "@/components/landing/personality/Community";
import supabase from '@/lib/supabaseClient';
import { GoldPass } from "@/components/landing/personality/GoldPass";

export default function LandingPage() {
    // --- DEFINITIVE ADDITION #2: NEW STATE FOR THE STATE MACHINE ---
    const [isLoading, setIsLoading] = useState(true);
    const [isApp, setIsApp] = useState(false);

    const [showGoldPass, setShowGoldPass] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // This is now the main effect that controls the entire page's logic.
        const initialize = async () => {
            const userAgent = navigator.userAgent;

            if (userAgent.includes('KalPad-Android-App')) {
                // --- We are in the app ---
                setIsApp(true);
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.replace('/dashboard');
                } else {
                    router.replace('/sign-up');
                }
                // Note: setIsLoading(false) is not called here because we are navigating away.
                // The loader will naturally disappear when the new page component replaces this one.
            } else {
                // --- We are in a normal browser ---
                setIsApp(false);
                // After a short delay to allow animations to feel smooth, hide the loader.
                setTimeout(() => {
                    setIsLoading(false);
                }, 1500); // 1.5 second "splash" for web users
            }
        };

        initialize();
    }, [router]);

    // This effect is now dependent on the loading state.
    useEffect(() => {
        // Only start the Gold Pass timer if we are in the browser AND loading is finished.
        if (!isLoading && !isApp) {
            const timer = setTimeout(() => {
                setShowGoldPass(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isLoading, isApp]);

    const handleClaimPass = () => {
        const communitySection = document.getElementById('community-section');
        if (communitySection) {
            communitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setShowGoldPass(false);
    };

    // --- DEFINITIVE ADDITION #3: THE STATE MACHINE RENDER LOGIC ---
    if (isLoading || isApp) {
        // While loading OR if we are in the app and waiting for redirect,
        // show the full-screen PageLoader.
        return <PageLoader isLoading={true} />;
    }

    // This JSX is now only rendered for browser users after the initial load.
    return (
        <>
            <Navbar />
            <main>
                <Hero />
                <Manifesto />
                <Arsenal />
                <Quote />
                <Battle />
                <Playground />
                <Hacks />
                <Devlog />
                <Community />
                <RealQuestion />
            </main>
            <Footer />
            <AnimatePresence>
                {showGoldPass && <GoldPass onClaim={handleClaimPass} />}
            </AnimatePresence>
        </>
    );
}