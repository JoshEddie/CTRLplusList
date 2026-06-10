import { auth } from '@/lib/auth';
import { getBlockedByUser, getUserIdByEmail } from '@/lib/data/user';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function BlockedSection() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const blocked = await getBlockedByUser(viewer.id);

  return (
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
  );
}
