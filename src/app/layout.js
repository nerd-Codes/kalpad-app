// src/app/layout.js
import "./globals.css";
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { headers } from 'next/headers'; // Import the headers function

import { Inter, Lexend } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const lexend = Lexend({ subsets: ["latin"], variable: '--font-lexend' });

export const metadata = {
  title: "KalPad - Your AI Study Mentor",
  description: "Turn 'Kal Padhunga' into reality.",
  verification: {
    google: 'K1qMc1fHGSFMOHtq6DDOxd7LrrHkKmdpIbrwwEUtgoo',
  },
};



export default function RootLayout({ children }) {
  // --- DEFINITIVE FIX: SERVER-SIDE PATH DETECTION ---
  const heads = headers();
  const pathname = heads.get('next-url') || '';
  
  // Determine the variant and color scheme based on the URL path.
  const isPrintPath = pathname.startsWith('/print');
  const layoutVariant = isPrintPath ? 'print' : 'app';
  const colorScheme = isPrintPath ? 'light' : 'dark';

  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />
      </head>
      <body>
        {/* Pass the determined variant and color scheme to the Providers */}
        <Providers variant={layoutVariant} colorScheme={colorScheme}>
            {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}