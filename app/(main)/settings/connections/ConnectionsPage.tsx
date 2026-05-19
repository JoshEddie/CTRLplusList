import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import {
  getBlockedByUser,
  getFollowersOfUser,
  getFollowingByUser,
  getUserIdByEmail,
} from '@/lib/dal';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function ConnectionsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const [following, followers, blocked] = await Promise.all([
    getFollowingByUser(viewer.id),
    getFollowersOfUser(viewer.id),
    getBlockedByUser(viewer.id),
  ]);

  return (
    <div className="connections-page">
      <Header title="Connections" />

      <ConnectionsSection
        title="Following"
        count={following.length}
        emptyMessage="Not following anyone yet."
      >
        {following.map((f) => (
          <ConnectionRow
            key={f.followee_id}
            userId={f.followee_id}
            name={f.followee?.name ?? null}
            since={f.created_at}
            actions={
              <ConnectionsAction action="unfollow" targetId={f.followee_id} />
            }
          />
        ))}
      </ConnectionsSection>

      <ConnectionsSection
        title="Followers"
        count={followers.length}
        emptyMessage="No followers yet."
      >
        {followers.map((f) => (
          <ConnectionRow
            key={f.follower_id}
            userId={f.follower_id}
            name={f.follower?.name ?? null}
            since={f.created_at}
            actions={
              <>
                <ConnectionsAction action="remove" targetId={f.follower_id} />
                <ConnectionsAction action="block" targetId={f.follower_id} />
              </>
            }
          />
        ))}
      </ConnectionsSection>

      <ConnectionsSection
        title="Blocked"
        count={blocked.length}
        emptyMessage="No blocked users."
      >
        {blocked.map((b) => (
          <ConnectionRow
            key={b.blocked_id}
            userId={b.blocked_id}
            name={b.blocked?.name ?? null}
            since={b.created_at}
            actions={
              <ConnectionsAction action="unblock" targetId={b.blocked_id} />
            }
          />
        ))}
      </ConnectionsSection>
    </div>
  );
}
