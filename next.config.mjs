// next.config.mjs
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // These are the defaults, but let's be explicit based on your docs:
  register: true,
  scope: "/app",
  sw: "sw.js",
  // Aggressive caching for the shell
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: "/android/:path*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: "attachment",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);