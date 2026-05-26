import ListCard, { ListCardData } from '@/app/ui/components/ListCard';
import { RemoveVisitButton } from './HistoryActions';

export type HistoryRowData = {
  user_id: string;
  list_id: string;
  last_visited_at: Date | null;
  favorited_at: Date | null;
  list: ListCardData;
};

export default function HistoryCard({ row }: { row: HistoryRowData }) {
  const bookmarked = !!row.favorited_at;
  return (
    <div className="history-card">
      <ListCard list={row.list} showOwner bookmarked={bookmarked} />
      <RemoveVisitButton listId={row.list_id} />
    </div>
  );
}
