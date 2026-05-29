import UserCard from '@/app/(main)/users/ui/components/UserCard';
import MoreCard from '@/app/ui/components/MoreCard';
import { getFollowingFeedUsers } from '@/lib/dal';
import { capRail } from './utils';

export default async function FollowingRail({ userId }: { userId: string }) {
  const all = await getFollowingFeedUsers(userId);
  const { shown: users, moreCount } = capRail(all);

  if (users.length === 0) {
    return <div className="list-card-row-empty">Not following anyone yet.</div>;
  }

  return (
    <div className="list-card-row" role="list">
      {users.map((u) => (
        <div className="list-card-row-item" role="listitem" key={u.id}>
          <UserCard
            user={{ id: u.id, name: u.name, image: u.image }}
            newCount={u.new_count}
            latestSharedAt={u.latest_shared_at}
            compact
          />
        </div>
      ))}
      {moreCount > 0 && (
        <div className="list-card-row-item" role="listitem">
          <MoreCard moreCount={moreCount} href="/following" />
        </div>
      )}
    </div>
  );
}
