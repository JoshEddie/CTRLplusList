'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'My Lists', href: '/lists' },
  { label: 'Bookmarks', href: '/lists/bookmarks' },
  { label: 'Recently visited', href: '/lists/history' },
  { label: 'Following', href: '/following' },
];

export default function ListCollectionsNav({
  children,
}: {
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="list-collections-nav">
      <nav className="list-collections-tabs" aria-label="List collections">
        {TABS.map(({ label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'list-collections-tab list-collections-tab--active'
                  : 'list-collections-tab'
              }
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children && <div className="list-collections-actions">{children}</div>}
    </div>
  );
}
