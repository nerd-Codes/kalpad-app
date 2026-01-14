// src/app/layout.js
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { headers } from 'next/headers';
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
        url: 'https://kalpad-app.vercel.app/og-image.jpeg',
        width: 1890,
        height: 1035,
        alt: 'KalPad - The greatest minds did not waste their cognitive budget on menial tasks.',
      },
    ],
    type: 'website',
  },
};

export default async function RootLayout({ children }) {
  const heads = await headers();
  const pathname = heads.get('next-url') || '';

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
        <MantineProvider theme={{ focusRing: 'never' }}>
          <Providers variant={layoutVariant} colorScheme={colorScheme}>
            {children}
          </Providers>
        </MantineProvider>
        
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}        <Providers variant={layoutVariant} colorScheme={colorScheme}>
            {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
