// src/components/landing/CTASection.jsx
"use client";
import { Container, Title, Text, Button, Paper } from '@mantine/core';
import Link from 'next/link';
import { ShimmerButton } from './ShimmerButton';
import { useRouter } from 'next/navigation'; // <-- Import the router
import { useLoading } from '@/context/LoadingContext'; 
import { useState, useEffect } from 'react'; // <-- Import hooks
import supabase from '@/lib/supabaseClient';   // <-- Import Supabase client

export function CTASection() {
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
    <Container size="lg" py="xl" my="xl">
      <Paper
        p="xl"
        radius="lg"
        style={{
          backgroundColor: 'rgba(124, 58, 237, 0.2)', // A purple glow
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--mantine-color-brandPurple-5)',
          textAlign: 'center',
        }}
      
      >
        <Title order={2} style={{ fontSize: '2.5rem' }}>
          Ready to Transform Your Study Habits?
        </Title>
        <Text c="dimmed" mt="md" maw={600} mx="auto">
          Join thousands of students who have already turned their procrastination into academic success. Your personalized AI study plan is just a click away.
        </Text>
         <ShimmerButton 
          onClick={handleGetStarted}
          size="lg" 
          color="brandPurple" 
          radius="xl"
          mt="xl"
        >
          Create Your First Plan →
        </ShimmerButton>
      </Paper>
    </Container>
  );
}