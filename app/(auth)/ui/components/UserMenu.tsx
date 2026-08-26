'use client';

import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import { CloseButton, buttonClasses } from '@/app/ui/components/button';
import type { ProfileSwitcherView } from '@/lib/data/profile.active';
import type { ActorProfile } from '@/lib/types';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import Image from 'next/image';
import { useState } from 'react';
import AuthContainer from './AuthContainer';
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

function SignedOutMenu() {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <>
      <div
        className={`avatar-container ${showMenu ? 'hide' : ''} placeholder`}
        onClick={() => setShowMenu(!showMenu)}
      >
        <div
          className={buttonClasses({
            variant: 'on-dark',
            extra: 'avatar placeholder',
          })}
        >
          Sign In
        </div>
      </div>
      <AuthContainer className={`user-menu ${showMenu ? 'show' : ''}`}>
        <Image
          src="/ctrlpluslist_logo-ver-color.webp"
          alt="Ctrl+List"
          width={200}
          height={120}
          priority={true}
        />
        <SignInButton />
        <CloseButton onClick={() => setShowMenu(false)} />
      </AuthContainer>
    </>
  );
}
