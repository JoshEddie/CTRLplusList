---
name: artifact-review
argument-hint: '[change-name]'
description: Review a change's OpenSpec artifacts before any code is written - do proposal, adr, specs, design, acceptance and tasks agree with each other, does each meet the contract its artifact instruction sets, and does the task list cover what they ask for. A fast pre-flight between /embark-write-tasks and /embark-apply, catching the wrong contract before an apply run builds against it. Reports in the session and writes nothing.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /artifact-review

The change's documents, read against each other and against the contract each was written to. Everything here is cheaper to fix now than after `/embark-apply` has built against it — a wrong spec caught here is one edit, caught at `/spec-review` it is an edit plus the code that was written from it.

A pre-flight, not a deep dive. The sweep is bounded (see **The sweep budget**) and the report says so, so a miss reads as a known limit rather than a false pass.

## Usage

**Run this in a fresh chat.** If this conversation wrote or repaired the change's artifacts, stop and start a new one — a run holding the authoring argument reads agreement into documents that do not state it.

```
/artifact-review [change-name]
```

No argument: the single change whose `review.md` sits at `round: 0` and whose `tasks.md` exists (ask if several).

## Entry

Verify the change holds `tasks.md`; without one, stop and name [/embark-write-tasks](../embark-write-tasks/SKILL.md). Verify no round exists in `review.md` — once apply has run, review belongs to [/spec-review](../spec-review/SKILL.md).

Run first, before reading anything:

```bash
openspec validate <name> --strict
openspec instructions adr --change <name> --json
openspec instructions specs --change <name> --json
openspec instructions acceptance --change <name> --json
```

A `validate --strict` failure is a Critical finding on its own, and it clears the structural half of check 4 for free — spend no attention re-checking hashtag depth, missing scenarios or `Purpose` length by eye.

The three instructions are the bar checks 2, 4 and 7 measure against. Read them; never restate them here. Everything this skill says about what an ADR, a spec or an acceptance flow must be is **padding around** those instructions — extra context for judging them — and contradicts none of them. Where this file and an instruction disagree, the instruction wins.

Then read the change directory whole: `proposal.md`, `adr.md`, `design.md`, `specs/**/spec.md`, `acceptance.md`, `tasks.md`.

**The review runs in this chat.** No sub-agents: the artifacts are short, and the agreement check needs all of them in one head — a fan-out would re-read every file per agent to answer a question one reader already holds.

## The sweep budget

Checks 5 and 6 reach outside the change directory. The reach is bounded:

- **Capabilities** — those named in the proposal's Capabilities section, plus any `openspec/specs/**/spec.md` hit by a grep for the change's handles (routes, DOM classes, component names, DB columns, commands).
- **Read on hit only** — a canonical `spec.md` is read whole when a grep matched inside it, never wholesale.
- **Docs** — only a doc a delta requirement or an ADR entry's **Touching** cell actually points at, plus the read-first docs `openspec/config.yaml` names.

No corpus-wide contradiction hunt. State the budget in the report's scope line.

## The corpus is not the bar

A canonical spec is read for **what it asserts** — the contract in force, which check 6 needs — and never for **what it looks like**. Existing `openspec/specs/**` holds grandfathered material that was never held to today's bar; `/embark-design` names the case directly, and a scenario that fails the bar plainly still stays as written while it stays true. The corpus is therefore evidence of what is true, not evidence of what is good.

So a delta requirement is never sound because a nearby canonical one is written the same way, and never a finding because it is written differently. The bar for checks 2, 4 and 7 is the artifact instruction read at entry, and nothing else.

The same holds harder for `adr.md`: the library is young and its entries carry no precedent value at all. Judge an entry against the `adr` instruction and check 2's two hard criteria, never against what the entries already in `openspec/adr/` happen to look like.

A corpus read produces findings about **this change** only. A canonical requirement that is itself weak is out of charter — `File issue`, not a defect of the change under review.

## The ten checks

### 1. The artifacts agree with each other

Every artifact against every other: `proposal.md`, `adr.md`, `design.md`, `specs/**`, `acceptance.md`, `tasks.md`.

The yardstick is the artifacts against **each other**, never against the GitHub issue. Grilling at `/embark-design` legitimately moves a change past what its issue asked; measuring against the issue would report that movement as a defect.

This check owns the disagreements with no behavior behind them — a statement in `proposal.md` that `design.md` denies, a capability listed in the proposal with no delta spec file, a **Touching** term absent from the `openspec/adr/INDEX.md` term bank. Behavior stated in a document and carried by no spec belongs to check 5, whose repair is specific.

**Framing is neutral**: name the repair on both sides and let the owner adjudicate. Never presume the spec is the correct side.

**Weight of evidence leans it.** State the tally in the finding — "proposal, design and spec agree; acceptance dissents" — and name the outlier as the **presumptive** repair site, with the other repair still named and open. A two-way tie stays fully neutral. Presumption is not a verdict.

### 2. Every ADR entry meets the bar for being one

The bar is the `adr` instruction read at entry. Two criteria are hard, and a breach of either is an automatic finding:

- **Permanence** — an entry states what is true from now on, undoable only by an explicit superseding entry. A decision contingent on a state expected to end (a migration window, a workaround pending an upstream fix, anything that reads with an implicit "for now") belongs in `design.md`. Tell: its **Consequences** name a condition that would retire it without anyone writing a `REMOVED`.
- **Reach** — an entry binds work beyond this change. One that binds only this change belongs in `design.md`.

Everything else is open judgment. This artifact is new and its failure modes are not yet known, so the check does not pretend to a rule set nobody has earned: **emit a one-line verdict per entry — good, or not good with the reason — even when every entry passes.** Mark any finding outside the two hard criteria **provisional**. Those provisional judgments are how the bar gets tightened later; the session report is the record.

### 3. Decisions that should have been entries and aren't

The discriminator is `/embark-design`'s Decision Routing: a decision binding only this change goes in `design.md`; every other decision is an entry in `adr.md`. A decision leaves `design.md` for `adr.md` only when it clears **both** of check 2's hard criteria — permanence and reach. Failing either keeps it in design, so the high bar for an entry is structural rather than a matter of taste.

The reverse fires as this same check: an `adr.md` entry that binds only this change is misrouted, and a wrongly promoted entry pollutes `openspec/adr/` for every future change that reads the index.

Hunting ground: `design.md` § Decisions, decisions stated only in `proposal.md` prose, and normative-sounding prose sitting outside a requirement in a delta spec.

### 4. Every spec meets the bar for being one

The bar is the `specs` instruction read at entry, plus the `validate --strict` result already in hand. Structure comes from the CLI; judge substance:

- A behavior contract, not an implementation plan — apply the instruction's quick test: if the implementation can change without changing externally visible behavior, it does not belong here.
- Normative language (SHALL/MUST), not should/may.
- A new capability's `## Purpose` is real, never a `TBD` placeholder.
- A `## MODIFIED Requirements` block carries the **entire** updated requirement, not a fragment — the instruction's named pitfall, and it loses detail silently at archive time.

### 5. Requirements that should have been added and aren't

Behavior asserted in `proposal.md` or `design.md` that no delta requirement carries. One finding, owned here rather than by check 1, because the repair is specific: write the requirement.

Same rule the `acceptance` instruction states from the other side — neither `design.md` nor `adr.md` ever sources behavior. A document asserting behavior alone is a gap in the specs, not a document to be trusted.

### 6. Requirements that should be modified or removed and aren't

Four triggers, all within the sweep budget:

- A canonical requirement this change makes false, with no delta touching it.
- A `## MODIFIED` block carrying partial content (also check 4; report once).
- A **grandfathered scenario** — `/embark-design`'s case: a scenario that was never spec material stays as written while it stays true, and this change makes it false. The delta neither rewrites it (MODIFIED) nor removes it.
- **Doc drift** — a rule in a prose channel (`CLAUDE.md`, `TESTING.md`, `DATABASE.md`, `LOCALDEV.md`, or a doc a **Touching** cell names) that this change makes false, with no task to edit it. Its repair is a `tasks.md` item, so it lands as a check-9 finding too; report it once, here.

### 7. Every acceptance flow is well written and accurate

The bar is the `acceptance` instruction read at entry — GWT arc, one atom per row, root actor with a literal handle, a Then asserting what execution emitted, hand-written source never a When or a Then.

Accuracy: every row traces to the scenario it claims. This audits `acceptance.md` **as written** — it does not re-chain the flows from scratch. That sweep is [/embark-qualify](../embark-qualify/SKILL.md)'s and already ran.

### 8. Every touched requirement appears in at least one flow

Runs requirement → flow, the coverage direction: walk the delta's requirements and find each one in a flow. Not flow → gap.

A requirement in no flow is the finding. Then ask why: where nothing a flow could reach exists behind it, the uncovered requirement has surfaced a gap, and that is the finding to report rather than the coverage miss.

### 9. One task for each thing needed

Source list, in order:

- Every requirement across the delta specs — `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`.
- One promotion task per `adr.md` entry, naming the file it writes; plus a second task where that entry's **Touching** cell is a repository path, putting its **Decision** into that document with a citation back. Both are mandatory in the `tasks` instruction.
- `design.md`'s Migration Plan steps.
- Any doc edit check 6 surfaced.

The reverse fires too: a task tracing to no artifact is either scope creep or a requirement nobody wrote. Report it neutrally with both repairs named.

### 10. The five gates are five tasks

`openspec/config.yaml` `rules.tasks`: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`, `npm run test:e2e` — each its own checkable item, never collapsed into one "validate" checkbox, so partial failure stays visible.

Under the doc-only exemption the two test gates MAY be **omitted** — no checklist item — with the section's lead-in naming the omitted gates and the rationale. An omitted gate with no lead-in, or a collapsed checkbox, is the finding. Any executable file in the change voids the exemption.

## The report

Emit one report in the session, in this order. The finding table follows `.claude/skills/spec-review/reference/finding-format.md` — same columns, same text severity labels, no emojis, same `Fix now` / `File issue` / `Drop` dispositions. IDs are keyed to the check that caught the finding: `C<check>.<n>` — `C4.1`, `C6.2` — so every finding names its check.

```markdown
# /artifact-review — <change-name>

<one- to two-sentence summary: overall artifact health + the headline problem>

**Scope:** <change-name> · sweep: <capabilities read> · `validate --strict`: <pass | fail>

## Findings

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

## ADR entries

| Entry | Verdict | Note |
|-------|---------|------|

## What looks good
- <short bullets>

**Verdict:** <clear to apply | findings remain (blockers: …)>
```

The **ADR entries** table is written every run, one row per `adr.md` entry, passing or not — it is the harvest that tightens check 2 later. An `adr.md` with no entries shows `_none_`. No findings shows `_none_` in the findings table.

## The verdict

Report before repairing anything.

While a finding stands, the change does not advance on this skill's authority. **Pause** on one question — repair the findings, or continue:

- **Repair** — through `/opsx:update`, never a direct edit of an artifact. `tasks.md` findings repair the same way; it is a generated artifact too. Re-run afterwards in a fresh chat, whole: nothing is persisted, so there is no round to append and no delta to compute.
- **Continue** — the owner rules the findings do not block.

A pause, not a stop: the conversation continues.

## Never writes

No `review.md`, no findings file, no `tasks.md` gate section, no issue comment, no label. Never runs `git commit`, stages files for one, or pushes. It reads, reports, and stops.

## Stop

End the turn here, after the run and any repair. Next: [/embark-apply](../embark-apply/SKILL.md) — occupy the tree and implement.
