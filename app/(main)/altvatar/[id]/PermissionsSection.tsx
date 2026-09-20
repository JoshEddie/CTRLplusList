import {
  getPendingInvites,
  getProfileMembers,
} from '@/lib/data/profile.members';
import InviteRow from './InviteRow';
import MemberRow from './MemberRow';

// Counted here rather than in the row: the clock is request-time state, and a
// client component reading it during render is impure. Never below one — the
// roster read filters expired invites out, so a non-positive count can only
// come of expiring in the gap between that read and this render.
const daysUntil = (at: Date) =>
  Math.max(1, Math.ceil((at.getTime() - Date.now()) / 86_400_000));

// Managed profiles only: a managed profile carries no `self` row, and a
// self-profile's membership is not administrable, so every row here is an
// owner or a manager and no rule is owed for a `self` row.
export default async function PermissionsSection({
  profileId,
  viewerUserId,
  viewerIsOwner,
}: {
  profileId: string;
  viewerUserId: string;
  viewerIsOwner: boolean;
}) {
  const members = await getProfileMembers(profileId);
  // Only for an owner: the row carries the token, and a token is the grant
  // itself, so showing one to a manager would let them admit a member by
  // forwarding a link they cannot mint.
  const invites = viewerIsOwner ? await getPendingInvites(profileId) : [];

  // A membership never acted as sorts after every one carrying a value: the
  // section is read to find who has gone quiet, and an unused seat is not the
  // quietest, it is a different thing.
  const sorted = [...members].sort((a, b) => {
    if (!a.last_active_at) return b.last_active_at ? 1 : 0;
    if (!b.last_active_at) return -1;
    return b.last_active_at.getTime() - a.last_active_at.getTime();
  });

  // The sole owner cannot leave, and their own Leave control carries the reason
  // as a tooltip rather than letting them discover it at the refusal. Owners are
  // counted here because the roster is already in hand; the floor itself is
  // enforced inside the delete, which also counts a `self` row this section can
  // never meet — the section renders for managed profiles, and those carry none.
  const soleOwner =
    viewerIsOwner && members.filter((m) => m.role.admin).length === 1;

  return (
    <section className="permissions-section">
      <ul className="member-list">
        {sorted.map((member) => (
          <MemberRow
            key={member.user_id}
            profileId={profileId}
            member={member}
            viewerUserId={viewerUserId}
            viewerIsOwner={viewerIsOwner}
            soleOwner={soleOwner && member.user_id === viewerUserId}
          />
        ))}
        {/* Seats offered but not taken. A redemption replaces the row with the
            member's own, so they sit after the memberships rather than among
            them. */}
        {invites.map((invite) => (
          <InviteRow
            key={invite.token}
            profileId={profileId}
            invite={invite}
            daysLeft={daysUntil(invite.expires_at)}
          />
        ))}
      </ul>
    </section>
  );
}
