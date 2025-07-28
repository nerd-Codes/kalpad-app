// src/components/landing/HeroSection.jsx
"use client";
import { Container, Title, Text, Button, Group, Badge } from '@mantine/core'; // <-- Add Badge
import Link from 'next/link';
import { IconPlayerPlay, IconSparkles } from '@tabler/icons-react'; // <-- Add IconSparkles
import { useRouter } from 'next/navigation'; // <-- Import the router
import { useLoading } from '@/context/LoadingContext'; 
import { ShimmerButton } from './ShimmerButton';

const heroStyles = {
    gradientText: {
        background: 'linear-gradient(to right, var(--mantine-color-brandPurple-4), var(--mantine-color-indigo-4))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 15px rgba(124, 58, 237, 0.5)', // The purple glow
    },
};

export function HeroSection() {

  const router = useRouter();
  const { setIsLoading } = useLoading();

  const handleNavigation = (path) => {
    setIsLoading(true);
    router.push(path);
  };

  return (
    <Container size="lg" style={{ paddingTop: '120px', paddingBottom: '80px', textAlign: 'center' }}>
      
      {/* --- THIS IS THE UPGRADED COMPONENT --- */}
      <Badge
        variant="filled"
        color="brandPurple"
        size="lg"
        radius="xl"
        leftSection={<IconSparkles size={16} />}
        style={{
          backgroundColor: 'rgba(124, 58, 237, 0.2)', // Purple glow
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--mantine-color-brandPurple-5)',
        }}
      >
        AI-Powered Study Planning
      </Badge>
      
      <Title order={1} style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1.1 }} mt="lg">
                Turn "<span style={heroStyles.gradientText}>Kal Padhunga</span>"<br />Into Reality Today
            </Title>
      
      <Text c="gray.4" mt="xl" size="xl" maw={900} mx="auto">
        Stop staring at your syllabus. KalPad's AI analyzes your materials and exam dates to build a hyper-optimized study plan that actually works.
      </Text>
      
      <Group justify="center" mt="xl">
        <ShimmerButton 
          onClick={() => handleNavigation('/dashboard')}
          size="lg" 
          color="brandPurple" 
          radius="xl"
        >
          Start Your Free Plan →
        </ShimmerButton>
        <Button 
          variant="outline" size="lg" radius="xl" 
          leftSection={<IconPlayerPlay size={20} />}
          onClick={() => alert("Demo video coming soon!")}
        >
          Watch Demo
        </Button>
      </Group>
    </Container>
  );
}