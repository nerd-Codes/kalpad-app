// src/components/Providers.jsx
"use client";

import { MantineProvider, createTheme,  CSSVariablesResolver } from '@mantine/core';
// --- FIX: Import the Notifications component and its required CSS ---
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

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

// AppContent wrapper is unchanged
function AppContent({ children }) {
    const { isLoading } = useLoading();
    return (
        <>
            <PageLoader isLoading={isLoading} />
            {children}
        </>
    );
}

export function Providers({ children }) {
  return (
    <LoadingProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        {/* --- FIX: The Notifications component is added here --- */}
        {/* It sits inside MantineProvider but outside your main content. */}
        {/* The `position` prop ensures it appears in the bottom right corner. */}
        <PostHogProvider>
        <style>
          {`
            @media (max-width: 768px) {
              .mantine-Notifications-root {
                top: var(--mantine-spacing-md) !important;
                right: var(--mantine-spacing-md) !important;
                bottom: auto !important;
                left: auto !important;
                width: calc(100% - var(--mantine-spacing-md) * 2);
              }
              .mantine-Notification-root {
                  font-size: var(--mantine-font-size-sm);
              }
            }
          `}
        </style>
        
        {/* The zIndex is increased to ensure notifications appear above the bottom navbar. */}
        <Notifications zIndex={2000} />
        
        <BackgroundBlobs />
        <AppContent>{children}</AppContent>
        </PostHogProvider>
      </MantineProvider>
    </LoadingProvider>
  );
}