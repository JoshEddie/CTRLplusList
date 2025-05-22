'use client';

import { signOut } from '@/app/actions/auth';
import { useTransition } from 'react';
import { LuLogOut } from 'react-icons/lu';

export default function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <button onClick={handleSignOut} disabled={isPending} className="btn nav mobile-small">
      <LuLogOut size={20} />
      <span>{isPending ? 'Signing out...' : 'Sign Out'}</span>
    </button>
  );
}
