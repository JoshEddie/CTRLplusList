import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import BookmarkMigrationToast from './lists/ui/components/BookmarkMigrationToast';
import CollapsibleRail from './lists/ui/components/CollapsibleRail';
import ListLoading from './lists/ui/components/ListLoading';
import BookmarksRail from './lists/ui/components/rails/BookmarksRail';
import FollowingRail from './lists/ui/components/rails/FollowingRail';
import MyListsRail from './lists/ui/components/rails/MyListsRail';
import RecentlyVisitedRail from './lists/ui/components/rails/RecentlyVisitedRail';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/sign-in');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/sign-in');

  return (
    <div className="home-digest">
      <BookmarkMigrationToast />

      <CollapsibleRail name="my-lists" title="My Lists" seeAllHref="/lists">
        <Suspense fallback={<ListLoading />}>
          <MyListsRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

      <CollapsibleRail name="following" title="Following" seeAllHref="/following">
        <Suspense fallback={<ListLoading />}>
          <FollowingRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

      <CollapsibleRail
        name="bookmarks"
        title="Bookmarks"
        seeAllHref="/lists/bookmarks"
      >
        <Suspense fallback={<ListLoading />}>
          <BookmarksRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

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
