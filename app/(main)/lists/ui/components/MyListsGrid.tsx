import ListCard from '@/app/ui/components/ListCard';
import { getListsByUser } from '@/lib/data/list';

export default async function MyListsGrid({ userId }: { userId: string }) {
  const lists = await getListsByUser(userId);

  if (lists.length === 0) {
    return (
      <p className="my-lists-empty">No lists yet. Create your first one.</p>
    );
  }

  return (
    <ul className="list-card-grid" role="list">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard list={list} />
        </li>
      ))}
    </ul>
  );
}
