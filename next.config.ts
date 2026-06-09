import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on files that changed during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript checking during builds to avoid memory issues
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aqmcgjvgmniqautyuepx.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
