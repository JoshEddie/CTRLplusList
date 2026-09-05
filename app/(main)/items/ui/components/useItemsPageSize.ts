import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './paginationConstants';

export function normalizePageSize(value: number | undefined): number {
  if (!value || !PAGE_SIZE_OPTIONS.includes(value as 12 | 24 | 48 | 96)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
}

// The page size is the viewer's, remembered in a cookie the server reads back
// on the next render; changing it drops the page, which no longer means what
// it did.
export function useItemsPageSize(
  initial: number | undefined
): [number, (next: number) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pageSize, setPageSize] = useState(normalizePageSize(initial));

  const change = (next: number) => {
    const normalized = normalizePageSize(next);
    setPageSize(normalized);
    document.cookie = `items_page_size=${normalized}; path=/; max-age=31536000; SameSite=Lax`;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return [pageSize, change];
}
