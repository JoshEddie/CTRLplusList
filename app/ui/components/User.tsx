'use server';
import { SignOutButton } from '@/app/(auth)/ui/components/AuthButtons';
import { auth } from '@/lib/auth';
import { Session } from 'next-auth';

import '@/app/(auth)/ui/styles/auth.css';
import Image from 'next/image';

function UserImage({ session }: { session: Session }) {
  return (
    <Image
      className="avatar"
      src={session?.user?.image || ''}
      alt={session?.user?.name || ''}
      width={80}
      height={80}
    />
  );
}

export default async function User() {
  const session = await auth();

  return (
    <div className="user-container">
      {session?.user && (
        <>
          <UserImage session={session} />
          <SignOutButton />
        </>
      )}
    </div>
  );
}
