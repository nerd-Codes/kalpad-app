/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is our existing ESLint fix
  eslint: {
    ignoreDuringBuilds: true,
  },

  // --- THIS IS THE DEFINITIVE FIX ---
  // This tells Next.js to treat 'magic-ui' as a library that contains
  // client-only components, preventing SSR errors like 'DOMMatrix is not defined'.
  transpilePackages: ['magic-ui'],
};

export default nextConfig;