## Why

Sub-proposal **9.1** of the `test-coverage` initiative ([issue #111](https://github.com/JoshEddie/CTRLplusList/issues/111)) — a coverage-gap follow-up discovered at the §7.1 close-out audit (`openspec/changes/test-coverage/tasks.md` §9.1).

The six data-layer carve-outs (4.2 / 4.3 / 4.6 / 4.9 / 4.11 / 4.14) each covered the `lib/dal.ts` reads their own capability needed — but only the happy paths their capability exercised. Measured today against the existing `lib/__tests__` suite, `lib/dal.ts` sits at **28% lines / 27% statements / 34% functions / 4.9% branches** (52/185 lines, 17/50 v8 functions, **3/61 branches**). Twelve exported reads plus the `sanitizePurchases` / `firstNameOf` projection branches are entirely untested, **and** the sibling-covered reads' `catch` error paths (and other branches) were never exercised — `test-following`'s `dal.following.test.ts` has no error-path tests at all.

Because vitest gates coverage **per file** (`perFile: true`), enumerating `lib/dal.ts` at `COVERAGE_FLOOR` requires the **whole file** to clear `lines:98 / statements:98 / branches:95 / functions:100` — not just the twelve untested reads. The carve-out is therefore "**everything needed to bring the whole of `lib/dal.ts` to the floor**": the twelve untested reads end-to-end, the projection-helper branch matrix, **and** the uncovered branches (chiefly the `catch` error paths) of the reads the sibling carve-outs already happy-path-tested. Only then can the file be enumerated in `thresholds` and promoted to `sonarjs/cognitive-complexity = error`. `lib/auth.ts` is in the same position at **66% lines / 50% functions / 55% branches** (the inline NextAuth callbacks are never invoked; the bypass branches are half-covered).

**No action remainder exists to sweep:** all four `app/actions/*.ts` files (`follows.ts`, `items.ts`, `lists.ts`, `user.ts`) are already enumerated at `COVERAGE_FLOOR` (4.9 / 4.2 / 4.13), so they are already whole-covered. `lib/dal.ts` and `lib/auth.ts` are the only files this change must bring to the floor.

This is the last shared multi-capability file standing between the program and two deferred governance items:

- **§7.7** (DAL per-file coverage-attribution strategy) chose "enumerate the whole file at `COVERAGE_FLOOR` once every function is covered" and named **this** sub-proposal as the operationalization.
- **§7.10** (enumerate multi-capability shared files once whole-covered) lists `lib/dal.ts` as the only remaining unresolved shared file; `app/actions/lists.ts` and `app/actions/items.ts` were already resolved by 4.9.

On landing, `lib/dal.ts` and `lib/auth.ts` are enumerated at `COVERAGE_FLOOR` and promoted to complexity `error`, unblocking §7.7 / §7.10 for good.

Inherited constraints (surfaced by spec-grep):

- **`testing-foundation`** (active accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md`, plus the archived deltas of every prior sub-proposal) — the **Tier-1 data-layer contract** "DAL reads and server actions SHALL be integration-tested against a migrated pglite instance via a shared harness" governs this carve-out verbatim: boot a fresh migrated PGlite per test (`bootPglite()`, `test/helpers/db.ts`), module-mock `@/db` to it, apply `mockNextCache()` (`test/helpers/next-cache.ts`), and mock only the NextAuth boundary (`@/lib/auth`'s `auth()`). Also binding: the universal per-file floor referenced from the single `COVERAGE_FLOOR` constant, the no-backdoor disposition rule (write the test **or** `/* v8 ignore */` with named rationale — never lower the floor), the `<State>_<Behavior>` `it()` shape, the three-role `describe()` convention, the four-audit + invariant-elevation obligations, the assertion-substance bar, the "internal modules SHALL NOT be mocked" rule, and the per-file complexity promotion convention.
- **`list-item-management`** (active) — owns the claim / purchase mutation semantics. The **read-side** purchase-spoiler projection in `lib/dal.ts` (`sanitizePurchases`: owner-without-spoilers sees no claims; owner-with-spoilers and non-owner viewers see first-name-only attribution with a `self`/`other` tag) is **not specced anywhere**. The tests here lock it; per the invariant-elevation requirement it is elevated to a `list-item-management` SHALL (see `design.md` Decision 5).
- **`home-digest`** (active) — already states the My Lists rail is "ordered by `updated_at DESC`" and §7.8 fixed `getListsByUser` to match. This carve-out **regression-locks** that sort with a direct DAL test (no spec change — the SHALL already exists).
- **`list-visibility`** (active) — the FOLLOWERS-only visibility filter in `getPublicListsByUser` / `getProfileForUser` / `getListsSharedByUser` is a privacy contract; the active spec already governs three-state visibility, so these tests assert against the existing SHALLs rather than adding new ones (elevation assessed and declined — see `design.md` Decision 6).

Cache-tag note (per the proposal rule): the reads under test consume the `lists` (`getList`/`getLists`/`getListsByUser`/`getListsSharedByUser`/`getPublicListsByUser`), `items` (`getItemsByUser`/`getItemById`/`getItemsByPurchased`/`getItemsByListId`), `user_blocks` (`getBlockedByUser`), and `user_follows` (via `getProfileForUser`'s `isFollowing`/`isBlocked` composition) tags; several (`getPublicListsByUser`, `getProfileForUser`, `getBlockedByUser`) are deliberately **not** cached because they join `users` (documented in source). This carve-out tests **reads only** — the mutation paths that must `revalidateTag`/`updateTag` those tags are owned by the action carve-outs (4.9 `app/actions/items.ts` + `app/actions/lists.ts`, 4.2 `app/actions/follows.ts`) and are already covered; no mutation is exercised here. `mockNextCache()` makes `cacheTag(...)` a no-op so the cached reads execute against PGlite.

## What Changes

- **NEW** colocated `.test.ts` files (node project, real PGlite via `bootPglite()`, `next/cache` mocked, `@/db` mocked to the instance) covering the twelve untested `lib/dal.ts` reads and the projection helpers:
  - `getUserById` — row-by-id and not-found (`null`) paths; the `catch` path returns `null` (distinct from the throwing reads).
  - `getList` — single list with `user` join + `items` count projection; not-found; the `catch` re-throws `'Failed to fetch list'`.
  - `getLists` — all lists ordered `created_at DESC`, visibility decoded via `withVisibility`.
  - `getListsByUser` — a user's lists ordered **`updated_at DESC`** (regression-locks the §7.8 sort fix) with the `user` column projection.
  - `getItemsByUser` — the `filter` matrix (`active` / `archived` / `all`, default `active`) over `archived_at`, `created_at DESC` ordering, the `hasPurchases` flag, store ordering, and the **owner spoiler branch** of `sanitizePurchases` (`showSpoilers` false → `[]`; true → first-name `other` rows).
  - `getItemById` — the `list_items`→`list` reshape into `lists[]` with `position`; not-found (`undefined`); `catch` re-throws.
  - `getItemsByPurchased` — the `!userId` early-return (`[]`), purchase rows ordered `purchased_at DESC`, and the **non-owner** `sanitizePurchases` branch (`self` vs `other`).
  - `getItemsByListId` — list-membership ordering by `position ASC`, and the full **viewer/owner/spoiler matrix** of `sanitizePurchases`.
  - `getListsSharedByUser` — `LINK` + `FOLLOWERS` visibility filter for a user (audited for dead-code — see `design.md` Decision 7).
  - `getBlockedByUser` — blocked-user rows with `blocked` join, ordered `created_at DESC`.
  - `getPublicListsByUser` — FOLLOWERS-only filter, `shared_at DESC`, `limit`/`offset` pagination.
  - `getProfileForUser` — `null` for an unknown user; the `publicListCount` aggregate; the viewer-relationship composition (`viewerIsFollowing` / `viewerIsBlocked` / `blockedByViewer`) including the `viewerId == null` and `viewerId === userId` short-circuits.
  - `firstNameOf` branch completion (null / empty / whitespace-only / multi-word name) reached through the purchase-bearing reads.
  - Read **error paths for the twelve** — each throwing read's `catch` is exercised via a `vi.spyOn(db.query.<table>, ...).mockRejectedValueOnce(...)` per the established `ReadErrorPaths` pattern.
- **NEW** whole-file branch backfill for the **sibling-covered reads** (`getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `isBlocked`, `getFollowingFeedUsers`, `getUserIdByEmail`, and any visit-history read whose branches the 4.14 suite left short). Their happy paths are NOT re-tested — this adds only the missing coverage (chiefly the `catch` error path of each, via `vi.spyOn(...).mockRejectedValueOnce(...)`) that the per-file gate needs to clear `branches:95 / lines:98`. Without this, the whole-file floor cannot pass and `lib/dal.ts` cannot be enumerated.
- **NEW** test coverage for `lib/auth.ts`: the local-mode bypass surface (`auth()` zero-arg bypass → default-viewer session, `guest` → `null`, other seeded id → minimal session; `synthesizeSession` both branches; the `args.length > 0` pass-through), and the NextAuth `signIn` / `jwt` / `session` callbacks (the Google display-name composition: given+family, given-only, neither). A small **testability refactor** extracts the three callbacks into named exports so they are reachable for `functions: 100%`, and the test **mocks the `next-auth` package boundary** (a framework/OAuth boundary `testing-foundation` explicitly permits mocking) so the module constructs cleanly under the node project AND the `auth(req, ctx)` pass-through branch becomes coverable (asserting the stubbed `nextAuth.auth` is invoked) — reaching the floor without a `/* v8 ignore */` escape hatch (see `design.md` Decision 4).
- **NEW** per-file `thresholds` entries in `vitest.config.ts` for `lib/dal.ts` and `lib/auth.ts`, each referencing the shared `COVERAGE_FLOOR` constant. **This resolves the explicit `lib/dal.ts` deferral note** in `vitest.config.ts` (the "No `lib/dal.ts` entry … deferred" comments from 4.2 / 4.3 / 4.14).
- **NEW** ESLint promotion in `eslint.config.mjs`: `lib/dal.ts` and `lib/auth.ts` added to the per-file `sonarjs/cognitive-complexity = error` array. Measured at HEAD: `npx eslint lib/dal.ts lib/auth.ts` reports zero issues, so promotion is safe today.
- **MODIFIED** `list-item-management` spec — ONE ADDED requirement elevating the `lib/dal.ts` purchase-spoiler read-projection invariant (Decision 5). No requirement removed or otherwise modified.
- **NEW** `testing-foundation` carve-out delta — records that `lib/dal.ts` + `lib/auth.ts` are now whole-covered and enumerated at `COVERAGE_FLOOR`, resolving the §7.7 / §7.10 multi-capability-shared-file deferral for the last shared file.
- **NEW** four-audit findings recorded in `tasks.md` (anticipated dispositions in `design.md`): the `getListsSharedByUser` dead-code observation (Decision 7) and the `lib/auth.ts` callback-testability refactor (Decision 4).
- **NO** runtime behavior change beyond the `lib/auth.ts` callback extraction (pure move; behavior preserved and proven by the new tests). All other changes are tests, config, specs, and governance bookkeeping.
- **NO** re-test of the happy paths already covered by a sibling carve-out (`getUserIdByEmail`, the three visit-history reads, the six following/block reads) — those are inherited. This carve-out adds only the *missing* branch coverage on them (see the whole-file backfill bullet above) required by the per-file gate.
- **NO** action-file work — all `app/actions/*.ts` are already enumerated at `COVERAGE_FLOOR`; there is no uncovered action remainder. Mutations remain owned by their action carve-outs.

## Capabilities

### New Capabilities

None. The reads under test belong to existing capabilities; the coverage harness already exists.

### Modified Capabilities

- `list-item-management`: ONE ADDED requirement — the `lib/dal.ts` purchase-spoiler read-projection invariant (`sanitizePurchases`): an item owner viewing their own items sees **no** claim attribution unless spoilers are explicitly enabled, and every non-owner / spoiler view exposes **first names only** with a `self`/`other` tag (never full names, emails, or ids). Justified for elevation by all three of (a) non-obvious from signatures, (b) survives reimplementation, (c) prevents a gift-spoiler / claimer-identity privacy leak.
- `testing-foundation`: carve-out bookkeeping (Tier 2, archive-only per `test-coverage` design D13) recording the whole-file coverage of `lib/dal.ts` + `lib/auth.ts` and their enumeration at `COVERAGE_FLOOR`; plus the Tier-1 governance outcome that the §7.7 / §7.10 multi-capability-shared-file deferral is resolved for the final shared file. No change to the active `testing-foundation` spec at apply-time (archive-time rollup per §7.11).

## Impact

- **New files:** test files for the `lib/dal.ts` remainder and `lib/auth.ts` (node project, `.test.ts`). Final file split (one combined `dal.remainder.test.ts` vs. per-concern files) decided in `design.md` Decision 2; the assertion/duplication audit may extract a shared list/item seed helper into `test/helpers/` if 2+ files duplicate setup.
- **Modified config:** `vitest.config.ts` gains two `thresholds` entries (`lib/dal.ts`, `lib/auth.ts`) and drops the three deferral comments; `eslint.config.mjs` gains two paths in the per-file complexity-`error` array.
- **Modified source:** `lib/auth.ts` only — the `signIn`/`jwt`/`session` callbacks extracted to named exports (testability refactor inside the carve-out; behavior preserved). No change to `lib/dal.ts` source.
- **Modified specs:** `openspec/specs/list-item-management/spec.md` gains one ADDED requirement at archive. The `testing-foundation` carve-out bookkeeping lives only in this sub-proposal's archive directory.
- **Parent governance:** `test-coverage/tasks.md` §9.1 checkbox flips on archive; §7.7 / §7.10 (and their dependents §7.2 / §7.3) become unblocked. No new sibling sub-proposal is anticipated unless the audit surfaces cross-file scope.
- **CI:** the four-gate workflow runs unchanged; the `test` job grows by the new files. Two more `bootPglite()` consumers add to the per-file DB-boot baseline already established by 4.2 / 4.14.
- **Dependencies:** none added.
- **Risk:** low–medium. The DAL harness is proven (4.2 / 4.14); the new surface is mechanical read coverage. The one genuine source change is the `lib/auth.ts` callback extraction (Decision 4) — mitigated by the new direct-invocation tests proving behavior preservation.
