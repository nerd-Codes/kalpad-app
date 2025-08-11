// src/app/page.js
"use client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

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

export default function LandingPage() {
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
        <RealQuestion />
      </main>
      <Footer />
    </>
  );
}