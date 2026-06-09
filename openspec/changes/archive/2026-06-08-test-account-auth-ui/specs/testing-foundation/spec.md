## ADDED Requirements

### Requirement: The live auth & account-menu client UI SHALL be whole-covered at the universal COVERAGE_FLOOR

The auth and account-menu **client UI** left at 0% by the §0–§6 carve-outs — whose sign-in *flow* is e2e-covered by 6.1 (`test-e2e-critical-flows`) but whose **components** had no unit tests — SHALL be brought to the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) by colocated `*.test.tsx` files under the **jsdom** vitest project. The covered files are, under `app/(auth)/ui/components/`: `User.tsx`, `UserMenu.tsx`, `UserAvatarPopover.tsx`, `UserImage.tsx`, `SignInPage.tsx`, `SignInButton.tsx`, and `AuthContainer.tsx`; and `app/(auth)/sign-in/page.tsx`.

The client components SHALL be rendered through the **real** governed primitives (`Menu`/`MenuItem`/`MenuLinkItem` for `UserAvatarPopover`, `Button`/`buttonClasses` for `SignInButton` and `UserMenu`), with only framework boundaries mocked — the server actions (`@/app/actions/user`), `next/image`, `next/navigation`, and `next/link` (the last pulled in transitively by the real `MenuLinkItem`, which cannot mount under jsdom without an `AppRouterContext`). The async server-component shells (`User`, `SignInPage`, `sign-in/page.tsx`) SHALL be tested via the async-RSC pattern: `auth()` mocked, `next/server`'s `connection()` mocked to a resolved no-op (for `SignInPage`), and `next/navigation`'s `redirect()` mocked to throw a sentinel. A sibling component that carries its own colocated coverage MAY be mocked when a test needs to isolate the parent's branch logic — `UserMenu`'s session-branch test mocks `UserAvatarPopover` and `SignInButton`, each owned and tested separately. No governed primitive SHALL be mocked, re-owned, or re-tested here, and internal modules SHALL NOT otherwise be mocked.

On completion, every covered file SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the shared `COVERAGE_FLOOR` constant (no per-file numeric variation) and SHALL have `sonarjs/cognitive-complexity` promoted to `error` in `eslint.config.mjs`.

#### Scenario: The live auth-UI files meet the universal floor

- **WHEN** `npm run test:coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of the eight covered files at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** each per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant
- **AND** `eslint.config.mjs` sets `sonarjs/cognitive-complexity` to `error` for each covered file

#### Scenario: Account-menu components render through real primitives

- **WHEN** a `UserAvatarPopover` test renders the component
- **THEN** the real `Menu` / `MenuItem` / `MenuLinkItem` primitives are mounted (not mocked)
- **AND** nothing beyond the permitted framework boundaries (`@/app/actions/user`, `next/image`, `next/navigation`, `next/link`) is mocked

#### Scenario: The sign-in redirect branch is unit-covered without duplicating the e2e

- **WHEN** `SignInPage` is rendered for an already-authenticated viewer (`auth()` resolves a session with a user)
- **THEN** the `redirect('/')` sentinel is thrown and no sign-in UI renders
- **AND** for a session-less viewer the `AuthContainer`, logo, and `SignInButton` render — the unit tier owning the redirect branch the e2e (6.1) does not exercise

### Requirement: The dead old-chrome cluster SHALL be removed, not covered

The pre-`AppFrame` chrome cluster — `app/ui/components/AuthPage.tsx` (`AuthProvider`, zero importers), its transitively-orphaned `app/ui/components/AppMenu.tsx`, `app/ui/components/Logo.tsx`, and `app/ui/components/Nav.tsx` (each imported only by the prior link and floored under sub-proposal 4.1), and the two leaf-dead `app/(auth)/ui/components/AuthButtons.tsx` and `app/(auth)/ui/components/SignOutButton.tsx` (zero importers; stale duplicates of the live `SignInButton`/sign-out affordances) — SHALL be disposed of by **deletion**, per the four-audit dead-code rule, rather than by writing tests for code nothing renders. The orphaned `AppMenu.tsx` / `Logo.tsx` / `Nav.tsx` per-file `thresholds` entries and `sonarjs/cognitive-complexity = error` overrides SHALL be removed from `vitest.config.ts` and `eslint.config.mjs`, and their colocated `*.test.tsx` files SHALL be deleted, so no orphaned tested-but-dead code survives. No `app-frame` requirement changes, since that spec governs the surviving `AppFrame`/`AppNav` path and never named the removed primitives.

#### Scenario: The dead cluster is gone and the build stays green

- **WHEN** the codebase is grepped for `AuthProvider`, `AppMenu`, the old `Logo`/`Nav` primitives, `AuthButtons`, and the old `SignOutButton` after this change archives
- **THEN** no source file matches, no `vitest.config.ts` / `eslint.config.mjs` entry references the three removed floored files, and no `__tests__/{AppMenu,Logo,Nav}.test.tsx` remains
- **AND** `npx tsc --noEmit` and `npm run build` complete with zero errors
