'use server';
import { auth } from '@/lib/auth';
import { getMembershipsForUser, switcherView } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import UserMenu from './UserMenu';

export default async function User() {
  const session = await auth();
  if (!session?.user) return <UserMenu session={session} />;

  const identity = await authedIdentity();
  if (!identity) return <UserMenu session={session} />;

  return (
    <UserMenu
      session={session}
      activeProfile={identity.activeProfile}
      switcher={switcherView(
        identity,
        await getMembershipsForUser(identity.userId)
      )}
    />
  );
}
