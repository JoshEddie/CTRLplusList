'use client';

import { usePathname } from 'next/navigation';

const LIST_DETAILS_ROUTE = /^\/lists\/[^/]+$/;

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isListDetails = LIST_DETAILS_ROUTE.test(pathname);
  const className = isListDetails ? 'container container--list-details' : 'container';
  return <main className={className}>{children}</main>;
}
