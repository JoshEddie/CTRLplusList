import { auth } from '@/lib/auth';
import { getFollowersOfUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function FollowersSection() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const followers = await getFollowersOfUser(viewer.id);

  return (
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
  );
}
