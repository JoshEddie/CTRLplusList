## Context

Sub-proposal 4.3 of the `test-coverage` initiative — a capability-flow carve-out targeting the `home-digest` capability: the home page (`/`) and its four collapsible rails. The foundation (1.1 spike, 1.2 foundation, 0.1 housekeeping, 2.1 pure-libs), the primitive families, and 4.1 `test-app-frame` are the established precedent. The two-project vitest setup is in place: `.test.tsx` runs under jsdom (RTL), `.test.ts` runs under node (DAL/DB integration). The PGlite DB-under-test harness (`test/helpers/db.ts#bootPglite`) exists and is exercised by `test/helpers/db.test.ts`, but **no DAL function has yet been integration-tested** — `lib/__tests__/` holds only pure tests (`listAccess`, `sqlstate`, `visibility`). This carve-out lands the first DAL-against-PGlite test.

The carve-out has two defining characteristics that shape every decision:

1. **A scope boundary that must be drawn precisely.** Every DAL read the rails consume is a shared, multi-consumer read owned by a more-specific sibling carve-out. The only DAL read this carve-out owns is `getUserIdByEmail` (the one read `HomePage.tsx` itself imports; no sibling names it). The rails' reads — and especially their SQL recency sort — belong to 4.2 / 4.6 / 4.14.

2. **The testing-foundation "DAL SHALL NOT be mocked" rule.** Rails are async server components whose only logic beyond a DAL call is `slice(0, 5)` + `moreCount` + mapping + empty-state. The rule forbids mocking the DAL read, so the rails are integration-tested: seed PGlite, swap the `@/db` connection, invoke the rail, and inspect the returned React element's props. This is rule-faithful (the read runs for real against seeded data) and avoids rendering sibling-owned child components.

Carve-out (per parent `test-coverage` tasks.md §4.3 — "DAL reads powering `app/(main)/HomePage.tsx`, page UI, recency sorting"):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `lib/dal.ts#getUserIdByEmail` | ~13 | React-`cache()`-wrapped `db.select().from(users).where(eq(users.email, …))` → `result[0] \|\| null`, try/catch → null. The only DAL read `HomePage.tsx` imports. | node + PGlite integration (`@/db` connection swapped); **not** gated per-file (see Decision 7) |
| `app/(main)/HomePage.tsx` | 63 | Async server component. `await auth()` → redirect if no email → `await getUserIdByEmail` → redirect if null → renders `<BookmarkMigrationToast>` + four `<CollapsibleRail>` (each wrapping `<Suspense>` + a rail) + three dividers. | node + direct invocation + prop-inspection; `@/lib/auth` + `next/navigation` mocked; `getUserIdByEmail` real vs PGlite |
| `app/(main)/page.tsx` | 13 | Route shell: `<main.container>` + `<Suspense fallback={<LoadingIndicator size="page"/>}>` + `<HomePage/>`. | jsdom + RTL; `./HomePage` mocked to a sync stub |
| `…/rails/MyListsRail.tsx` | 16 | Async. `getListsByUser` → `capRail` → `<ListCardRow lists moreCount seeAllHref emptyMessage>`. | node + invocation + prop-inspection; real read vs PGlite |
| `…/rails/BookmarksRail.tsx` | 25 | Async. `getBookmarkedListsByUser` → `capRail` → bespoke field-mapping → `<ListCardRow showOwner …>`. | node + invocation + prop-inspection; real read vs PGlite |
| `…/rails/FollowingRail.tsx` | 33 | Async. `getFollowingFeedUsers` → `capRail` → empty-branch `<div.list-card-row-empty>` OR `<div.list-card-row>` with mapped `<UserCard>` + conditional `<MoreCard>`. | node + invocation + prop-inspection; real read vs PGlite |
| `…/rails/RecentlyVisitedRail.tsx` | 38 | Async. `getVisitHistoryByUser(userId, {limit:50})` → `capRail` → empty-branch OR mapped `<HistoryCard>` + conditional `<MoreCard>`. | node + invocation + prop-inspection; real read vs PGlite |
| `…/rails/capRail.ts` (NEW) | ~5 | Pure helper extracted from the four rails: `capRail<T>(all, limit=5) → { shown, moreCount }`. | node + pure unit test (no DB) |
| `…/CollapsibleRail.tsx` | 80 | `'use client'`. `useSyncExternalStore`-backed `localStorage` bool (`home.rail.<name>.open`, default open); chevron toggle; conditional body; `<LinkButton variant="link">` See-all. | jsdom + RTL + fireEvent + localStorage |
| `…/BookmarkMigrationToast.tsx` | 48 | `'use client'`. `useSyncExternalStore`-backed dismissed flag (`home.bookmark-migration-toast.dismissed`); SSR snapshot = dismissed (no flash); dismiss button. | jsdom + RTL + fireEvent + localStorage |

Coverage floor: universal `COVERAGE_FLOOR` (98/98/95/100) per `test-housekeeping`. Per-file thresholds added by name in `vitest.config.ts` for every file above **except `lib/dal.ts`** (Decision 7).

Bound by: `testing-foundation` (all requirements verbatim, including the DAL-not-mocked rule and the NextAuth network-boundary allowance); `home-digest` (active, 10 requirements — this carve-out locks the structural/behavioral ones it can isolate, adds one, leaves CSS-layout SHALLs out of unit scope); `button-system` (token-surface link via `LinkButton`, already tested).

## Goals / Non-Goals

**Goals:**

- Land nine colocated test files + `capRail.test.ts` at `COVERAGE_FLOOR` for the executable carve-out files (excluding `lib/dal.ts`).
- Establish the first DAL-against-PGlite integration test (`getUserIdByEmail`) and the reusable `@/db`-connection-swap pattern.
- Extract the duplicated rail capping logic into a pure `capRail` helper and unit-test it.
- Exercise every observable branch — no execute-for-coverage, no tautologies, no snapshot-only.
- Promote `sonarjs/cognitive-complexity` to `error` for the executable carve-out files.
- MODIFY the `home-digest` spec's placeholder `Purpose`; ADD the migration-toast no-flash SHALL.
- Complete the four-audit + invariant-elevation obligations, recording dispositions and three deferred findings.

**Non-Goals:**

- No assertion of the rails' DAL reads' **sort orders** — owned by 4.2 / 4.6 / 4.14. This carve-out asserts the rails' cap/map/empty-state only.
- No coverage of the card primitives `ListCard` / `ListCardRow` / `MoreCard` (4.6), `HistoryCard` (4.14), `UserCard` (4.2 / users), `LoadingIndicator` (3.7), `LinkButton` (3.1). The rails' tests inspect the *props* handed to these children, not their render.
- No gating of `lib/dal.ts` per-file (Decision 7; deferred finding 1).
- No assertion of `home-digest`'s CSS-layout SHALLs (card widths, horizontal scroll, hover) — jsdom computes no layout (Decision 8).
- No fix of the discovered My-Lists sort drift or the Following "public"-vs-FOLLOWERS wording — deferred to the read-owning siblings (deferred findings 2 & 3).
- No e2e (belongs to 6.x).
- No real Google OAuth — `auth()` mocked at the `@/lib/auth` boundary.

## Decisions

### Decision 1: One test file per executable source file, colocated under `__tests__/`.

Nine test files plus `capRail.test.ts`, each colocated under a `__tests__/` directory mirroring its source. Project assignment follows the file's testing need, not its extension convention alone:

- **node project (`.test.ts`):** `getUserIdByEmail`, `HomePage`, the four rails, `capRail`. These need PGlite (DB) and/or async-server-component invocation, neither of which needs a DOM.
- **jsdom project (`.test.tsx`):** `page`, `CollapsibleRail`, `BookmarkMigrationToast`. These render and exercise `localStorage` + events.

**Alternatives considered:** *One mega `home-digest.test.tsx`.* Rejected — destroys per-file coverage attribution. *Render the rails in jsdom with the DAL read mocked.* Rejected — violates the DAL-not-mocked rule and pulls in sibling-owned child components.

### Decision 2: The DAL scope boundary — own `getUserIdByEmail` only; the rails' reads are sibling-owned and integration-exercised, not asserted-for-contract.

`HomePage.tsx` imports exactly one DAL read (`getUserIdByEmail`). The four rails import `getListsByUser`, `getBookmarkedListsByUser`, `getVisitHistoryByUser`, `getFollowingFeedUsers` — each a multi-consumer read whose sort/visibility contract is owned by 4.6 (`getListsByUser`, `getBookmarkedListsByUser`), 4.14 (`getVisitHistoryByUser`), or 4.2 (`getFollowingFeedUsers`, per "DAL `getFollowing*`"). This carve-out:

- **Owns + behavior-tests** `getUserIdByEmail` (no sibling names it; it is the read in `HomePage.tsx`).
- **Exercises** the rails' reads against seeded PGlite (they run for real when the rail is invoked) but **asserts only the rail's own contract** (cap to 5, `moreCount`, field-mapping, empty-state, child props). It does NOT assert the reads' `ORDER BY` results — that double-coverage is the siblings' job.

This mirrors `test-app-frame` Decision/boundary discipline (which disclaimed routes owned by other capabilities). The rule "cross-capability constraints belong in the capability that owns the behavior" applies: the rail-capping behavior belongs to `home-digest`; the read sort belongs to `list-collections` / `visit-history` / `following`.

### Decision 3: Extract `capRail` from the four rails (duplication-audit fix, in-place).

All four rails repeat `const shown = all.slice(0, 5); const moreCount = Math.max(0, all.length - shown.length);` (MyListsRail/BookmarksRail name the slice `lists`/`rows`; Following/RecentlyVisited name it `users`/`rows`). This is identical-by-design logic. Per the duplication-audit obligation (and the repo's standing "extract on sight" convention), it is extracted to a pure generic helper:

```ts
// app/(main)/lists/ui/components/rails/capRail.ts
export function capRail<T>(all: T[], limit = 5): { shown: T[]; moreCount: number } {
  const shown = all.slice(0, limit);
  return { shown, moreCount: Math.max(0, all.length - shown.length) };
}
```

The four rails are refactored to `const { shown, moreCount } = capRail(all);`. This is an in-place refactor within the carve-out (all four rails are in scope). `capRail.test.ts` covers it purely (empty, < limit, = limit, > limit, custom limit); the rail integration tests prove the rails still produce the same `shown`/`moreCount`. Behavior is preserved.

**Alternatives considered:** *Leave the duplication and test each rail's slicing independently.* Rejected — the duplication audit would flag four copies of the same three lines; "extract on sight" is the standing disposition. *Extract into `lib/`.* Rejected — the helper is rail-specific UI glue; it lives next to the rails.

### Decision 4: Async server components are tested by direct invocation + element prop-inspection in the node project (no render).

`HomePage` and the four rails are `async function`s returning a React element tree. They are tested by `const tree = await Rail({ userId });` then asserting on `tree.type` / `tree.props` — **not** by rendering. This:

- Avoids rendering sibling-owned children (`ListCardRow`, `UserCard`, `HistoryCard`, `MoreCard`) — the assertion targets the *props handed to* the child element, which is the rail's actual contract.
- Avoids the React-19-async-server-component render gap in RTL (the same gap `test-app-frame` Decision 4 worked around for `AppMenu`/`Nav`, there via direct invocation + render; here we skip the render entirely since prop-inspection suffices).

For `HomePage`, the returned tree is walked positionally: `tree.props.children` is the array `[<BookmarkMigrationToast/>, <CollapsibleRail name="my-lists"…>, <div.home-rail-divider/>, <CollapsibleRail name="following"…>, …]`. Each `<CollapsibleRail>`'s `children` is a `<Suspense>` whose `children` is the rail element with `userId` set.

**Node-project JSX transform:** importing a `.tsx` source into a `.test.ts` (node project, which has no `react()` plugin) requires vitest's underlying esbuild to transform the JSX in the imported module. If the default transform does not (the `react()` plugin normally provides the automatic runtime), the node project's `test.esbuild` / top-level `esbuild` is set to `{ jsx: 'automatic', jsxImportSource: 'react' }` — a one-line `vitest.config.ts` addition within the carve-out's test-infra authority. This is verified at apply: if direct `.tsx` import + invocation works out of the box, no config change lands.

**Alternatives considered:** *Render the returned tree with RTL.* Rejected — renders sibling-owned children and needs jsdom. *Put these tests in the jsdom project to guarantee the JSX transform.* Acceptable fallback if the node-project transform proves intractable, but the DB-integration rails belong in the node project by the two-project convention; the esbuild-jsx config is the cleaner fix.

### Decision 5: `RecentlyVisitedRail`'s `{ limit: 50 }` over-fetch is asserted as a call argument; the resulting remainder-cap is recorded but NOT elevated.

`RecentlyVisitedRail` calls `getVisitHistoryByUser(userId, { limit: 50 })` — over-fetching so it can show "+N more" while bounding the query. The source comment names it a Stage-2 perf trade-off. The test asserts the rail passes `{ limit: 50 }` (a home-digest-specific behavior, observable as the read's call argument). The consequence — the "+N more" count for this rail is bounded at `50 − 5 = 45`, unlike the other rails which fetch all then slice — is recorded in the invariant-elevation audit as **NOT elevated**: it fails criterion (b) "survives reimplementation" (a reimplementation that issues an exact-count query would change the bound; the 50 is incidental, not a contract).

### Decision 6: ADD one `home-digest` SHALL — the migration toast's pre-hydration no-flash contract.

`BookmarkMigrationToast`'s `useSyncExternalStore` server/initial snapshot returns `true` (dismissed) — the comment reads "SSR: hide to avoid flash before hydration". This is the non-obvious, load-bearing contract: without it, the server would render the toast, then hydration would read a `dismissed` flag and remove it — a flash on every cold load. It passes all three elevation criteria: (a) non-obvious (the `() => true` server snapshot is the opposite of the client default), (b) survives reimplementation (any rewrite must avoid the flash), (c) protects a real UX failure (flash-of-toast). Elevated as an ADDED requirement (the existing toast requirement covers first-render-shows + dismissal-persists; this ADDS the SSR-hide concern without changing them). `CollapsibleRail`'s analogous `() => null` server snapshot is NOT separately elevated — it resolves to the existing "Default state is open" SHALL (null → defaultValue `true` → open), so it is locked by test against an existing requirement, not a new one.

The placeholder `## Purpose` ("TBD - created by archiving add-following-and-history") is replaced with a real statement. Because OpenSpec deltas are requirement-keyed (they apply `## ADDED/MODIFIED Requirements` blocks), the `Purpose` text is updated as a direct edit to the active `openspec/specs/home-digest/spec.md` at apply time (tasks §12), not carried in the delta file.

### Decision 7: Do NOT enumerate `lib/dal.ts` in `vitest.config.ts` per-file thresholds; defer the dal.ts coverage-attribution strategy.

`testing-foundation`'s coverage table intends `lib/dal.ts` floors **per exported function** (80% each). But vitest's `coverage.thresholds` with `perFile: true` gates **per file**. `lib/dal.ts` is 708 lines / ~25 exported functions split across sibling carve-outs (4.2/4.6/4.9/4.11/4.14/…). Adding `'lib/dal.ts': COVERAGE_FLOOR` now would require the *entire file* at 98% — unreachable until every sibling lands. So this carve-out:

- Behavior-tests `getUserIdByEmail` against PGlite (real integration, rule-faithful).
- Does NOT add `lib/dal.ts` to the `thresholds` map (only enumerated files are gated while the parent is in flight, so a non-enumerated `dal.ts` simply isn't gated — consistent with how the initiative ramps).
- Records the gap as **deferred finding 1**: a governance checkbox in `test-coverage/tasks.md` defining the strategy (split `dal.ts` per-capability module / adopt per-function coverage tooling / enumerate `dal.ts` only at governance close-out once all functions are covered).

This is a documented deviation from "enforce floors ONLY on carve-out files" forced by the per-file-vs-per-function gate mismatch — surfaced now because this is the first carve-out to touch `dal.ts`, and every later DAL carve-out hits the same wall.

**Alternatives considered:** *Enumerate `lib/dal.ts` and `/* v8 ignore */` every other function.* Rejected — ignoring ~24 functions to gate one is absurd and would have to be un-ignored by each sibling. *Split `lib/dal.ts` into per-capability modules now.* Rejected — a cross-capability refactor spanning files outside this carve-out; deferred per the audit rule.

### Decision 8: The `home-digest` CSS-layout SHALLs are out of unit-test scope.

The spec's layout requirements (card widths 236/260/190px, horizontal-scroll rows, hover appearance, brand-tinted "+N more" tile) are CSS-level; jsdom computes no layout and CSS is not in the JS coverage report. Same disposition as `test-app-frame` Decision 9 for `app-frame` R4/R5. These remain satisfied-as-archived from `add-following-and-history`; this carve-out asserts only structural/behavioral contracts (composition order, cap counts, collapse state, toast lifecycle, child-prop shape). The "+N more tile renders iff total > 5" *decision* IS asserted (it is the rail's `moreCount > 0` gate, JS-observable as the conditional `<MoreCard>` element) — only its pixel dimensions are out of scope.

### Decision 9: `getUserIdByEmail` integration test wires PGlite by swapping the `@/db` connection.

`getUserIdByEmail` (and the rails' reads) import the module-level `db` from `@/db`, which is the Neon-HTTP client. To run them against PGlite, the test mocks `@/db` so its exported `db` resolves to the PGlite-backed Drizzle client from `bootPglite()`:

```ts
let testDb: Awaited<ReturnType<typeof bootPglite>>['db'];
vi.mock('@/db', () => ({ get db() { return testDb; } }));
beforeEach(async () => { ({ db: testDb } = await bootPglite()); });
```

This swaps only the connection/driver — the DAL function's query logic runs unchanged against the real (PGlite) database — so it satisfies "DAL SHALL NOT be mocked". The seed glue stays inline in the first DB-integration test; per the duplication audit it extracts to `test/helpers/` when the second DAL carve-out needs it (recorded in §10.2 and the testing-foundation Tier-2 delta).

## Risks / Trade-offs

- **First DAL-against-PGlite test + first `@/db` connection swap.** New pattern; the getter-over-mutable-holder mock is the fiddly part. → Mitigation: `bootPglite` already works (`db.test.ts`); only the swap glue is new. If the getter-mock proves unreliable under vitest module caching, fall back to importing the DAL function through a thin re-export that takes `db` — but that is a cross-file change, so the getter-mock is preferred and verified at apply.
- **Node-project JSX transform for `.tsx` import in `.test.ts`.** → Mitigation: `esbuild.jsx = 'automatic'` config addition if needed (Decision 4); jsdom-project fallback if intractable.
- **Scope-boundary disputes.** A reviewer may expect rail-read sort assertions here. → Mitigation: the boundary is stated in the proposal and Decision 2; the sort contracts + the discovered drift are explicitly deferred to the read-owning siblings.
- **`lib/dal.ts` coverage deferral is a real deviation.** → Mitigation: deferred finding 1 + governance checkbox; forced by tooling, not by laziness.
- **My-Lists sort drift (spec `updated_at DESC` vs source `created_at DESC`) is a genuine spec/source contradiction this carve-out discovers but cannot fix** (the read is sibling-owned). → Disposition: deferred finding 2 → 4.6 `test-list-collections`. The rail tests avoid the drift by not asserting sort order.
- **Following "public" vs `FOLLOWERS` visibility wording.** Spec prose says "public lists"; `getFollowingFeedUsers` filters `VISIBILITY.FOLLOWERS`. Likely a vocabulary mismatch, not a behavior bug. → Disposition: deferred finding 3 → 4.2 `test-following`.
- **Prop-inspection brittleness.** Asserting on `tree.props.children[2]` positional structure couples tests to the element order. → Accepted: the composition order IS the contract (the spec mandates "Rails render in order"), so positional assertions are appropriate and the coupling is intentional.
- **Complexity promotion locks the ceiling at 15** for files that are all ≤ ~4 today. → Accepted: comfortable buffer.
