## 1. Shared reset helper

- [x] 1.1 Add `resetDb(db)` to `test/helpers/db.ts` that derives the table set from `db/schema.ts` (iterate `import * as schema`, keep exports where `is(value, PgTable)`, resolve names via `getTableName`) and issues one `TRUNCATE TABLE <quoted names> RESTART IDENTITY CASCADE`.
- [x] 1.2 Document the `bootPglite` contract in a comment as boot-once-per-file (callers reset between tests via `resetDb`, do not re-boot).
- [x] 1.3 Add a focused test in `test/helpers/db.test.ts` asserting that after seeding several tables and calling `resetDb`, every schema table selects empty (locks the spec's reset scenario).

## 2. Convert inline per-`it()` boot files (the flake source)

- [x] 2.1 `db/__tests__/list-subtitle.test.ts`: boot once in `beforeAll`, `resetDb` + seed owner in `beforeEach`, drop the four in-`it()` `bootPglite()` calls.
- [x] 2.2 `test/helpers/db.test.ts`: boot once in `beforeAll`, `resetDb` in `beforeEach`, drop the in-`it()` boots (keep 1.3's reset test alongside).

## 3. Convert per-`beforeEach` boot files to per-file boot

- [x] 3.1 `app/(main)/__tests__/HomePage.test.ts`
- [x] 3.2 `app/(main)/lists/ui/components/rails/__tests__/MyListsRail.test.ts`
- [x] 3.3 `app/(main)/lists/ui/components/rails/__tests__/FollowingRail.test.ts`
- [x] 3.4 `app/(main)/lists/ui/components/rails/__tests__/BookmarksRail.test.ts`
- [x] 3.5 `app/(main)/lists/ui/components/rails/__tests__/RecentlyVisitedRail.test.ts`
- [x] 3.6 `app/actions/__tests__/follows.test.ts`
- [x] 3.7 `app/actions/__tests__/visitHistory.actions.test.ts`
- [x] 3.8 `lib/__tests__/dal.following.test.ts`
- [x] 3.9 `lib/__tests__/visitHistory.dal.test.ts`
- [x] 3.10 `lib/__tests__/getUserIdByEmail.test.ts`
- [x] 3.11 For each: move `bootPglite` into `beforeAll` (set the `@/db` getter-holder and dynamic-import the module under test there), and in `beforeEach` call `vi.restoreAllMocks()` (only where the file installs `db` spies), `resetDb(db)`, reseed, and re-apply auth/cache mocks. No new `vi.setConfig({ hookTimeout })` was needed — files that already booted per-test under the default 10s hook timeout now boot strictly fewer times.

## 4. De-duplicate the existing TRUNCATE literal

- [x] 4.1 `app/actions/__tests__/items.test.ts`: replace the hand-rolled `TRUNCATE … CASCADE` with `resetDb(db)`.
- [x] 4.2 `app/actions/__tests__/lists.test.ts`: replace the hand-rolled `TRUNCATE … CASCADE` with `resetDb(db)`.

## 5. Verify no per-test boot remains & no leakage

- [x] 5.1 Grep confirms no `bootPglite()` call appears inside an `it()`/`test()` body or a `beforeEach` hook across the repo (all 17 call sites are in `beforeAll`).
- [x] 5.2 Run each converted file's full suite (not isolated) and confirm green — no cross-test row or mock leakage (node project: 518 pass / 0 fail).
- [x] 5.3 Run the full node project repeatedly under `pool: 'forks'` (three consecutive `rtk vitest run --project node` passes, all 518 green) to confirm the issue #97 boot-timeout flake no longer reproduces.
- [x] 5.4 Fallback only — not needed: 5.3 was green across repeated runs, so `vitest.config.ts` is left untouched (no `testTimeout` added).

## 6. Pre-merge

- [x] 6.1 `npm run lint` passes clean — `eslint .` exits 0 with 0 errors. The 5 remaining `warn`-level findings are pre-existing in files untouched by this change (`Item.tsx`, `useItemForm.ts`, `ChooseItemsForm.tsx`, `Avatar.tsx`, `seed-dev-users.ts`).
- [x] 6.2 `npx tsc --noEmit` passes clean (zero errors).
- [x] 6.3 `npm run build` completes successfully (only a pre-existing multi-lockfile workspace-root warning).
- [x] 6.4 `npm run test:coverage` passes — exit 0, 1524 tests passed across 112 files, no per-file coverage-floor violation.
- [x] 6.5 `npm run test:e2e` — no Playwright specs exist in the repo (`e2e/` holds only `tsconfig.json`), so the gate is vacuously satisfied; this change touches no e2e files.
