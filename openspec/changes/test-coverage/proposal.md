## Why

The app has zero automated tests today. Every behavior — three-state visibility, claim under `quantity_limit`, cache-tag revalidation, server-action authorization, primitive variant matrices — is verified manually or not at all. The risks the codebase already knows about (race conditions backstopped only by partial unique indexes per `CLAUDE.md`'s no-transactions note; cache staleness when `revalidateTag` is forgotten; privacy regressions in `list-visibility`) have no regression net.

A test suite cannot land as one change. It is a governance question (which slices, in what order, with what tooling, against what coverage floor) before it is an implementation question. This change establishes the governance: a `testing-foundation` capability spec, a sub-proposal typology, per-file coverage floors, complexity gating via lint, and a fixture strategy that reuses the existing `AUTH_BYPASS=true` + `npm run db:seed:dev` infrastructure. Implementation is deferred to per-carve-out sub-proposals enumerated in `tasks.md`; each sub-proposal is its own OpenSpec change with refactor authority over its files.

The pre-merge gate trio (`lint` / `tsc --noEmit` / `build`) encoded in `openspec/config.yaml`'s `tasks` rule is the closest existing analog — this change extends that trio to a quartet by adding `test`.

## What Changes

- **NEW** capability: `testing-foundation` — global rules for the test suite (runner, layout, mocking, fixtures, coverage floors, complexity threshold, CI gating). Authoritative for cross-cutting test concerns; sub-proposals inherit from it.
- **NEW** convention: `test-*` sub-proposal prefix. Each sub-proposal is its own OpenSpec change whose carve-out is a coherent slice of the codebase (a primitive family, a capability, a layer). Each sub-proposal MAY add testing-related SHALLs to the capability spec governing its carve-out — capturing latent invariants surfaced by writing the tests.
- **NEW** code-quality discipline tied to test writing: every sub-proposal performs four audits — duplication + complexity + testability on its carve-out source, plus an assertion audit on its newly-written tests. Source-audit findings are fixed in-place or deferred as a new sibling sub-proposal; assertion-audit findings are always fixed in-place. Findings deferred as TODO comments or follow-up issues are NOT an acceptable disposition.
- **NEW** test-substance rule: tests SHALL assert observable behavior — tautologies (`expect(arr.length).toBeGreaterThanOrEqual(0)`, lone `toBeDefined()`, etc.) and execute-for-coverage calls are forbidden. Enforced mechanically via `vitest/expect-expect` + project-specific ESLint rule configuration landed at severity `error` in `test-foundation`, and verified by the assertion audit in every sub-proposal.
- **NEW** complexity gate: `eslint-plugin-sonarjs` with `cognitive-complexity` at threshold 15. Lands at `warn` in `test-foundation`, promoted to `error` per-file as each sub-proposal cleans its carve-out.
- **NEW** pre-merge `test` gate alongside the existing `lint` / `tsc --noEmit` / `build` trio. Encoded in `openspec/config.yaml`'s `tasks` rule and consumed by `tasks.md` of every future change.
- **NEW** seed-as-fixture commitment: the existing `scripts/seed-dev-users.ts` becomes the canonical E2E fixture once the foundation-spike audits gaps and either extends it or adds a parallel `e2e-fixture` seed for negative cases (private lists owned by others, etc.).
- **NEW** two-tier rollup convention for `testing-foundation` deltas across sub-proposals (rollout-period only; see design D13). Tier 1 (foundation rules) accumulate in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` and roll into the active spec at THIS governing change's archive. Tier 2 (carve-out bookkeeping) live ONLY in the sub-proposal's own archive directory and do NOT propagate. Sub-proposal authors SHALL classify their delta as Tier 1 or Tier 2 in `proposal.md` and `tasks.md` and follow the corresponding rule.
- This change writes **no test code itself**. It writes the governance and enumerates the sub-proposals.

## Capabilities

### New Capabilities

- `testing-foundation`: Governs the test suite as a system. Specifies runner choice, test file layout, fixture sources, mocking rules at external boundaries (image-search upstream MUST NOT be hit from tests; Neon HTTP DB strategy resolved by a spike), per-file coverage floors by file class, cognitive-complexity threshold, the audit obligation every test sub-proposal carries (duplication / complexity / testability with refactor-in-place vs. spin-out-sub-proposal disposition rule), and the pre-merge `test` gate.

### Modified Capabilities

None. This change defines new governance; no existing capability's behavior changes. Sub-proposals (each its own OpenSpec change) will modify their target capability specs as they discover latent invariants worth elevating to SHALLs.

## Impact

- **Tooling (added by `test-foundation` sub-proposal, scoped here):** test runner (vitest expected), `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`, `eslint-plugin-sonarjs`, DB-under-test driver (decided by spike: pglite vs testcontainers vs Neon branch).
- **Config:** `openspec/config.yaml` `tasks` rule gains a fourth required gate (`npm test` or equivalent). `package.json` gains `test`, `test:watch`, `test:e2e`, `test:coverage` scripts. `eslint.config.mjs` gains the sonarjs plugin. Coverage configuration lives with the runner.
- **CI:** A CI runner must exist to enforce the pre-merge `test` gate. No `.github/` directory exists today; `test-foundation` establishes one (GitHub Actions assumed; alternative TBD by spike).
- **Repo layout:** `test/fixtures/`, `test/helpers/` directories established by `test-foundation` for shared, DRY test infrastructure. Each test file colocates with the source it tests (`Component.tsx` → `Component.test.tsx`).
- **Seed fixture:** `scripts/seed-dev-users.ts` becomes versioned-as-fixture. Changes to it become breaking changes for E2E suites that assert against it.
- **Refactor surface:** sub-proposals have authority to refactor code in their carve-out as needed for testability. Cross-file or architectural refactors that exceed a single sub-proposal's scope become new sub-proposals listed in this change's `tasks.md`.
- **No runtime behavior change** in this change itself.
