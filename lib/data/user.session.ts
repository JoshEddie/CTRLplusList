import { auth } from '@/lib/auth';
import { getUserIdentity } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import { type ActionResponse, type UserIdentity } from '@/lib/types';

export const UNAUTHORIZED_RESPONSE: ActionResponse = {
  success: false,
  message: 'Unauthorized',
  error: 'Unauthorized',
};

// Session → users.id, the shared actor-resolution helper for action modules. Lives apart from the
// user read module so importing reads never drags in NextAuth initialization.
export async function authedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await getUserIdByEmail(session.user.email);
  return u?.id ?? null;
}

// Session → { userId, selfProfile, activeProfile }. The seam names both
// profiles and exposes no unqualified one: an endpoint comparing against an
// ownership column or writing new content takes the active profile, and one
// naming or acting for the human takes the self-profile. Both causes of an
// unresolvable actor (no session, no users row) yield null.
export async function authedIdentity(): Promise<UserIdentity | null> {
  const userId = await authedUserId();
  if (!userId) return null;
  return getUserIdentity(userId);
}
