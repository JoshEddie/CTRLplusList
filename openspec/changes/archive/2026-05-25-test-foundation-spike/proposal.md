## Why

`test-coverage` (the governing change) defers four foundation-level questions to a spike rather than locking them in by speculation: which DB-under-test technology, which runner, which CI provider, and what seed-fixture negative cases the existing `scripts/seed-dev-users.ts` is missing. The wrong choice on the DB question alone cascades into every capability-flow sub-proposal — `test-list-visibility`, `test-list-item-management`, `test-following`, `test-server-endpoint-authorization`, etc. all depend on a working integration harness against the `drizzle-orm/neon-http` driver. The right answer needs evidence, not a guess.

This change runs that spike. Its job is to produce evidence and a recommendation; `test-foundation` (the next sub-proposal) consumes the recommendation and lands the foundation. The testing-foundation capability spec (defined in `test-coverage`) requires this sub-proposal explicitly: "The first test sub-proposal SHALL be `test-foundation-spike`" with four enumerated deliverables.

Per the no-transactions constraint in `CLAUDE.md`, the partial-unique-index + `ON CONFLICT` backstop is the only mechanism preventing overclaim, duplicate follows, and duplicate visits. The spike's DB choice MUST preserve this behavior under test — a substrate where partial unique indexes behave differently from Neon-HTTP would silently make our race-condition tests meaningless.

## What Changes

- **NEW** under `spike/` (or equivalent location chosen by spike): a written comparison document — `db-under-test-comparison.md` — covering pglite, testcontainers Postgres, and Neon-branch-per-CI-run across: speed (cold-start, per-test), fidelity to `drizzle-orm/neon-http` behavior (partial unique indexes, `ON CONFLICT`, error shapes), CI cost (time + dollars per run), and local-dev ergonomics (Docker-required?, offline-capable?, integration with `npm test`).
- **NEW**: a working proof-of-concept against ONE DAL function (recommendation: a `getListsByUser`-style read with cache-tag verification) and ONE server action (recommendation: the claim action with partial-unique-index race assertion) under the recommended DB technology. The PoC is not production foundation — it's evidence that the choice works for the two cases that matter most.
- **NEW**: a written runner choice (vitest vs jest) with rationale; default expectation is vitest given Next 16 + React 19 + ESM, but if the spike surfaces a reason to choose jest, that decision is recorded here.
- **NEW**: a written CI provider choice (GitHub Actions vs alternative) with rationale and a sketch of the four-gate workflow (`lint` / `tsc --noEmit` / `build` / `test`).
- **NEW**: a `seed-negative-case-audit.md` enumerating, for each visibility/authorization negative case relevant to E2E, whether `scripts/seed-dev-users.ts` already produces an entity that exercises it. Findings: missing, partial, present. For each missing/partial, disposition: extend `seed-dev-users.ts` (preferred) or create parallel `seed-e2e-fixtures.ts`.
- **EXPLICITLY NOT** in scope: installing the runner permanently, landing CI, modifying `package.json` scripts beyond what the PoC needs locally, modifying `openspec/config.yaml`, modifying `eslint.config.mjs`, writing any production test code. All of that is `test-foundation`'s job.
- The PoC code SHALL be removed before this change archives. Its purpose is to validate the choice, not to seed the suite. The PoC's findings + the recommended approach become the inputs to `test-foundation`'s `tasks.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `testing-foundation`: adds three spike-specific requirements — the four-deliverable archival contract (comparison + PoC + runner/CI choices + seed audit), the no-migration rule for PoC code, and the dependency-revert rule. The capability itself is newly defined in the governing `test-coverage` change; this sub-proposal contributes only the spike-lifecycle requirements. Capability-level governance (coverage floors, complexity threshold, mocking rules, audit obligation) remains owned by `test-coverage`.

## Impact

- **Files created (committed, archive with this change's archive)**: spike deliverable docs under `openspec/changes/test-foundation-spike/spike/` — `db-under-test-comparison.md`, `seed-negative-case-audit.md`, plus the PoC source under `spike/poc/` for inspection.
- **Files created (temporary, removed before archive)**: any local installs of the candidate runner/DB driver needed for the PoC. The spike DOES install dependencies into `package.json` temporarily to make the PoC runnable, but reverts before archive. The lockfile churn is acceptable spike cost.
- **Files modified (committed)**: none in production code paths. If `scripts/seed-dev-users.ts` needs extension per the audit, that edit is RECORDED in the audit doc but DEFERRED to `test-foundation` — extending the seed is fixture-stable production work, not spike work.
- **Files modified (temporary, reverted before archive)**: `package.json` and `package-lock.json` for the PoC's dependencies, IF the chosen technology requires installation rather than e.g. a one-off `npx` invocation. Recorded in tasks.md.
- **No runtime behavior change.**
- **Blocks**: `test-foundation` (cannot be drafted with confidence until this spike's deliverables exist).
- **Does NOT block**: drafting of any other sub-proposal — but every other sub-proposal's IMPLEMENTATION blocks on `test-foundation` archiving.
