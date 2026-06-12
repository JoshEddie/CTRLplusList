import AuthContainer from '@/app/(auth)/ui/components/AuthContainer';
import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import { auth } from '@/lib/auth';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import '../styles/auth.css';

export default async function SignInPage() {
  // Resolve the session per request. Under the local-mode bypass auth() is
  // synchronous, so without this opt-in this session-dependent surface would be
  // prerendered with the build-time session baked in (the e2e guest server would
  // then serve a logged-in redirect instead of the sign-in UI). No-op in
  // production, where auth() reads cookies and is already dynamic.
  await connection();
  const session = await auth();

  if (session?.user) {
    redirect('/');
  }

  return (
    <AuthContainer>
      <Image
        src="/ctrlpluslist_logo-ver-color.webp"
        alt="Ctrl+List"
        width={200}
        height={120}
        priority={true}
      />
      <Suspense fallback={'loading sign in...'}>
        <SignInButton />
      </Suspense>
    </AuthContainer>
  );
}
