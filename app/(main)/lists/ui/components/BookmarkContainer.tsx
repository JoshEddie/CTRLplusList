import { getBookmarkStatus } from '@/lib/dal';
import BookmarkButton from './BookmarkButton';

export default async function BookmarkContainer({
  list_id,
  user_id,
}: {
  list_id: string;
  user_id: string;
}) {
  const bookmarked = await getBookmarkStatus(list_id, user_id);
  return <BookmarkButton listId={list_id} initialBookmarked={bookmarked} />;
}
