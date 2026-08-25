import { db } from '@/db';
import { users } from '@/db/schema';
import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { getFollowingFeedProfiles } from '@/lib/data/user';
import { authedUserId } from '@/lib/data/user.session';
import { eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { after } from 'next/server';
import UserCardGrid from '../users/ui/components/UserCardGrid';

const EMPTY_MESSAGE = (
  <>
    You aren&apos;t following anyone yet. Visit a shared list and click Follow
    on the owner to see their new public lists here.
  </>
);

export default async function FollowingPage() {
  const viewerId = await authedUserId();
  if (!viewerId) redirect('/');

  const feedProfiles = await getFollowingFeedProfiles(viewerId);

  // Mark seen after the response is sent. Inlined (not a server action)
  // because the deferred work cannot call auth() — Next 16 disallows
  // headers()/cookies() inside after(). The viewer id resolved above is the
  // only request state the closure reads.
  after(async () => {
    try {
      await db
        .update(users)
        .set({ last_seen_following_at: new Date() })
        .where(eq(users.id, viewerId));
      updateTag('user_follows');
    } catch (error) {
      unstable_rethrow(error);
      console.error('Error marking following seen:', error);
    }
  });

  return (
    <div className="following-page">
      <ListCollectionsNav />
      <UserCardGrid profiles={feedProfiles} emptyMessage={EMPTY_MESSAGE} />
    </div>
  );
}
