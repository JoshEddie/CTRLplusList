## Why

The governing `test-coverage` change established the `testing-foundation` capability — runner choice, layout, mocking rules, fixture strategy, per-file coverage floors, complexity threshold, four-gate pre-merge — but wrote zero implementation. The `test-foundation-spike` sub-proposal (archived as `2026-05-25-test-foundation-spike`) then locked the open decisions: pglite 0.4.6 + vitest 4.1.7 + GitHub Actions, with a documented error-shape unwrap helper, and a concrete seed-extension list (one OWNER-visibility friend list, one LINK-visibility friend list, one new friend `kim` with no `list_visits` row). Nothing else in the test-coverage roadmap can start until those decisions land as code, scripts, CI workflow, and config — every primitive-family and capability-flow sub-proposal inherits this machinery.

This change installs that machinery. It is the bottleneck for sub-proposals 2.1 through 6.2 in `openspec/changes/test-coverage/tasks.md`.

## What Changes

- **NEW** dev dependencies pinned per the spike: `vitest@4.1.7`, `@electric-sql/pglite@0.4.6`, `@vitest/coverage-v8` (matched to vitest), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitejs/plugin-react`, `jsdom`, `@playwright/test`, `eslint-plugin-sonarjs`, `eslint-plugin-vitest`.
- **NEW** `vitest.config.ts` at repo root: jsdom environment for `*.test.tsx`, node environment for `*.test.ts`, `pool: 'forks'` for pglite isolation, v8 coverage with per-file thresholds derived from the testing-foundation spec's file-class table.
- **NEW** `playwright.config.ts` at repo root + `e2e/` directory with `tsconfig.json` extending the root config. E2E suite is scaffolded but empty — sub-proposals 6.1 / 6.2 land specs.
- **NEW** directories `test/fixtures/` and `test/helpers/` with the load-bearing helpers required by the spike's PoC findings: `test/helpers/db.ts` (boots a pglite instance, applies all `drizzle/*.sql` migrations, returns a drizzle client), `test/helpers/sqlstate.ts` (`sqlstateOf(err): string | undefined` reading `.code ?? .cause?.code`), `test/helpers/next-cache.ts` (vi.mock factory for `next/cache` — `cacheTag` no-op, `revalidateTag` spy).
- **NEW** package.json scripts: `test` (vitest run), `test:watch` (vitest), `test:e2e` (playwright test), `test:coverage` (vitest run --coverage).
- **NEW** GitHub Actions workflow at `.github/workflows/ci.yml` running the four-gate trio + test as four parallel jobs per the spike's topology decision. Triggers: `pull_request` + `push` to `main`, `dev`, `1.*.x`.
- **NEW** `eslint.config.mjs` additions: `eslint-plugin-sonarjs` registered, `sonarjs/cognitive-complexity` at threshold 15, severity `warn` globally; `eslint-plugin-vitest` registered with `vitest/expect-expect`, `vitest/valid-expect`, `vitest/no-standalone-expect` at severity `error` scoped to `*.test.ts` / `*.test.tsx`; project-local rule configuration flagging the tautology shortlist (`.length` against 0 with `toBeGreaterThanOrEqual` / `toBeGreaterThan(-1)`, lone `toBeDefined()` / `toBeTruthy()` patterns) — implementation TBD by the design (custom rule vs. configurable lint rule).
- **MODIFIED** `scripts/seed-dev-users.ts`: extended with the three spike-recommended entities (one friend-owned OWNER list, one friend-owned LINK list, one new friend `kim` with FOLLOWERS list and zero `list_visits` rows). Header comment added declaring the file versioned-as-fixture per the testing-foundation spec.
- **MODIFIED** `openspec/config.yaml`: the `tasks` rule's pre-merge section grows from three required gates (`lint`, `tsc --noEmit`, `build`) to four (`+ test`). The existing wording stays compatible — only the gate list extends.
- **NO test code written by this change for app source.** The PoC machinery the spike produced lives in the archived spike directory and is NOT migrated — `test-foundation` rebuilds equivalents in `test/helpers/`. The only test files this change introduces are smoke tests for the new helpers themselves (e.g., `test/helpers/db.test.ts` proving `bootPglite()` returns a working drizzle client) — those are necessary to prove the foundation works without coupling to any app source.

## Capabilities

### New Capabilities

None. The `testing-foundation` capability already exists (defined by the governing `test-coverage` change; extended by `test-foundation-spike`). This change adds further requirements to it.

### Modified Capabilities

- `testing-foundation`: adds normative requirements pinning the chosen versions (`vitest@4.1.7`, `@electric-sql/pglite@0.4.6`, Node 20), declaring the CI workflow topology (four parallel jobs at `.github/workflows/ci.yml`), declaring the canonical helpers (`test/helpers/db.ts`, `test/helpers/sqlstate.ts`, `test/helpers/next-cache.ts`) as the only sanctioned surfaces sub-proposals use to boot a DB / unwrap a sqlstate / mock `next/cache`, declaring the seed-as-fixture header obligation, and declaring that the `eslint-plugin-vitest` rules land at severity `error` from day one (no warn-then-promote ramp).

## Impact

- **Dependencies:** ~12 new `devDependencies`. Install adds ~30–50 MB to `node_modules`; CI npm cache restores stay fast (~3 s) per the spike's measurement.
- **Config files added:** `vitest.config.ts`, `playwright.config.ts`, `e2e/tsconfig.json`, `.github/workflows/ci.yml`. `eslint.config.mjs` modified.
- **Config files modified:** `package.json` (scripts + devDependencies), `openspec/config.yaml` (tasks rule), `scripts/seed-dev-users.ts` (extended + header).
- **Repo layout:** `test/`, `e2e/`, `.github/` directories established.
- **CI:** GitHub Actions begins running on every PR + push to main/dev/release branches. First run after merge of this change SHOULD pass all four gates (lint/typecheck/build are already green per the existing pre-merge ritual; test gate has only the helper smoke tests at this point).
- **No runtime behavior change.** Production code is unchanged except for one possible refactor: per the spike's error-shape finding, `app/actions/items.ts` may switch from `(err as { code?: string })?.code` to the new `sqlstateOf(err)` helper. The helper preserves the existing Neon-HTTP read path (`.code` first); the refactor is optional for this change but trivial enough to bundle.
- **Sub-proposal unblocking:** every `test-*` sub-proposal listed in `openspec/changes/test-coverage/tasks.md` (sections 2–6) becomes startable after this change archives. The governing change's tracking checkbox for `1.2 test-foundation` flips on archive.
- **Cache-tag verification scope:** integration tests verify mutations call `revalidateTag(...)` with the expected tag at the interaction level only (per the spike's `dal-cache.test.ts` finding — `next/cache` is a no-op outside the Next runtime). End-to-end cache invalidation is covered by E2E (sub-proposal 6.1) against `next dev`.
- **Inherited constraints:** this change touches no interactive UI surfaces, no DAL reads, no cache-tag mutations, no primitive component families — so the cross-cutting design-system rule and cache-tag rule don't apply. The only inherited constraint surfaced by spec-grep is the `testing-foundation` capability spec itself, which this change is explicitly extending.
