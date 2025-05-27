'use client'

import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import SignOutButton from '@/app/(auth)/ui/components/SignOutButton';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import Image from 'next/image';
import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import AuthContainer from './AuthContainer';
import UserImage from './UserImage';

export default function UserMenu({ session }: { session: Session | null }) {

    const [showMenu, setShowMenu] = useState(false);

    const userSignedIn: boolean = !!session?.user;
    const user = session?.user;

  return (
        <>
        <div className={`avatar-container ${showMenu ? 'hide' : ''} ${userSignedIn ? '' : 'placeholder'}`} onClick={() => setShowMenu(!showMenu)}>
            {userSignedIn ? (
                <>
                  <UserImage image={user?.image || ''} name={user?.name || ''} />
                  <div className="gradientOverlay" />
                </>
            ) : (
                <div className="btn nav avatar placeholder">
                    Sign In
                </div>
            )}
        </div>
        <AuthContainer className={`user-menu ${showMenu ? 'show' : ''}`}>
        {userSignedIn ? (
            <>
            <UserImage image={user?.image || ''} name={user?.name || ''} />
            <SignOutButton action={() => setShowMenu(false)}/>
            </>
        ) : (
            <>
            <Image src="/wishlist.webp" alt="Wishlist Logo" width={250} height={56} priority={true} />
            <SignInButton />
            </>
        )}
        <div onClick={() => setShowMenu(false)} className="close-button"><LuX /></div>
        </AuthContainer>
        </>
    )
}
