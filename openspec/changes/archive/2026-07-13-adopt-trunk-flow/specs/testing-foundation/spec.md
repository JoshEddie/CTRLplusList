# testing-foundation Delta

`app/changelog/releases.ts` is deleted by this change (dead data, zero importers), so the two requirements that name it as a carve-out example are updated to drop the reference. No behavioral rule changes.

## MODIFIED Requirements

### Requirement: Coverage SHALL be enforced per-file with a single universal floor

Coverage SHALL be measured and enforced per file, not as a layer or repo-wide aggregate. There SHALL be exactly one floor applying to every enumerated file regardless of file class:

| Metric | Floor |
| --- | --- |
| Lines | 98% |
| Statements | 98% |
| Branches | 95% |
| Functions | **100% (non-negotiable)** |

The `functions: 100%` floor is non-negotiable: an uninvoked exported function is a real test gap, not slop. Dead code SHALL be deleted, not protected by a lower floor.

Files excluded from coverage enforcement (informational only): `*.d.ts`; generated drizzle artifacts under `drizzle/`; `app/sw.ts`; test files themselves and their `__tests__/` siblings (matched by `**/__tests__/**`); barrel `index.ts` re-exports of zero runtime behavior (matched by `app/**/index.ts` — scoped to `app/`, NOT a global `**/index.ts`, which would silently exclude `db/index.ts` and other top-level index modules that carry runtime; every `index.ts` under `app/` is by convention a pure re-export, and the review bar is that it stays one); type-only `**/types.ts`; layout files without branching logic; constant-data modules holding only literal data with no executable behavior (`app/ui/components/field/field-icons.tsx`); the NextAuth framework barrel `app/api/auth/[...nextauth]/route.ts` (matched by `app/api/auth/*/route.ts` — a pure re-export of NextAuth's handlers whose behavior is covered via `lib/auth.ts` tests). The app scope of the index-barrel exclude is invariant: a global `**/index.ts` exclude SHALL NOT be introduced.

While the parent `test-coverage` change is in flight, the per-file threshold list in `vitest.config.ts` MAY enumerate only files with landed tests (so files in untested carve-outs do not fail the gate they have no opportunity to pass). When the parent `test-coverage` change archives, the per-file enumeration SHALL be removed and the floor SHALL apply universally across `coverage.include` — at that point, every file in `coverage.include` (subject to `coverage.exclude`) is gated against the universal floor.

Each test sub-proposal SHALL enforce the coverage floor on every file in its declared carve-out at archive time. A repo-wide coverage report SHALL be generated for visibility but SHALL NOT gate merge until the parent `test-coverage` change archives.

#### Scenario: Functions floor is non-negotiable

- **WHEN** a sub-proposal's carve-out includes a file with an exported helper that has no invoking test
- **THEN** the file's `functions` coverage metric is below 100%
- **AND** the pre-merge `test` gate fails
- **AND** the disposition is to write the missing test OR delete the unreachable function — NOT to lower the floor

#### Scenario: Small helper cannot hide behind fat file

- **WHEN** a sub-proposal's carve-out includes both a 500-line component and a 30-line helper
- **THEN** coverage is computed per file
- **AND** the 30-line helper meeting the floor is checked independently of the 500-line component meeting the floor
- **AND** an aggregate average across the two does NOT satisfy the gate

#### Scenario: Per-file enumeration during test-coverage flight

- **WHEN** the parent `test-coverage` change is in flight (not yet archived) and a contributor adds the file `app/(main)/lists/page.tsx` to production without writing tests for it yet
- **THEN** the file does NOT appear in `vitest.config.ts`'s per-file threshold enumeration
- **AND** the pre-merge `test` gate does NOT fail on that file
- **AND** the file's coverage gap is captured in the parent change's task list awaiting its carve-out sub-proposal

#### Scenario: Enumeration deletes at test-coverage archive

- **WHEN** the parent `test-coverage` change archives via its task 7.3 baseline
- **THEN** the per-file enumeration in `vitest.config.ts` is removed
- **AND** the universal floor applies to every file matched by `coverage.include` and not excluded by `coverage.exclude`

#### Scenario: Index-barrel exclude is app-scoped

- **WHEN** a contributor proposes adding `**/index.ts` to `coverage.exclude`
- **THEN** the proposal is rejected
- **AND** the only acceptable index-barrel exclude is `app/**/index.ts` (app-side `index.ts` files are zero-runtime re-export barrels by convention)
- **AND** `db/index.ts` (which carries Drizzle init) is NOT excluded

### Requirement: File size SHALL be lint-enforced as three bands

Production source files SHALL be held to the repo-wide size bands, enforced in `eslint.config.mjs`. Both rules count **lines of code** — comments and blank lines are free (`sonarjs/max-lines` counts code lines natively; the core rule is configured with `skipBlankLines`/`skipComments` to match, so the two thresholds measure the same thing):

- **Red — over 400 lines is an error.** Core `max-lines` configured at `['error', { max: 400, skipBlankLines: true, skipComments: true }]`. A red file blocks merge; the only disposition is decomposition (for data-layer modules, by table cohesion per `data-layer-organization`) — never an `eslint-disable`.
- **Yellow — 300–400 lines is a warning.** `sonarjs/max-lines` configured at `['warn', { maximum: 300 }]`. Yellow is advisory: pull easy wins where a clean extraction exists; a cohesive file MAY remain yellow indefinitely.
- **Green — under 300 lines.** The goal; no diagnostics.

Scope: the rules SHALL apply to production source (`app/**`, `lib/**`, `hooks/**`, `db/**`) and SHALL NOT apply to test files (`**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`), `scripts/**`, or data-literal modules already carved out of coverage (e.g. `app/ui/components/field/field-icons.tsx`). Test-file size remains governed by this capability's structural conventions (one lane per source module), not a line count.

Gate interaction: the pre-merge "zero warnings" lint bar SHALL be read as zero warnings **outside the yellow band** — yellow size advisories are the single deliberate warning class and do not block merge. Per-file or per-line `eslint-disable` for either size rule SHALL NOT be added.

#### Scenario: Red file blocks at lint

- **WHEN** a production source file reaches 401+ lines
- **THEN** `npm run lint` reports a `max-lines` error and pre-merge fails until the file is decomposed

#### Scenario: Yellow file warns without blocking

- **WHEN** a production source file sits between 300 and 400 lines
- **THEN** lint emits a `sonarjs/max-lines` warning, visible in lint output, and merge is not blocked

#### Scenario: Test files are exempt

- **WHEN** a `__tests__/` suite or e2e spec exceeds 500 lines
- **THEN** neither size rule fires; test structure is governed by the one-lane-per-source-module convention, not a line count

#### Scenario: No escape hatches

- **WHEN** a PR adds an `eslint-disable` (file- or line-level) for `max-lines` or `sonarjs/max-lines`
- **THEN** the PR is rejected at review; the disposition is decomposition (red) or accepting the visible warning (yellow)
