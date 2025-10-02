// src/components/Providers.jsx
"use client";

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/core/styles.css'; // Ensure base styles are always included
import { OnboardingProvider } from '@/context/OnboardingContext';

import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { PageLoader } from "@/components/PageLoader";
import { LoadingProvider, useLoading } from "@/context/LoadingContext";
import { PostHogProvider } from './PostHogProvider';

// The theme definition is unchanged
const theme = createTheme({
    fontFamily: 'var(--font-inter)',
    headings: { fontFamily: 'var(--font-lexend)' },
    primaryColor: 'brandPurple',
    defaultRadius: 'lg',
    colors: {
    'brandPurple': [
      "#f1e7fe", "#d8c3fc", "#be9ffb", "#a47afa", "#8a56f8", 
      "#7031f7", "#5a1ae6", "#4d16c4", "#4112a3", "#350e82"
    ],
    'brandGreen': [
      "#ebfbee", "#d7f5d8", "#b1e9b2", "#89dd8b", "#64d266", 
      "#3fca41", "#2ca331", "#218227", "#19681f", "#125118"
    ],
  },

  components: {
    Title: {
      styles: {
        root: {
          color: 'var(--mantine-color-white)',
        },
      },
    },
  },

});

function AppContent({ children }) {
    const { isLoading } = useLoading();
    return (
        <>
            <PageLoader isLoading={isLoading} />
            {children}
        </>
    );
}

// --- DEFINITIVE FIX: THE PROVIDER IS NOW "VARIANT-AWARE" ---
export function Providers({ children, variant = 'app', colorScheme = 'dark' }) {
  // For the 'print' variant, we render a minimal, clean wrapper.
  if (variant === 'print') {
    return (
      <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
        <main style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
          {children}
        </main>
      </MantineProvider>
    );
  }

  // For the default 'app' variant, we render the full application chrome.
  return (
    <LoadingProvider>
      <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
        <OnboardingProvider>
        <PostHogProvider>
          <style>{`
            @media (max-width: 768px) {
              .mantine-Notifications-root {
                top: var(--mantine-spacing-md) !important;
                right: var(--mantine-spacing-md) !important;
                bottom: auto !important; left: auto !important;
                width: calc(100% - var(--mantine-spacing-md) * 2);
              }
            }
          `}</style>
          <Notifications zIndex={2000} />
          <BackgroundBlobs />
          <AppContent>{children}</AppContent>
        </PostHogProvider>
        </OnboardingProvider>
      </MantineProvider>
    </LoadingProvider>
  );
}