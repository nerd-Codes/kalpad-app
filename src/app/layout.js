// src/app/layout.js
import "./globals.css";
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { headers } from 'next/headers'; // Import the headers function
import Script from 'next/script'; 

import { Inter, Lexend } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const lexend = Lexend({ subsets: ["latin"], variable: '--font-lexend' });

export const metadata = {
  title: "KalPad - Your AI topper friend",
  description: "Turn 'Kal Padhunga' into reality.",
  manifest: "/manifest.json",
  verification: {
    google: 'K1qMc1fHGSFMOHtq6DDOxd7LrrHkKmdpIbrwwEUtgoo',
  },

    openGraph: {
    title: 'KalPad - Your AI topper friend',
    description: 'The AI study friend that turns a messy syllabus into a clear daily plan. Built by a student, for students.',
    images: [
      {
        url: 'https://kalpad-app.vercel.app/og-image.png', // Absolute URL
        width: 1910,
        height: 973,
        alt: 'KalPad landing page preview',
      },
    ],
    type: 'website',
  },
};


export default async function RootLayout({ children }) {
  // --- DEFINITIVE FIX: SERVER-SIDE PATH DETECTION ---
  const heads = await headers();
  const pathname = heads.get('next-url') || '';
  
  // Determine the variant and color scheme based on the URL path.
  const isPrintPath = pathname.startsWith('/print');
  const layoutVariant = isPrintPath ? 'print' : 'app';
  const colorScheme = isPrintPath ? 'light' : 'dark';

  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />
         {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17875257691"
          strategy="afterInteractive"
        />
        <Script id="google-ads">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17875257691');
          `}
        </Script>
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
