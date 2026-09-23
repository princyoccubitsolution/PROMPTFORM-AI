/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['lucide-react', 'framer-motion', 'next-themes', 'recharts', 'react-hook-form', 'zod', 'zustand'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
