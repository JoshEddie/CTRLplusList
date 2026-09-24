'use client';

import type { ProfileSwitcherView } from '@/lib/data/profile.active';
import type { ActorProfile } from '@/lib/types';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import SignedOutMenu from './SignedOutMenu';
import UserAvatarPopover from './UserAvatarPopover';

export default function UserMenu({
  session,
  activeProfile,
  switcher,
}: {
  session: Session | null;
  activeProfile?: ActorProfile;
  switcher?: ProfileSwitcherView;
}) {
  const user = session?.user;

  // Signed-in users get a compact popover anchored to the avatar.
  if (user) {
    return (
      <UserAvatarPopover
        user={user}
        activeProfile={activeProfile}
        switcher={switcher}
      />
    );
  }

  // Signed-out users get the full-screen modal sign-in flow.
  return <SignedOutMenu />;
}
