// src/app/print/layout.js
"use client";

import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import 'katex/dist/katex.min.css';

const printTheme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: { fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, sans-serif' },
});

/**
 * Sub-layout for /print routes.
 * Must NOT render duplicate html or body tags (managed by root layout.js).
 */
export default function PrintSubLayout({ children }) {
  return (
    <MantineProvider theme={printTheme} defaultColorScheme="light" forceColorScheme="light">
      <div className="print-wrapper" style={{ minHeight: '100vh', backgroundColor: '#e5e7eb' }}>
        {children}
      </div>
    </MantineProvider>
  );
}
