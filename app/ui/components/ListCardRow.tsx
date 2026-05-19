import ListCard, { ListCardData } from './ListCard';

export default function ListCardRow({
  lists,
  showOwner = false,
  bookmarkedIds,
  emptyMessage,
}: {
  lists: ListCardData[];
  showOwner?: boolean;
  bookmarkedIds?: Set<string>;
  emptyMessage: React.ReactNode;
}) {
  if (lists.length === 0) {
    return <div className="list-card-row-empty">{emptyMessage}</div>;
  }
  return (
    <div className="list-card-row" role="list">
      {lists.map((list) => (
        <div className="list-card-row-item" role="listitem" key={list.id}>
          <ListCard
            list={list}
            showOwner={showOwner}
            bookmarked={bookmarkedIds?.has(list.id) ?? false}
          />
        </div>
      ))}
    </div>
  );
}
