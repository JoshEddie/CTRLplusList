import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
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
        hostname: '*.googleusercontent.com', // Google profile images (lh1–lh6)
      },
    ],
  },
};

export default isDev ? nextConfig : withSerwist(nextConfig);
