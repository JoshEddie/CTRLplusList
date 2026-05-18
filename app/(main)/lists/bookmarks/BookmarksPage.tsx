import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import { getBookmarkedListsByUser, getUserIdByEmail } from '@/lib/dal';
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
      <Header title="Bookmarks" />
      <BookmarksList rows={rows} />
    </div>
  );
}
