// src/app/page.js
"use client";
import { useState, useEffect } from 'react';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnimatePresence } from 'framer-motion';

// Import the new, redesigned sections
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

import { GoldPass } from "@/components/landing/personality/GoldPass";

export default function LandingPage() {

  const [showGoldPass, setShowGoldPass] = useState(false);

  useEffect(() => {
    // Show the Gold Pass after a 3-second delay
    const timer = setTimeout(() => {
      setShowGoldPass(true);
    }, 3000);

    return () => clearTimeout(timer); // Cleanup the timer
  }, []);

  const handleClaimPass = () => {
    const communitySection = document.getElementById('community-section');
    if (communitySection) {
      communitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Optionally hide the button after it's been clicked
    setShowGoldPass(false); 
  };

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