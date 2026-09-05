import { cookies } from 'next/headers';

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './ui/components/paginationConstants';

export function normalizePageSize(raw: string | undefined | null): number {
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return PAGE_SIZE_OPTIONS.includes(parsed as 12 | 24 | 48 | 96)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

export async function readItemsPageSize(): Promise<number> {
  const store = await cookies();
  return normalizePageSize(store.get('items_page_size')?.value);
}
