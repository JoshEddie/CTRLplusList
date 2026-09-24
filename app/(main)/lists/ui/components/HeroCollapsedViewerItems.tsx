import { getBookmarkStatus } from '@/lib/data/visit';
import { ListTable } from '@/lib/types';
import BookmarkMenuItem from './BookmarkMenuItem';
import ShareMenuItem from './ShareMenuItem';

// Viewer variant — pre-fetches bookmark state so the client MenuItem can be
// hydrated with it. Follow is not here: it lives inside the profile card the
// byline row opens.
export default async function HeroCollapsedViewerItems({
  list,
  viewerUserId,
}: {
  list: ListTable;
  viewerUserId: string;
}) {
  const bookmarked = await getBookmarkStatus(list.id, viewerUserId);

  return (
    <>
      <ShareMenuItem list={list} />
      <BookmarkMenuItem listId={list.id} initialBookmarked={bookmarked} />
    </>
  );
}
