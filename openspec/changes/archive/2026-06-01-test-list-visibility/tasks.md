## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm the node vitest project picks up `**/*.test.ts` and that `lib/__tests__/listAccess.test.ts` runs green at HEAD (the harness this carve-out reuses: pglite boot + `vi.mock('@/db')` getter holder + `vi.mock('next/cache')`).
- [x] 1.2 Confirm `test/helpers/db.ts`'s `bootPglite()` applies the current `db/schema.ts` (so a freshly-booted DB has `lists.visibility`, `lists.shared`, `lists.shared_at` columns).
- [x] 1.3 Spec re-grep against `openspec/specs/list-visibility/spec.md` at HEAD: confirm R2 (shared_at transitions), R5 (legacy-`shared` dual-write), R6 (noindex + name-leak), and R3's "Non-owner submission is rejected" scenario are present and worded as this carve-out's tests will assert. Confirm the ADDED fail-closed re-validation requirement does not overlap or contradict any existing SHALL.
- [x] 1.4 Confirm `setListVisibility` (`app/actions/lists.ts`) and `generateMetadata` (`app/(main)/lists/[id]/page.tsx`) are individually importable. Record (for §5 testability audit) whether `generateMetadata`'s sibling imports (`ListHeroSection`, `ListItemsSection`, `LoadingIndicator`) load cleanly under the node project or require a test-side `vi.mock` of those out-of-carve-out modules (Decision 3). **Finding:** `generateMetadata` imports cleanly under the node project — a probe importing `@/app/(main)/lists/[id]/page` resolved the module and exposed `generateMetadata` as a function with no sibling-component mocks (vitest transforms the sibling `.tsx` imports without dragging in render-only deps). No `vi.mock` of `ListHeroSection`/`ListItemsSection`/`LoadingIndicator` is needed (Decision 3, clean-import path).
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. Confirm `app/actions/lists.ts` and `app/(main)/lists/[id]/page.tsx` are NOT currently in `thresholds` (they remain un-enumerated per Decision 1).

## 2. Write `app/actions/__tests__/lists.setListVisibility.test.ts` (node project; pglite-backed) (post-rebase: merged into `lists.test.ts` — see §9)

### 2A. Harness — pglite, db getter, mocked boundaries

- [x] 2.1 Boot pglite in `beforeAll`; assign to the `vi.hoisted` db holder; `vi.mock('@/db', () => ({ get db() { return holder.current } }))` (mirror `listAccess.test.ts`).
- [x] 2.2 `vi.mock('next/cache', () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }))`; expose the `updateTag` spy for assertions.
- [x] 2.3 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; per-test configure `auth` to resolve a fixture session, `null`, or a session whose email has no `users` row.
- [x] 2.4 Seed in `beforeAll`: an owner user, a non-owner user, and lists owned by the owner in each starting visibility state needed (`private`, `unlisted`, `public`). Reset mutated rows in `beforeEach`/`afterEach` (or seed fresh per-test rows) so transition tests are independent.

### 2B. Authorization — fail-closed, server-resolved actor

- [x] 2.5 `Unauthenticated_ReturnsUnauthorized_RowUnchanged` — `auth()` → `null`; assert `{ success: false, error: 'Unauthorized' }` and the row's `{visibility, shared, shared_at}` unchanged; `updateTag` not called.
- [x] 2.6 `AuthedEmailNoUserRow_ReturnsUnauthorized_RowUnchanged` — `auth()` resolves a session whose email matches no `users` row; assert `error: 'Unauthorized'`, row unchanged.
- [x] 2.7 `AuthedNonOwner_ReturnsForbidden_RowUnchanged` **(R3 scenario)** — owner's list, caller is a different user; assert `{ success: false, error: 'Forbidden' }`, row unchanged, `updateTag` not called.
- [x] 2.8 `NonExistentId_ReturnsNotFound` — valid owner session, unknown `id`; assert `error: 'Not found'`, `updateTag` not called.

### 2C. Fail-closed enum re-validation (ADDED SHALL)

- [x] 2.9 `OutOfEnumValue_ReturnsValidation_RowUnchanged` **Spec delta SHALL** — owner session, `visibility = 'owner'` (a future-canonical string the action must still reject in Stage 1); assert `error: 'Validation'`, row's `{visibility, shared, shared_at}` byte-identical, `updateTag` not called.
- [x] 2.10 `EmptyStringValue_ReturnsValidation` **Spec delta SHALL** — `visibility = ''`; assert `error: 'Validation'`.
- [x] 2.11 `ValidationPrecedesLookup_InvalidValueUnknownId_ReturnsValidationNotNotFound` **Spec delta SHALL** — invalid value AND unknown `id`; assert the returned error is `'Validation'` (not `'Not found'`), proving validation fails closed before the existence lookup.

### 2D. `shared_at` transition state machine (R2) — controlled clock

- [x] 2.12 `PrivateToUnlisted_SetsSharedAtFresh_SharedTrue` — start `private` (`shared_at = null`); set `unlisted`; assert `shared_at` is a fresh timestamp within the captured `Date.now()` bounds, `visibility = 'unlisted'`, `shared = true`.
- [x] 2.13 `PrivateToPublic_SetsSharedAtFresh_SharedTrue` — same from `private` → `public`.
- [x] 2.14 `UnlistedToPublic_PreservesSharedAt_SharedTrue` — start `unlisted` with a known `shared_at = T`; set `public`; assert `shared_at` byte-identical to `T`, `shared = true`.
- [x] 2.15 `PublicToUnlisted_PreservesSharedAt_SharedTrue` — start `public` with `shared_at = T`; set `unlisted`; assert `shared_at === T`, `shared = true`.
- [x] 2.16 `PublicToPrivate_ClearsSharedAt_SharedFalse` — start `public` with `shared_at = T`; set `private`; assert `shared_at = null`, `shared = false`.
- [x] 2.17 `UnlistedToPrivate_ClearsSharedAt_SharedFalse` — same from `unlisted` → `private`.
- [x] 2.18 `PublicPrivatePublicCycle_SecondSharedAtIsFresh` **(R2 "re-sharing gets fresh shared_at")** — `public` (shared_at = T1) → `private` (null) → `public`; advance the clock between the two `public` writes; assert the final `shared_at` is strictly greater than T1.
- [x] 2.19 `PrivateToPrivate_NoSpuriousSharedAt` — start `private` (`shared_at = null`); set `private`; assert `shared_at` stays `null`, `shared = false` (the `goingPrivate` branch on an already-private row is a no-op observable).

### 2E. Success shape + revalidation

- [x] 2.20 `SuccessfulTransition_ReturnsVisibilityUpdated` — a valid owner transition returns `{ success: true, message: 'Visibility updated' }`.
- [x] 2.21 `SuccessfulTransition_CallsUpdateTagListsOnce` — assert `updateTag` was called exactly once with `'lists'` on the success path (and zero times across §2B/§2C failure paths — cross-check).

## 3. Write `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` (node project; pglite-backed)

### 3A. Harness

- [x] 3.1 Reuse the pglite + `vi.mock('@/db')` + `vi.mock('next/cache')` + `vi.mock('@/lib/auth')` harness. If §1.4 found the sibling component imports break under node, add `vi.mock` stubs for `ListHeroSection` / `ListItemsSection` / `@/app/ui/components/LoadingIndicator` (out-of-carve-out UI; Decision 3) and record it in the §5 testability audit.
- [x] 3.2 Seed: an owner user, a non-owner user, and lists owned by the owner in `private`, `unlisted`, `public` states with known `name` values. Helper to call `generateMetadata({ params: Promise.resolve({ id }) })`.

### 3B. Universal noindex (R6)

- [x] 3.3 `PrivateList_RobotsNoindex` — any viewer; assert `robots` deep-equals `{ index: false, follow: false }`.
- [x] 3.4 `UnlistedList_RobotsNoindex` — assert `noindex`.
- [x] 3.5 `PublicList_RobotsNoindex` — assert `noindex` even though full metadata is served.

### 3C. Name-leak matrix (R6)

- [x] 3.6 `PrivateList_AnonymousViewer_GenericTitle_NoOgTwitter` — `auth()` → `null`; assert `title === 'List | ctrl+list'`, `openGraph` and `twitter` are `undefined`.
- [x] 3.7 `PrivateList_AuthedNonOwner_GenericTitle_NoOgTwitter` — non-owner session; assert generic title, no OG/twitter.
- [x] 3.8 `UnlistedList_AuthedNonOwner_GenericTitle_NoOgTwitter` — same for `unlisted`.
- [x] 3.9 `PrivateList_Owner_FullMetadata_StillNoindex` — owner session; assert `title === list.name`, `openGraph.title === list.name`, `twitter` present, `robots` still `noindex`.
- [x] 3.10 `UnlistedList_Owner_FullMetadata_StillNoindex` — same for `unlisted`.
- [x] 3.11 `PublicList_AnonymousViewer_FullMetadata` — `auth()` → `null`; assert full `title`/`openGraph`/`twitter`.
- [x] 3.12 `PublicList_AuthedNonOwner_FullMetadata` — non-owner; assert full metadata.
- [x] 3.13 `PublicList_AuthNeverConsulted` — for a `public` list, assert the `auth` mock recorded zero calls (locks the `isShared` short-circuit that skips the session lookup; a regression that removed it would over-fetch and could leak).

### 3D. Fail-closed fallbacks (R6)

- [x] 3.14 `UnknownId_GetListReturnsNull_GenericTitleNoindex_NoOgTwitter` — `id` that resolves to no list; assert generic title, `noindex`, no OG/twitter.
- [x] 3.15 `GetListThrows_GenericTitleNoindex_NoOgTwitter` — force `getList` to throw (e.g. seed a row whose `visibility` decode would throw, or a DB error path) ; assert the `catch` returns generic title + `noindex` + no OG/twitter.

## 4. Invariant-elevation audit (record in this section)

- [x] 4.1 **ELEVATED** — `setListVisibility` fail-closed re-validation: added as a `### Requirement` to `openspec/specs/list-visibility/spec.md`. Rationale: non-obvious (the typed signature hides the network-boundary re-validation), survives reimplementation, protects a privacy-data-integrity failure mode. Locked by §2.9–§2.11.
- [x] 4.2 **NOT ELEVATED (already specced)** — shared_at transitions (R2), legacy-`shared` dual-write (R5), non-owner rejection (R3), universal noindex + name-leak suppression + fail-closed fallback (R6). Each is an existing SHALL with scenarios; the tests assert against them. Re-adding would duplicate.
- [x] 4.3 **NOT ELEVATED (trivial/derivable)** — the success-message string, the specific error-code strings (`'Unauthorized'`/`'Forbidden'`/`'Not found'`/`'Validation'`), and the `updateTag('lists')` revalidation. Response shapes and the cross-cutting data-freshness rule, not visibility-specific privacy invariants; tested but not elevated to `list-visibility`.

## 5. Four audits (record findings + dispositions BEFORE coverage validation)

- [x] 5.1 **Duplication audit** (carve-out source) — `setListVisibility` and `generateMetadata` share no logic; both reuse the standard `auth()` + `users.findFirst({ where: eq(users.email, ...) })` actor-resolution idiom seen across `app/actions/lists.ts`. Disposition: NOT extracted here (the idiom spans functions owned by §4.9/§4.14; extraction would be a cross-file/cross-owner refactor → defer). Record.
- [x] 5.2 **Duplication audit** (test setup) — the pglite boot + `vi.mock('@/db')` + `vi.mock('next/cache')` + `vi.mock('@/lib/auth')` + seed harness is reused across §2 and §3 (and already exists in `lib/__tests__/listAccess.test.ts`). Disposition: if both files plus `listAccess.test.ts` would copy the same boot/seed, extract a shared helper to `test/helpers/` (per testing-foundation's "two or more files → extract" rule); otherwise keep inline. Record which.
- [x] 5.3 **Complexity audit** (carve-out source) — measure `setListVisibility` (expected ≈ 4–5: auth guard + safeParse + owner check + the three-way `sharedAtUpdate`) and `generateMetadata` (expected ≈ 5–6: try/catch + null guard + isShared + isOwner + showFullMetadata). Both expected < 15. Record measured values. (No `eslint.config.mjs` error-promotion is added for these multi-owner files — Decision 1.)
- [x] 5.4 **Testability audit** (carve-out source) — record: (a) whether `generateMetadata` imported cleanly under the node project or needed sibling-module mocks (Decision 3); (b) that `@/lib/auth` is the only mocked internal boundary (the NextAuth network boundary), DAL runs real against pglite; (c) the multi-owner-file enumeration gap (Decision 1) — note it as a foundation/orientation finding and confirm `CLAUDE.md` / the testing-foundation orientation is flagged (see §6). No source refactor performed; any that were needed would defer (cross-file).
- [x] 5.5 **Assertion audit** (new test files) — for every test in §2 and §3, record in one sentence the observable property asserted (returned object shape, persisted `{visibility, shared, shared_at}` triple read back from pglite, `updateTag` spy call, `auth` spy non-call, `robots`/`title`/`openGraph`/`twitter` fields). Confirm no test asserts only `toBeDefined()`/`toBeTruthy()` on a value the test constructed; confirm timestamp assertions use captured-bounds / `vi.setSystemTime`, never `toBeDefined()`. Fix any substance failure in-place.
- [x] 5.6 Disposition log — every finding from §5.1–§5.5 marked fixed-in-place or deferred-as-new-sub-proposal (audits 1–3 only). No TODO-comment dispositions.

### Recorded audit findings

- **5.1 (source duplication):** `setListVisibility` and `generateMetadata` share no logic. Both rely on the `auth()` + `users.findFirst({ where: eq(users.email, …) })` actor-resolution idiom (also in `createList`/`updateList`/`deleteList`/`setListItems` and the `authedUserId()` helper) — but that idiom spans functions owned by §4.9/§4.14, so any extraction is a cross-file/cross-owner refactor. **Disposition: deferred** (out of carve-out; not extracted here).
- **5.2 (test-setup duplication):** the boot/seed harness is shared, not copied. Both new files reuse `bootPglite` (`test/helpers/db.ts`), `mockNextCache()` (`test/helpers/next-cache.ts`), `seedUsers`, and a new shared `seedList` helper added to `test/helpers/seedFollowGraph.ts` (the established home of `seedUsers`/`seedPublicList`, consumed by 9 other test files). **Disposition: extracted in-place** — `seedList` is the shared list-seeding helper. The per-file `vi.hoisted` db holder + `vi.mock('@/db')`/`vi.mock('@/lib/auth')` wiring and the 3-line session-fixture helpers (`asOwner`/`asNonOwner`/`noSession`) are kept inline because `vi.mock` is hoisted per-module and cannot be relocated to a helper — this mirrors the established `app/actions/__tests__/follows.test.ts` precedent exactly. `seedPublicList` is left intact (4 existing consumers) rather than re-pointed at `seedList`, a trivial micro-refactor deferred to avoid churning unrelated tests.
- **5.3 (complexity):** measured via `eslint --rule '{"sonarjs/cognitive-complexity":["warn",1]}'`. `setListVisibility` = **9**; `generateMetadata` = **6**. Both well under 15. No `eslint.config.mjs` error-promotion added for either multi-owner file (Decision 1). (For reference the file's pre-existing over-15 function is `updatePriority` = 16, a §4.9-owned sibling this carve-out does not touch.)
- **5.4 (testability):** (a) `generateMetadata` imports cleanly under the node project — no sibling-component (`ListHeroSection`/`ListItemsSection`/`LoadingIndicator`) mocks needed (Decision 3, clean-import path; see §1.4). (b) `@/lib/auth`'s `auth()` is the only mocked internal boundary (the NextAuth network boundary); the DAL (`getList`, `getUserIdByEmail`) and the action's DB writes run real against pglite. (c) The multi-owner-file enumeration gap (Decision 1) is a foundation/orientation finding, surfaced in §6.3; no source refactor performed.
- **5.5 (assertion substance):** every test asserts a concrete observable — `setListVisibility`: the returned `{success,error}`/`{success,message}` object plus the `{visibility, shared, shared_at}` triple read back from pglite, and `updateTag` spy call count/args; `generateMetadata`: exact `title`/`openGraph.title`/`twitter.title` strings, `robots` deep-equal to `{index:false,follow:false}`, `openGraph`/`twitter` `toBeUndefined()` for suppressed cases, and `auth` spy non-call. Timestamp freshness uses captured `Date.now()` bounds (and a strict `> T1` for the re-share cycle), never `toBeDefined()`. The owner/public "full metadata" tests were strengthened from `expect(twitter).toBeDefined()` to `expect(twitter?.title).toBe(<name>)` so no assertion rests on bare presence. No substance failures remain.

## 6. Spec + convention housekeeping

- [x] 6.1 Confirm `openspec/specs/list-visibility/spec.md` will receive the ADDED fail-closed re-validation requirement on archive (the delta at `specs/list-visibility/spec.md`).
- [x] 6.2 Confirm the Tier-2 `testing-foundation` delta (`specs/testing-foundation/spec.md`) records: the two functions tested at behavioral-contract level; the deferred-enumeration convention for multi-owner files (naming §4.9/§4.14 for `app/actions/lists.ts` and the list-page render carve-out for `page.tsx`); and the §4.13 authorization dual-ownership note. Confirm it does NOT touch the active `testing-foundation` spec or the parent accumulator.
- [x] 6.3 Surface the multi-owner-file coverage-floor gap (Decision 1) to `CLAUDE.md` / the testing-foundation orientation as a convention worth documenting initiative-wide (the orientation file invites this). Record the suggestion; do not edit unrelated docs without owner sign-off.

### Recorded housekeeping findings

- **6.1:** the ADDED fail-closed re-validation requirement lives at `openspec/changes/test-list-visibility/specs/list-visibility/spec.md` (one `### Requirement` with two scenarios). It applies to the active `openspec/specs/list-visibility/spec.md` on archive and does not overlap or contradict R1–R6 (it governs argument validation, a surface none of R1–R6 address). Locked by §2.9–§2.11.
- **6.2:** the Tier-2 `testing-foundation` delta at `openspec/changes/test-list-visibility/specs/testing-foundation/spec.md` records the two functions tested at behavioral-contract level, the deferred-enumeration convention (naming §4.9/§4.14 for `app/actions/lists.ts` and the list-page render carve-out for `page.tsx`), and the §4.13 authorization dual-ownership note. It does not modify the active `openspec/specs/testing-foundation/spec.md` and does not roll into the parent `test-coverage` accumulator.
- **6.3 (suggestion, not applied):** the multi-owner-file coverage-floor gap is worth a one-line note in `CLAUDE.md`'s testing section or the testing-foundation orientation — namely that a file co-owned by multiple sub-proposals is enumerated in `vitest.config.ts` `thresholds` / promoted to `sonarjs/cognitive-complexity = error` only by the sub-proposal that lands its *last* coverage slice (until then its functions are locked by their tests + capability SHALLs, not by the per-file floor). **Not edited here** — deferred to owner sign-off per the task's guardrail; the convention is already durably captured in this change's Tier-2 `testing-foundation` delta.

## 7. Coverage validation (carve-out files only)

- [x] 7.1 Run `npm run test:coverage`; confirm `setListVisibility` and `generateMetadata` are fully exercised (every branch in §2D's state machine and §3C's matrix hit). Because the two files are NOT enumerated in `vitest.config.ts` `thresholds` (Decision 1), the gate does not numerically enforce them here; record the per-function line/branch coverage from the report as evidence the behavioral contract is fully covered. **Finding:** scoped v8 coverage (text reporter, `--coverage.include` per source file). `setListVisibility` (`app/actions/lists.ts` lines 266–349): every line covered including the `catch` (the only post-contract gap was the generic `catch` at 342–353, now locked by the added `UpdateThrows_ReturnsFailed-NoUpdateTag` test; remaining file-level uncovered lines `41–256,354–793` are the §4.9/§4.14-owned sibling functions). `generateMetadata` (`app/(main)/lists/[id]/page.tsx` lines 18–76): **100% branch**, all lines covered; the file's only uncovered line (79) is inside the sibling `ListPage` render export, owned by the list-page render carve-out, not this one. Both carve-out functions are fully exercised.
- [x] 7.2 Confirm no unrelated file's coverage regressed and no new `vitest.config.ts`/`eslint.config.mjs` entry was added for the two multi-owner files.

## 8. Pre-merge (four gates)

- [x] 8.1 `npm run lint` passes with zero errors and zero warnings (including `vitest/expect-expect` and the tautology rules on the two new files). **Finding:** `eslint .` exits 0 with 0 errors. The two new test files + `test/helpers/seedFollowGraph.ts` lint completely clean (zero errors, zero warnings). The 8 project-wide warnings are all pre-existing `sonarjs/cognitive-complexity` notes on files this carve-out does not touch (`updatePriority` in `app/actions/lists.ts` = 16, owned by §4.9; `scripts/seed-dev-users.ts`; etc.) — none introduced here, and per Decision 1 the multi-owner `lists.ts` is not error-promoted.
- [x] 8.2 `npx tsc --noEmit` passes with zero errors.
- [x] 8.3 `npm run build` completes successfully. **Finding:** build completes successfully (`Compiled successfully`, all routes generated, exit 0) when a `DATABASE_URL` is present. This worktree's gitignored `.env.local` omits `DATABASE_URL`, so a bare `npm run build` fails at the post-compile page-data-collection step for `/api/image-search` (`neon()` requires a connection string) — a pre-existing environment-config condition independent of this change (which is test-only and not in the build graph). Re-running with a placeholder `DATABASE_URL` set builds cleanly.
- [x] 8.4 `npm test` passes (both new node-project files green). **Finding:** full suite green — 1084 passed, 0 failed (after switching both files to the spec'd `beforeAll`-boot + `beforeEach`-reset harness per tasks 2.1/2.4, which removed the per-test pglite-boot pressure that was causing hook-timeout flakiness across the whole DB-integration cohort).

## 9. Post-rebase reconciliation onto `dev`

This sub-proposal was rebased onto `dev` after sibling carve-outs landed. The git rebase was conflict-free, but `dev` had advanced in ways that overlap this carve-out; the resolutions below supersede the pre-rebase assumptions recorded in §1.5, §2, §5.2, §5.3, §6.2, §6.3 and §7 (Decision 1 "not enumerated" premise).

- **`setListVisibility` already covered on `dev` → tests merged, standalone file deleted.** §4.9 `test-list-item-management` landed `app/actions/__tests__/lists.test.ts` with its own (weaker) `setListVisibility` block and enumerated `app/actions/lists.ts` in `vitest.config.ts` `thresholds`. Per the chosen reconciliation, this carve-out's more-rigorous superset was **merged into the `setListVisibility` block of `lists.test.ts`** (replacing the weaker tests — adds row-unchanged assertions, empty-string + validation-precedes-lookup, the full transition state machine incl. the re-share freshness cycle and the private→private no-op, and the update-throws fail path). The standalone `app/actions/__tests__/lists.setListVisibility.test.ts` was **deleted**.
- **`app/actions/lists.ts` is now enumerated (by §4.9), realizing the deferred-enumeration convention.** Decision 1's premise (file not yet enumerable because slices were outstanding) is resolved: §4.9 was the enumerating sub-proposal. This carve-out adds **no** `vitest.config.ts` / `eslint.config.mjs` entry for `lists.ts`; the merged tests keep `setListVisibility` at the floor inside the now-enumerated file. `app/(main)/lists/[id]/page.tsx` remains **un-enumerated** (still deferred to the list-page render carve-out) — §7.2 still holds for `page.tsx`.
- **`seedList` duplication avoided.** §4.9 introduced a richer `seedList` in `app/actions/__tests__/test-helpers.ts`. The pre-rebase `seedList` this carve-out had added to `test/helpers/seedFollowGraph.ts` was **reverted** (that file is now zero-diff vs `dev`); both the merged `lists.test.ts` block and the standalone `page.generateMetadata.test.ts` consume the single canonical `test-helpers.seedList`. (§5.2 disposition updated: single shared helper, no new duplicate.)
- **`generateMetadata` remains this carve-out's sole standalone test** — `page.tsx` was untouched on `dev` and has no other test, so `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` stands as written (now importing `seedList` from `@/app/actions/__tests__/test-helpers`).
- **Spec deltas:** the `list-visibility` ADDED fail-closed re-validation requirement is unchanged and still valid (now locked by the merged `lists.test.ts` block). The Tier-2 `testing-foundation` delta was rewritten to describe the merged reality (setListVisibility tests live in `lists.test.ts`; `lists.ts` enumerated by §4.9; `page.tsx` enumeration still deferred).
- **Gates re-verified post-merge:** `tsc --noEmit` clean; `eslint` clean on changed files; `lists.test.ts` + `page.generateMetadata.test.ts` = 92 tests green.
