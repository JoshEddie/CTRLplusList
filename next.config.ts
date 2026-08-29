import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

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

// The dev server 403s /_next/* for any origin it wasn't started on, so a
// phone hitting http://<lan-ip>:3000 renders the SSR HTML but loads no
// chunks and never hydrates. Read this machine's own addresses rather than
// pinning one DHCP will rotate.
const lanOrigins = Object.values(networkInterfaces())
  .flat()
  .flatMap((iface) =>
    iface?.family === 'IPv4' && !iface.internal ? [iface.address] : []
  );

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: lanOrigins,
  // The thing kind's art is read from disk at request time (openmoji.server.ts),
  // which file tracing cannot see through a runtime-built path. Every function
  // rather than just the art route, because the avatar write path runs inside
  // server actions on ordinary pages.
  // ponytail: ~9MB per function; scope to the routes that write avatars if size bites.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/openmoji/color/svg/**'],
  },
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
