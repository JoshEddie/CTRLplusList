'use client';

import { usePathname } from 'next/navigation';

// /lists/:id only — excludes non-id siblings (/lists/new, /lists/bookmarks, /lists/history).
const LIST_DETAILS_ROUTE = /^\/lists\/(?!new$|bookmarks$|history$)[^/]+$/;
// /items only — excludes /items/:id (the item edit form).
const ITEMS_LIBRARY_ROUTE = /^\/items\/?$/;
// Pages that share the <ListCollectionsNav> tab strip.
const LIST_COLLECTIONS_ROUTES = new Set([
  '/lists',
  '/lists/bookmarks',
  '/lists/history',
  '/following',
]);

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isListDetails = LIST_DETAILS_ROUTE.test(pathname);
  const isItemsLibrary = ITEMS_LIBRARY_ROUTE.test(pathname);
  const isListCollections = LIST_COLLECTIONS_ROUTES.has(pathname);
  const variant = isListDetails
    ? 'container--list-details'
    : isItemsLibrary
      ? 'container--items-library'
      : isListCollections
        ? 'container--list-collections'
        : null;
  const className = variant ? `container ${variant}` : 'container';
  return <main className={className}>{children}</main>;
}
