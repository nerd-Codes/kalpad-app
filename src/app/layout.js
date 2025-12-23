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
  title: "KalPad - Your AI Study Mentor",
  description: "Turn 'Kal Padhunga' into reality.",
  manifest: "/manifest.json",
  verification: {
    google: 'K1qMc1fHGSFMOHtq6DDOxd7LrrHkKmdpIbrwwEUtgoo',
  },

    openGraph: {
    title: 'KalPad: Your AI Academic Strategist',
    description: 'The brutally honest AI partner that turns academic chaos into a clear battle plan. Built by a student, for students.',
    images: [
      {
        url: 'https://kalpad-app.vercel.app/og-image.jpeg', // Absolute URL
        width: 1890,
        height: 1035,
        alt: 'KalPad - The greatest minds did not waste their cognitive budget on menial tasks.',
      },
    ],
    type: 'website',
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
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('✅ KalPad SW Registered:', registration.scope);
                  })
                  .catch(function(err) {
                    console.error('❌ SW Registration Failed:', err);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}