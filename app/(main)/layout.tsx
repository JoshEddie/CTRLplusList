import OnboardingGate from '@/app/ui/components/onboarding/OnboardingGate';
import { randomAccentName } from '@/lib/accent';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import { resolveOnboarding } from '@/lib/data/onboarding';
import AppFrame from '../ui/components/AppFrame';
import { ProfileSwitchProvider } from '../ui/components/ProfileSwitchProvider';
import '../ui/styles/app-frame.css';
import './items/ui/styles/item.css';
import './lists/ui/styles/following-and-history.css';
import './lists/ui/styles/list.css';
import './profiles/ui/styles/profiles.css';

// This segment blocks on purpose. Whether `children` renders at all depends on
// a database read, so nothing under `(main)` can be emitted before that read
// resolves — the gate's guarantee that no page work is performed is exactly a
// refusal to stream the page optimistically. Declaring it is honest; wrapping
// the whole frame in a Suspense boundary instead only hid the same block behind
// an empty fallback, and left Next unable to validate the segments it drops.
export const instant = false;

// Onboarding is a layout short-circuit, not a guard and not a route. For an
// un-onboarded account this returns the gate INSTEAD OF `children`, so the page
// element is never included in the output, React never invokes it, and no page
// read is issued — `children` is an element passed in, and passing one does not
// render it. No per-action onboarding check ships and none is to be added:
// between sign-in and the gate's submit there is no profile, so actor
// resolution yields nothing and nothing can own content. Because the requested
// URL is untouched, completing the gate reveals the page originally asked for.
// See openspec/adr/2026-08-26-onboarding-is-a-layout-short-circuit-not-a-guard.md
export default async function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const onboarding = await resolveOnboarding();
  if (!onboarding.onboarded) {
    return (
      <OnboardingGate
        arm={onboarding.arm}
        initialName={onboarding.name}
        suggested={rollAltvatar()}
        suggestedAccent={randomAccentName()}
      />
    );
  }

  return (
    <ProfileSwitchProvider>
      <AppFrame>
        {children}
        {modal}
      </AppFrame>
    </ProfileSwitchProvider>
  );
}
