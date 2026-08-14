## Context

The review family today: `/spec-review` (full, three lanes standard/convention/contract, subagent fan-out per #279), `/recheck-review` (inline verify of fix deltas, escalating on size/file tells), `/adjudicate-review` (fresh-session owner interview appending `### Adjudications`, landed via #273), `/release-review` (release cut, shares only the header/round/finding-shape contract). `/landfall` gates on the latest round's effective verdict.

Map #269 settled (tickets #271, #272) a third lever plus an arena restructure; embark grilling settled the residual mechanics (ID lettering, escalation fate, gate-section ownership, shared briefs, B's diff scope, in-interview issue creation). All settled — no open questions.

Constraints: skill/doc-only; skills never `git commit`; `spec-review`'s existing spec requirements on fan-out mechanics (JSON reply, one retry, abort), self-containment, progressive disclosure, and persistence stay binding — this change re-lanes the content those mechanics carry.

## Goals / Non-Goals

**Goals:**

- A second-stage full-rigor review that never requires staging the fix delta.
- One arena vocabulary (A/B/C) across both full-rigor skills, single-sourced briefs.
- Persisted-report truth preserved: rounds append-only, effective-verdict reader rule untouched.
- An explicit tasks.md gate trail for adverse rounds that `/landfall`'s existing tasks gate enforces for free.

**Non-Goals:**

- `/release-review` behavior (consumes shared format; no arena tables there).
- Verdict vocabulary changes (`clear to land` / `findings remain` / `outgrew recheck` / `ready to cut` / `not ready` all survive).
- Anchor wiring for File-issue follow-ups (deferred pending #275; plain `gh issue create` only).
- Any `/landfall` gate behavior change (wording gains the new skill's name, nothing else).

## Decisions

### Arena restructure: dissolve standard, three lanes in both skills

A **Alignment** absorbs contract (tasks/design/spec-delta audit, `openspec validate`); B **Boundary** takes standard's corpus-relative cargo (duplication, naming-fit, doc-vs-code drift, cross-file performance), fenced by "invisible viewing the delta alone"; C **Convention** takes house law (CLAUDE.md + gated doc-pointers, test substance, coverage-gaming) and standard's single-sight craft cargo (security, correctness, single-file performance, single-responsibility). Every C finding cites its source — a doc rule or a named universal principle; a "universal" citation is itself shakeable at adjudication. Coverage thresholds belong to no arena (`test:coverage` is mechanical). Rationale: the standard/convention split leaked (both audited the same lines with different citations); the new fence is scope (corpus-relative vs single-sight), which is also exactly the axis the incremental skill needs to scope its fan-out. Alternative kept-four-lanes rejected in #271: fan-out cost got cheaper, not pricier.

### Shared briefs, different diff commands

The three briefs live in `.claude/skills/spec-review/` (renamed `alignment-brief.md`, `boundary-brief.md`, `convention-brief.md`); `/incremental-spec-review` points its agents at the same files, passing its own diff commands — the brief carries the arena's review contract, the orchestrator owns scope. This mirrors how `recheck` and `adjudicate` already consume `finding-format.md` as format-only reference (no runtime dependency on the spec-review *skill*, a file read is not an invocation). Alternative own-copies rejected: six briefs drifting.

### Incremental's scopes

From the review header's `anchor:` sha — A and C agents review `git diff` (unstaged-atop-staged fix delta); B reviews `git diff <anchor>` (staged + unstaged, the change's whole footprint), because corpus-relative defects can be created by the *combination* of reviewed and unreviewed edits. Fan-out mechanics (parallel Agent-tool subagents, JSON reply convention, one retry, abort) are spec-review's existing contract, reused verbatim.

### Routing: what changed, not how much

- `/recheck-review`: fix delta changed code OR spec artifacts, never both. Verify-only.
- `/incremental-spec-review`: the delta changed both — the contract moved, so full rigor plus recheck's prior-findings status table (one round, one verdict; heading `## Round N — incremental-spec-review (<date>)`).
- Full `/spec-review` reruns only by explicit owner choice.
- Size is not a tell anywhere; the files-outside-diff tell is retired. `outgrew recheck` survives with exactly one trigger — mid-recheck the delta turns out to touch both sides — and now directs to `/incremental-spec-review`.

### Finding IDs: capital letters, one global sequence

`<A|B|C><integer>`, integer incrementing globally across all findings within a round (`A1, B2, C3` — never `A1, B1`), merges joined with `+` (`A1+C3`). The existing scheme already carried global integers; this swaps letters and case. Old IDs (`s1`, `c3`, `k4`) in already-persisted reports stay valid history — readers resolve IDs within their own round, so no migration.

### Gate sections in tasks.md

Any change-review round (spec-review, incremental, recheck) whose verdict is adverse (`findings remain`) appends to the change's `tasks.md`:

```markdown
## Gates — round <n>

- [ ] <ID> <one-line finding> — resolved
```

one item per open `Fix now` finding. Sections are append-only per round; prior sections are never unchecked or edited. Exits: the fixes land and the section is checked off in the fixing session; or an adjudication re-dispositions every open `Fix now` and — its recomputed verdict now clearing the round — **deletes** that round's pending gate section (a gate for findings that no longer block is dead weight, and leaving it unchecked would wedge `/landfall`'s tasks gate on a cleared round). `/landfall`'s all-tasks-checked gate is the enforcement and needs no change. `outgrew recheck` also appends its section (the open findings still exist; the next incremental round supersedes it the same way an adjudication does — verify-then-check or carry forward).

### Adjudication creates File-issue follow-ups in-interview

When the owner confirms `File issue`, the interview asks the issue type — chunk into the change's open map (same-release commitment) vs standalone `OFF THE MAP` — then runs `gh issue create` (and sub-issue wiring for the map case) and records the created issue's link in the Adjudications rationale column. Plain `gh`, no `/anchor` invocation (deferred pending #275); the disposition's existing rule — the only durable form is an actual issue — finally gets an owner at the moment of decision instead of an honor-system afterstep. `adjudicate-review`'s side-effect surface grows to: `review.md` append, gate-section delete, `gh issue create`. Still no commits, no staging, no fixes.

## Risks / Trade-offs

- [Old persisted reports carry `s/c/k` IDs and `### Standard/Convention/Contract` tables] → readers (`recheck`, `adjudicate`, `landfall`) operate on the *latest* round's own IDs and the verdict line; nothing re-derives arena semantics from old letters. Mixed-vocabulary files are expected history.
- [Gate-section deletion is the one place a skill removes prior content from a change artifact] → scoped strictly: only the pending (latest adverse round's) section, only when the recomputed effective verdict clears, never a prior round's checked section, never review.md content.
- [Shared briefs create a real coupling between two skills] → deliberate: the arena contract *should* move in lockstep; the brief files are the single source the spec-review spec already mandates for shared contracts.
- [`outgrew recheck` round now also writes a gate section whose findings the follow-up incremental round re-verifies] → the incremental round's status table is the authoritative resolution record; its clearing verdict licenses checking off or superseding the stale section, same as fixes do.
