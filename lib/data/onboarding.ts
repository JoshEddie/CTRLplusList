import { db } from '@/db';
import { users } from '@/db/schema';
import { getMembershipsForUser } from '@/lib/data/profile.active';
import { authedUserId } from '@/lib/data/user.session';
import { eq } from 'drizzle-orm';

export type OnboardingState =
  | { onboarded: true }
  // Which arm decides the copy and what cancel does: an account holding no
  // self-profile is finishing signing up and owns nothing, so cancelling can
  // delete it; one that already holds a self-profile is being introduced to a
  // new feature, so cancelling only signs out.
  | {
      onboarded: false;
      userId: string;
      arm: 'signup' | 'existing';
      name: string | null;
    };

// The latch, derived from rows the actor path already read — no extra query
// and no column recording onboarding. An account is un-onboarded when either
// holds: it has no self-profile, or its self-profile carries no Altvatar art.
// A managed profile's missing art means nothing.
export async function resolveOnboarding(): Promise<OnboardingState> {
  // An unauthenticated request is unaffected: it takes the path it takes
  // today, and the gate never renders over it.
  const userId = await authedUserId();
  if (!userId) return { onboarded: true };

  const memberships = await getMembershipsForUser(userId);
  const self = memberships.find((m) => m.role === 'self');
  if (!self) {
    // The name the account already carries, so the gate's field arrives filled
    // wherever the provider gave one. Read only on this arm, which an account
    // passes through once.
    const [account] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));
    return {
      onboarded: false,
      userId,
      arm: 'signup',
      name: account?.name ?? null,
    };
  }
  if (!self.art)
    return { onboarded: false, userId, arm: 'existing', name: self.name };
  return { onboarded: true };
}
