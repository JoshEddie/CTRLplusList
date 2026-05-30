## Context

Sub-proposal 2.1 of the `test-coverage` initiative. The `testing-foundation` capability is established (`test-foundation` and `test-foundation-spike` archived; runner = vitest 4.1.7, DB = pglite 0.4.6, helpers at `test/helpers/db.ts` + `lib/sqlstate.ts` + `test/helpers/next-cache.ts`, CI in place, lint plugins active). This change is the first sub-proposal to exercise that foundation against real source.

Carve-out (per parent `test-coverage` tasks.md §2.1):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `lib/visibility.ts` | 90 | Pure functions over strings; no I/O | Pure unit test |
| `lib/listAccess.ts` | 91 | Imports `db`, `next/navigation`, `./dal` | Integration test against pglite + `redirect`-mock |
| `lib/types.ts` | 102 | Type-only declarations | Excluded — no runtime surface |
| `hooks/use-media-query.ts` | 21 | Client hook using `useSyncExternalStore` + `window.matchMedia` | jsdom test with `matchMedia` stub |
| `app/ui/components/button/buttonClasses.ts` | 15 | Pure string-composition function | Pure unit test |

Coverage floor: 95% per file (`testing-foundation` Pure-logic class). `lib/types.ts` is excluded as type-only (no executable statements after TS erasure) — the parent issue's "zod validators" reference is stale; the file holds only `type` and `interface` declarations.

Bound by:
- `testing-foundation` (test layout, mocking rules, no-real-network, four-audit, assertion-substance bar, complexity ≤ 15)
- `list-visibility` (private/unlisted/public semantics — `lib/visibility.ts` decoder + `lib/listAccess.ts` predicate enforce these)
- `server-endpoint-authorization` (item-claim gating uses `isItemViewable`)
- `button-system` (`buttonClasses` is the spec's class-composition single-source-of-truth)

## Goals / Non-Goals

**Goals:**

- Land four colocated test files at 95%+ per-file coverage for the four runtime files in the carve-out.
- Exercise every observable branch of each function — no execute-for-coverage calls, no tautological assertions.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for the four carve-out files via `eslint.config.mjs` `overrides`.
- Use only the canonical foundation helpers (`bootPglite`, `sqlstateOf`, `mockNextCache`). Define zero new helpers in `test/helpers/`.
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) and record dispositions in `tasks.md`.

**Non-Goals:**

- No new requirements on `list-visibility`, `server-endpoint-authorization`, or `button-system`. Those specs are already authoritative; this change exercises them, not extends them.
- No source refactors anticipated. Refactor authority exists per parent governance but micro-findings (rename, extract) are the only realistic ones given file sizes.
- No coverage of `lib/dal.ts` — that's its own future sub-proposal at the 80%-per-function floor.
- No coverage of any Button component (`Button.tsx`, `LinkButton.tsx`) — those belong to `test-button-system` (3.1). This sub-proposal covers only the `buttonClasses.ts` helper, by explicit parent carve-out.
- No E2E. The carve-out is pure-libs and one client hook; E2E belongs to 6.1 / 6.2.

## Decisions

### Decision 1: Test `lib/listAccess.ts` as an integration test against pglite, not a unit test with mocked DAL.

`isItemViewable` and `guardListViewable` are not "pure" — they read `db.query.items`, `db.select().from(list_items)`, `db.select().from(lists)`, and call `isBlocked` / `isFollowing` from `./dal`. The `testing-foundation` spec is unambiguous: "Internal modules — DAL functions, server actions, `lib/`, hooks — SHALL NOT be mocked when their dependencies are local; integration tests SHALL exercise them against the real test database." So `isBlocked`, `isFollowing`, and every drizzle query stay real; pglite is the substrate.

**What we DO mock:** `next/navigation`'s `redirect` — it throws a sentinel in Next runtime to interrupt rendering. In a unit test environment we want to *observe* the navigation target without unwinding the test, so we `vi.mock('next/navigation', ...)` with `redirect: vi.fn()` and assert `expect(redirect).toHaveBeenCalledWith('/lists' | '/')`.

**Alternatives considered:**

- *Mock the DAL.* Rejected — violates the testing-foundation rule above, and would replicate `isBlocked` / `isFollowing` semantics in two places (test mock + production), inviting drift.
- *Stub `db` with a plain object.* Same rejection — drizzle query shape is non-trivial; a hand-rolled stub would test the stub, not the real query path.
- *Use the existing Neon connection.* Rejected — tests must not hit a real DB per the foundation; pglite is the substrate.

### Decision 2: `lib/types.ts` is excluded from coverage enforcement as type-only.

The file contains zero executable statements after TS erasure. Per `testing-foundation`'s exclusion list ("`*.d.ts`; generated drizzle artifacts; `app/sw.ts`; `app/manifest.ts`; test files themselves; layout files without branching logic"), informationally-excluded files don't gate. `lib/types.ts` is the same class as `*.d.ts` semantically. We add it to the `coverage.exclude` patterns in `vitest.config.ts` so the report is unambiguous, and we document the parent-issue wording mismatch (issue #31 says "zod validators"; the file is pure types) in this change's `proposal.md` and `tasks.md` audit section.

**Alternative considered:** *Write a "test" that imports the types to prove they compile.* Rejected — compilation is already proven by `tsc --noEmit` in the four-gate pre-merge; this would be an execute-for-coverage call by definition.

### Decision 3: `hooks/use-media-query.ts` is tested via jsdom + stubbed `window.matchMedia`, not RTL `renderHook`.

The hook calls `useSyncExternalStore` directly. jsdom does not implement `matchMedia` natively, so the test SHALL stub it before each test using `vi.stubGlobal('matchMedia', ...)` (or `window.matchMedia = vi.fn(...)`). The stub returns a `MediaQueryList`-shaped object with `matches`, `addEventListener`, `removeEventListener` we can inspect.

We DO use `@testing-library/react`'s `renderHook` to drive the hook through React's lifecycle (mount → subscribe, unmount → unsubscribe, query change → re-subscribe). The `getServerSnapshot` branch (returns `false`) is exercised by importing the hook in a Node-environment test file (`hooks/use-media-query.server.test.ts`) — but the foundation's `environmentMatchGlobs` routes `*.test.tsx` to jsdom and `*.test.ts` to node. So the file naming matters:

- `hooks/use-media-query.test.tsx` — jsdom — covers `subscribe` (with and without `window`), `getSnapshot`, change-event dispatch, unsubscribe on unmount, re-subscribe on query change.
- The `typeof window === 'undefined'` branch in `subscribe` is reachable from jsdom by temporarily setting `globalThis.window = undefined` inside one test — simpler than maintaining a parallel node-environment file. The `getServerSnapshot` literal `() => false` is asserted by reading the hook's third argument to `useSyncExternalStore` indirectly: render the hook with a stubbed `matchMedia` that returns `matches: true`, confirm output is `true` on client; assert the third-argument fn is `() => false` by extracting it via spy. If that proves awkward, fall back to a parallel `.test.ts` (node env) file — both routes meet the coverage floor.

**Alternative considered:** *Skip the SSR branch.* Rejected — the hook ships with `'use client'` but Next still calls `getServerSnapshot` on initial hydration; the branch is load-bearing and trivially testable.

### Decision 4: `buttonClasses` tests assert the literal output string, not via DOM render.

The function returns a `string`. There's no DOM, no React, no css-modules indirection — just `Array.filter(Boolean).join(' ')` over four inputs. Tests SHALL assert the exact returned string for the matrix:

- variants: `'primary' | 'secondary' | 'tertiary' | 'destructive' | 'on-dark' | ...` (whatever `ButtonVariant` admits — read from `./types`).
- sizes: `'sm' | 'md'` (default `'md'`).
- extra: `undefined`, `''`, `'a-class'`, `'a-class b-class'`.

Combinatorial coverage is small (≤ ~30 cases); each case is a single `expect(buttonClasses(...)).toBe('expected literal')`. No snapshot; literal strings are authored from the function definition.

**Spec divergence note (audit candidate):** `button-system` spec mentions `buttonClasses({ variant, size, pressed, extra })` (line 158); the actual signature is `{ variant, size, extra }`. `pressed` is a component-level prop (translates to `aria-pressed`) that does not affect class composition. This is a spec-vs-code divergence that the assertion audit will surface; disposition is "fix spec wording in a sibling change OR record as resolved via tests proving the actual surface" — decided at audit time. The test SHALL test what `buttonClasses` actually does, not what the spec line says.

### Decision 5: `visibility.ts` tests cover both legacy and future-canonical decoding, including the intentional dead code.

The file is mid-rollout (Stage 1 of 3 — see file header). The future-canonical branches in `fromDb` (`'owner' | 'link' | 'followers'`) are intentional dead code that SHALL stay covered so Stage 2 (string-flip) doesn't surprise CI. Tests:

- `fromDb('private')` → `VISIBILITY.OWNER`
- `fromDb('unlisted')` → `VISIBILITY.LINK`
- `fromDb('public')` → `VISIBILITY.FOLLOWERS`
- `fromDb('owner')` → `VISIBILITY.OWNER` (future-canonical)
- `fromDb('link')` → `VISIBILITY.LINK` (future-canonical)
- `fromDb('followers')` → `VISIBILITY.FOLLOWERS` (future-canonical)
- `fromDb('garbage')` → throws `Error` whose message includes `JSON.stringify('garbage')` (the actual format)
- `fromDb('')` → throws (empty-string edge)

`visibilityDbValues`:

- Single value: `[VISIBILITY.OWNER]` → returns `['private', 'owner']` (legacy + canonical, in that order — observable from `Object.entries` iteration order, which is insertion-ordered per ES2015+).
- Multi value: `[VISIBILITY.LINK, VISIBILITY.FOLLOWERS]` → returns `['unlisted', 'link', 'public', 'followers']`.
- Empty input: `[]` → returns `[]`.
- Duplicate input: `[VISIBILITY.OWNER, VISIBILITY.OWNER]` → returns `['private', 'owner', 'private', 'owner']` (current behavior — the function does not dedupe, and the upstream `inArray` filter is dedup-tolerant). The test SHALL assert the actual behavior (no dedupe) and add a one-line comment naming this as an intentional contract observation, not a normative requirement.

### Decision 6: `listAccess.ts` tests use the foundation seed's three pre-staged entities, not custom seed.

`test-foundation` extended `scripts/seed-dev-users.ts` with one friend-owned OWNER list, one friend-owned LINK list, and a new friend `kim` owning a FOLLOWERS list with no `list_visits` row for `dev-test-viewer`. These cover four of the five viewability axes; the fifth (blocked viewer) is constructible at test setup by inserting a `blocks` row against the seed via direct drizzle insert in the test `beforeAll`.

**Cases to cover for `isItemViewable(itemId, viewerId)`:**

| Item context | viewerId | Expected | Source |
|---|---|---|---|
| Item on OWNER list owned by `friend-a` | `dev-test-viewer` | `false` | Seed |
| Item on OWNER list owned by `dev-test-viewer` | `dev-test-viewer` | `true` (owner short-circuit) | Seed |
| Item on OWNER list owned by `friend-a` | `friend-a` | `true` (owner via item.user_id branch) | Seed |
| Item on LINK list owned by `friend-b` | anonymous (null) | `true` (link is anyone-with-url) | Seed |
| Item on LINK list owned by `friend-b` | `dev-test-viewer` | `true` | Seed |
| Item on FOLLOWERS list owned by `kim` | `dev-test-viewer` (not following kim) | `false` | Seed |
| Item on FOLLOWERS list owned by `alice` | `dev-test-viewer` (mutual follow per seed) | `true` | Seed |
| Item on FOLLOWERS list owned by `alice` | anonymous (null) | `false` (anonymous never follows) | Seed |
| Item on any list owned by `friend-c` who blocked `dev-test-viewer` | `dev-test-viewer` | `false` (block trumps everything) | Test setup inserts `blocks` row |
| Item on multiple lists (one OWNER, one FOLLOWERS), viewer follows owner of FOLLOWERS | `dev-test-viewer` | `true` (returns on first satisfying list) | Test setup adds item to second list |
| Item not on any list, viewer is item owner | item owner | `true` (owner short-circuit) | Seed |
| Item not on any list, viewer is anonymous | null | `false` (memberships.length === 0 branch) | Seed |
| `itemId` does not exist | any | `false` (item-not-found branch) | Test uses a random uuid |

**Cases for `guardListViewable(list, viewerId)`:**

| Input | Expected |
|---|---|
| `list = null`, `viewerId = 'dev-test-viewer'` | `redirect('/lists')` was called |
| `list = null`, `viewerId = null` | `redirect('/')` was called |
| `list = { user_id: friend-c }`, `friend-c` has blocked `dev-test-viewer` | `redirect('/lists')` was called |
| Happy path: `list = { user_id: friend-a }`, no block, viewerId = `dev-test-viewer` | returns the `list` argument verbatim |
| Happy path: anonymous viewer (`viewerId = null`) on any non-null list | returns the `list` argument (no block check because there's no viewer to block) |

The `redirect`-mock is the existing pattern documented in the `testing-foundation` rules: production code calls `redirect(...)`, the mock records the call without throwing, and the test asserts on the mock's argument. Because `redirect` throws in real Next, production callers do not have code after it — the test's mock returning `undefined` is fine; the production behavior under test is "what URL would have been navigated to."

### Decision 7: One pglite instance per test file (foundation default), not per test.

`bootPglite()` per the foundation contract gives each `*.test.ts` its own pglite. Inside the file, tests can mutate state if they own that state (e.g., the block test inserts a `blocks` row). Tests share the seed read, so each test's input is the deterministic seed. If two tests in the same file need contradicting setups, the second SHALL clean up after itself (or the test author SHALL split into separate files — but the carve-out is small enough this should not arise).

## Risks / Trade-offs

- **Seed drift.** If a future change to `scripts/seed-dev-users.ts` removes one of the pre-staged entities, the `listAccess` tests break. → Mitigation: the seed carries the testing-foundation header declaring it versioned-as-fixture, so the change author is on notice. The test SHALL `expect` against the seeded entity by canonical name (e.g., `'friend-b'`, `'kim'`) so the failure message names the missing entity precisely.
- **Server-snapshot branch of `useMediaQuery` is awkward to test from jsdom.** → Mitigation: Decision 3 lays out two paths (transient `globalThis.window` unset, or parallel node-env file). Both work; pick whichever passes lint and reads cleaner.
- **Spec-vs-code divergence in `button-system` (`pressed` argument).** → Mitigation: surfaced in Decision 4 as an audit finding; disposition decided in the assertion audit task (likely "spec wording fix sibling change," since `pressed` is genuinely component-level). Does NOT block this change.
- **Coverage tool counting type-only file as 0/0.** Some coverage tools report `0/0` as `100%` and some as `NaN`. → Mitigation: explicit `coverage.exclude` entry for `lib/types.ts` removes ambiguity.
- **Cognitive-complexity promotion locks the ceiling.** A future change that grows `isItemViewable` to 16 will fail lint on the carve-out files specifically. → Mitigation: this is the intended behavior per the testing-foundation spec. If a future change legitimately needs the ceiling raised, it adds a per-line disable comment with reason, or splits the function — both acceptable.
- **The carve-out is the first non-foundation test work landing.** If a foundation defect surfaces (e.g., `bootPglite` doesn't replay a migration in correct order, or `mockNextCache` is missing a method), this sub-proposal hits it first. → Mitigation: report the defect upstream as a foundation patch (small follow-up change to `testing-foundation`), not as carve-out code. Do NOT inline a workaround.
