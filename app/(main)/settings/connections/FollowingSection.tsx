import { auth } from '@/lib/auth';
import { getFollowingByUser, getUserIdByEmail } from '@/lib/data/user';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function FollowingSection() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const following = await getFollowingByUser(viewer.id);

  return (
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
  );
}
