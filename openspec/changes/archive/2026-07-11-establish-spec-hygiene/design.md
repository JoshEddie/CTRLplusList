# Design — establish-spec-hygiene

## Context

`scripts/check-spec-purposes.mjs` currently runs as the second half of `npm run lint` (`eslint . && node scripts/check-spec-purposes.mjs`), making a TBD spec Purpose merge-blocking. The check was added outside the OpenSpec pipeline and has no spec home. Tracing the failure mode showed the violation has exactly one origin: the generated sync/archive workflow, whose instruction for newly created capability specs reads "Add Purpose section (can be brief, mark as TBD)" (`.claude/skills/openspec-sync-specs/SKILL.md:79`). Ordinary code commits cannot create a stub. The generated `openspec-*` skills cannot be hand-edited (clobbered by `openspec update`), but they are agent-executed in sessions where `CLAUDE.md` and `openspec/config.yaml` context are loaded — those two files are the available bridge.

## Goals / Non-Goals

**Goals:**

- Prevent TBD stubs at their origin (authorship time) instead of policing every merge.
- Keep a mechanical verifier and the `KNOWN_TBD` burndown ratchet, without merge-blocking.
- Record normatively why this is not a merge gate, so the decision doesn't resurface.
- Close the pre-merge gate drift in `testing-foundation` (four stale gates → five real ones).

**Non-Goals:**

- No upstream OpenSpec issue or fork; the weak generated instruction is bridged locally.
- No change to what `/finalize-spec-purposes` writes or how Purposes are drafted.
- No new merge gate of any kind; gate count stays five.

## Decisions

### D1 — Workflow enforcement over merge gate

A merge gate runs on every PR to catch a state only sync/archive can create, and it fires *after* the workflow that has a designated repair step (`/finalize-spec-purposes`) immediately downstream. Enforcement moves to authorship: when a change introduces a new capability, its Purpose is authored then, and the stub is never born. Alternatives considered: keep gate riding lint (rejected — miscategorized as a lint concern, muddies gate semantics); make it a sixth gate (rejected — ceremony for an ~80-line script whose failure mode one workflow step owns); ride `npm run build` (rejected — same miscategorization, slowest gate).

### D2 — Bridge via config.yaml + CLAUDE.md, not the generated skills

The generated sync/archive skills would be the natural home but are clobbered by `openspec update`. Both `openspec/config.yaml` (`rules.specs`, consumed during delta-spec authoring; plus the shared `context` block) and `CLAUDE.md` (loaded every session) reach the agent that executes those skills. The rule lands in `rules.specs`: a delta that ADDs a new capability must state the capability's Purpose so sync writes it instead of a TBD stub.

### D3 — Script demoted to advisory verifier, ratchet retained

The script is un-chained from `lint` and exposed as `npm run check:specs`. It remains step 6 of `/finalize-spec-purposes` and the `KNOWN_TBD` baseline keeps its only-shrinks semantics: it still detects baseline regression (a re-added name, a stale entry) and tracks grandfathered-stub burndown — just advisorily. Deleting the script was rejected: the mobile-commit episode showed the workflow gets skipped when tooling is absent, so a runnable verifier is kept; it simply doesn't block unrelated merges.

### D4 — Rationale lives in the spec-hygiene capability

The requirement that the check SHALL NOT be a merge gate is itself normative in `spec-hygiene`, with the origin analysis as rationale. Without this, the next reviewer who finds an "unenforced" check will re-add the gate — the exact churn this change unwinds.

### D5 — testing-foundation gate fix rides along

The gate-count drift (spec says four tasks including `npm test`, which now launches an interactive menu; reality is five gates) predates this change but touches the same wording being reverted in `config.yaml`'s tasks rule. Fixing it here closes all gate-description drift in one archive. A separate change was rejected as pure overhead.

## Risks / Trade-offs

- [Authorship rule is agent-discipline, not mechanical] → `check:specs` remains runnable any time and is the mandatory verification step of `/finalize-spec-purposes`; `KNOWN_TBD` regression detection still fails loudly when the script runs.
- [`openspec update` regenerates skills with the weak TBD instruction] → expected and harmless; the bridge deliberately lives outside the generated files (D2), and CLAUDE.md already documents that the generated set must not be hand-edited.
- [A stub can still land on a merged branch with nothing failing] → accepted by decision: the cost of a stale Purpose is spec-authority erosion, not shipped defects; the repair path is standing and idempotent.

## Migration Plan

Single-commit, no runtime surface: revert `lint` script, add `check:specs`, update `config.yaml` / `CLAUDE.md` / finalize-skill wording, sync the two spec deltas. Rollback is a revert of the same commit.

## Open Questions

None — all decisions resolved in the proposal interview (2026-07-11).
