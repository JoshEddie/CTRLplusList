## Why

**Problem.** Tests verifying scenarios already stated in active specs add no capability and no spec delta.

**Today.** `/set-sail`, the only route into occupying the tree, demands an OpenSpec change dir — so tests-only coverage chunks (the e2e scout's closing chunk, e.g. issue #297) ride machinery built to carry deltas to a seal commit. No delta, nothing to seal: a change dir there is theater.

**Rejected alternative.** A prior "test-coverage schema" handoff, on three counts:

- `/spec-review` is miscalibrated for a tests-only diff — arena C excludes test files, arena T targets delta specs, arena A degenerates.
- A proposal Coverage table duplicates the citation headers the tests already carry.
- The plan already exists — `/port-inspection`'s e2e scout writes it into the ticket at map close.

Inherited constraints from active specs this change modifies, reworded here rather than bypassed:

- `trunk-workflow` binds `/set-sail` as the only route into implementing a change, gated on one-change-mid-apply, and binds `/landfall`'s review-verdict gate to a change's persisted `review.md` (spec.md:71).
- `map-workflow` owns the e2e scout and the closing-chunk cut via `issue-cut.md`.
- `spec-review` establishes the bundled arena briefs as the single source of the arena contract for the whole review family, with `/incremental-spec-review` as precedent for consuming brief files directly — the new `/muster-review` follows that pattern without factoring any brief out.

Owner decisions:

- Landing runs through a `/landfall` no-seal branch, not a set-sail tail.
- The set-sail occupancy gate becomes label-only (`UNDER SAIL` beacon).
- MUSTER landings are always CI-verified — the e2e battery IS the verification, no live click-test.
- Review is a new lean `/muster-review` skill fanning out one fresh testing-arena agent — not a landfall gate body, self-check, or owner-eyes-only.
- The untracked `openspec/changes/e2e-map-233-coverage/` scratch dir is deleted.

## What Changes

- **New `MUSTER` routing label** — marks the coverage roll-call chunk the map's e2e scout cuts: plan in the ticket body, no spec delta, skips `/embark`. Label row in `label-machine.md`; birth rule in `issue-cut.md` (scout's closing e2e chunk born `MUSTER`, not `CHARTED`). GitHub label creation is an owner-run setup step. `/embark` needs no edit — it already admits only `CHARTED`.
- **`/set-sail` split** — identity strengthens from "only route into the apply stage" to "only route into occupying the tree".
  - Gate simplifies to the declared beacon: hard-stop if ANY issue is labeled `UNDER SAIL`, replacing the change-dir+dirty-tree heuristic, which cannot see a MUSTER voyage.
  - Argument resolves to an OpenSpec change (existing lane, unchanged) or a `MUSTER` issue (new lane).
  - New lane: add `UNDER SAIL` alongside `MUSTER`; ticket body is the plan; staleness grep of every cited `#### Scenario:` heading against active specs, missing → stop; read TESTING.md in full; every test file carries the citation header; implement inline — no `/opsx:apply`.
- **New `/muster-review` skill** — fans out one fresh testing-arena agent reading the existing bundled arena T brief; traceability runs against the cited **active**-spec scenarios, not degraded; verdict + findings reported in-session, no issue comment. Guards against "tests pass so they're good".
- **`/landfall` no-seal branch for MUSTER issues**
  - Review gate is owner confirmation of the latest `/muster-review` verdict, not `review.md`.
  - Keep lint+tsc gates; skip the archive/seal half and the verification question.
  - Single owner-signed `issue-<N>:` work commit, push after signing, wait for green CI, flip `IN PORT`.
  - No summary comment — this chunk IS the scout's output.
- **Doc touch-ups** — CLAUDE.md § Trunk workflow fleet list gains a one-clause MUSTER mention; `/port-inspection` skill text verified non-contradicting (birth label falls out of `issue-cut.md`).
- **Cleanup** — delete untracked `openspec/changes/e2e-map-233-coverage/`.

## Capabilities

### New Capabilities
- `muster-review`: fresh-context testing-arena review of a MUSTER (tests-only) diff — one agent, arena T brief, active-spec traceability, verdict reported in-session.

### Modified Capabilities
- `trunk-workflow`: `/set-sail` gate becomes the `UNDER SAIL` label check and gains the MUSTER lane; `/landfall`'s review-verdict gate becomes conditional (change-dir landings bind `review.md`; MUSTER landings gate on owner confirmation of the muster-review verdict) and gains the no-seal always-CI-verified MUSTER branch; one-voyage-at-a-time restated on the `UNDER SAIL` beacon so both lanes share the invariant.
- `map-workflow`: closing e2e chunk cut language aligned with the MUSTER birth label — smallest edit that removes contradiction, no restructure.

## Impact

- **Skills**: `.claude/skills/set-sail/SKILL.md`, `.claude/skills/landfall/SKILL.md`, new `.claude/skills/muster-review/` (reads the arena T brief by reference).
- **Skill references**: `.claude/skills/map/reference/label-machine.md`, `.claude/skills/map/reference/issue-cut.md`; verify `.claude/skills/port-inspection/SKILL.md`.
- **Specs**: `openspec/specs/trunk-workflow/spec.md`, `openspec/specs/map-workflow/spec.md`, new `openspec/specs/muster-review/spec.md` (via delta).
- **Docs**: `CLAUDE.md` (one clause).
- **Repo setup**: owner creates the `MUSTER` GitHub label (`gh label create`).
- **Test gates**: markdown/skills/specs-only diff — the doc-only test-gate exemption applies, named in tasks.md's pre-merge lead-in; lint + tsc + build still run. No production code, DB, UI primitives, or cache tags.
