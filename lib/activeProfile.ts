import type { EmptySecondaryAction, UserIdentity } from '@/lib/types';

// The client-safe half of the active-profile capability: copy a Client
// Component may import. It lives apart from `lib/data/profile.active.ts`
// because that module holds a `'use cache'` read, and Next refuses to let a
// Client Component import a module that defines one.

// The route an empty profile-scoped surface offers beside its create
// affordance. Emptiness is the one state in which such a surface looks the
// same for every profile, so it is where a viewer who has switched is least
// able to tell another profile's view from their own content having vanished.
//
// The label names the destination, not the act: this is a link to the Profiles
// page, and switching happens there. It names no profile either — the offer is
// true whichever one is active.
export const SWITCH_PROFILE_ACTION: EmptySecondaryAction = {
  href: '/profiles',
  label: 'Go to Profiles',
};

// Whether a profile page is the viewer's own, for the surfaces that offer to
// follow or manage it. Either of the viewer's two profiles counts: the active
// profile is the one they manage, and following is account-keyed, so their
// self-profile is never followable however they have switched. Comparing one
// alone renders an affordance the backing action unconditionally refuses.
export function isViewersOwnProfile(
  viewer: UserIdentity | null | undefined,
  profileId: string
): boolean {
  return (
    viewer?.selfProfile.id === profileId ||
    viewer?.activeProfile.id === profileId
  );
}
