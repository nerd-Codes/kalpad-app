// src/app/page.js
"use client";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";


export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '60px' }}> {/* Add padding to offset the fixed navbar */}
        <HeroSection />
        <Features />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}