import UserCard from '@/app/(main)/users/ui/components/UserCard';
import MoreCard from '@/app/ui/components/MoreCard';
import { getFollowingFeedProfiles } from '@/lib/data/user';
import { capRail } from './utils';

export default async function FollowingRail({ userId }: { userId: string }) {
  const all = await getFollowingFeedProfiles(userId);
  const { shown: profiles, moreCount } = capRail(all);

  if (profiles.length === 0) {
    return <div className="list-card-row-empty">Not following anyone yet.</div>;
  }

  return (
    <div className="list-card-row" role="list">
      {profiles.map((p) => (
        <div className="list-card-row-item" role="listitem" key={p.id}>
          <UserCard
            profile={p}
            newCount={p.new_count}
            latestSharedAt={p.latest_shared_at}
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
