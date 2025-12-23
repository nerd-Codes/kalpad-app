// next.config.mjs
/** @type {import('next').NextConfig} */
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',         // Where to output the sw.js
  register: true,         // Auto-register the SW
  skipWaiting: true,      // Activate new SW immediately
  disable: process.env.NODE_ENV === 'development', // Disable in dev to avoid caching chaos
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add other config here if needed
};

export default withPWA(nextConfig);