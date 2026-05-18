import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FaPlus } from 'react-icons/fa';
import BookmarkMigrationToast from './ui/components/BookmarkMigrationToast';
import CollapsibleRail from './ui/components/CollapsibleRail';
import ListLoading from './ui/components/ListLoading';
import BookmarksRail from './ui/components/rails/BookmarksRail';
import FollowingRail from './ui/components/rails/FollowingRail';
import MyListsRail from './ui/components/rails/MyListsRail';
import RecentlyVisitedRail from './ui/components/rails/RecentlyVisitedRail';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  return (
    <div className="list-container home-digest">
      <BookmarkMigrationToast />

      <Header title="My Lists">
        <Link className="btn primary" href="/lists/new">
          <FaPlus size={14} />
          <span className="mobile-hide">New List</span>
        </Link>
      </Header>

      <CollapsibleRail name="my-lists" title="My Lists" seeAllHref="/lists/all">
        <Suspense fallback={<ListLoading />}>
          <MyListsRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>

      <CollapsibleRail name="following" title="Following" seeAllHref="/following">
        <Suspense fallback={<ListLoading />}>
          <FollowingRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>

      <CollapsibleRail
        name="bookmarks"
        title="Bookmarks"
        seeAllHref="/lists/bookmarks"
      >
        <Suspense fallback={<ListLoading />}>
          <BookmarksRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>

      <CollapsibleRail
        name="recently-visited"
        title="Recently visited"
        seeAllHref="/lists/history"
      >
        <Suspense fallback={<ListLoading />}>
          <RecentlyVisitedRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
    </div>
  );
}
