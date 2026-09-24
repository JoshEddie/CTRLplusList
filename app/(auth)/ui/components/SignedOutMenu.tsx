'use client';

import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import { CloseButton, buttonClasses } from '@/app/ui/components/button';
import Image from 'next/image';
import { useState } from 'react';
import AuthContainer from './AuthContainer';

export default function SignedOutMenu() {
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
