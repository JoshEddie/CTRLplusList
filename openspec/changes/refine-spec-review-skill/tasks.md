## 1. Single-source the shared contracts in SKILL.md

- [x] 1.1 Identify the structured finding shape in `SKILL.md` and mark it as the single source the orchestrator stamps into each agent prompt (no behavioral change to the shape itself)
- [x] 1.2 Consolidate the archive-state definitions (active / premature / merged), the git discrimination command, and the reconciliation-latitude table into one location in `SKILL.md`, removing any duplicate statements

## 2. Carve out and expand the three brief files (D5)

Each brief is moved into its own bundled leaf file and then expanded for its
sub-agent's budget — not ported verbatim. Apply the removal bar to every
addition: it must change what the agent flags or how it writes a finding, else
cut it. Do not restate any shared contract from group 1.

- [x] 2.1 Create the standard-review brief as a bundled leaf file; move its dimensions and false-positive guard out of `SKILL.md`, then expand with few-shot worked findings (per dimension, in the output shape) and calibration pairs for false-positive-prone categories (e.g. N+1, race conditions, missing tests)
- [x] 2.2 Create the convention-audit brief as a bundled leaf file; move the CLAUDE.md doc-pointer logic, missing-test rule, and coverage-gaming rule, then expand with a worked example of generic pointer derivation (parse "Read X first" → gate on trigger) and concrete coverage-gaming examples in this repo's idiom
- [x] 2.3 Create the contract-audit brief as a bundled leaf file; move the direction-neutral framing and three contract checks, referencing (not copying) the archive-state data and git classification walk single-sourced in 1.2/`SKILL.md` per D3 (the orchestrator classifies once in Phase 0 and passes the state down, so the brief applies the given state rather than re-deriving it), then expand with worked mismatch findings in both neutral and directional framings — this brief is the priority for expansion

## 3. Rewire orchestration to pointer delivery

- [x] 3.1 Rewrite the Phase-orchestration step so each sub-agent is spawned in the single parallel message with a prompt = pointer to its bundled brief + the diff (or command to produce it) + resolved change name + archive state, plus the inlined finding shape from 1.1
- [x] 3.2 Confirm the contract-audit agent is still skipped when Phase 0c resolved to no change, and that the three agents still run concurrently

## 4. Reduce SKILL.md to the orchestrator's job

- [x] 4.1 Remove the carved-out brief bodies from `SKILL.md`, leaving dispatch, Phase 0, the finding-shape contract, consolidation, the verdict / clear-to-archive logic, the archive-state data, and pointers to the three briefs
- [x] 4.2 Verify every brief pointer in `SKILL.md` resolves to an existing bundled file (no pointer drift)

## 5. Verify in two layers

- [x] 5.1 Run `/spec-review` against a known diff and confirm the **output contract** is unchanged: section order, finding-table columns, text-label severities, dispositions, and verdict logic
- [x] 5.2 Spot-check **finding content** for no regression — the expanded briefs should produce findings at least as good as before; improved or additional findings are the intended outcome, not a contract violation
- [x] 5.3 Confirm no brief is registered as a separately invocable skill and that all three phases run with only the `spec-review` skill installed
