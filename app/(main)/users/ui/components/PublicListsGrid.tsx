import ListCard, { ListCardData } from '@/app/ui/components/ListCard';

export default function PublicListsGrid({
  lists,
}: {
  lists: ListCardData[];
}) {
  if (lists.length === 0) {
    return <p className="profile-empty">No shared lists yet.</p>;
  }
  return (
    <ul className="list-card-grid" role="list">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard list={list} showOwner={false} />
        </li>
      ))}
    </ul>
  );
}
