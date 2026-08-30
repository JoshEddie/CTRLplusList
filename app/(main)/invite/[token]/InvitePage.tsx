import { writableMembership } from '@/lib/data/profile.gate';
import { getLiveInvite } from '@/lib/data/profile.members';
import { authedUserId } from '@/lib/data/user.session';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import InviteCard from './InviteCard';

// The page states what the link grants and redeems nothing on load: link
// unfurlers, mail scanners and the browser's own prefetch all issue this GET,
// and a single-use token has no second chance.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getLiveInvite(token);

  // An unknown token, an expired one and a spent one land here alike, so the
  // page cannot confirm to a stranger that a guessed token ever existed.
  if (!invite) {
    return (
      <main className="container">
        <div className="empty-container">
          <h3>This invite link is no longer valid</h3>
          <p>Ask whoever sent it to you for a fresh one.</p>
          <Link href="/">Go home</Link>
        </div>
      </main>
    );
  }

  // A member following the link has nothing to accept, so the page states
  // nothing and just takes them to the profile. The link is untouched: loading
  // never redeems, and a sitting member's role is not a link's to change.
  const userId = await authedUserId();
  if (userId && (await writableMembership(userId, invite.id)))
    redirect(`/altvatar/${invite.id}`);

  return <InviteCard token={token} invite={invite} signedIn={!!userId} />;
}
