import { getFollowersOfProfile } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function FollowersSection() {
  const identity = await authedIdentity();
  if (!identity) redirect('/');

  const followers = await getFollowersOfProfile(identity.selfProfile.id);

  return (
    <ConnectionsSection
      title="Followers"
      count={followers.length}
      emptyMessage="No followers yet."
    >
      {followers.map((f) => (
        <ConnectionRow
          key={f.follower_id}
          profileId={f.follower.profile_id}
          name={f.follower?.name ?? null}
          since={f.created_at}
          actions={
            <>
              <ConnectionsAction action="remove" targetId={f.follower_id} />
              <ConnectionsAction
                action="block"
                targetId={f.follower.profile_id}
              />
            </>
          }
        />
      ))}
    </ConnectionsSection>
  );
}
