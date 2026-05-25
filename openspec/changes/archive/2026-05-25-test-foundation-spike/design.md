## Context

`test-coverage`'s design D6 enumerates three real DB-under-test options and a working hypothesis (pglite likely) but explicitly defers the decision: "the partial-unique-index behavior and `ON CONFLICT` semantics MUST be verified against the actual Neon driver behavior before commitment." This spike does that verification.

The race-condition test cases this app cares about — overclaim under `quantity_limit`, follow toggle dupes, visit-history dedupe — are ALL backstopped by partial unique indexes per `CLAUDE.md`. Any candidate substrate that diverges from Neon HTTP behavior on partial-unique-index conflicts would silently invalidate those tests. That's the fidelity bar.

The seed-fixture audit is bundled into the spike rather than into `test-foundation` because (a) the audit's findings might require extending the seed in ways that change `test-foundation`'s scope, and (b) auditing is investigative work that fits the spike's shape better than the foundation's implementation shape.

## Goals / Non-Goals

**Goals:**

- Produce a written comparison sufficient for `test-foundation` to be drafted without further investigation.
- Produce a working PoC against one DAL function and one server action that demonstrates the recommended DB approach DOES preserve the partial-unique-index + `ON CONFLICT` semantics this codebase depends on.
- Produce a runner choice and a CI provider choice with rationale.
- Produce a complete seed-fixture negative-case audit with a disposition for every gap.
- Be inexpensive — the spike should take a single conversation and produce no more code than the PoC.

**Non-Goals:**

- Install or configure the chosen tools permanently.
- Add CI workflows.
- Modify `eslint.config.mjs`, `package.json` scripts, or `openspec/config.yaml`.
- Extend `scripts/seed-dev-users.ts` — the audit records what to do; the doing is `test-foundation`'s.
- Write production test code. The PoC code is throwaway.
- Re-litigate decisions already made in `test-coverage`'s design (slicing strategy, audit obligation, complexity threshold, etc.).

## Decisions

### D1. Spike output lives under `openspec/changes/test-foundation-spike/spike/`

The comparison doc, audit doc, and PoC source live inside the change directory under a `spike/` subdirectory. When the change archives, the directory archives with it; the deliverables remain readable historically. The PoC is removable code, not production code — keeping it in the change directory avoids polluting any production path.

**Alternatives considered:** writing the comparison directly into `test-foundation`'s eventual artifacts (rejected — couples two changes and makes the spike's authorship ambiguous); writing under a top-level `docs/spikes/` (rejected — clutters the repo with one-off doc, and the spike's lifecycle is tied to this change).

### D2. PoC chooses the canonical race case

The server-action PoC SHALL exercise a partial-unique-index race against the chosen substrate. The canonical case is **claim under `quantity_limit`** — two concurrent claims for an item where only one slot remains. The PoC simulates two near-simultaneous claims and asserts that exactly one succeeds and the other fails with the expected error shape.

If the substrate is pglite (in-process), "concurrent" is simulated by interleaving the writes without await between the two calls. If the substrate is testcontainers Postgres, "concurrent" can use real parallel connections. If Neon-branch, same.

**Rationale:** this is the canonical case because (a) it's the highest-stakes race in the app, (b) the partial unique index `claim_one_per_user_per_item` (or equivalent — name to be verified during the spike) is the only backstop, (c) any substrate that gets this case wrong is unusable.

### D3. DAL PoC verifies cache-tag behavior

The DAL PoC SHALL pick a function with a `'use cache'` + `cacheTag(...)` tag and verify that a mutation calling `revalidateTag` invalidates the cached read. This is the second silent-failure class `CLAUDE.md` warns about. If pglite-or-equivalent makes this hard to test (e.g., because the cache layer needs Next.js's runtime), the spike records that as a finding and proposes an alternative (mock the cache layer; run against `next dev`; etc.).

**Rationale:** cache-tag correctness is invisible to type-checking and to most manual QA. Whatever substrate we choose MUST support testing it, or we accept a known coverage gap and document it.

### D4. Runner default is vitest, only switched on evidence

The default runner choice is **vitest**. The spike does NOT need to write a full comparison doc for runner choice unless evidence emerges during the PoC that jest fits better. Rationale: Next 16 + React 19 + ESM align with vitest's defaults; jest's ESM story remains rough; and vitest's coverage reporting (v8) is straightforward to wire to per-file thresholds (which the testing-foundation spec requires).

If something breaks during the PoC that vitest can't handle, that's evidence — record it and propose jest.

**Alternatives considered:** evaluate both equally (rejected — wastes spike time on a likely-foregone conclusion); pick jest by default (rejected — outdated default for Next 16 + React 19).

### D5. CI provider default is GitHub Actions, only switched on evidence

Default is **GitHub Actions**. The spike does not deeply evaluate CircleCI / GitLab CI / Vercel-based CI unless there's reason to believe one of them fits better. The repo is on GitHub (per the `gh` CLI commands in CLAUDE.md's commit guidance); Actions is the path of least resistance.

The spike produces a sketch of the four-gate workflow as YAML (one job, four steps, OR four parallel jobs — the spike picks). The YAML is NOT committed by the spike — it's recorded in the comparison doc for `test-foundation` to land.

### D6. Seed audit method

The audit reads `scripts/seed-dev-users.ts` and enumerates, for each capability with privacy/authorization stakes (`list-visibility`, `following`, `server-endpoint-authorization`, `visit-history`), the negative test cases E2E will need to assert. For each, classify:

- **Present** — seed already produces a fixture exercising this case.
- **Partial** — seed produces a fixture but missing some attribute (e.g., a user but no private list of theirs).
- **Missing** — seed doesn't produce anything close.

For each Partial/Missing, propose a disposition: **extend** `seed-dev-users.ts` (preferred — single source of truth) or **parallel fixture** at `seed-e2e-fixtures.ts` (only when including the case in dev seed would pollute dev UX, e.g., a fake "blocked" relationship if blocking ever exists).

**Note:** the app has no blocking model today per my read of CLAUDE.md (only follows). The audit records this as a finding — if blocking is planned, the seed will need to add it later; this spike does not.

### D7. Working hypothesis: pglite, but documented for falsification

I expect pglite to win because: zero infra (runs in CI without Docker), fastest cold-start, in-process so concurrency simulation is mechanical, MIT-licensed. The risk is fidelity to Neon HTTP on partial-unique-index conflicts and `ON CONFLICT` semantics.

The spike falsifies pglite if:

- A partial unique index defined the same way in pglite vs Neon yields different conflict behavior on the claim PoC.
- `ON CONFLICT ... DO NOTHING` / `DO UPDATE` clauses behave differently.
- Drizzle's `neon-http` adapter is incompatible with pglite at a level the spike can't bridge (e.g., requires `pg`-driver-specific APIs).

If pglite falsifies: the spike falls back to **testcontainers Postgres** (real Postgres in Docker, highest fidelity, but requires Docker in CI). If testcontainers also fails some bar (CI cost, Docker dep), the spike falls to **Neon branch per CI run** (closest fidelity — same driver — but slowest and costs $).

The spike's deliverable includes a falsification log: which behaviors were checked, which passed, which failed.

### D8. PoC is removable, audit findings are not

When the spike archives, the PoC source under `spike/poc/` archives with the change but is NOT migrated to a production location. `test-foundation` rebuilds the PoC's machinery from scratch in the proper locations (`test/fixtures/`, `test/helpers/`) per the testing-foundation spec.

The audit and comparison documents are deliverables that `test-foundation` reads but does not re-author. They live in the archive.

### D9. Dependency installation is temporary

If the chosen substrate requires installation (likely — pglite, testcontainers, or vitest all need `npm install`), the spike installs them temporarily, runs the PoC, and reverts `package.json` + `package-lock.json` before archive. The comparison doc records exact versions tested so `test-foundation` can pin the same.

**Alternatives considered:** leave the installs in place for `test-foundation` to consume (rejected — couples the changes, and if `test-foundation` is delayed the unused deps accumulate); use `npx --yes` only (rejected — some packages need to be present in `node_modules` for resolution).

## Risks / Trade-offs

[Spike falsifies all three candidates] → Unlikely (at least one of pglite/testcontainers/Neon-branch will work), but the spike's deliverables include a contingency note: if all three fail, the recommendation downgrades to "DAL/action integration tests live behind a `RUN_INTEGRATION_TESTS=true` env flag and run only against a real Neon dev DB locally; CI does unit + E2E only." This is a worse outcome but a survivable one.

[PoC accidentally becomes load-bearing] → D8 explicitly forbids this. `test-foundation` reads the PoC as inspiration only; it rebuilds the harness from scratch with the production patterns the testing-foundation spec requires.

[Audit misses negative cases that emerge only when a capability sub-proposal starts writing tests] → Accepted. Per `test-coverage` D7, capability sub-proposals can extend the seed if they find a gap. The audit is best-effort for known cases, not exhaustive.

[Runner comparison gets short-changed because vitest is the default] → Mitigated by D4's rule: the moment the PoC encounters friction vitest can't handle, the spike records evidence and switches its recommendation. The default isn't a commitment.

[Spike conflates "works" with "is best"] → The comparison doc explicitly evaluates each candidate on speed, fidelity, CI cost, and local-dev ergonomics — not just pass/fail on the PoC. If pglite passes the PoC but is markedly slower than testcontainers on a representative test count, the spike records the tradeoff.

[The PoC code is throwaway but its insights aren't documented well] → Mitigated by writing the comparison doc and audit doc DURING the PoC, not after. The PoC findings update the docs immediately so nothing is lost when the PoC code is removed.

[Reverting `package.json` cleanly] → Mitigated by capturing `git diff package.json package-lock.json` before commit; the revert is a `git checkout` of those two files at archive time. Recorded as the final spike task.
