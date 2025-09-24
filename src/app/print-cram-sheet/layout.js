// src/app/(print)/layout.js
"use client";

import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// A minimal theme for the print page.
const printTheme = createTheme({
    fontFamily: 'Inter, sans-serif',
    headings: { fontFamily: 'Lexend, sans-serif' },
});

// This is the new ROOT layout for any page within the (print) group.
// It does NOT contain BackgroundBlobs, AppLayout, or any other app chrome.
export default function PrintRootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* We can add the necessary font links directly here for the print page */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Lexend:wght@700;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
      </head>
      <body>
        {/* 
          This MantineProvider forces a LIGHT color scheme. 
          This is the definitive fix for the white-on-white text issue.
        */}
        <MantineProvider theme={printTheme} defaultColorScheme="light">
            {children}
        </MantineProvider>
      </body>
    </html>
  );
}