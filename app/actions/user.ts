'use server';
import { signIn, signOut } from '@/lib/auth';

export async function signInUser() {
  await signIn('google');
}

export async function signOutUser() {
    await signOut();
}