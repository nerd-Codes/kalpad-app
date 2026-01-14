 // src/app/layout.js
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { headers } from "next/headers";
import Script from "next/script";

import { Inter, Lexend } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata = {
  title: "KalPad - Your AI Study Mentor",
  description: "Turn 'Kal Padhunga' into reality.",
};

export default async function RootLayout({ children }) {
  const heads = await headers();
  const pathname = heads.get("next-url") || "";

  const isPrintPath = pathname.startsWith("/print");
  const layoutVariant = isPrintPath ? "print" : "app";
  const colorScheme = isPrintPath ? "light" : "dark";

  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17875257691"
          strategy="afterInteractive"
        />

        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17875257691');
          `}
        </Script>
      </head>

      <body>
        <MantineProvider theme={{ focusRing: "never" }}>
          <Providers variant={layoutVariant} colorScheme={colorScheme}>
            {children}
          </Providers>
        </MantineProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
