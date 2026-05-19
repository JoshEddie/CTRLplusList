'use client';

import { usePathname } from 'next/navigation';

// /lists/:id only — excludes non-id siblings (/lists/new, /lists/bookmarks, /lists/history).
const LIST_DETAILS_ROUTE = /^\/lists\/(?!new$|bookmarks$|history$)[^/]+$/;

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isListDetails = LIST_DETAILS_ROUTE.test(pathname);
  const className = isListDetails
    ? 'container container--list-details'
    : 'container';
  return <main className={className}>{children}</main>;
}
