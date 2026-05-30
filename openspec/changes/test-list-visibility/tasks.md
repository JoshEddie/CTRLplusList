## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm the node vitest project picks up `**/*.test.ts` and that `lib/__tests__/listAccess.test.ts` runs green at HEAD (the harness this carve-out reuses: pglite boot + `vi.mock('@/db')` getter holder + `vi.mock('next/cache')`).
- [ ] 1.2 Confirm `test/helpers/db.ts`'s `bootPglite()` applies the current `db/schema.ts` (so a freshly-booted DB has `lists.visibility`, `lists.shared`, `lists.shared_at` columns).
- [ ] 1.3 Spec re-grep against `openspec/specs/list-visibility/spec.md` at HEAD: confirm R2 (shared_at transitions), R5 (legacy-`shared` dual-write), R6 (noindex + name-leak), and R3's "Non-owner submission is rejected" scenario are present and worded as this carve-out's tests will assert. Confirm the ADDED fail-closed re-validation requirement does not overlap or contradict any existing SHALL.
- [ ] 1.4 Confirm `setListVisibility` (`app/actions/lists.ts`) and `generateMetadata` (`app/(main)/lists/[id]/page.tsx`) are individually importable. Record (for §5 testability audit) whether `generateMetadata`'s sibling imports (`ListHeroSection`, `ListItemsSection`, `LoadingIndicator`) load cleanly under the node project or require a test-side `vi.mock` of those out-of-carve-out modules (Decision 3).
- [ ] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. Confirm `app/actions/lists.ts` and `app/(main)/lists/[id]/page.tsx` are NOT currently in `thresholds` (they remain un-enumerated per Decision 1).

## 2. Write `app/actions/__tests__/lists.setListVisibility.test.ts` (node project; pglite-backed)

### 2A. Harness — pglite, db getter, mocked boundaries

- [ ] 2.1 Boot pglite in `beforeAll`; assign to the `vi.hoisted` db holder; `vi.mock('@/db', () => ({ get db() { return holder.current } }))` (mirror `listAccess.test.ts`).
- [ ] 2.2 `vi.mock('next/cache', () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }))`; expose the `updateTag` spy for assertions.
- [ ] 2.3 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; per-test configure `auth` to resolve a fixture session, `null`, or a session whose email has no `users` row.
- [ ] 2.4 Seed in `beforeAll`: an owner user, a non-owner user, and lists owned by the owner in each starting visibility state needed (`private`, `unlisted`, `public`). Reset mutated rows in `beforeEach`/`afterEach` (or seed fresh per-test rows) so transition tests are independent.

### 2B. Authorization — fail-closed, server-resolved actor

- [ ] 2.5 `Unauthenticated_ReturnsUnauthorized_RowUnchanged` — `auth()` → `null`; assert `{ success: false, error: 'Unauthorized' }` and the row's `{visibility, shared, shared_at}` unchanged; `updateTag` not called.
- [ ] 2.6 `AuthedEmailNoUserRow_ReturnsUnauthorized_RowUnchanged` — `auth()` resolves a session whose email matches no `users` row; assert `error: 'Unauthorized'`, row unchanged.
- [ ] 2.7 `AuthedNonOwner_ReturnsForbidden_RowUnchanged` **(R3 scenario)** — owner's list, caller is a different user; assert `{ success: false, error: 'Forbidden' }`, row unchanged, `updateTag` not called.
- [ ] 2.8 `NonExistentId_ReturnsNotFound` — valid owner session, unknown `id`; assert `error: 'Not found'`, `updateTag` not called.

### 2C. Fail-closed enum re-validation (ADDED SHALL)

- [ ] 2.9 `OutOfEnumValue_ReturnsValidation_RowUnchanged` **Spec delta SHALL** — owner session, `visibility = 'owner'` (a future-canonical string the action must still reject in Stage 1); assert `error: 'Validation'`, row's `{visibility, shared, shared_at}` byte-identical, `updateTag` not called.
- [ ] 2.10 `EmptyStringValue_ReturnsValidation` **Spec delta SHALL** — `visibility = ''`; assert `error: 'Validation'`.
- [ ] 2.11 `ValidationPrecedesLookup_InvalidValueUnknownId_ReturnsValidationNotNotFound` **Spec delta SHALL** — invalid value AND unknown `id`; assert the returned error is `'Validation'` (not `'Not found'`), proving validation fails closed before the existence lookup.

### 2D. `shared_at` transition state machine (R2) — controlled clock

- [ ] 2.12 `PrivateToUnlisted_SetsSharedAtFresh_SharedTrue` — start `private` (`shared_at = null`); set `unlisted`; assert `shared_at` is a fresh timestamp within the captured `Date.now()` bounds, `visibility = 'unlisted'`, `shared = true`.
- [ ] 2.13 `PrivateToPublic_SetsSharedAtFresh_SharedTrue` — same from `private` → `public`.
- [ ] 2.14 `UnlistedToPublic_PreservesSharedAt_SharedTrue` — start `unlisted` with a known `shared_at = T`; set `public`; assert `shared_at` byte-identical to `T`, `shared = true`.
- [ ] 2.15 `PublicToUnlisted_PreservesSharedAt_SharedTrue` — start `public` with `shared_at = T`; set `unlisted`; assert `shared_at === T`, `shared = true`.
- [ ] 2.16 `PublicToPrivate_ClearsSharedAt_SharedFalse` — start `public` with `shared_at = T`; set `private`; assert `shared_at = null`, `shared = false`.
- [ ] 2.17 `UnlistedToPrivate_ClearsSharedAt_SharedFalse` — same from `unlisted` → `private`.
- [ ] 2.18 `PublicPrivatePublicCycle_SecondSharedAtIsFresh` **(R2 "re-sharing gets fresh shared_at")** — `public` (shared_at = T1) → `private` (null) → `public`; advance the clock between the two `public` writes; assert the final `shared_at` is strictly greater than T1.
- [ ] 2.19 `PrivateToPrivate_NoSpuriousSharedAt` — start `private` (`shared_at = null`); set `private`; assert `shared_at` stays `null`, `shared = false` (the `goingPrivate` branch on an already-private row is a no-op observable).

### 2E. Success shape + revalidation

- [ ] 2.20 `SuccessfulTransition_ReturnsVisibilityUpdated` — a valid owner transition returns `{ success: true, message: 'Visibility updated' }`.
- [ ] 2.21 `SuccessfulTransition_CallsUpdateTagListsOnce` — assert `updateTag` was called exactly once with `'lists'` on the success path (and zero times across §2B/§2C failure paths — cross-check).

## 3. Write `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` (node project; pglite-backed)

### 3A. Harness

- [ ] 3.1 Reuse the pglite + `vi.mock('@/db')` + `vi.mock('next/cache')` + `vi.mock('@/lib/auth')` harness. If §1.4 found the sibling component imports break under node, add `vi.mock` stubs for `ListHeroSection` / `ListItemsSection` / `@/app/ui/components/LoadingIndicator` (out-of-carve-out UI; Decision 3) and record it in the §5 testability audit.
- [ ] 3.2 Seed: an owner user, a non-owner user, and lists owned by the owner in `private`, `unlisted`, `public` states with known `name` values. Helper to call `generateMetadata({ params: Promise.resolve({ id }) })`.

### 3B. Universal noindex (R6)

- [ ] 3.3 `PrivateList_RobotsNoindex` — any viewer; assert `robots` deep-equals `{ index: false, follow: false }`.
- [ ] 3.4 `UnlistedList_RobotsNoindex` — assert `noindex`.
- [ ] 3.5 `PublicList_RobotsNoindex` — assert `noindex` even though full metadata is served.

### 3C. Name-leak matrix (R6)

- [ ] 3.6 `PrivateList_AnonymousViewer_GenericTitle_NoOgTwitter` — `auth()` → `null`; assert `title === 'List | ctrl+list'`, `openGraph` and `twitter` are `undefined`.
- [ ] 3.7 `PrivateList_AuthedNonOwner_GenericTitle_NoOgTwitter` — non-owner session; assert generic title, no OG/twitter.
- [ ] 3.8 `UnlistedList_AuthedNonOwner_GenericTitle_NoOgTwitter` — same for `unlisted`.
- [ ] 3.9 `PrivateList_Owner_FullMetadata_StillNoindex` — owner session; assert `title === list.name`, `openGraph.title === list.name`, `twitter` present, `robots` still `noindex`.
- [ ] 3.10 `UnlistedList_Owner_FullMetadata_StillNoindex` — same for `unlisted`.
- [ ] 3.11 `PublicList_AnonymousViewer_FullMetadata` — `auth()` → `null`; assert full `title`/`openGraph`/`twitter`.
- [ ] 3.12 `PublicList_AuthedNonOwner_FullMetadata` — non-owner; assert full metadata.
- [ ] 3.13 `PublicList_AuthNeverConsulted` — for a `public` list, assert the `auth` mock recorded zero calls (locks the `isShared` short-circuit that skips the session lookup; a regression that removed it would over-fetch and could leak).

### 3D. Fail-closed fallbacks (R6)

- [ ] 3.14 `UnknownId_GetListReturnsNull_GenericTitleNoindex_NoOgTwitter` — `id` that resolves to no list; assert generic title, `noindex`, no OG/twitter.
- [ ] 3.15 `GetListThrows_GenericTitleNoindex_NoOgTwitter` — force `getList` to throw (e.g. seed a row whose `visibility` decode would throw, or a DB error path) ; assert the `catch` returns generic title + `noindex` + no OG/twitter.

## 4. Invariant-elevation audit (record in this section)

- [ ] 4.1 **ELEVATED** — `setListVisibility` fail-closed re-validation: added as a `### Requirement` to `openspec/specs/list-visibility/spec.md`. Rationale: non-obvious (the typed signature hides the network-boundary re-validation), survives reimplementation, protects a privacy-data-integrity failure mode. Locked by §2.9–§2.11.
- [ ] 4.2 **NOT ELEVATED (already specced)** — shared_at transitions (R2), legacy-`shared` dual-write (R5), non-owner rejection (R3), universal noindex + name-leak suppression + fail-closed fallback (R6). Each is an existing SHALL with scenarios; the tests assert against them. Re-adding would duplicate.
- [ ] 4.3 **NOT ELEVATED (trivial/derivable)** — the success-message string, the specific error-code strings (`'Unauthorized'`/`'Forbidden'`/`'Not found'`/`'Validation'`), and the `updateTag('lists')` revalidation. Response shapes and the cross-cutting data-freshness rule, not visibility-specific privacy invariants; tested but not elevated to `list-visibility`.

## 5. Four audits (record findings + dispositions BEFORE coverage validation)

- [ ] 5.1 **Duplication audit** (carve-out source) — `setListVisibility` and `generateMetadata` share no logic; both reuse the standard `auth()` + `users.findFirst({ where: eq(users.email, ...) })` actor-resolution idiom seen across `app/actions/lists.ts`. Disposition: NOT extracted here (the idiom spans functions owned by §4.9/§4.14; extraction would be a cross-file/cross-owner refactor → defer). Record.
- [ ] 5.2 **Duplication audit** (test setup) — the pglite boot + `vi.mock('@/db')` + `vi.mock('next/cache')` + `vi.mock('@/lib/auth')` + seed harness is reused across §2 and §3 (and already exists in `lib/__tests__/listAccess.test.ts`). Disposition: if both files plus `listAccess.test.ts` would copy the same boot/seed, extract a shared helper to `test/helpers/` (per testing-foundation's "two or more files → extract" rule); otherwise keep inline. Record which.
- [ ] 5.3 **Complexity audit** (carve-out source) — measure `setListVisibility` (expected ≈ 4–5: auth guard + safeParse + owner check + the three-way `sharedAtUpdate`) and `generateMetadata` (expected ≈ 5–6: try/catch + null guard + isShared + isOwner + showFullMetadata). Both expected < 15. Record measured values. (No `eslint.config.mjs` error-promotion is added for these multi-owner files — Decision 1.)
- [ ] 5.4 **Testability audit** (carve-out source) — record: (a) whether `generateMetadata` imported cleanly under the node project or needed sibling-module mocks (Decision 3); (b) that `@/lib/auth` is the only mocked internal boundary (the NextAuth network boundary), DAL runs real against pglite; (c) the multi-owner-file enumeration gap (Decision 1) — note it as a foundation/orientation finding and confirm `CLAUDE.md` / the testing-foundation orientation is flagged (see §6). No source refactor performed; any that were needed would defer (cross-file).
- [ ] 5.5 **Assertion audit** (new test files) — for every test in §2 and §3, record in one sentence the observable property asserted (returned object shape, persisted `{visibility, shared, shared_at}` triple read back from pglite, `updateTag` spy call, `auth` spy non-call, `robots`/`title`/`openGraph`/`twitter` fields). Confirm no test asserts only `toBeDefined()`/`toBeTruthy()` on a value the test constructed; confirm timestamp assertions use captured-bounds / `vi.setSystemTime`, never `toBeDefined()`. Fix any substance failure in-place.
- [ ] 5.6 Disposition log — every finding from §5.1–§5.5 marked fixed-in-place or deferred-as-new-sub-proposal (audits 1–3 only). No TODO-comment dispositions.

## 6. Spec + convention housekeeping

- [ ] 6.1 Confirm `openspec/specs/list-visibility/spec.md` will receive the ADDED fail-closed re-validation requirement on archive (the delta at `specs/list-visibility/spec.md`).
- [ ] 6.2 Confirm the Tier-2 `testing-foundation` delta (`specs/testing-foundation/spec.md`) records: the two functions tested at behavioral-contract level; the deferred-enumeration convention for multi-owner files (naming §4.9/§4.14 for `app/actions/lists.ts` and the list-page render carve-out for `page.tsx`); and the §4.13 authorization dual-ownership note. Confirm it does NOT touch the active `testing-foundation` spec or the parent accumulator.
- [ ] 6.3 Surface the multi-owner-file coverage-floor gap (Decision 1) to `CLAUDE.md` / the testing-foundation orientation as a convention worth documenting initiative-wide (the orientation file invites this). Record the suggestion; do not edit unrelated docs without owner sign-off.

## 7. Coverage validation (carve-out files only)

- [ ] 7.1 Run `npm run test:coverage`; confirm `setListVisibility` and `generateMetadata` are fully exercised (every branch in §2D's state machine and §3C's matrix hit). Because the two files are NOT enumerated in `vitest.config.ts` `thresholds` (Decision 1), the gate does not numerically enforce them here; record the per-function line/branch coverage from the report as evidence the behavioral contract is fully covered.
- [ ] 7.2 Confirm no unrelated file's coverage regressed and no new `vitest.config.ts`/`eslint.config.mjs` entry was added for the two multi-owner files.

## 8. Pre-merge (four gates)

- [ ] 8.1 `npm run lint` passes with zero errors and zero warnings (including `vitest/expect-expect` and the tautology rules on the two new files).
- [ ] 8.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 8.3 `npm run build` completes successfully.
- [ ] 8.4 `npm test` passes (both new node-project files green).
