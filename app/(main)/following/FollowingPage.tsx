import { db } from '@/db';
import { users } from '@/db/schema';
import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { auth } from '@/lib/auth';
import { getFollowingFeedUsers, getUserIdByEmail } from '@/lib/data/user';
import { eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import UserCardGrid from '../users/ui/components/UserCardGrid';

const EMPTY_MESSAGE = (
  <>
    You aren&apos;t following anyone yet. Visit a shared list and click Follow
    on the owner to see their new public lists here.
  </>
);

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const feedUsers = await getFollowingFeedUsers(viewer.id);

  // Mark seen after the response is sent. Inlined (not a server action)
  // because the deferred work cannot call auth() — Next 16 disallows
  // headers()/cookies() inside after(). Viewer id is captured into a local
  // here so the closure never touches request state.
  const viewerId = viewer.id;
  after(async () => {
    try {
      await db
        .update(users)
        .set({ last_seen_following_at: new Date() })
        .where(eq(users.id, viewerId));
      updateTag('user_follows');
    } catch (error) {
      console.error('Error marking following seen:', error);
    }
  });

  return (
    <div className="following-page">
      <ListCollectionsNav />
      <UserCardGrid users={feedUsers} emptyMessage={EMPTY_MESSAGE} />
    </div>
  );
}
