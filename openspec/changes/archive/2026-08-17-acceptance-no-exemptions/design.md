## Context

The proposal argues the rule; this records what happened when the rule was applied to the change's own deltas, because the outcome was not the one the proposal predicted.

Three tooling constraints shaped it, all verified against the installed `@fission-ai/openspec` v1.9.0 rather than assumed:

- A requirement with zero scenarios is an ERROR, non-strict (`base.schema.js:15`, `validator.js:255`). A spec with zero requirements is an ERROR (`spec.schema.js:7`). A prose-only spec throws in the parser before Zod runs (`markdown-parser.js:20`). There is no shape between "requirement with a scenario" and "no requirement".
- A `MODIFIED` block may not drop a scenario the current spec still has — ERROR at authoring time and archive refuses (`validator.js:457`, `specs-apply.js:333`). The check walks renames, so rename-then-modify does not escape it. Comparison is by scenario **name** only, multiplicity-aware, body unchecked (`requirement-blocks.js:269`).
- `## REMOVED Requirements` takes **names only** — no scenarios, no description (`validator.js:109`, `:267`). Apply order is RENAMED → REMOVED → MODIFIED → ADDED.

Together those give a touched requirement exactly three moves: reroot a scenario in place (name survives, body rewritten), remove the whole requirement, or leave the block alone. Per-scenario deletion is not expressible.

## Goals / Non-Goals

**Goals:**

- State the testable-outcome rule where an author meets it, and delete the exemption that stood in for its absence.
- Apply the rule to this change's own deltas rather than exempting the change that writes it.
- Leave the standing corpus exactly as grandfathered as it is today.

**Non-Goals:**

- Rectifying the corpus. 1,672 scenarios across 57 capability specs, and most of the process capabilities fail the rule; none of that is touched here.
- Retiring a capability. Both specs survive on their untouched requirements.
- Any application code, schema migration, or test.

## Decisions

### The deltas are removals, not modifications

The proposal planned `MODIFIED` blocks that would repair the row grammar in place and add `Unreachable` to `/embark-qualify`'s requirement. Writing them proved that impossible on the rule's own terms.

Rerooting was attempted three ways on `acceptance-artifact` and each failed:

- **File existence after a run** — `WHEN the acceptance artifact is generated, THEN acceptance.md exists`. Fails: the actor is an agent following an instruction, which the rule disqualifies, and no test can produce the WHEN. A file-on-disk THEN does not rescue an unrooted WHEN.
- **A finding's absence** — `WHEN generation surfaces a step the corpus cannot back, THEN no file is written`. Fails identically, and its trigger is an agent's judgment.
- **The CLI as root** — `WHEN openspec status --json runs, THEN the artifacts run proposal, adr, specs…`. Fails as laundering: the subject matter is a hand-written line in `schema.yaml`, which the rule bars as a When or Then whatever verb dresses it, and whatever behavior the command does pin belongs to OpenSpec rather than to this repo.

With no rerooting available and per-scenario deletion not expressible, a touched requirement can only be kept whole or removed whole. Kept whole, it would sit unchanged while documenting a rule it violates. Removed, its contract moves intact to prose that already carries it. Five requirements are removed on that basis; every requirement this change does not touch is left alone.

**Alternative considered — `skip_specs: true`.** Defensible, and precedented one commit earlier: `2026-08-17-adr-artifact` added an artifact, a template, a schema registration and a library directory, and landed with `skip_specs`, no `specs/` and an empty `adr.md`. Rejected because a skipped delta leaves the contradicting requirements standing and silent, while a removal states in the spec's own history why they went.

### The contract moves to prose, and earns no ADR

Each removed requirement migrates to the channel an author already passes through at the moment the rule binds them — the `acceptance` instruction in `schema.yaml` for the artifact contract, and `.claude/skills/{embark-design,embark-qualify,landfall}/SKILL.md` for the fleet's. Those are prose: they carry reasoning by nature whether or not a sentence spells it out, so a second home in an ADR would be duplication, and drift risk outranks writing the argument down twice.

`adr.md` is therefore written empty, which the schema calls a record rather than an incomplete artifact. Two entries were drafted and both were rejected on review: the membership rule as already stated and enforced by OpenSpec's own `specs` instruction, and migration-by-contact as governing a transitional state that ends when the transition does — lasting is what an ADR is, and a rule that expires is not one. Both rejections are folded back into the `adr` instruction's bar so the next author reaches them without a review round.

### Migration stays on contact, and contact is block-shaped

The tooling settles what the interview left fuzzy. Because a `MODIFIED` block cannot shed a scenario, cleanup is block-level or nothing — there is no version of this where an agent adjudicates scenarios one at a time inside a block it keeps. Where a block is touched, the agent rules it whole and reports what it did; where a block is not touched, nothing happens to it and nothing is recorded about it. Grandfathered is a state, not a list.

### `/embark-design` runs loose; `/embark-qualify` is the hard gate

Membership is applied before a scenario hardens, by the skill that holds every rule for specs, ADRs and design in context at the moment of writing — so it rules on its own authority rather than asking. It is a duty, not a refusal mechanism: the existing "specs should be testable" rule has been quietly violated across the corpus for months, and adding enforcement machinery to a rule nobody enforces buys nothing. `/embark-qualify` is the backstop, and it is the harder gate: where it can rule under the stated rules it rules, and where it **cannot write a row correctly** under them it raises that explicitly and the owner rules, overriding it if they choose.

### How the run detects Unreachable — the mechanic, not the definition

This is the change's origin and it needs no new machinery, because the detection already happens; only the reporting is missing.

A qualification run chains delta scenarios into flows. That pass has two residues, and they are inverses:

- **A step in a flow that no scenario backs** — the flow needs it, the specs lack it. That is a **gap**, and it is reported today.
- **A delta scenario that no flow reaches** — the specs carry it, no journey needs it. That is **Unreachable**, and today it is not reported. It goes into `## No manual path — fully automated`.

The exemption section is literally the leftover bucket. Every one of the 25 entries across `profiles-schema-phase-1` and `-2` is a scenario the chaining pass could not place, relabelled as a requirement with no human-observable surface. So removing the section does not create a detection problem to solve — it stops discarding a list the run already computes, and routes it into findings alongside gaps.

**The row-grammar repair shrinks the list before classification runs.** Several current exemptions are leftovers only because the root actor was assumed to be a user at a browser. `profiles-schema-phase-1` exiles *"Second self-profile rejected"* and *"Invalid role rejected"* with the reason *"database constraint; no UI path inserts a row"* — but a database constraint rejecting an insert is an exit code and a failed write, which is a testable outcome under the repaired grammar with the migration or a direct insert as the root actor. Those chain, and never reach classification. The list that survives is the genuinely unreachable one — `UNTITLED`, idempotent-by-construction — which is the list worth ruling on.

**The sweep is what makes the list complete.** The unit is the scenario, not the requirement: a requirement holding four scenarios owes four rootings, and covering one does not discharge the other three. Scope is the change's own delta scenarios; canonical scenarios the chains pass through are traversed, not swept. And the run walks all of them before reporting, rather than stopping at the first blocker — ten unplaceable scenarios surface in one run, not across ten.

**Classification runs per leftover, after the sweep**, on the test the proposal states: does the scenario state a testable outcome? Not behavior takes the rehome exit; behavioral-but-unreachable takes the dead-requirement exit, which removes the scenario and nothing else by default. The run names which exit it took and what it is removing, because the cost of a wrong exit is asymmetric — a wrong rehome is a misfiled rule, a wrong deletion is a lost invariant.

**Where the run cannot rule, it stops and says so.** A leftover it cannot classify, or a row it cannot write correctly under the grammar, is raised explicitly rather than written anyway or quietly dropped. The owner rules and may override. This is the asymmetry with `/embark-design`, which rules on its own authority: qualify is the harder gate precisely because it runs in a chat that did not author the documents, so what it cannot resolve from the documents is a real signal rather than missing context.

**Withholding is what gives the findings teeth.** While any finding stands, no flows are written and no `acceptance.md` exists. A gap already disqualified a change; an Unreachable now does the same, which is the whole point — the exemption's cost was that a finding could be filed as an excused absence and nothing obliged anyone to act on it.

### The `/embark-qualify` SKILL.md edit

The contract now lives only here, so the edit is larger than adding a type.

The current text is headed *"Two failure types"* — a count in prose, not a list that takes an append. It becomes three, stated as the complete and symmetric set: missing, excess, wrong. `Gap` and `Contradiction` keep their current text except that contradiction widens from design-against-specs to specs against **the proposal or the design**, because `/embark-design` folds moved decisions back into the proposal via `/opsx:update` and nothing afterward re-checks that the specs still match what was approved.

The normative text the removed requirement carried moves here rather than being rewritten: fresh-chat-first with its reasoning (a contaminated run does not degrade, it inverts), classification belonging to this member rather than the artifact, the three `design.md` cases, verdict-before-repair, repair routing through `/opsx:update` rather than a hand edit, and continue being the owner's ruling. None of that changes; it changes address.

### Where each homeless rule lands

Five requirements lose their spec home, and the proposal states what each rule *says*. What it does not state is where each one goes, why that home and not another, and what goes wrong if the two drift. With no spec left to hold them, that placement is the whole of the design.

#### The row grammar → the `acceptance` instruction, and its template in the same edit

The grammar governs a row at the moment one is drafted, and the instruction is what the drafting run reads then. The removed requirement was a second copy of it.

The drift hazard is the template, not the spec. `templates/acceptance.md` ships example rows, and an example outranks a rule in practice — a run copying a UI-click example will keep writing UI-click Whens however the instruction defines a root actor. So the exemption section and the example rows are edited together, and the template gains at least one operator-rooted example (`runs npm run db:migrate`) so the shape the instruction now sanctions is visible where runs actually look.

#### Unreachable and its exits → `/embark-qualify`'s SKILL.md, and nowhere else

The removed requirement carried a constraint about itself: *"the failure types are stated once, in the member"*, with the schema `acceptance` instruction barred from restating them. That constraint outlives the requirement that stated it, and removing the requirement is exactly the moment it would be forgotten — the instruction is being edited in this same change, and a third failure type is tempting to mention there.

So the single-statement rule moves into the skill alongside the failure types it governs. The instruction keeps only what it has now: an unsourceable step is surfaced. If the two drift, a run reads two versions of the type list and picks the nearer one.

#### Sweep and withhold → split, deliberately

These two look like one rule and belong in different homes:

- **No partial artifact** goes to the `acceptance` instruction, because it is a property of the artifact rather than of the gate. `acceptance.md` is generated on routes other than `/embark-qualify`, and the capability's own contract says so; withholding has to hold on every route, or a hand-run generation leaves a half-chained file that reads as a completed walk.
- **Sweep, don't stop at the first blocker** goes to `/embark-qualify`'s SKILL.md, because it is the gate's discipline. Nothing about the artifact requires a run to surface ten findings rather than one; a qualification run wanting ten does.

Putting both in one home would force one of them onto a route it does not govern.

#### The scenario-coverage bar → `TESTING.md`, matched to a gate that already runs

The reviewer-side half exists: `spec-review`'s testing arena, check 2, requires a named test pinning every delta-spec scenario, delta-scoped, with no dependency on `acceptance.md`. There is no `spec-review` delta and no testing-brief edit here — the gate is not the gap. The gap is that an author has nowhere to read the bar before review applies it.

The constraint that follows is that `TESTING.md`'s wording has to state the same unit rule check 2 enforces, or an author writes to one bar and is reviewed against a different one — which is worse than the silence it replaces. One scenario per unit or integration test, because a failing test should name the scenario that broke; an e2e test spans a flow, because a flow *is* a chain of scenarios. A norm, not a count: a scenario with zero tests is the failure, not a scenario sharing one.

It stays out of `testing-foundation` because no execution roots it, and out of the ADR library because `TESTING.md` carries the rule and its reasoning in the same paragraph.

### ADR promotion, at landing

`openspec archive` syncs specs only, so an entry written into a change's `adr.md` rides into `archive/` and is lost. `/landfall` closes that:

- **Promote** each entry from the delta into `openspec/adr/NNNN-kebab-title.md`, taking the next unused ordinal from the index. `MODIFIED` entries replace the file's body in place; `REMOVED` entries leave the file and its title standing with the body replaced by a single redirect line, so a number cited in a commit or another entry resolves to an answer rather than nothing.
- **Verify** that every ADR the change declares exists in the library and carries an index row — derived from the entry's own `Touching` line, since nothing is authored at index level. The check reads disk on every invocation, consistent with the phase detection it sits beside, and it runs before the seal.

## Risks / Trade-offs

**The two specs now contradict themselves in public** → `acceptance-artifact` keeps `Apply refines flows with literal handles` and `Archived acceptance flows are hints, not truth`; `trunk-workflow` keeps ten requirements. Most fail the rule this change states. They are grandfathered by design and migrate when next touched, but a reader meeting them before then sees a spec violating its own contract. Accepted: the alternative is the campaign the proposal rules out.

**`trunk-workflow` stops being the departure arc's contract** → CLAUDE.md names it normative for the workflow, and after this change the departure arc's contract lives in the SKILL.md files instead. The CLAUDE.md line is corrected in the same change rather than left pointing at a spec that no longer holds it. `map-workflow` cites `trunk-workflow` as owner of gate-side behavior in four places and `muster-review` in one; those citations still resolve, because the requirements they name are not among the five removed.

**`/landfall`'s promotion step ships with nothing to promote** → the ADR library stays at zero entries, so the promotion and verification path lands untested by use. Mitigated by the verification half being disk-derivable: a change declaring an ADR that is absent from the library or missing from the index fails the check whenever the first real entry arrives.

**The rule is strict enough to be unpopular** → almost nothing in the process capabilities survives it, and the first author to hit that will feel the spec shrink under them. That is the intended effect; the exemption existed precisely because the rule was missing, and a rule this consequential is better stated once than rediscovered per change.
