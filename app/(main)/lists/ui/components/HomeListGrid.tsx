import HomeListCard, { HomeListCardData } from './HomeListCard';

export default function HomeListGrid({
  lists,
  showOwner = false,
  bookmarkedIds,
  emptyMessage,
}: {
  lists: HomeListCardData[];
  showOwner?: boolean;
  bookmarkedIds?: Set<string>;
  emptyMessage: React.ReactNode;
}) {
  if (lists.length === 0) {
    return <div className="rail-empty">{emptyMessage}</div>;
  }
  return (
    <div className="list-grid">
      {lists.map((list) => (
        <HomeListCard
          key={list.id}
          list={list}
          showOwner={showOwner}
          bookmarked={bookmarkedIds?.has(list.id) ?? false}
        />
      ))}
    </div>
  );
}
