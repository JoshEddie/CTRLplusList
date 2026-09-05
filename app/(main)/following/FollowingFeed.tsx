import { db } from '@/db';
import { users } from '@/db/schema';
import { getFollowingFeedProfiles } from '@/lib/data/user';
import { authedUserId } from '@/lib/data/user.session';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import UserCardGrid from '../users/ui/components/UserCardGrid';

const EMPTY_MESSAGE = (
  <>
    You aren&apos;t following anyone yet. Visit a shared list and click Follow
    on the owner to see their new public lists here.
  </>
);

// Everything on this page that touches data, under one Suspense boundary: both
// the actor resolution and the feed are uncached reads, and either one awaited
// in the page body holds the whole navigation rather than streaming in behind
// the tab strip.
export default async function FollowingFeed() {
  const viewerId = await authedUserId();
  if (!viewerId) redirect('/');

  const feedProfiles = await getFollowingFeedProfiles(viewerId);

  // Mark seen after the response is sent. Inlined (not a server action)
  // because the deferred work cannot call auth() — Next 16 disallows
  // headers()/cookies() inside after(). The viewer id resolved above is the
  // only request state the closure reads.
  // No tag fires here: updateTag throws in after(), and the only reader of
  // last_seen_following_at (getFollowingFeedProfiles) is uncached (#305).
  after(async () => {
    try {
      await db
        .update(users)
        .set({ last_seen_following_at: new Date() })
        .where(eq(users.id, viewerId));
    } catch (error) {
      console.error('Error marking following seen:', error);
    }
  });

  return <UserCardGrid profiles={feedProfiles} emptyMessage={EMPTY_MESSAGE} />;
}
