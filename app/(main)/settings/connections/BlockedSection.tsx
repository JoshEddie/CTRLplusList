import { getBlockedByProfile } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ConnectionRow from './ConnectionRow';
import ConnectionsAction from './ConnectionsActions';
import ConnectionsSection from './ConnectionsSection';

export default async function BlockedSection() {
  const identity = await authedIdentity();
  if (!identity) redirect('/');

  const blocked = await getBlockedByProfile(identity.selfProfile.id);

  return (
    <ConnectionsSection
      title="Blocked"
      count={blocked.length}
      emptyMessage="No blocked users."
    >
      {blocked.map((b) => (
        <ConnectionRow
          key={b.blocked_profile_id}
          profileId={b.blocked_profile_id}
          name={b.blocked?.name ?? null}
          since={b.created_at}
          actions={
            <ConnectionsAction
              action="unblock"
              targetId={b.blocked_profile_id}
            />
          }
        />
      ))}
    </ConnectionsSection>
  );
}
