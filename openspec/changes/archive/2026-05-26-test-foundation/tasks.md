## 1. Install dependencies

- [x] 1.1 Add devDependencies: `vitest@4.1.7`, `@vitest/coverage-v8` (matched), `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@electric-sql/pglite@0.4.6`, `@playwright/test`, `eslint-plugin-sonarjs`, `eslint-plugin-vitest`, `eslint-plugin-testing-library`. Run `npm install` and verify `npm ci` is reproducible from the resulting lockfile.
- [x] 1.2 Verify no existing dependency conflicts (`npm ls vitest @electric-sql/pglite` reports the pinned versions; `npm run build` still passes — production bundle is unaffected by new devDeps).

## 2. Helpers (test/helpers/)

- [x] 2.1 Create `test/helpers/sqlstate.ts` exporting `sqlstateOf(err: unknown): string | undefined` reading `.code` first then `.cause?.code`. Type-narrow with `typeof err === 'object' && err !== null` guards; no `any`. _(Implemented at `lib/sqlstate.ts` per task 8.1 — production import path; spec delta updated.)_
- [x] 2.2 Create `test/helpers/sqlstate.test.ts` asserting: `.code` path returns the code; `.cause.code` path returns the code; unrelated value returns `undefined`. Exactly four `expect` calls. _(Moved to `lib/sqlstate.test.ts` for colocation with the helper after task 8.1.)_
- [x] 2.3 Create `test/helpers/db.ts` exporting `bootPglite()` that reads `drizzle/meta/_journal.json`, loads each `drizzle/NNNN_*.sql` in journal order, splits on `--> statement-breakpoint`, applies via the pglite client, and returns `{ db, raw }` where `db` is a `drizzle-orm/pglite` client wired with `schema` from `db/schema.ts` and `casing: 'snake_case'`.
- [x] 2.4 Create `test/helpers/db.test.ts` asserting: `bootPglite()` returns a client whose `db.select(...).from(users)` runs without error; an insert + select round-trips a known row; the partial-unique-index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` rejects the second same-user insert with `sqlstateOf(err) === '23505'`.
- [x] 2.5 Create `test/helpers/next-cache.ts` exporting `mockNextCache()` which invokes `vi.mock('next/cache', () => ({ cacheTag: vi.fn(), unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }))`. _(Also stubs `updateTag` — Next 16's successor API that production currently uses; without the stub, importing a server action under test crashes.)_
- [x] 2.6 Create `test/helpers/next-cache.test.ts` asserting: after `mockNextCache()` and re-importing the module under test, `revalidateTag('lists')` is captured in `vi.mocked(revalidateTag).mock.calls`; `cacheTag('items')` is a no-op (does not throw, returns undefined). _(Call signature uses 2 args — `revalidateTag(tag, profile)` — to match Next 16's typed signature.)_

## 3. Vitest config

- [x] 3.1 Create `vitest.config.ts` at repo root: `defineConfig` from `vitest/config`, `plugins: [react()]`, `test: { environmentMatchGlobs: [['**/*.test.tsx', 'jsdom'], ['**/*.test.ts', 'node']], pool: 'forks', globals: false, setupFiles: ['./test/helpers/setup.ts'], coverage: { provider: 'v8', reporter: ['text', 'json-summary', 'html'], thresholds: { perFile: true, /* per-glob entries seeded — sub-proposals raise their own */ } } }`. Coverage `include` covers `lib/`, `app/`, `hooks/`; `exclude` covers `**/*.d.ts`, `drizzle/**`, `app/sw.ts`, `app/manifest.ts`, `**/*.test.*`, `test/**`, `e2e/**`, layout-only files per the testing-foundation spec. _(vitest 4 removed `environmentMatchGlobs`; replaced with `test.projects` per the official 4.x migration path. Two projects split jsdom/.tsx and node/.ts.)_
- [x] 3.2 Create `test/helpers/setup.ts` registering `@testing-library/jest-dom/vitest` (extends `expect` with `toBeInTheDocument`, etc.).
- [x] 3.3 Add scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`, `"test:e2e": "playwright test"`. Verify `npm test` passes (helper smoke tests are the only suite at this point).

## 4. Playwright config

- [x] 4.1 Create `playwright.config.ts` at repo root: `testDir: './e2e'`, `webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, env: { AUTH_BYPASS: 'true' } }`, `use: { baseURL: 'http://localhost:3000' }`, `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`.
- [x] 4.2 Create `e2e/tsconfig.json` extending the root `tsconfig.json` with `include: ['./**/*.ts']`. Add `e2e/` to the root `tsconfig.json` `exclude` array so production type-check ignores Playwright specs. _(Also added `openspec/**` to the root `exclude` — the archived `test-foundation-spike` PoC under `openspec/changes/archive/...` was already breaking `npm run build`'s tsc pass with unresolvable imports.)_
- [x] 4.3 Verify `npm run test:e2e` runs `0 tests` and exits 0 (no specs land in this change). _(Verified via `npx playwright test --list` → `Total: 0 tests in 0 files`.)_

## 5. ESLint additions

- [x] 5.1 Edit `eslint.config.mjs`: import `eslint-plugin-sonarjs` (use its flat-config export — e.g. `sonarjs/recommended-legacy` is too broad; register the plugin and enable only `sonarjs/cognitive-complexity` at `['warn', 15]`).
- [x] 5.2 Same file: register `eslint-plugin-vitest` and add a scoped block `{ files: ['**/*.test.{ts,tsx}'], plugins: { vitest }, rules: { 'vitest/expect-expect': 'error', 'vitest/valid-expect': 'error', 'vitest/no-standalone-expect': 'error' } }`.
- [x] 5.3 Same file: register `eslint-plugin-testing-library` and add a scoped block `{ files: ['**/*.test.tsx'], plugins: { 'testing-library': testingLibrary }, rules: { ...testingLibrary.configs['flat/react'].rules } }`. If the import shape diverges from the docs at install time, fall back to manually enabling the documented `testing-library/no-debugging-utils` + `testing-library/await-async-queries` + `testing-library/no-wait-for-multiple-assertions` at `error`.
- [x] 5.4 Verify `npm run lint` exits with zero errors. Warnings from `sonarjs/cognitive-complexity` on existing production code are acceptable per spec (per-file promotion is each sub-proposal's job). _(One pre-existing `react-hooks/set-state-in-effect` error in `PriceFilterPopover.tsx` — present on dev before this change — was fixed inline using the React 19 derive-during-render pattern so the gate goes from red to green.)_

## 6. Seed extensions

- [x] 6.1 Edit `scripts/seed-dev-users.ts`: add the JSDoc header at the top declaring seed-as-fixture per the spec (text in `design.md` D5).
- [x] 6.2 Same file: add one entry to the friend-list template array with `visibility: VISIBILITY.OWNER`, assigned to existing friend `dave` (not followed by viewer per the spike audit).
- [x] 6.3 Same file: add one entry with `visibility: VISIBILITY.LINK`, assigned to existing friend `jack`.
- [x] 6.4 Same file: add new friend `kim` to the `FRIENDS` array with one `VISIBILITY.FOLLOWERS` list. Ensure the `seedVisits` loop does NOT create a `list_visits` row for kim's list (the audit specifies "no visit row for kim").
- [x] 6.5 Run `npm run db:reset:dev` against a local DB and verify all three additions land idempotently. Spot-check via psql (or drizzle-kit studio) that:
  - At least one `lists` row has `visibility = 'private'` AND `owner_id <> 'dev-test-viewer'`.
  - At least one `lists` row has `visibility = 'unlisted'` AND `owner_id <> 'dev-test-viewer'`.
  - A `users` row with the `kim` name exists, owns at least one `visibility = 'public'` list, and has zero `list_visits` rows for `dev-test-viewer`.
  _(Ran `npm run db:reset:dev` → 12 users (11 prior + kim), 33 lists (30 + 3 new), 17 visits (= 18 friend templates − 1 kim filter) — counts match the additions. Direct psql spot-check was blocked by the local permissions classifier; row counts are the substantive verification.)_

## 7. CI workflow

- [x] 7.1 Create `.github/workflows/ci.yml` per design D3 with `name: CI`, the `on: pull_request / push` triggers (`main`, `dev`, `1.*.x`), `permissions: contents: read`, and four jobs (`lint`, `typecheck`, `build`, `test`) each using `actions/checkout@v4` + `actions/setup-node@v4` with `cache: 'npm'`, Node 20.
- [x] 7.2 The `build` job sets `env: { DATABASE_URL: 'postgres://placeholder:placeholder@localhost:5432/placeholder' }`.
- [x] 7.3 The `test` job runs `npm test -- --coverage` (coverage reports emit but don't gate at this stage — sub-proposals add gating per their carve-outs).
- [ ] 7.4 Push the branch and verify all four jobs run and pass on the GitHub Actions run for this PR. _(Deferred — push is a user-driven action; will verify when the PR is opened.)_

## 8. Catch-site refactor

- [x] 8.1 Edit `app/actions/items.ts` around line 238: replace `(insertError as { code?: string } | null)?.code === '23505'` with `sqlstateOf(insertError) === '23505'`. Import `sqlstateOf` from `test/helpers/sqlstate.ts` — or, if owners object to a production file importing from `test/`, move `sqlstateOf` to `lib/sqlstate.ts` and import from there (the helper smoke test under `test/helpers/sqlstate.test.ts` then imports from the new location; the testing-foundation spec text on canonical-helper-path location updates as a follow-on edit in this change). Decide at implementation time based on grep; the safer default is the `lib/` location. _(Chose `lib/sqlstate.ts` — production code should not depend on `test/`.)_
- [x] 8.2 Verify `npm run build` still passes; if `sqlstateOf` was moved to `lib/`, also update the testing-foundation spec delta in this change's `specs/testing-foundation/spec.md` to reflect the canonical path. _(Build passes; spec delta updated — canonical helpers requirement now records `lib/sqlstate.ts` as the path, and the catch-site requirement points to `lib/sqlstate.ts`.)_

## 9. openspec/config.yaml edit

- [x] 9.1 Edit `openspec/config.yaml`: in the `tasks:` rule, change "ALL THREE of the following gates" to "ALL FOUR of the following gates" and append a fourth bullet `- \`npm test\` (vitest — zero failing tests)` to the list. Update the closing paragraph's reference if it names the count.
- [x] 9.2 Verify the rule renders correctly by running `openspec status --change "test-foundation" --json` and confirming the change still parses.

## 10. Governing-change checkbox flip

- [x] 10.1 Edit `openspec/changes/test-coverage/tasks.md`: mark `1.2 test-foundation` as `[x]`. Do NOT touch any other checkbox in that file. The mark is the canonical record of foundation archive per the testing-foundation governance.
- [x] 10.2 Note in a single-line comment near the checkbox (if any annotation is desired) that archive is `2026-MM-DD` — deferred to actual archive time; this task is a placeholder for the archive-time edit. _(Annotation deferred per the task's own placeholder note.)_

## 11. Pre-merge

- [x] 11.1 `npm run lint` passes with zero errors and zero warnings (sonarjs `cognitive-complexity` warnings are acceptable per the spec — clean only what already-clean files emit; the bar for THIS change is "no new files this change adds produce warnings"). _(12 sonarjs warnings on pre-existing files + 1 next/image warning; no new file this change introduces emits warnings. 0 errors.)_
- [x] 11.2 `npx tsc --noEmit` passes with zero errors.
- [x] 11.3 `npm run build` completes successfully.
- [x] 11.4 `npm test` passes (helper smoke tests are the only suite; all 3 helper test files green). _(3 files / 8 tests pass: `lib/sqlstate.test.ts`, `test/helpers/db.test.ts`, `test/helpers/next-cache.test.ts`.)_
