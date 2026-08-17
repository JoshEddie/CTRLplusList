import { getFollowingByUser } from '@/lib/data/user';
import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function FollowingSection() {
  const viewerId = await authedUserId();
  if (!viewerId) redirect('/');

  const following = await getFollowingByUser(viewerId);

  return (
    <ConnectionsSection
      title="Following"
      count={following.length}
      emptyMessage="Not following anyone yet."
    >
      {following.map((f) => (
        <ConnectionRow
          key={f.followee_profile_id}
          profileId={f.followee_profile_id}
          name={f.followee?.name ?? null}
          since={f.created_at}
          actions={
            <ConnectionsAction
              action="unfollow"
              targetId={f.followee_profile_id}
            />
          }
        />
      ))}
    </ConnectionsSection>
  );
}
