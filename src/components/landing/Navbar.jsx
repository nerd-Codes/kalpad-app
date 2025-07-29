// src/components/landing/Navbar.jsx
"use client";
import { Container, Group, Button } from '@mantine/core';
import Link from 'next/link';
import { ShimmerButton } from './ShimmerButton';
import { useRouter } from 'next/navigation'; // <-- Import the router
import { useLoading } from '@/context/LoadingContext'; 
import { useState, useEffect } from 'react'; // <-- Import hooks
import supabase from '@/lib/supabaseClient';   // <-- Import Supabase client

export function Navbar() {

  const router = useRouter();
  const [session, setSession] = useState(null);
  const { setIsLoading } = useLoading();
  
    const handleNavigation = (path) => {
      setIsLoading(true);
      router.push(path);
    };

    const handleGetStarted = () => {
    // --- THIS IS THE FIX ---
    if (session) {
      handleNavigation('/dashboard');
    } else {
      handleNavigation('/sign-up');
    }
  };

  return (
    <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        backgroundColor: 'rgba(23, 24, 28, 0.5)', // Subtle glass
        backdropFilter: 'blur(10px)',
    }}>
      <Container size="xl" h={60}>
        <Group justify="space-between" h="100%">
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>KalPad</span>
          <Group>
            <Button component={Link} href="/sign-up" variant="subtle" color="gray">Sign In</Button>
            <ShimmerButton 
          onClick={handleGetStarted}
          size="sm" 
          color="brandPurple" 
          radius="xl"
        >Get Started</ShimmerButton>
          </Group>
        </Group>
      </Container>
    </header>
  );
}