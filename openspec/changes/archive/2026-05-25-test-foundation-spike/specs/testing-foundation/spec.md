## ADDED Requirements

### Requirement: Foundation spike deliverables SHALL be archived before foundation implementation begins

Before any work begins on the `test-foundation` sub-proposal, the `test-foundation-spike` sub-proposal SHALL have archived with the following four deliverables persisted in its archived change directory:

1. **DB-under-test comparison** — a written comparison of at least pglite, testcontainers Postgres, and Neon-branch-per-CI on speed (cold-start and per-test), fidelity to `drizzle-orm/neon-http` behavior (partial unique indexes, `ON CONFLICT` semantics, error shapes), CI cost (time and dollars per run), and local-dev ergonomics. Includes a recommendation.

2. **Working proof-of-concept** — runnable code (archived under the spike's `spike/poc/`) demonstrating the recommended substrate against ONE DAL function (with cache-tag invalidation verified) and ONE server action (with the canonical partial-unique-index race — claim under `quantity_limit` — verified).

3. **Runner and CI provider choices** — written choices with rationale. Default expectations are vitest and GitHub Actions; deviations from defaults SHALL be evidence-backed.

4. **Seed-fixture negative-case audit** — `seed-negative-case-audit.md` enumerating every visibility/authorization negative case relevant to E2E, classified Present / Partial / Missing against the current `scripts/seed-dev-users.ts`, with a disposition (extend seed / parallel fixture / accept-with-rationale) for each Partial or Missing case.

#### Scenario: Foundation begins with all four deliverables

- **WHEN** the `test-foundation` sub-proposal's `proposal.md` is being drafted
- **THEN** all four deliverables above are referenceable from the archived `test-foundation-spike` change directory
- **AND** the foundation proposal cites each by name as an input

#### Scenario: Missing deliverable blocks foundation

- **WHEN** any of the four deliverables is missing or incomplete at archive review
- **THEN** the spike SHALL NOT be archived
- **AND** the missing work is completed in the spike before archive

### Requirement: Spike PoC code SHALL NOT be migrated to production paths

The spike's proof-of-concept lives under the spike's `spike/poc/` subdirectory and SHALL be removed from any production path before the spike archives. `test-foundation` SHALL rebuild equivalent machinery from scratch in the production locations (`test/fixtures/`, `test/helpers/`) using the patterns the testing-foundation capability spec requires. The PoC's purpose is to validate the choice, not to seed the production suite.

#### Scenario: PoC stays inside spike directory

- **WHEN** the spike archives
- **THEN** no PoC source code resides under `test/`, `e2e/`, or any other production test path
- **AND** the PoC source archived with the change is reachable only via the archived spike directory

### Requirement: Spike SHALL revert temporary dependency installations

Any dependency the spike installs into `package.json` and `package-lock.json` SHALL be reverted before the spike archives. The exact versions tested SHALL be recorded in the comparison doc so `test-foundation` can pin the same versions when it installs them permanently.

#### Scenario: package.json is clean at archive

- **WHEN** the spike archives
- **THEN** `git diff <pre-spike-base>..HEAD -- package.json package-lock.json` shows no net change

#### Scenario: Tested versions are recorded

- **WHEN** the spike installs a candidate runner or DB driver to run the PoC
- **THEN** the exact version installed is recorded in the comparison doc
- **AND** the version recommendation in the comparison doc matches a version that was actually run
