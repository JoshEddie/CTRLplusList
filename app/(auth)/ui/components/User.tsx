'use server';
import { auth } from '@/lib/auth';
import UserMenu from './UserMenu';

export default async function User() {
  const session = await auth();

  return <UserMenu session={session} />;
}
