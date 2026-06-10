# Delta: testing-foundation

## MODIFIED Requirements

### Requirement: File size SHALL be lint-enforced as three bands

Production source files SHALL be held to the repo-wide size bands, enforced in `eslint.config.mjs`. Both rules count **lines of code** — comments and blank lines are free (`sonarjs/max-lines` counts code lines natively; the core rule is configured with `skipBlankLines`/`skipComments` to match, so the two thresholds measure the same thing):

- **Red — over 400 lines is an error.** Core `max-lines` configured at `['error', { max: 400, skipBlankLines: true, skipComments: true }]`. A red file blocks merge; the only disposition is decomposition (for data-layer modules, by table cohesion per `data-layer-organization`) — never an `eslint-disable`.
- **Yellow — 300–400 lines is a warning.** `sonarjs/max-lines` configured at `['warn', { maximum: 300 }]`. Yellow is advisory: pull easy wins where a clean extraction exists; a cohesive file MAY remain yellow indefinitely.
- **Green — under 300 lines.** The goal; no diagnostics.

Scope: the rules SHALL apply to production source (`app/**`, `lib/**`, `hooks/**`, `db/**`) and SHALL NOT apply to test files (`**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`), `scripts/**`, or data-literal modules already carved out of coverage (e.g. `app/changelog/releases.ts`). Test-file size remains governed by this capability's structural conventions (one lane per source module), not a line count.

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
