'use client'

import SignOutButton from '@/app/(auth)/ui/components/SignOutButton';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import AuthContainer from './AuthContainer';
import UserImage from './UserImage';

export default function UserMenu({ session }: { session: Session | null }) {

    const [showMenu, setShowMenu] = useState(false);

  return (
    session?.user && (
        <>
        <div className={`avatar-container ${showMenu ? 'hide' : ''}`} onClick={() => setShowMenu(!showMenu)}>
            <UserImage image={session?.user?.image || ''} name={session?.user?.name || ''} />
            <div className="gradientOverlay" />
        </div>
        <AuthContainer className={`user-menu ${showMenu ? 'show' : ''}`}>
        {session?.user && (
            <>
            <UserImage image={session?.user?.image || ''} name={session?.user?.name || ''} />
            <SignOutButton />
            <div onClick={() => setShowMenu(false)} className="close-button"><LuX /></div>
            </>
        )}
        </AuthContainer>
        </>
    )
  );
}
