import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import BookmarkMigrationToast from './lists/ui/components/BookmarkMigrationToast';
import CollapsibleRail from './lists/ui/components/CollapsibleRail';
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
        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <MyListsRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

      <CollapsibleRail
        name="following"
        title="Following"
        seeAllHref="/following"
      >
        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <FollowingRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

      <CollapsibleRail
        name="bookmarks"
        title="Bookmarks"
        seeAllHref="/lists/bookmarks"
      >
        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <BookmarksRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
      <div className="home-rail-divider" role="separator" />

      <CollapsibleRail
        name="recently-visited"
        title="Recently visited"
        seeAllHref="/lists/history"
      >
        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <RecentlyVisitedRail userId={viewer.id} />
        </Suspense>
      </CollapsibleRail>
    </div>
  );
}
