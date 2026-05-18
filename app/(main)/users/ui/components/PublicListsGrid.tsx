import PublicListCard from './PublicListCard';

export default function PublicListsGrid({
  lists,
}: {
  lists: { id: string; name: string; occasion: string }[];
}) {
  if (lists.length === 0) {
    return <p className="profile-empty">No shared lists yet.</p>;
  }
  return (
    <ul className="profile-list-grid">
      {lists.map((list) => (
        <PublicListCard key={list.id} list={list} />
      ))}
    </ul>
  );
}
