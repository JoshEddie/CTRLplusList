import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import FollowingFeed from './FollowingFeed';

// Synchronous on purpose: the tab strip is the same for every viewer, so
// nothing above the boundary touches data and the navigation paints it
// immediately. Resolving the actor is itself an uncached read — `authedUserId`
// memoizes per request, it does not cache — so it belongs inside the boundary
// with the feed rather than in front of it.
export default function FollowingPage() {
  return (
    <div className="following-page">
      <ListCollectionsNav />
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <FollowingFeed />
      </Suspense>
    </div>
  );
}
