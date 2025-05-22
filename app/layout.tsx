import '@/app/ui/styles/button.css';
import type { Metadata } from 'next';
import { Crimson_Pro, Roboto, Roboto_Condensed } from 'next/font/google';
import Link from 'next/link';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import Menu from './ui/components/Menu';
import User from './ui/components/User';
import './ui/styles/global.css';

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

const robotoCondensed = Roboto_Condensed({
  variable: '--font-roboto-condensed',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

const crimsonPro = Crimson_Pro({
  variable: '--font-crimson-pro',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['georgia', 'serif'],
});

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Create and share your wishlists with friends and family',
  metadataBase: new URL('https://list.eddiefamily.com'),
  openGraph: {
    title: 'Wishlist',
    description: 'Create and share your wishlists with friends and family',
    images: [
      {
        url: '/images/Wishlist_preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Wishlist Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wishlist',
    description: 'Create and share your wishlists with friends and family',
    images: ['/images/Wishlist_preview.jpg'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Wishlist',
    'format-detection': 'telephone=no',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoCondensed.variable} ${crimsonPro.variable}`}
      >
        <Toaster position="top-right" />
        <Menu />
        <Suspense fallback={<Link href="/signin">Sign In</Link>}>
          <User />
        </Suspense>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
