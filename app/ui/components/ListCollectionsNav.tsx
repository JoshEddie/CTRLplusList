'use client';

import { usePathname } from 'next/navigation';
import { LinkTabs } from '@/app/ui/components/tabs';

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
    <div className="list-collections-nav pinned-page-chrome">
      <LinkTabs
        className="list-collections-tabs"
        aria-label="List collections"
        items={TABS}
        activeHref={pathname}
      />
      {children && <div className="list-collections-actions">{children}</div>}
    </div>
  );
}
