import UserCardGrid from '@/app/(main)/users/ui/components/UserCardGrid';
import { getFollowingFeedUsers } from '@/lib/dal';

export default async function FollowingRail({ userId }: { userId: string }) {
  const users = (await getFollowingFeedUsers(userId)).slice(0, 5);
  return (
    <UserCardGrid
      users={users}
      emptyMessage="Not following anyone yet."
    />
  );
}
