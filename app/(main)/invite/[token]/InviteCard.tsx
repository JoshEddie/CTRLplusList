'use client';

import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import type { ProfileAvatarView, RoleShape } from '@/lib/types';
import { redeemInvite } from '@/lib/data/profile.members.actions';
import { signInUser } from '@/lib/data/user.actions';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import toast from 'react-hot-toast';
import '../invite.css';

// Branches on the right rather than the role, because administering the profile
// itself is exactly what separates the two roles a link may carry.
const roleBlurb = (role: RoleShape) =>
  role.admin
    ? 'as an owner — you’ll be able to change its lists, its items, and who else runs it.'
    : 'as a manager — you’ll be able to look after its lists and items.';

export type InviteView = ProfileAvatarView & {
  id: string;
  tagline: string | null;
  role: RoleShape;
};

// The link's whole job is to say who is asking, so the profile wears its own
// face and colour here rather than being named in a sentence. A shell rather
// than a page: an invite is a decision to take or leave, and the app behind it
// is where either answer lands.
export default function InviteCard({
  token,
  invite,
  signedIn,
}: {
  token: string;
  invite: InviteView;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const leave = () => router.push('/');

  const accept = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await redeemInvite(token);
      if (result.success) {
        toast.success(result.message);
        router.push(`/altvatar/${invite.id}`);
      } else toast.error(result.message);
    });
  };

  const body = (
    <div className="form-shell-body invite-body">
      <p className="invite-kicker">You’ve been invited to help run</p>
      <h1 className="invite-name">{invite.name}</h1>
      {invite.tagline && <p className="invite-tagline">{invite.tagline}</p>}
      <p className="invite-blurb">{roleBlurb(invite.role)}</p>
    </div>
  );

  return (
    <FormShell
      onClose={leave}
      header={
        <div className="invite-band" style={accentVars(invite.accent)}>
          <span className="invite-band-avatar">
            <ProfileAvatar profile={invite} />
          </span>
        </div>
      }
    >
      {signedIn ? (
        <form onSubmit={accept}>
          {body}
          <FormShellFooter
            onCancel={leave}
            submitLabel="Accept invite"
            isPending={isPending}
          />
        </form>
      ) : (
        // The destination rides the sign-in round trip, so the recipient lands
        // back on the invite they were sent rather than on the home page.
        <form action={signInUser.bind(null, `/invite/${token}`)}>
          {body}
          <FormShellFooter onCancel={leave} submitLabel="Sign in to accept" />
        </form>
      )}
    </FormShell>
  );
}
