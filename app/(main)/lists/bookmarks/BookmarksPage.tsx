import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/data/user';
import { getBookmarkedListsByUser } from '@/lib/data/visit';
import { redirect } from 'next/navigation';
import BookmarksList from './BookmarksList';

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const rows = await getBookmarkedListsByUser(viewer.id);

  return (
    <div className="bookmarks-page">
      <ListCollectionsNav />
      <BookmarksList rows={rows} />
    </div>
  );
}
