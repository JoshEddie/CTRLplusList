## ADDED ADRs

### 2026-08-31-a-profile-less-account-still-gets-the-frame

**Touching**: `app/(main)/layout.tsx`, `DAL`

**Context**: The gate rendered instead of the whole frame, and the app's only sign-out lives in the frame's account menu, so a returning account met the gate unable to see which account it was signed in as or to leave it — `/sign-in` bounces a signed-in visitor back into the gate, and no route outside `(main)` ends a session. Putting a sign-out route outside `(main)` was considered and refused: it fixes the escape without fixing the silent half, which is that the gate never says whose account it is about to attach a profile to.

**Decision**: The un-onboarded branch renders the gate inside `AppFrame` and `ProfileSwitchProvider` rather than in place of them, so the nav's account menu — name, email, sign-out — is reachable at the gate. The frame's identity read is not page work and the short-circuit is unchanged: `children` is still never rendered, no page component runs, no page data is fetched, and there is still no route and no redirect. A surface that must render for a profile-less account belongs inside the frame, not outside `(main)`; where such a request resolves no active profile, the nav avatar falls back to the account's name initials with no accent. The frame's destinations stay live but inert — following one changes the URL and the gate renders again.

**Consequences**: The account menu's profile switcher needs no suppression, because an un-onboarded account holds at most one profile and `app-frame` already offers a single-profile viewer no switch rows — an invariant that stops holding the moment a membership-minting surface escapes the gate. `ProfileSwitchProvider` becomes mandatory in a branch that renders no switchable profile, because `useProfileSwitch()` runs unconditionally in the popover. The `facelessView` fallback, until now reachable only on error paths, becomes a live rendering path for every account signing up.

## MODIFIED ADRs

### 2026-08-26-onboarding-is-a-layout-short-circuit-not-a-guard

**Touching**: `DAL`, `app/(main)/layout.tsx`

**Context**: `profiles.name` is notNull with no automatic source, so an account must supply a name and a face before it can own anything — but `createSelfProfile` ran inside NextAuth's `createUser` event, where nothing can ask a human for either. Guarding every server action against a profile-less actor would mean a check per action that any new action can forget to add.

**Decision**: Self-profile creation happens in the onboarding submit action, and the `(main)` layout renders onboarding *instead of* `children` for an un-onboarded account. Between sign-in and submit there is no profile, so no page component runs and no data is fetched. Every write that resolves its actor through `resolveIdentity` — `authedIdentity()` / `authedWriter()` — yields null for an account holding no `self` membership, so no profile-scoped write lands. No per-action onboarding guard ships, and none is to be added. The gate covers every route under `(main)`, public content included; it is not a route and never changes the URL, so submitting reveals the page that was requested.

**Consequences**: A new page, and any server action resolving through `resolveIdentity`, inherits the guarantee without doing anything, and an actor that resolves is by construction fully set up. An action resolving on `authedUserId()` alone does not: `createProfile` mints a profile and an `'owner'` membership for an un-onboarded account that calls it directly, and the visit writers key rows on the account id. Those stand — the surfaces are unreachable before the gate and the endpoints only by hand — but an action choosing that resolution is outside the guarantee and owes a reason. In exchange the layout performs a read on every authenticated request. A surface that must render for a profile-less account does not have to live outside `(main)` — see [2026-08-31-a-profile-less-account-still-gets-the-frame](2026-08-31-a-profile-less-account-still-gets-the-frame.md), which renders the frame's account chrome around the gate.

## REMOVED ADRs

None.
