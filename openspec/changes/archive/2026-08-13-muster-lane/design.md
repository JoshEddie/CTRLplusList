## Context

**Problem.** Map e2e scout (`map-workflow`) writes a coverage plan into a ticket at map close; that work is tests-only — every test verifies an already-active spec scenario, so no spec delta, nothing for a seal commit to seal.

**Today.** Delta machinery carries it anyway: `/embark` → change dir → `/spec-review` → two-commit landfall.

**Fix.** Lane built from issue + labels + skill splits. Prior handoff's thin `test-coverage` OpenSpec schema rejected step by step.

**Current state:**

- `/set-sail` — gates on change-dir+dirty-tree heuristic, enters only `/opsx:apply`.
- `/landfall` — gates on `review.md`, always seals.
- `label-machine.md` — no tests-only routing state.
- Scout's chunk — born `CHARTED` like any other.

## Goals / Non-Goals

**Goals:**
- Tests-only coverage chunks flow scout ticket → `/set-sail` MUSTER lane → `/muster-review` → `/landfall` no-seal branch, no change dir at any point.
- Fresh-context review of test substance — guarding "tests pass so they're good" — without miscalibrated arenas.
- Both lanes share one occupancy invariant: `UNDER SAIL` beacon.

**Non-Goals:**
- No `test-coverage` OpenSpec schema — explicitly rejected.
- Not dissolving the `e2e-critical-flows`/`e2e-management-flows`/`e2e-pwa-offline` inventory specs into `testing-foundation` — separate follow-up.
- Not adding the test-citation-header convention text to TESTING.md — separate follow-up; lane cites the convention whose canonical home lands there.
- Not writing issue #297's tests — they land later through the lane.

## Decisions

### Landing owned by /landfall (no-seal branch), not a set-sail tail

**Rule.** Landfall stays single landing ritual — one skill owns commits-hand-off, CI wait, `IN PORT` flip. `trunk-workflow`'s landfall requirement MODIFIED, not overridden.

**Rejected.** Set-sail-owned landing tail — splits ritual across two skills.

### MUSTER landings always CI-verified, no verification question

**Why no question.** Fast/verified question decides what happens between two commits; MUSTER has one, and its deliverable IS the e2e battery — CI green is the verification.

**Flow.** stage → owner signs → push → wait green CI → flip `IN PORT`.

**Dropped:**

- Live click-test — tests have no live surface.
- Summary comment — harvest ritual feeds the e2e scout; this chunk is scout's output.

### Occupancy gate is the label alone

**Gate.** Hard-stop when ANY issue carries `UNDER SAIL` — both lanes.

**Heuristic dropped**, not kept alongside: change-dir+dirty-tree can't see MUSTER voyage (no change dir), duplicates what the beacon declares.

**Stranded beacon.** Out of scope — `/port-inspection` reconciles a stranded `IN PORT` by stamping `UNDER SAIL`, never clears one. See Risks.

### Review is a new lean /muster-review skill

**Shape.** `/muster-review` fans out one fresh testing-arena agent reading the bundled arena T brief by reference — pattern `spec-review`'s spec already blesses for `/incremental-spec-review` ("the bundled briefs are the single source of the arena contract for the whole review family"). Traceability runs against cited **active**-spec scenarios, not delta specs.

**Output.** Verdict + findings in the session running the skill (supersedes earlier issue-comment design); landfall's MUSTER review gate is one line — owner confirms latest verdict reads clear.

**Rejected**, kept for record:

- Full `/spec-review` no-change mode — 3 arenas, testing degraded: arena C excludes test files, traceability skipped exactly where it matters.
- Fidelity gate inside landfall — review body in the landing skill; the same split the single-ritual rule forbids.
- Set-sail self-check — writer grades own work.
- Owner-eyes-only — no gate forces it; landfall gates on a verdict existing.

### Traceability direction

**Direction.** Test → spec, via in-file citation header naming capability + scenario. Never spec → test.

**Freshness check.** Lane greps every cited `#### Scenario:` heading against active specs — cheap staleness catch; missing heading stops voyage back to owner.

### Birth label rule lives in issue-cut.md only

**Home.** `issue-cut.md` — `map-workflow`'s spec already declares it the sole birth-label rule-set; scout's closing e2e chunk born `MUSTER` there.

**No other edits.** `/port-inspection` carries no birth-label text, so nothing to contradict; not given its own rule. `/embark` needs none — allowlist admits only `CHARTED`, so `MUSTER` correctly stops it.

## Risks / Trade-offs

- **Stranded `UNDER SAIL` beacon blocks all set-sail, no heuristic fallback** → unmitigated: nothing in the fleet clears a stranded `UNDER SAIL` — `/landfall` and `/run-aground` clear it only from a live voyage, `/port-inspection` reconciles a stranded `IN PORT` by stamping one. Collision window is narrow: MUSTER chunks cut only when all other tickets are in port or closed.
- **Muster-review verdict lives only in the review session — no durable record** → Accepted: diff is tests-only, contract (active specs) already sealed; landfall gates on owner confirming latest verdict.
- **Arena T brief drift — brief wording assumes change-dir diff** → `/muster-review` frames traceability target (cited active-spec scenarios) in its agent prompt; if brief later hard-codes delta-spec assumptions, that framing line is the single seam to fix.
- **Doc-only diff skips two test gates locally** → CI still runs full battery on push; exemption named in tasks.md's pre-merge lead-in per CLAUDE.md.

## Migration Plan

**Owner setup.** Create GitHub label — `gh label create MUSTER ...`. Labels made at repo setup, never by skills.

**Cleanup.** Delete untracked `openspec/changes/e2e-map-233-coverage/`.

**Rollback.** Nothing to plan — no code or data.

## Open Questions

None.
