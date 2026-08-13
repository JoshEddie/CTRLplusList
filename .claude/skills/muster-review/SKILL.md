---
name: muster-review
argument-hint: '[issue#]'
description: Fresh-context review of a MUSTER (tests-only) voyage. One testing-arena agent reads the bundled arena T brief, checks test substance and traceability against the active-spec scenarios each test file's citation header names, and reports findings plus a verdict in the session. Guards against "tests pass, so they're good". Use before landing a MUSTER voyage via /landfall.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /muster-review

Full arena T rigor on a tests-only diff, minus the change-dir machinery `/spec-review` needs. One fresh testing-arena agent; verdict reported in-session, and `/landfall`'s MUSTER branch gates on the owner confirming it.

## Usage

```
/muster-review [issue#]
```

- **`<issue#>`** → the MUSTER voyage's issue.
- **No argument** → resolve the single issue labeled both `MUSTER` and `UNDER SAIL`; announce it. None, or the `UNDER SAIL` issue is not `MUSTER` (that's `/spec-review`'s lane) → say so and stop.

## Qualification — check before fan-out

Inspect the voyage's diff (`git diff` — staged plus unstaged against `HEAD`, or the pushed `issue-<N>:` commits on a fix-forward round). Any production source file touched → **stop without fanning out**: the voyage no longer qualifies as tests-only; report it to the owner.

## Fan-out — exactly one testing-arena agent

Spawn one fresh Agent-tool sub-agent, following the review family's brief-consumption pattern (a file read, never a skill invocation — `/incremental-spec-review` is the precedent):

- **Identity line** — `You are the testing agent for /muster-review.`
- **Brief pointer** — `First Read your brief at .claude/skills/spec-review/testing-brief.md and follow it exactly, with the framing adjustment below.`
- **Framing adjustment (traceability target)** — tests-only diff, no OpenSpec change, no delta specs. Do **not** run degraded: traceability targets the **active-spec scenarios cited by each test file's citation header** (`openspec/specs/<capability>/spec.md`). For each test file, read its header (capability + scenario), open the cited spec, and confirm the test asserts the observable behavior the scenario's THEN states — a test that executes the flow but asserts nothing the scenario states is a finding (tautology / execute-for-coverage). A test file missing its header is a finding. The staleness sweep is scoped to the cited scenarios' handles.
- **Diff command** — the voyage's diff, resolved above.
- **TESTING.md sweep** — the brief already mandates reading `TESTING.md` in full; sweep the diff against its forbidden patterns.

No boundary, convention, or alignment arena runs.

## The verdict report — one per round

Report the round **in the session running the skill** — no issue comment, nothing posted anywhere:

```markdown
## Muster review — round <n> (<date>)

<one- to two-sentence summary>

### Findings

<findings table, standard finding shape per .claude/skills/spec-review/reference/finding-format.md — or "None.">

**Verdict:** <clear to land | findings remain>
```

`/landfall`'s MUSTER gate reads this verdict via owner confirmation. A fix-forward round (red CI or findings drove further test edits) reports fresh; the latest verdict supersedes.

## Never touches the tree

No `review.md`, no tree artifacts, no issue comments. Never runs `git commit`, never stages, never pushes — it reviews, reports, and stops.
