import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: isDev,
  additionalPrecacheEntries: [
    { url: '/manifest.webmanifest', revision: null },
    { url: '/icons/icon-192.png', revision: null },
    { url: '/icons/icon-512.png', revision: null },
  ],
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh1.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh2.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile images
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
    ],
  },
};

export default isDev ? nextConfig : withSerwist(nextConfig);
