'use server';
import { signIn, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function signInUser() {
  await signIn('google');
}

export async function signOutUser() {
  await signOut({ redirect: false });
  redirect('/sign-in');
}
