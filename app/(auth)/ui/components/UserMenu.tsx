'use client';

import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import { buttonClasses } from '@/app/ui/components/button';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import Image from 'next/image';
import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import AuthContainer from './AuthContainer';
import UserAvatarPopover from './UserAvatarPopover';

export default function UserMenu({ session }: { session: Session | null }) {
  const userSignedIn: boolean = !!session?.user;
  const user = session?.user;

  // Signed-in users get a compact popover anchored to the avatar.
  if (userSignedIn && user) {
    return <UserAvatarPopover user={user} />;
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
        <div onClick={() => setShowMenu(false)} className="close-button">
          <LuX />
        </div>
      </AuthContainer>
    </>
  );
}
