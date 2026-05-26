import ListCard, { ListCardData } from './ListCard';
import MoreCard from './MoreCard';

export default function ListCardRow({
  lists,
  showOwner = false,
  bookmarkedIds,
  emptyMessage,
  moreCount = 0,
  seeAllHref,
}: {
  lists: ListCardData[];
  showOwner?: boolean;
  bookmarkedIds?: Set<string>;
  emptyMessage: React.ReactNode;
  moreCount?: number;
  seeAllHref?: string;
}) {
  if (lists.length === 0) {
    return <div className="list-card-row-empty">{emptyMessage}</div>;
  }
  const showMore = moreCount > 0 && seeAllHref;
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
      {showMore && (
        <div className="list-card-row-item" role="listitem">
          <MoreCard moreCount={moreCount} href={seeAllHref} />
        </div>
      )}
    </div>
  );
}
