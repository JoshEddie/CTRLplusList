## Context

See proposal.md — Why. The mechanics that shape the approach:

- `app/(main)/layout.tsx` returns `<OnboardingGate>` from the un-onboarded branch and `<ProfileSwitchProvider><AppFrame>{children}{modal}</AppFrame></ProfileSwitchProvider>` from the other. The two branches share nothing.
- `.onboarding-gate-page` is `position: fixed; inset: 0; z-index: 150`. `.app-nav` is `position: fixed` at `z-index: 10`, `height: var(--app-nav-height)` (`calc(65px + env(safe-area-inset-top))`, `59px` at ≤700px).
- The account menu's chain already handles both arms without a branch: `User` falls back to `<UserMenu session>` when `authedIdentity()` yields null, and `UserAvatarPopover` falls back to `facelessView(user.name)` when no `activeProfile` is passed.
- `switcherView` excludes the active profile from its rows, so a viewer holding one membership yields `rows: []` and `profileCount: 1`.

## Goals / Non-Goals

**Goals:**

- The un-onboarded branch composes from the same three pieces the onboarded branch does, so a change to the frame reaches the gate without anyone remembering it should.
- No new branching inside `AppFrame`, `AppNav`, `User`, `UserMenu`, `UserAvatarPopover` or `switcherView`.

**Non-Goals:**

- Making any frame destination work at the gate. They change the address and the gate renders again; that is the intended outcome, not a limitation to design around.
- Changing what `/sign-in` does with a signed-in visitor. It still redirects to `/`. Once sign-out is reachable that redirect is no longer load-bearing, and what a signed-in visitor should be shown there is a separate question.
- Any change to the gate's beats, copy, arms, inputs, submit or recovery-by-re-submit.

## Decisions

### The frame wraps the gate; the gate is not moved into the frame's surface

The un-onboarded branch returns `<ProfileSwitchProvider><AppFrame><OnboardingGate …/></AppFrame></ProfileSwitchProvider>`, and the gate keeps `position: fixed`. Fixed positioning takes it out of `.app-surface`'s flow, so it paints full-bleed below the nav regardless of where it sits in the tree, and it keeps the gradient background rather than inheriting the white rounded surface. The only CSS change is `inset: 0` → `inset: var(--app-nav-height) 0 0`.

*Rejected — render the gate as ordinary content inside `.app-surface`.* It reads as a page rather than as a continuation of signing in, inherits the surface's white card and radius, and would need the story's four absolutely-positioned layers re-expressed against a flowed parent. The spec's whole-viewport-below-the-nav requirement is what fixed positioning already gives.

*Rejected — a `/sign-out` route outside `(main)`.* Fixes the escape and not the silent half: the gate still never says whose account it is attached to, and the viewer has to know the URL exists. Recorded in the ADR delta, which supersedes the prior entry's "a surface that must render for a profile-less account has to live outside `(main)`".

### `ProfileSwitchProvider` is included even though nothing at the gate switches

`useProfileSwitch()` is called unconditionally at the top of `UserAvatarPopover`, before any switch row is rendered, and `useProfileSwitchContext` throws when the context is absent. Omitting the provider is a render-time crash on both arms, not a degraded menu.

*Rejected — make the popover's hook call conditional on having rows.* Conditional hook call; also puts a branch in a shared component to serve one caller, which is the fragile-coupling shape `CLAUDE.md` names.

### Nothing suppresses the switcher

`app-frame` already requires that a viewer running only their self-profile is offered no switch rows, and an un-onboarded account holds at most one profile — zero on the `signup` arm, exactly the backfilled one on the `existing` arm, with every membership-minting surface (creation, invite acceptance) behind the same gate. `switcherView` therefore returns no rows on its own. Passing `switcher={undefined}` at the gate would be a guard re-deciding what the invariant already decided.

The invariant is load-bearing and worth stating where it can be checked: it holds only while no membership-minting surface lives outside `(main)`. `openspec/specs/onboarding-gate` carries it as the reason the gate offers no switching.

### The `signup` arm's avatar is the account's initials, and that is the only carve-out

`facelessView(user.name)` renders initials with a null accent. It is not `users.image`, so `altvatar`'s ban on account images is untouched; it is not a third link in the resolution chain, because there is no profile for the chain to start from. The alternative — covering only the `existing` arm — avoids the carve-out but leaves the signup arm able to mint a profile on an account it was never shown.

This resurrects a path that is currently dead outside error handling, so it earns test coverage rather than inheriting it.

## Risks / Trade-offs

- **The empty `.app-surface` renders behind the fixed gate and may produce residual scroll** (`.app-frame` carries `min-height: 100vh` plus `padding-top: var(--app-nav-height)`). → Verify at both breakpoints; if it scrolls, the un-onboarded branch renders the gate as `AppFrame`'s only child with no surface content, which is already what it does.
- **`env(safe-area-inset-top)` makes the docking offset dynamic**, so a hard-coded top would be wrong on notched devices. → Use `var(--app-nav-height)`, never a literal.
- **The nav is tabbable before the gate**, so a keyboard user now passes through frame controls before reaching the gate's primary control. → Intended: reaching the account menu by keyboard is the point. The gate's existing focus-on-mount and focus-on-beat-change behaviour is unchanged, so the caret still lands inside the gate.
- **The gate's own e2e assertions were written against a frameless page.** → `Onboarding_BackfilledAccountRequestsAPage_GateStandsInsteadOfIt` still holds (the gate stands in place of the page's content); the layout unit test that asserts the frame does not come with the gate is the one that inverts.
- **A future membership-minting surface outside `(main)` would silently put switch rows at the gate.** → Accepted, recorded as the invariant's condition in the spec and the ADR's consequences rather than defended with a guard.
