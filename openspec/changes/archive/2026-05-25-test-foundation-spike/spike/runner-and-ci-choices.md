# Runner and CI provider choices

**Status:** spike deliverable for `test-foundation-spike`.

## Runner: vitest (4.1.7)

**Decision: vitest.** Confirmed against the spike default per design D4 (vitest is the default; deviation requires evidence from the PoC).

**Evidence from the PoC:**

- Native ESM, no TypeScript transform config required for the spike's test files. The PoC's `import` from `'../../../../../db/schema'` Just Worked against the production TS sources without `ts-jest` / `babel-jest` shenanigans.
- `pool: 'forks'` cleanly isolates the WASM-backed pglite instance per file (each test file calls `bootPglite()` and gets its own `PGlite`).
- Built-in `Promise.allSettled`-style assertions for race tests work with no plugin.
- v8 coverage is built in (`vitest run --coverage`); per-file thresholds required by the testing-foundation capability spec are first-class in vitest's config schema.
- Aligns with Next 16 + React 19 + ESM; jest's ESM story remains rough.

**No evidence emerged during the PoC that would justify switching to jest.** No transform issue, no incompatibility with `drizzle-orm/pglite`, no problem mocking `next/cache` (the spike's `dal-cache.test.ts` documents the strategy even though the test runs against pglite directly).

**Exact CLI invocation used by the PoC:**

```bash
cd openspec/changes/test-foundation-spike/spike/poc && npx vitest run
```

Result: `Test Files 2 passed (2)` / `Tests 5 passed (5)` / `Duration ~2.5s`.

When `test-foundation` lands the runner in the repo root, the equivalent invocation will be `npx vitest run` (project-root config) or `npm test` (scripts wrapper).

## CI provider: GitHub Actions

**Decision: GitHub Actions.** Confirmed against the spike default per design D5.

**Evidence:** the repo is hosted on GitHub and already uses `gh` for PR workflows (per CLAUDE.md's commit guidance). Actions is the path of least resistance, has free minutes for private repos via the Vercel-funded plan, ships with Docker pre-installed (relevant only if pglite ever falls back to testcontainers), and supports the matrix patterns we'd want for Node version pinning later.

No evidence emerged during the spike to suggest CircleCI / GitLab CI / Buildkite would fit better.

## Four-gate workflow sketch (NOT for committing here — `test-foundation`'s job)

The testing-foundation capability spec requires four gates: `lint`, `tsc --noEmit`, `build`, `test`. Sketched as YAML for `test-foundation` to land:

```yaml
# .github/workflows/ci.yml — sketch only, do NOT commit from this change.
name: CI
on:
  pull_request:
  push:
    branches: [main, dev, '1.*.x']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env:
          # Build needs a placeholder DATABASE_URL even though no queries run.
          DATABASE_URL: postgres://placeholder:placeholder@localhost:5432/placeholder

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
```

### Topology decision: four parallel jobs, not one job with four steps

**Rationale:** the four gates are independent and parallelisable. A single job runs them serially; four jobs fan out and finish in ~the time of the slowest one (probably `build`). The `npm ci` cost is duplicated across jobs but is cheap with `actions/setup-node`'s built-in npm cache (a warm cache restore is ~3 s). The win on wall-clock for a contributor waiting on CI is worth the cache-restore duplication.

Caveat for `test-foundation`: if CI runner minutes ever become a billing concern, the workflow can collapse to one job with four steps without test changes. The decision is reversible.

## Versions to pin in `test-foundation`

| Package | Version observed working in spike |
|---|---|
| `vitest` | `4.1.7` |
| `@electric-sql/pglite` | `0.4.6` |
| Node (CI matrix entry) | `20` (matches the repo's existing `engines` / Vercel runtime) |

These were the actual versions installed during the spike and exercised by the PoC. `test-foundation` should pin the same to keep the bridge from spike-validated behaviour to production-installed behaviour zero-divergence.
