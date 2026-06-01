## Why

Sub-proposal 4.15 of the `test-coverage` initiative — the capability-flow carve-out for the user-account server actions in `app/actions/user.ts`. The parent `test-coverage` change's `tasks.md` §4.15 names the carve-out as "`app/actions/user.ts` and any user-settings UI under `app/(main)/settings/` / `app/(main)/user/` — carve-out determined at proposal time." This proposal makes that determination: the carve-out is `app/actions/user.ts` ONLY (two server actions — `signInUser`, `signOutUser`). The nominal "user-settings UI" under `app/(main)/settings/connections/` and `app/(main)/user/[id]/` is excluded with rationale (see "Carve-out boundary" below) because it is owned by other capability flows and touches `app/actions/follows.ts`, not `app/actions/user.ts`.

Inherited constraints surfaced by spec-grep:

- `testing-foundation` (active delta in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` plus the archived deltas from every prior `test-*` sub-proposal) — runner (vitest 4.x, node project for `.test.ts`), four-gate pre-merge, `__tests__/` colocation, universal per-file floor `lines:98 / statements:98 / branches:95 / functions:100` referenced from the single `COVERAGE_FLOOR` constant in `vitest.config.ts`, no-backdoor disposition rule, `<State>_<Behavior>` `it()` shape, three-role `describe()` convention, four-audit obligation, invariant-elevation audit, assertion-substance bar, `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy, and the **NextAuth-as-network-boundary mocking allowance**. Every requirement applies verbatim.
- `server-endpoint-authorization` (active) — owns "every server action is authorized for every caller class." `signInUser` / `signOutUser` are deliberately NOT authz-gated (sign-in is for unauthenticated callers; sign-out clears whatever session exists). They are out of scope for that capability's authz contract, which sub-proposal 4.13 owns. This carve-out does not assert any `server-endpoint-authorization` SHALL.
- No `user` / `auth` / `session` / `settings` capability spec exists in `openspec/specs/`. There is therefore no pre-existing spec to elevate user-action invariants into (see the invariant-elevation analysis in `design.md` Decision 3).

## What Changes

- **NEW** `app/actions/__tests__/user.test.ts` (node project — `app/actions/user.ts` is a `.ts` file with no DOM surface). One test file covering both exported server actions:
  - `signInUser()` — delegates to `signIn('google')` from `@/lib/auth`. The test mocks `@/lib/auth` (the NextAuth boundary, per the testing-foundation allowance) and asserts `signIn` is invoked exactly once with exactly the single argument `'google'` — locking the provider identity and the absence of extra options. Would fail if the provider were changed or a redirect/options object were added.
  - `signOutUser()` — calls `signOut({ redirect: false })` then `redirect('/sign-in')`. The test mocks `@/lib/auth`'s `signOut` and `next/navigation`'s `redirect` (a framework control-flow primitive — see `design.md` Decision 2) and asserts: `signOut` invoked once with exactly `{ redirect: false }` (locking the suppression of NextAuth's built-in redirect); `redirect` invoked once with exactly `'/sign-in'` (locking the post-sign-out destination); and that `signOut` is invoked BEFORE `redirect` (the session is cleared before navigation), asserted via `mock.invocationCallOrder`.
- **NEW** per-file threshold entry in `vitest.config.ts` for `app/actions/user.ts`, referencing the existing `COVERAGE_FLOOR` constant (no per-file numeric variation, per `test-housekeeping`'s single-constant rule).
- **NEW** entry in the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` for `app/actions/user.ts`, with a `// test-user-actions (sub-proposal 4.15)` header comment. Both functions are complexity 1; the override locks the ceiling at 15 for future edits.
- **NEW** `testing-foundation` carve-out bookkeeping record (sub-proposal-archive ONLY, Tier 2 per `test-coverage` design D13): the `app/actions/user.ts` carve-out has landed at the universal `COVERAGE_FLOOR` with complexity promoted to `error`. Recorded in `openspec/changes/test-user-actions/specs/testing-foundation/spec.md` ONLY — does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.
- **NEW** four-audit + invariant-elevation findings recorded in `tasks.md`. No source refactor anticipated (the two functions are already trivially testable).

### Carve-out boundary (the §4.15 "determined at proposal time" decision)

- **IN:** `app/actions/user.ts` — `signInUser`, `signOutUser`.
- **OUT — `app/(main)/settings/connections/**`:** the connections settings UI (`ConnectionsPage`, `ConnectionsSection`, `FollowersSection`, `FollowingSection`, `BlockedSection`, `ConnectionRow`, `ConnectionsActions`) is driven entirely by `app/actions/follows.ts` (`blockUser`, `removeFollower`, `unfollowUser`, `unblockUser`) — zero `app/actions/user.ts` involvement. It is owned by sub-proposal 4.2 `test-following`, whose carve-out is `app/actions/follows.ts` + the follow/connections page UI. Including it here would force this sub-proposal to test `follows.ts`, double-covering 4.2.
- **OUT — `app/(main)/user/[id]/**`:** the public profile page (`ProfilePage`, `ProfileHeaderSection`, `ProfileListsSection`) renders another user's public lists; it is follow / list-collections territory (4.2 / 4.6) and touches no `app/actions/user.ts` symbol.
- **OUT — auth-UI consumers** of the two actions (`app/(auth)/ui/components/SignInButton.tsx`, `SignOutButton.tsx`, `AuthButtons.tsx`, and the `signOutUser` form in `UserAvatarPopover.tsx`): these are thin `<form action={...}>` wrappers whose meaningful behavior is the real OAuth round-trip and the post-submit redirect — exercisable only end-to-end. Sub-proposal 6.1 `test-e2e-critical-flows` explicitly states "AuthPage sign-in UI covered here," so the sign-in/sign-out UI is E2E territory, not this unit carve-out. (See `design.md` Decision 4 for the `UserAvatarPopover` governance observation.)

## Capabilities

### New Capabilities

None. This carve-out tests two server actions; it does not introduce a capability. No `user` / `auth` / `session` capability spec is created — see `design.md` Decision 3 for why the latent invariants are tested-but-not-elevated (no relevant host spec exists, and standing up a new capability spec for two one-line server actions is disproportionate).

### Modified Capabilities

- `testing-foundation`: a carve-out bookkeeping record is written to this sub-proposal's archive-only delta (Tier 2 per `test-coverage` design D13). No change to the active `testing-foundation` spec; no change to the parent `test-coverage` accumulator.

## Impact

- **New files:** one `app/actions/__tests__/user.test.ts` (first `__tests__/` directory under `app/actions/`). No shared `test-helpers` extracted (single file; nothing to share).
- **Modified config:** `vitest.config.ts` gains one `thresholds` entry (`app/actions/user.ts`). `eslint.config.mjs` gains one path in the per-file `sonarjs/cognitive-complexity = error` override array.
- **Modified source:** none expected. The two functions are already trivially testable by mocking the framework boundaries they call.
- **Modified specs:** none active. The carve-out bookkeeping requirement lives ONLY in this sub-proposal's archive directory (`openspec/changes/archive/<date>-test-user-actions/specs/testing-foundation/spec.md`); it does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.
- **CI:** the existing four-gate workflow runs unchanged; the `test` job grows by one small node-project file (two `it()`s, no DOM, no DB).
- **Dependencies:** none added.
- **Downstream:** the parent `test-coverage` change's checkbox for sub-proposal 4.15 flips on archive of this sub-proposal (not at apply).
- **Risk:** low. One file, two pure-delegation server actions, both testable as-shipped by mocking the NextAuth (`@/lib/auth`) and Next-routing (`next/navigation`) boundaries.
