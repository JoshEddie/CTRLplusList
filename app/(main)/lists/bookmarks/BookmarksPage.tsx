import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { authedUserId } from '@/lib/data/user.session';
import { getBookmarkedListsByUser } from '@/lib/data/visit';
import { redirect } from 'next/navigation';
import BookmarksList from './BookmarksList';

export default async function BookmarksPage() {
  const viewerId = await authedUserId();
  if (!viewerId) redirect('/');

  const rows = await getBookmarkedListsByUser(viewerId);

  return (
    <div className="bookmarks-page">
      <ListCollectionsNav />
      <BookmarksList rows={rows} />
    </div>
  );
}
