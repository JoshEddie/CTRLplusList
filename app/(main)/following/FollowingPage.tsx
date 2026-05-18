import { markFollowingSeen } from '@/app/actions/follows';
import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import { getFollowingFeedUsers, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import UserCardGrid from '../users/ui/components/UserCardGrid';

const EMPTY_MESSAGE = (
  <>
    You aren&apos;t following anyone yet. Visit a shared list and click Follow on
    the owner to see their new public lists here.
  </>
);

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const users = await getFollowingFeedUsers(viewer.id);

  // Mark seen after the response is sent. Deferred via after() because the
  // action calls updateTag, which Next 16 disallows during render.
  after(() => markFollowingSeen());

  return (
    <div className="following-page">
      <Header title="Following" />
      <UserCardGrid users={users} emptyMessage={EMPTY_MESSAGE} />
    </div>
  );
}
