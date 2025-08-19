// src/app/layout.js
import "./globals.css";
import '@mantine/core/styles.css';
// --- MODIFICATION: IMPORT THE NEW PRINT STYLESHEET ---
import '../styles/print.css';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next"

// Fonts can be loaded here, but passed to the theme in Providers.jsx
import { Inter, Lexend } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const lexend = Lexend({ subsets: ["latin"], variable: '--font-lexend' });

// Metadata can now be safely exported from this Server Component
export const metadata = {
  title: "KalPad",
  description: "AI-Powered Study Planner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}