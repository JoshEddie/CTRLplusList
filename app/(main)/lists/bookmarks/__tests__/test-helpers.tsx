import type { ListCardData } from '@/app/ui/components/ListCard';
import type { BookmarkRowData } from '../BookmarksList';

export function makeRow(
  overrides: Partial<BookmarkRowData> = {}
): BookmarkRowData {
  return {
    user_id: 'viewer',
    list_id: 'l1',
    list: { id: 'l1' } as ListCardData,
    ...overrides,
  };
}
