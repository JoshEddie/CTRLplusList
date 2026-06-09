## Context

This is sub-proposal 9.4 of `test-coverage` — a unit-coverage carve-out for two social-graph **page-shell** clusters left at 0% by the §0–§6 carve-outs: the connections settings UI (`app/(main)/settings/connections/`, 8 files) and the user profile pages (`app/(main)/user/[id]/`, 4 files). 4.15 covered `app/actions/user.ts`; 4.2 covered the `users/ui` components; neither covered the route shells that compose them. The proposal enumerates the files, the surface classes, and the inherited constraints; this document settles the boundary, the per-surface test mechanics, and the (non-)elevation decisions.

Unlike 9.3, this carve-out has **no dead-code cascade and no deletions** — every file is a live Next route shell or a component it renders. The single largest finding is that **the `following` capability already specs every behavior in scope**, so the elevation question resolves to a clean **LOCK existing, elevate nothing** (Decision 6), and the one drift finding is a stale route-path string in the `following` spec (Decision 7).

The carve-out's 12 files divide into four surface classes, each with an established repo precedent:

1. **Async server-component (RSC) shells (5):** `FollowingSection`, `FollowersSection`, `BlockedSection`, `ProfileHeaderSection`, `ProfileListsSection`. Precedent: `FollowingPage.test.tsx`, `ListItemsSection.test.tsx`, `ChooseItemsBody.test.tsx` (mock `auth()` + `@/lib/dal`, sentinel `redirect()`/`notFound()`, await the component, assert the rendered output or the thrown sentinel).
2. **Pure layout shells (4):** the two route `page.tsx` files, `ConnectionsPage`, `ProfilePage`. Precedent: `lists/new/__tests__/page.test.tsx`, `items/__tests__/page.test.tsx` (mock the child page/section, assert the `Suspense` fallback + composition + forwarded props).
3. **Pure render components (2):** `ConnectionsSection`, `ConnectionRow`. Precedent: `Empty.test.tsx`, the misc-primitive render tests (plain `render` + assert branch/structure).
4. **Client component (1):** `ConnectionsActions`. Precedent: the `useTransition` + toast + `router.refresh` dispatch tests (`FollowControls.test.tsx`), driven with `@testing-library/user-event`.

## Goals / Non-Goals

**Goals:**

- Bring every enumerated file to the universal `COVERAGE_FLOOR`, enumerate it in `vitest.config.ts`, and promote it to `sonarjs/cognitive-complexity = error`.
- LOCK the already-specced `following` requirements at the component level (the three connections sections + per-row actions + since-date; the profile name/lists/follow-prompt render; the **block cover-story `notFound()`** privacy invariant), rendering the in-carve-out children through the **real** components and mocking the floored `users/ui` siblings only to isolate parent branch logic.
- Keep the unit tier non-redundant with any e2e: unit owns the **branch logic** (the section auth-guards, the `ProfileHeaderSection` not-found / cover-story branches, the `ConnectionsActions` success/error branches).
- Discharge the four audits (dead-code, duplication, complexity, assertion) and the invariant-elevation obligation, recording each disposition — including the **route-path drift** finding and the **no-elevation** decision.

**Non-Goals:**

- Re-testing the `lib/dal.ts` reads (owned by 9.1), the `follows` actions (owned by 4.2), the `users/ui` components (`ProfileHeader` / `FollowPrompt` / `PublicListsGrid`, owned by 4.2), or the chrome/primitives (`Header` / `LoadingIndicator` / `ListCollectionsNav` / `Button`).
- Modifying any `following` requirement, the `/u/[id]` route-path prose, or any source behavior — flagged for the operator, not touched here.
- Adding e2e coverage — this carve-out is unit-level only.

## Decisions

### Decision 1 — Final carve-out boundary

**In (test + floor + complexity-error) — 12 live files:**

| File | Surface class |
| --- | --- |
| `app/(main)/settings/connections/page.tsx` | pure layout shell (route → `ConnectionsPage`) |
| `app/(main)/settings/connections/ConnectionsPage.tsx` | pure layout shell (`Header` + 3 `Suspense`) |
| `app/(main)/settings/connections/ConnectionsSection.tsx` | pure render (count → empty vs `<ul>`) |
| `app/(main)/settings/connections/FollowingSection.tsx` | async RSC (auth-guards + `getFollowingByUser`) |
| `app/(main)/settings/connections/FollowersSection.tsx` | async RSC (auth-guards + `getFollowersOfUser`) |
| `app/(main)/settings/connections/BlockedSection.tsx` | async RSC (auth-guards + `getBlockedByUser`) |
| `app/(main)/settings/connections/ConnectionRow.tsx` | pure render (`Link` + name fallback + since) |
| `app/(main)/settings/connections/ConnectionsActions.tsx` | client (`useTransition` + dispatch + toast) |
| `app/(main)/user/[id]/page.tsx` | pure layout shell (route → `ProfilePage`) |
| `app/(main)/user/[id]/ProfilePage.tsx` | pure layout shell (`ListCollectionsNav` + 2 `Suspense`) |
| `app/(main)/user/[id]/ProfileHeaderSection.tsx` | async RSC (`getProfileForUser` + `notFound` + cover-story) |
| `app/(main)/user/[id]/ProfileListsSection.tsx` | async RSC (`getPublicListsByUser` → `PublicListsGrid`) |

**Out (rendered through or mocked-to-isolate; already floored, not re-owned):**

- `lib/dal.ts` reads (9.1), `app/actions/follows.ts` mutations (4.2) → module-mocked at the boundary.
- `ProfileHeader`, `FollowPrompt`, `PublicListsGrid` (4.2) → mocked to isolate the parent shell's branch logic (assert the forwarded prop).
- `Header` (4.1), `LoadingIndicator` (3.7), `ListCollectionsNav` (4.6), `Button`/`buttonClasses` (3.1), `next/link` → rendered through the real components (or, for `next/link`, mocked to a plain `<a>` per Decision 3).

**Note on the issue's named set.** The issue names `app/(main)/settings/connections/*` and `app/(main)/user/[id]/*` as carve-outs. The boundary above enumerates the concrete 12 files those globs resolve to (verified by directory listing); no file in either directory is excluded, and `ConnectionsActions.tsx` (the only `'use client'` file) is included so its directory is not left at 0% beneath floored siblings.

### Decision 2 — No deletions; the dead-code audit confirms all 12 files live

Contrast 9.3, whose audit found a dead old-chrome cluster to delete. Here every file is reachable: `settings/connections/page.tsx` and `user/[id]/page.tsx` are Next App-Router entry points; `ConnectionsPage` / `ProfilePage` are imported by their `page.tsx`; the sections are imported by those; `ConnectionsSection` / `ConnectionRow` / `ConnectionsActions` are imported by the sections. The dead-code audit (§5.1 in `tasks.md`) records this **confirmed-live** result with the importer chain, so a reviewer sees the audit was run, not skipped. No `vitest.config.ts` / `eslint.config.mjs` entries are removed.

### Decision 3 — Mocking strategy per surface class

- **Async RSC shells** — `vi.mock('@/lib/auth')` (`auth()` → a session or `null`); `vi.mock('@/lib/dal')` stubbing the read(s) each shell calls; `vi.mock('next/navigation')` with `redirect()` **and** `notFound()` each throwing a distinct sentinel (`vi.hoisted(() => vi.fn(() => { throw new Error('NOTFOUND') }))`, mirroring the established `REDIRECT:${url}` pattern) so each guard branch is assertable. Await the component (`await FollowingSection()`, `await ProfileHeaderSection({ params, searchParams })`, …) and assert the rendered output or the thrown sentinel. The three connections sections render through the **real** `ConnectionsSection` + `ConnectionRow` + `ConnectionsAction` (cheap, in-carve-out — LOCKS the section structure); `ProfileHeaderSection` / `ProfileListsSection` mock the floored `users/ui` siblings (`ProfileHeader` / `FollowPrompt` / `PublicListsGrid`) and assert the **forwarded props** (the `AppFrame.test.tsx` "mock floored sibling, assert forwarded" precedent), since rendering the real `ProfileHeader` would pull in `FollowButton`'s router/action surface for no in-carve-out gain. `params` / `searchParams` are passed as `Promise.resolve({ … })` (the App-Router async-props shape these shells `await`).
- **Pure layout shells** — render and assert the composition: the route `page.tsx` files mock their child (`./ConnectionsPage` / `./ProfilePage`) and assert it is rendered with the forwarded `params`/`searchParams`; `ConnectionsPage` / `ProfilePage` assert the `Suspense` fallbacks (`LoadingIndicator`), the section children, and (for `ProfilePage`) the `params`/`searchParams` forwarded into both sections. The real `Header` / `LoadingIndicator` / `ListCollectionsNav` render through (floored elsewhere); the async section children are mocked so the shell test stays synchronous and asserts only the shell's own composition.
- **Pure render components** — plain `render` + assert structure/branch: `ConnectionsSection` with `count === 0` (the `connections-empty` message branch) and `count > 0` (the `<ul className="connections-list">` children branch), plus the `title (count)` heading; `ConnectionRow` with a present `name` and the `name ?? 'Unnamed'` fallback, with and without `since` (the `formatDate` subline branch), and the `/user/${userId}` `Link` `href`. `next/link` is mocked to a plain `<a>` (the 9.3 precedent — the real `Link` needs an `AppRouterContext` to mount under jsdom).
- **Client component** — render real; `vi.mock('@/app/actions/follows')` (the four mutations → spies returning `{ success, message }`), `vi.mock('react-hot-toast')` (`toast.success`/`toast.error` spies), `vi.mock('next/navigation')` (`useRouter` → `{ refresh }` spy). Drive the `Button` click with `@testing-library/user-event` and assert: the dispatched action (`fns[action]` → the correct mock called with `targetId`), the success branch (`toast.success` + `router.refresh`), the error branch (`!result.success` → `toast.error`, no refresh), and the `isPending` re-entrancy guard (`aria-disabled` + the early `return`). Renders through the real `Button`/`buttonClasses` (3.1, not re-owned).

**Internal modules are never mocked** beyond the `auth()` / `@/lib/dal` / `@/app/actions/follows` / `next/navigation` / `next/link` / floored-`users/ui`-sibling boundaries `testing-foundation` permits.

### Decision 4 — `ProfileHeaderSection` is the substance core: not-found, the block cover-story, and the follow-prompt derivation

`ProfileHeaderSection` carries the carve-out's most load-bearing logic and its one **privacy invariant**:

1. `getProfileForUser` → `null` ⇒ `notFound()` (unknown user).
2. `profile.viewerIsBlocked` ⇒ `notFound()` — the **cover-story**: a blocked viewer gets the *same* not-found response as a non-existent user, so the account's existence is not disclosed (the inline comment, and the `following` *"Signed-in blocked user 404s on profile page"* scenario).
3. `isOtherUser` / `isReachable` / `showFollowPrompt` derivation: `isReachable = isOtherUser && !viewerIsBlocked && !blockedByViewer`; `showFollowPrompt = isReachable && !viewerIsFollowing && sp.follow === '1'`.

**Decision:** the test asserts every branch via the `notFound`/sentinel mechanic and the forwarded-prop mechanic — (a) `getProfileForUser` → `null` throws the `NOTFOUND` sentinel; (b) `viewerIsBlocked: true` throws the **same** `NOTFOUND` sentinel (LOCKS the cover-story — the privacy invariant is that block and absent are indistinguishable, so the test asserts the *identical* outcome, not merely "some 404"); (c) a reachable non-follower with `?follow=1` renders the `FollowPrompt` (mocked, asserting `name`), while `?follow` absent / already-following / self / blocked-by-viewer renders no prompt; (d) `ProfileHeader` always receives `{ user, publicListCount, viewerId, showFollowButton: isReachable }`. The `getProfileForUser` mock returns a shaped object (`{ id, name, image, publicListCount, viewerIsBlocked, blockedByViewer, viewerIsFollowing }`) per branch; `getUserIdByEmail` is mocked for the viewer-resolution path and the session-less (`viewerId = null`) path. This is the unit complement: the e2e (6.1) is not asserted against here, but the branch logic it cannot cheaply enumerate is owned by this test.

### Decision 5 — Section auth-guards: assert both redirect legs at the shell level

`FollowingSection` / `FollowersSection` / `BlockedSection` each run two guards before their read: `if (!session?.user?.email) redirect('/')` and `if (!viewer) redirect('/')` (a signed-in email with no resolvable user row). Each is a small render-guard with no clean owning capability.

**Decision:** each section test asserts three legs — (a) `auth()` → `null` throws the `REDIRECT:/` sentinel; (b) `auth()` → a session but `getUserIdByEmail` → `null` throws the `REDIRECT:/` sentinel; (c) a resolved viewer + a stubbed read renders the real `ConnectionsSection` with the correct count, empty-message, and per-row action set (unfollow for Following; remove + block for Followers; unblock for Blocked). The guards are unit-covered, **not elevated** (Decision 6) — they are render-time auth guards, not the action/route authorization `server-endpoint-authorization` owns.

### Decision 6 — No new requirement elevated; non-elevation rationale recorded

The four-audit invariant-elevation obligation is discharged with a **no-elevation** decision, justified per behavior:

- **The three connections sections + per-row actions + since-date** — **already** the `following` *"Owners SHALL view and manage their followers"* and *"Connections page SHALL show a 'since' date"* SHALLs (the three sections with unfollow / remove + block / unblock, and the `created_at` subline). LOCKED by the new tests rendering the real sections/rows/actions; **not** duplicated.
- **The connections-row name display** — **already** the `following` *"Sign-in SHALL capture the user's full name"* SHALL (its connections-row clause). LOCKED by `ConnectionRow` rendering the passed `name`.
- **The profile render + invite-URL prompt + unknown-user 404** — **already** the `following` *"Profile pages SHALL exist at `/u/[id]`"* SHALL. LOCKED by the `ProfilePage` / `ProfileHeaderSection` / `ProfileListsSection` tests.
- **The block cover-story `notFound()`** — **already** the `following` *"Blocks SHALL gate URL access for signed-in blocked viewers"* SHALL (the *"Signed-in blocked user 404s on profile page"* scenario). LOCKED at the unit level by Decision 4's identical-sentinel assertion; **not** duplicated.
- **The section auth-guards and the `ConnectionsActions` success/error branches** — small UI guards / dispatch branches with **no clean owning capability** (`server-endpoint-authorization` owns the *actions/routes*; `following` owns the *product behavior*, which is already LOCKED). Per the three-part elevation test they fail part (c) — a mis-branch is a minor UX wrong-surface, not a data-integrity or privacy invariant — and neither has a natural spec home. **Decision: do not manufacture a SHALL.** Both are fully constrained by the new unit tests; the non-elevation is recorded in `tasks.md`.

The one genuine privacy invariant in scope (the block cover-story) is **already** a `following` SHALL, so it is LOCKED, not re-elevated.

### Decision 7 — `following` `/u/[id]` route-path drift: flag, do not modify

The active `following` *"Profile pages SHALL exist at `/u/[id]`"* requirement (title, prose, and all four scenarios) names the route `/u/[id]`. The **live** route is `app/(main)/user/[id]` (→ `/user/[id]`); the same spec's *"Owner name linkified"* requirement and `ConnectionRow`'s own `Link href={`/user/${userId}`}` both use `/user/{id}`. The spec is internally inconsistent — the prose route string is stale (or the route was renamed `/u` → `/user` without updating that one requirement). The product behavior is unaffected: there is no `/u/[id]` route, and every link target in the codebase uses `/user/[id]`.

**Decision: do not modify** the `following` spec in this unit carve-out. Editing a capability spec's route prose from a test-only carve-out is cross-tier scope creep (the 9.3 Decision 8 "AuthPage stale-prose" precedent — flag, don't touch). Recorded as an audit observation in `tasks.md` recommending the operator reconcile the prose (`/u/[id]` → `/user/[id]`) in the `following` spec at the §7 close-out or a docs follow-up. The new tests assert the **real** `/user/${id}` link target, so they pin the live behavior regardless of the stale prose.

### Decision 8 — One test file per source file, colocated under `__tests__/`

Per `testing-foundation` colocation + the `__tests__/` convention: `app/(main)/settings/connections/__tests__/{page,ConnectionsPage,ConnectionsSection,FollowersSection,FollowingSection,BlockedSection,ConnectionRow,ConnectionsActions}.test.tsx` and `app/(main)/user/[id]/__tests__/{page,ProfilePage,ProfileHeaderSection,ProfileListsSection}.test.tsx`. The two `page.test.tsx` files live in distinct `__tests__/` directories — no collision. Shared Arrange (a `makeSession` / `makeViewer` factory, the `redirect()`/`notFound()` sentinels, the `next/link` mock, a `makeProfile` shape factory) is hoisted into each file's `beforeEach`; a colocated `__tests__/test-helpers.tsx` is extracted per directory only on 3+ reuse (the established threshold) — likely in the connections directory (the three sections share the session/viewer/sentinel Arrange).

## Risks / Trade-offs

- **`notFound()` has no existing sentinel precedent** (only `redirect()` does) → Mitigated by Decision 3: `notFound()` is mocked with the same `vi.hoisted` throw-a-sentinel idiom as `redirect()`, a one-line extension; the cover-story test (Decision 4) asserts the *identical* sentinel for block-vs-absent so the privacy invariant is pinned, not just "a 404".
- **Rendering the real `ProfileHeader` would pull in `FollowButton`'s router/action surface** → Mitigated by mocking the floored `users/ui` siblings (4.2) and asserting forwarded props; the real components keep their own coverage in 4.2, so nothing is left untested.
- **Two `page.tsx` basenames could collide** → Mitigated by colocated `__tests__/` dirs (distinct paths); vitest keys on the full path.
- **Over-elevation (manufacturing a homeless SHALL)** → Avoided by Decision 6's no-elevation call; every behavior is either already a `following` SHALL (LOCKED) or a small guard with no spec home (unit-covered). The rationale is recorded so a reviewer sees the elevation question was answered, not skipped.
- **Editing the stale `/u/[id]` prose would be tempting but out of tier** → Decision 7 flags it for the operator and pins the live `/user/[id]` behavior in the tests; the spec edit belongs to the §7 close-out, not a unit carve-out.
