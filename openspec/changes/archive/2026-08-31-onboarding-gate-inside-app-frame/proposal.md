## Why

The onboarding gate renders **instead of** the app frame ([app/(main)/layout.tsx](../../../app/(main)/layout.tsx)), and the app's only sign-out lives inside that frame ([UserAvatarPopover.tsx](<../../../app/(auth)/ui/components/UserAvatarPopover.tsx>)). A returning account that meets the gate therefore cannot see which account it is signed in as, and cannot sign out. The trap is total: every page is under `(main)`, and `/sign-in` — the one route outside it — redirects a signed-in visitor back to `/` and into the gate. The only escape is clearing cookies by hand.

The cost falls hardest on the population the gate's `existing` arm exists for: someone who has used the app for months, on a shared device, is shown a name pre-filled from whoever signed in last and given no way to check or correct it. They must mint an Altvatar on the wrong account to reach the control that would have let them switch accounts.

Two active specs already disagree here, and the code resolved the conflict in the direction that produced the trap:

- `app-frame` — *"Every route under `app/(main)/` SHALL render inside a shared frame"*, and *"The frame SHALL be rendered from `app/(main)/layout.tsx`"*. The un-onboarded branch does neither.
- `onboarding-gate` — *"The gate SHALL offer no way out but submit"*, and *"no actor SHALL be resolved"*.

The second was written to stop an un-onboarded account reaching app content. It was read as also forbidding an account from learning who it is and leaving. Signing out is not getting past the gate — it ends the session and lands on `/sign-in`, reaching no page the gate protects. The archived design assumed exactly this exit was available, and leaned on it in its risk register (*"it strands nothing (they can sign out …)"*); the shipped requirement closed it without replacing it.

## What Changes

- The un-onboarded branch of `app/(main)/layout.tsx` renders the gate **inside** `AppFrame`, wrapped in `ProfileSwitchProvider`, rather than in place of them. The short-circuit itself is unchanged: `children` is still never rendered, still no page work, still no route and no redirect.
- The gate's own surface stops covering the nav — `.onboarding-gate-page` docks below the gradient bar instead of `inset: 0` over it.
- The nav's account menu becomes reachable at the gate, stating the signed-in account's name and email and offering sign-out. Its Altvatars and Connections destinations, and the four primary nav pills, remain reachable but inert — following one changes the URL and the gate renders again.
- **No profile switcher appears at the gate**, and no code enforces that: an un-onboarded account holds at most one profile, so `app-frame`'s existing *"A single-profile viewer sees no switcher"* already governs. Recorded as the reason, not as a new rule.
- Where no active profile is resolvable — the `signup` arm, which holds no membership at all — the nav avatar renders the account's name initials with no accent. This resurrects `facelessView`, currently reachable only on error paths.

Not in scope: any change to what the gate collects, its arms, its copy, its submit, or its recovery-by-re-submit behaviour.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `onboarding-gate`: the "no way out but submit" requirement narrows to *no way into the application* but submit — the four dismissal guarantees (no close control, backdrop, Escape, reload) are unchanged. "No actor SHALL be resolved" narrows to *no page data SHALL be fetched*; the frame's own identity read is not page work, and `getMembershipsForUser` is already warm from `resolveOnboarding`. The full-screen-treatment requirement is amended to full-bleed-below-the-nav. New requirements: the gate states which account it is attached to, and offers sign-out.
- `app-frame`: the avatar requirement gains the un-onboarded case — where a request resolves no active profile, the circle renders the account's name initials with no accent. Adds that the frame renders around the gate with its destinations inert.
- `active-profile`: *"Every authenticated request SHALL resolve an active profile"* is not true of an account that has not passed the gate — it holds no membership, so there is no self-profile to fall back to. The inaccuracy predates this change and is unobservable today only because the gate suppresses the frame; rendering the frame makes it observable. One-sentence carve-out, no behaviour change.

Inherited and **not** modified: `menu-system` already fixes the popover's row order and marks the switch group *"absent for a viewer who runs only their self-profile"*; `altvatar`'s ban on rendering an account's own image is unaffected — initials derive from `users.name`, not the image column.

## Impact

- `app/(main)/layout.tsx` — un-onboarded branch composition. `ProfileSwitchProvider` is required, not optional: `useProfileSwitch()` runs unconditionally at `UserAvatarPopover.tsx:23`, before any switch row exists, and throws without a provider.
- `app/ui/styles/onboarding.css` — `.onboarding-gate-page` positioning.
- No data-layer change. No new read, no new cache tag, no mutation, no migration.
- `User`, `UserMenu`, `UserAvatarPopover`, `switcherView` and `AppNav` are untouched — they already handle both the profile-less and single-profile cases.
- Tests pinning gate-instead-of-frame move: `app/ui/components/onboarding/__tests__/`, `app/(main)/__tests__/` layout coverage, and the e2e onboarding flow.
