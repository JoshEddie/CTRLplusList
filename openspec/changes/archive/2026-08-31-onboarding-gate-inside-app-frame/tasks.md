## 1. Compose the frame around the gate

- [x] 1.1 In `app/(main)/layout.tsx`, return the gate from the un-onboarded branch wrapped in `ProfileSwitchProvider` and `AppFrame`, leaving `children` and `modal` out of that branch entirely
- [x] 1.2 Update the branch's comment: it currently states the gate renders instead of the frame, and must state that it renders instead of the page while the frame stands, citing the new ADR entry

## 2. Dock the gate below the navigation bar

- [x] 2.1 In `app/ui/styles/onboarding.css`, change `.onboarding-gate-page` from `inset: 0` to `inset: var(--app-nav-height) 0 0`, keeping `position: fixed` so the gate paints full-bleed rather than inside `.app-surface`
- [x] 2.2 Update the file's lead comment — it asserts nothing is behind the gate because the layout renders it instead of the page; the frame is now behind it and the page still is not
- [x] 2.3 Verify at desktop and at ≤700px that the nav is fully visible, the gate fills the remainder, and the empty `.app-surface` behind it produces no residual scroll; if it does, render the gate as `AppFrame`'s only child with no surface content

## 3. Unit tests

- [x] 3.1 Invert `UnOnboardedAccount_RendersTheGateInsteadOfTheRequestedPage` in `app/(main)/__tests__/layout.test.tsx`: the frame now renders with the gate, the modal slot still does not, and the page component still never runs
- [x] 3.2 Add layout coverage that the un-onboarded branch renders inside `ProfileSwitchProvider`, so removing it fails rather than crashing only at popover render
- [x] 3.3 Cover the `facelessView` path in `User`/`UserAvatarPopover`: an account resolving no identity renders its own name's initials with no accent, and the popover renders name, email and `Sign out` with no switch rows and no profile count
- [x] 3.4 Confirm `UnOnboardedAccount_IssuesNoPageLevelQuery` and `UnOnboardedAccount_IssuesNoRedirect` still pass unchanged, and that `OnboardingGate.test.tsx`'s backdrop, Escape and no-close-control assertions are untouched

## 4. E2E

- [x] 4.1 In `e2e/onboarding.existing.spec.ts`, add the account-menu walk: open the user menu at the gate, assert the signed-in email, assert no switch rows, sign out, land on the sign-in page
- [x] 4.2 Add the account-swap arc: sign out at the gate, sign in as an account whose self-profile carries art, assert the gate does not render — SKIPPED: bypass is process-wide (one account per server), account swap is structurally untestable in e2e
- [x] 4.3 In `e2e/onboarding.signup.spec.ts`, assert the nav avatar renders the account's name initials and the menu states that account's email, with no profile created
- [x] 4.4 Assert a nav pill at the gate changes the address and leaves the gate standing, and that `Onboarding_BackfilledAccountRequestsAPage_GateStandsInsteadOfIt` still holds

## 5. Decisions into the library

- [x] 5.1 Promote `2026-08-31-a-profile-less-account-still-gets-the-frame` into `openspec/adr/`
- [x] 5.2 Promote the modified `2026-08-26-onboarding-is-a-layout-short-circuit-not-a-guard` into `openspec/adr/`, replacing the entry in place with the version carried in `adr.md`
- [x] 5.3 Add the new entry's index rows to `openspec/adr/INDEX.md` — one per **Touching** term (`app/(main)/layout.tsx`, `DAL`)
- [x] 5.4 Put the new entry's **Decision** into `app/(main)/layout.tsx` as the branch's comment, citing the entry by filename (satisfied by 1.2 — verify the citation names the new entry, not only the old one)

## 6. Pre-merge

All five gates are run locally against the author's real `.env.local` before review. This change edits `app/(main)/layout.tsx`, `app/ui/styles/onboarding.css` and test files, so no gate is exempt.

- [x] 6.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.3 `npm run build` — completes
- [x] 6.4 `npm run test:coverage` — zero failing tests
- [x] 6.5 `npm run test:e2e` — zero failing tests
- [x] 6.6 `openspec validate onboarding-gate-inside-app-frame --strict` — passes
