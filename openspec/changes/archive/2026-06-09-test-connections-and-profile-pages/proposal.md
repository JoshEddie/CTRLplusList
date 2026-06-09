## Why

Sub-proposal **9.4** of the `test-coverage` initiative ([issue #114](https://github.com/JoshEddie/CTRLplusList/issues/114)) — a coverage-gap follow-up discovered at the §7.1 close-out audit (`openspec/changes/test-coverage/tasks.md` §9.4).

Two social-graph **page-shell** clusters were left at **0% unit coverage** by the §0–§6 carve-outs. 4.15 (`test-user-actions`) covered `app/actions/user.ts` but not the connections settings UI; 4.2 (`test-following`) covered the `users/ui` components (already floored: `ProfileHeader`, `FollowPrompt`, `PublicListsGrid`, `FollowButton`, …) but not the **route shells** that compose them. The two clusters are:

- **Connections settings** (`app/(main)/settings/connections/`, 8 files): the `/settings/connections` page that lists a viewer's Following / Followers / Blocked relationships with per-row actions.
- **User profile pages** (`app/(main)/user/[id]/`, 4 files): the public profile at `/user/[id]` rendering a user's header + their public lists, with the block cover-story and the invite-URL follow prompt.

Every file below is absent from `vitest.config.ts` `thresholds` (verified against the live map — none enumerated) and has no colocated test.

A spec-grep (every active `spec.md` grepped for these file paths, the route strings, and the behaviors they render) found that **the `following` capability already specs every behavior in scope** — this carve-out adds no new requirement; it **LOCKS** the existing `following` SHALLs at the component level. The relevant `following` requirements:

- *"Owners SHALL view and manage their followers"* — the three connections sections (Following → unfollow, Followers → remove + block, Blocked → unblock). LOCKED by the section + row + action tests.
- *"Connections page SHALL show a 'since' date for each relationship"* — `ConnectionRow`'s `created_at` short-date subline. LOCKED by the `ConnectionRow` test.
- *"Sign-in SHALL capture the user's full name …"* — its connections-row clause (the row displays the stored `users.name`). LOCKED at the component level by `ConnectionRow` rendering the passed `name`.
- *"Profile pages SHALL exist at `/u/[id]` with an invite-URL follow prompt"* — name/image/public-lists render, `?follow=1` prompt, unknown-user 404. LOCKED by the `ProfilePage` / `ProfileHeaderSection` / `ProfileListsSection` tests.
- *"Blocks SHALL gate URL access for signed-in blocked viewers"* — the **"Signed-in blocked user 404s on profile page"** scenario. This is the **privacy invariant** (`if (profile.viewerIsBlocked) notFound()` — "act as not-found so the existence of the account isn't disclosed"). LOCKED by the `ProfileHeaderSection` cover-story test.

Inherited constraints (binding SHALLs cited as-is — none re-owned here):

- **`testing-foundation`** (active accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md`, plus every prior sub-proposal's archived deltas) — governs verbatim: the vitest 4.x runner with the jsdom/node two-project split (`.test.tsx` → jsdom, `.test.ts` → node), four-gate pre-merge, `__tests__/` colocation, the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) referenced from the single `vitest.config.ts` constant, the no-backdoor disposition rule (`/* v8 ignore */` with a named rationale, never lower the floor), the assertion-substance bar, the `<State>_<Behavior>` `it()` shape and three-role `describe()` convention, the four-audit + invariant-elevation obligations, and the `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy. Two load-bearing mocking allowances apply: **(1) NextAuth is the network boundary** — `@/lib/auth`'s `auth()` is mocked, never the modules it wraps; **(2) `next/navigation`'s `redirect()`/`notFound()` are mocked to throw a sentinel** for RSC guards (the `FollowingPage.test.tsx` / `ChooseItemsBody.test.tsx` `redirect()` precedent, extended to `notFound()` here).
- **`following`** (active) — owns every behavior under test (enumerated above). This carve-out **LOCKS** those requirements at the component level; **no `following` requirement is modified**.
- **`lib/dal.ts` reads, already whole-covered + enumerated by 9.1** (`test-dal-remainder`): `getFollowersOfUser`, `getFollowingByUser`, `getBlockedByUser`, `getProfileForUser`, `getPublicListsByUser`, `getUserIdByEmail`. **Module-mocked** at the `@/lib/dal` boundary here — these tests assert *which read a shell calls and how it renders the result*, not the query.
- **`app/actions/follows.ts` mutations, owned + floored by 4.2** (`test-following`): `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`. **Module-mocked** at the `@/app/actions/follows` boundary — `ConnectionsActions` asserts *which action a row wires to a click*, plus the toast/refresh branches, not the mutation side-effects.
- **`users/ui` components, owned + floored by 4.2** — `ProfileHeader`, `FollowPrompt`, `PublicListsGrid`. Mocked at the boundary to isolate the parent shell's branch logic (the "mock the floored sibling, assert the forwarded prop" precedent), never re-owned or re-tested.
- **Primitive/chrome families rendered *through*, not re-owned** — `Header` (4.1), `LoadingIndicator` (3.7), `ListCollectionsNav` (4.6), `Button`/`buttonClasses` (3.1), and `next/link`. All already tested and floored; the in-carve-out children render through the real ones, asserting no primitive SHALL directly.

Cache-tag note: none of these 12 files own a server-side read or mutation tag — they are page shells composing reads/actions owned and floored elsewhere (9.1 / 4.2). All such boundaries are module-mocked.

## What Changes

- **NEW** colocated `.test.tsx` files under `__tests__/` directories mirroring the source layout, one per source file (all client/JSX or JSX-returning async RSC → all run under the **jsdom** project). In-carve-out (none enumerated in `vitest.config.ts`, all 0% today), grouped by surface class:

  - **Connections settings (8 files)** under `app/(main)/settings/connections/`:
    - `page.tsx` (route shell: `metadata` + `<ConnectionsPage />`).
    - `ConnectionsPage.tsx` (pure layout shell: `Header` + three `Suspense`-wrapped sections with `LoadingIndicator` fallbacks + `role="separator"` dividers).
    - `ConnectionsSection.tsx` (pure render: `title (count)` heading; the `count === 0` empty-message branch vs the `<ul>` children branch).
    - `FollowingSection.tsx` / `FollowersSection.tsx` / `BlockedSection.tsx` (async RSC: the `auth()` → `redirect('/')` and `getUserIdByEmail` → `redirect('/')` guards, then `getFollowingByUser` / `getFollowersOfUser` / `getBlockedByUser`, rendering the real `ConnectionsSection` + `ConnectionRow` + the correct `ConnectionsAction` set — unfollow / remove + block / unblock).
    - `ConnectionRow.tsx` (pure render: the `/user/${userId}` `Link`, the `name ?? 'Unnamed'` fallback, the `since &&` `formatDate` subline branch).
    - `ConnectionsActions.tsx` (client: `useTransition`, the `fns[action](targetId)` dispatch to the mocked follows action, the `result.success` toast-success/`router.refresh` vs toast-error branches, and the `isPending` re-entrancy guard).
  - **User profile pages (4 files)** under `app/(main)/user/[id]/`:
    - `page.tsx` (route shell: `metadata` + `<ProfilePage {...props} />` forwarding `params`/`searchParams`).
    - `ProfilePage.tsx` (pure layout shell: `ListCollectionsNav` + `Header` + two `Suspense`-wrapped sections forwarding `params`/`searchParams`).
    - `ProfileHeaderSection.tsx` (async RSC: `auth()` → optional `getUserIdByEmail`, `getProfileForUser`, the `!profile` → `notFound()` guard, the **block cover-story** `profile.viewerIsBlocked` → `notFound()` guard, the `isReachable` / `showFollowPrompt` derivation, rendering the mocked `ProfileHeader` + conditional `FollowPrompt`).
    - `ProfileListsSection.tsx` (async RSC: `getPublicListsByUser(id, { limit: 50 })` → the mocked `PublicListsGrid`).

- **NEW** per-file `thresholds` entries in `vitest.config.ts` for the 12 files, each referencing the shared `COVERAGE_FLOOR` constant (no per-file numeric variation), under a `// test-connections-and-profile-pages (sub-proposal 9.4) — locked at universal COVERAGE_FLOOR.` comment.

- **NEW** ESLint per-file `sonarjs/cognitive-complexity = error` overrides in `eslint.config.mjs` for the same 12 files, promoting them from the global `warn`, under the matching comment. Any function measuring ≥ 15 at HEAD is disposed in-carve-out by a single-file, behavior-preserving extraction (covered by the new tests, recorded in `tasks.md`) — never by raising the ceiling. (`ProfileHeaderSection.tsx` is the only branching candidate; expected well under 15.)

- **NEW** four-audit + invariant-elevation findings recorded in `tasks.md`:
  - **Dead-code audit:** confirm all 12 files are live (each route `page.tsx` is a Next entry point; the rest are reached from it). No deletion expected — recorded as a confirmed-live finding (contrast 9.3, which deleted a dead old-chrome cluster).
  - **Route-path drift finding:** the `following` *"Profile pages SHALL exist at `/u/[id]`"* requirement names `/u/[id]`, but the live route is `app/(main)/user/[id]` (→ `/user/[id]`), and the same spec's colocate requirement and `ConnectionRow`'s link both use `/user/{id}`. Internal spec inconsistency / stale prose; flagged for the operator (not modified — cross-tier, test-only carve-out; mirrors 9.3's "AuthPage" stale-prose disposition).
  - **Duplication + complexity + assertion audits** with their dispositions.

- **NO** new requirement elevated. Every behavior under test is **already** a `following` SHALL (LOCKED by the new tests, coordinated non-redundantly). The remaining small page-shell auth guards (`if (!session?.user?.email) redirect('/')`) have no clean owning capability (`server-endpoint-authorization` owns the *actions/routes*, not these section-shell render guards) and are adequately constrained by the new unit tests; the non-elevation rationale is recorded per the four-audit obligation (`design.md` Decision 6).

- **NO** re-test of the `lib/dal.ts` reads (owned by 9.1) or the `follows` actions (owned by 4.2) — module-mocked, asserting the shells' read/action wiring.
- **NO** re-test of the governed primitives or `users/ui` components (`Header`, `LoadingIndicator`, `ListCollectionsNav`, `Button`, `ProfileHeader`, `FollowPrompt`, `PublicListsGrid`) — rendered through (the chrome/primitives) or mocked-to-isolate (the floored `users/ui` siblings); none re-owned.
- **NO** source refactor anticipated beyond any audit-driven, behavior-preserving extraction (only if a function exceeds the complexity ceiling of 15 at HEAD).

## Capabilities

### New Capabilities

None. Every behavior under test belongs to the existing `following` capability; this carve-out LOCKS the already-specced connections/profile requirements and adds no new requirement.

### Modified Capabilities

- `testing-foundation`: Tier-2 carve-out bookkeeping (archive-only per parent design D13) — records the 12 page-shell files floored + enumerated. No change to the active `testing-foundation` spec at apply-time (archive-time rollup per §7.11); no change to the parent `test-coverage` accumulator. No other capability's requirements change: the `following` SHALLs are LOCKED as-is (asserted by the new tests, not modified).

## Impact

- **New files:** 12 `.test.tsx` files — 8 under `app/(main)/settings/connections/__tests__/` (`page`, `ConnectionsPage`, `ConnectionsSection`, `FollowersSection`, `FollowingSection`, `BlockedSection`, `ConnectionRow`, `ConnectionsActions`) and 4 under `app/(main)/user/[id]/__tests__/` (`page`, `ProfilePage`, `ProfileHeaderSection`, `ProfileListsSection`). The two `page.test.tsx` files sit in separate `__tests__/` dirs — no collision. Shared Arrange (an `auth()`-mock / session+viewer factory, the `redirect()`/`notFound()` sentinels, a `getProfileForUser` shape factory) is hoisted into each file's `beforeEach`; a colocated `__tests__/test-helpers.tsx` is extracted only on 3+ reuse (the established threshold).
- **Deleted files:** none — all 12 source files are live (the dead-code audit confirms, contrast 9.3).
- **Modified config:** `vitest.config.ts` gains 12 per-file `thresholds` entries (all → `COVERAGE_FLOOR`); `eslint.config.mjs` gains the same 12 paths in the `sonarjs/cognitive-complexity = error` array.
- **Modified source:** none expected beyond any conditional audit-driven, behavior-preserving extraction in `ProfileHeaderSection.tsx` if a function exceeds the ceiling of 15 at HEAD.
- **Modified specs:** the Tier-2 `testing-foundation` record lives only in this change's `specs/` delta and its archive directory. No active capability spec changes at apply-time; the `following` route-path drift is flagged for the operator, not edited here.
- **Parent governance:** `test-coverage/tasks.md` §9.4 checkbox flips on archive. §7.2 / §7.3 (global complexity promotion + final coverage baseline) remain blocked while §9.5 is still open — this sub-proposal alone does not clear them.
- **CI:** the four-gate workflow runs unchanged; the `test` job nets **+12 jsdom files**. The async-RSC shells mock `auth()`, `@/lib/dal`, and sentinel `redirect()`/`notFound()`; the client `ConnectionsActions` mocks `@/app/actions/follows`, `react-hot-toast`, and `next/navigation`'s `useRouter`; the pure-render files mock `next/link` (transitively needed by the real `ConnectionRow`).
- **Dependencies:** none added (`@testing-library/user-event`, jsdom harness already present).
- **Risk:** low. All 12 files are small render/dispatch shells with direct precedents (the `FollowingPage` / `ProfileHeaderSection`-style async-RSC pattern, the `AppFrame.test.tsx` "mock floored sibling, assert forwarded prop" precedent, the field/form render and `useTransition`/toast dispatch tests). No deletion blast radius. The only new harness mechanic is the `notFound()` sentinel, a one-line extension of the established `redirect()` sentinel.
