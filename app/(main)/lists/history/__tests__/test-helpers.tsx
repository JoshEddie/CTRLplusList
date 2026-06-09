import type { ListCardData } from '@/app/ui/components/ListCard';
import type { HistoryRowData } from '../HistoryCard';

export function makeRow(
  overrides: Partial<HistoryRowData> = {}
): HistoryRowData {
  return {
    user_id: 'viewer',
    list_id: 'l1',
    last_visited_at: new Date('2021-01-01'),
    favorited_at: null,
    list: { id: 'l1' } as ListCardData,
    ...overrides,
  };
}
