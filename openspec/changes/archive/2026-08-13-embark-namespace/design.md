## Context

See [proposal.md](proposal.md) — Why. Three constraints shape everything below:

- **`/opsx:propose` cannot be modified.** It is `openspec update`-generated and CLAUDE.md forbids hand-editing it. `openspec new change` plus one `/opsx:continue` per artifact is the only supported route to a mid-bundle stop.
- **`/opsx:continue` selects by declaration order.** Not alphabetically, not by dependency depth — `compareByDeclarationOrder` in the CLI's artifact graph follows the schema author's sequence. Reordering the `artifacts:` list is therefore the entire mechanism for moving `acceptance`.
- **The schema is a repo-owned fork** that must stay reconcile-clean against the package `spec-driven` schema on `openspec update`.

## Goals / Non-Goals

**Goals:**

- Put an owner checkpoint at every point in the departure arc where a decision is durable and the next step reads from disk.
- Make the acceptance run a real spec probe by denying it the context that wrote the specs.
- Keep every existing gate, beacon and lane behavior byte-identical in effect, changing only where the boundaries fall and what the members are called.

**Non-Goals:**

- Proportionality. A small charted change still gets the full interview and the full bundle, now across five members. Real gap, separate change — see Open Questions.
- Folding `/opsx:verify` into `/spec-review`. Gated on usage evidence this change is designed to produce.
- Touching `/opsx:verify` or `/opsx:sync` themselves. Both are invoked by nothing in the fleet and stay that way.

## Decisions

### Five members, not three

Every boundary is a **stop**: the turn ends and the next member resumes from disk alone. Each boundary earns its place:

- `start` | `design` — makes `embark-design` an honest name; it no longer has to cover writing a proposal.
- `design` | `qualify` — **forced.** The run must not carry the grill transcript. See "No subagent for qualify".
- `qualify` | `write-tasks` — **forced by context rot.** After the run reports gaps and `/opsx:update` repairs the specs, that chat still holds the pre-repair specs and the argument that fixed them. Tasks written there can encode the argument rather than the settled contract. Tasks needs no conversation — it reads specs and design from disk — so the boundary is free.
- `write-tasks` | `apply` — the existing embark/set-sail seam, unchanged.

Two units are irreducible and must not be split further:

- **board + scaffold + proposal** — nothing on disk seeds the proposal (`proposal` has `requires: []`, and `openspec new change` writes only `.openspec.yaml`). A fresh chat running `/opsx:continue` on a bare change dir would invent one.
- **grill + update + specs + design** — the grill walks the *design tree*, and `proposal.md` has no section a design decision fits in while `design.md` does not yet exist. `/opsx:update` makes the *proposal* durable and does nothing for the design tree; the rest lives only in conversation. So specs and design must be written while the interview is still in the room.

*Alternative — three members (start / design+qualify / apply):* collapses the one boundary that exists for a correctness reason rather than an ergonomic one.

### Skills with an `embark-` prefix, not commands with a colon

The colon in `/opsx:new` comes from the `.claude/commands/opsx/` directory — it is the path separator, not a name. No local skill can produce one: every skill directory on this machine is flat and every skill `name:` is colon-free.

Moving to `.claude/commands/embark/*.md` would buy the colon and cost `disable-model-invocation`. No local command sets that field, so whether commands honor it is unverified — and `embark-apply` stamps `UNDER SAIL` and occupies the tree. Trading a verified autonomy contract for punctuation is a bad trade, and it would also make embark the only fleet member not a skill (`map`, `anchor`, `landfall`, `run-aground`, `port-inspection`, `spec-review`, `close-map` are all skills).

The `embark-` prefix does the disambiguating work the colon was wanted for: it stops `embark` and `set sail` reading as competing verbs.

*Alternatives:* commands with the real colon (above); a colon inside a skill `name:` (zero precedent, would need testing first — and the ladder says don't).

### The grilling interview runs after the proposal, not before

The proposal gives the interview grounded facts — Capabilities, Impact — to aim at, and the owner gets a manual review pass first. Today's pre-proposal grill has to first establish what the change *is*, work the issue body and terrain check already did.

Anchoring is not a concern: the design tree is still unwritten at proposal time, so there is nothing to rubber-stamp.

Re-running `embark-design` with `proposal.md` present and no `specs/` re-runs the grill deliberately — a second grill against the *updated* proposal is sometimes what the owner wants, since the first ran against worse material. Cuttable short when it isn't.

No member restates `/mattpocock-skills:grilling`'s own mechanics (one question at a time, concludes only on the owner's confirmation). That text lives in the `/mattpocock-skills:grilling` skill itself; today's `/embark` and the `trunk-workflow` spec both duplicate it, and both are stripped.

### Epic route-out fires from two members

The handoff kept the route-out in `embark-start`, and the grill — which is what historically concluded "epic-sized" — moved to `embark-design`. Both therefore have it, and the sweep's input differs:

- **From `embark-start`'s terrain check** — no interview answers to carry, no change directory to discard. Thin evidence, but a false positive costs nothing and the owner confirms.
- **From `embark-design`'s grilling** — answers plus a drafted `proposal.md`, which the sweep treats as a candidate framing rather than settled scope.

Keeping only the design-side route would mean writing a proposal for an epic before discovering it is one. Keeping only the start-side route would delete existing behavior.

*Alternative — design-side only:* rejected; wastes a proposal on work that routes out anyway.

### No subagent for the qualification run

A run carrying the grill transcript knows things the specs do not say. It completes a route the documents cannot support and reports no failure. Contaminated context does not degrade this run — it **silently inverts** its result.

The command boundary already provides the isolation: `embark-qualify` is its own owner-invoked skill, started in its own chat, and `embark-design` ends by saying so. An agent's only remaining job would be insurance against the owner ignoring one hand-off line — and every other boundary in this design relies on exactly that same discipline. Singling this one out for mechanical enforcement is inconsistent.

The fresh-chat requirement is the skill's first line.

*Alternative — an agent writes the flows, the main thread runs `/opsx:update` on its reports:* makes both read the same files and re-derive the same context. If the silent-inversion risk later warrants enforcement, the delegation hook exists (artifact skills already honour "if the `instruction` field delegates creation to a specific skill or command, invoke it"), and the rule must then be that the main thread does **not** re-derive — it takes the agent's report and runs `/opsx:update`, nothing more.

### Qualification is a layer over the artifact, not the artifact

`/embark-qualify` is the route a map charts through, not the exclusive path to `acceptance.md`. `/opsx:ff`, `/opsx:propose` and a bare `/opsx:continue` all generate it, and what they produce is not wrong — validating the specs and design it chains is then the owner's own job. What the member adds is the two things a schema instruction cannot assert: uncontaminated context, and a gate.

So the seam is not the file versus the ritual, it is **which rows may be written** versus **what to do about a row that cannot be**:

| Schema `acceptance` instruction | `embark-qualify/SKILL.md` · `trunk-workflow` |
| --- | --- |
| Sourcing — chain touched scenarios, grep the canonical corpus | The two failure types, gap and contradiction |
| Every row sourced; an unsourceable step is surfaced, never written around | A step whose behavior only design.md asserts is a gap |
| design.md may name an observable, never source a behavior | Repair routes through `/opsx:update` |
| Format, lifecycle, no test-plan content | The verdict, and the gate on advancing |

The instruction stops at "surface it". It names no failure type, no repair route and no verdict, because a generator outside the fleet cannot act on them and the owner does not need the schema to tell them what they are looking at.

*Alternative — the whole block stays in the schema instruction (B7's original remedy):* see the B7 amendment below.

### B7's one home was right; its unit was wrong

Round 1's B7 found the gap-vs-contradiction rules, the three design.md cases and the repair rule stated in full in both the skill and the schema, and its adjudication put them wholly in the schema. The duplication was real. The unit was not: the block is not atomic, and the DRY seam runs through it. Sourcing rules govern what the file may contain and belong to the artifact; classification, repair and verdict govern what an operator does with a finding and belong to the member.

Splitting it keeps B7's one-home rule per *rule* rather than per block — nothing is stated twice, and neither home carries a rule it cannot act on.

*Alternative — leave the whole block in the schema:* the skill then reports "findings" with no referent, since the text defining them is somewhere it never names. That is the shape the first attempt landed in.

### Two failure types, and the three design.md cases

Only a **gap** is a spec gap. A **contradiction** is a coherence failure whose fix lands wherever the conflict actually sits — a judgment made when it is found. `/opsx:update` covers both; its charter is to revise planning artifacts and keep them *coherent with one another*, which is exactly a contradiction's shape.

The earlier framing — design.md "supplies the prose for connective tissue" — permits design to supply a *link* and hide a gap. It also does not survive contact with the format: acceptance rows are Gherkin atoms asserting observables, and design.md is prose. There is no "wording" for a row to borrow. What design can legitimately give is the **concrete surface** a spec leaves unnamed, which the format block already demands ("reads as theirs" → "the banner reads `You`"). Three cases, distinguished:

1. **Design names the observable** — a spec backs the step but names no surface, and design does. The row asserts design's observable. No finding: design supplied the handle, not the behavior.
2. **Design asserts the behavior itself, and nothing else does** — a **gap**. The step does not chain on design's authority.
3. **Design contradicts a spec** — a **contradiction**, surfaced as a finding; either file may be wrong.

### Schema: move `acceptance`, do not touch `requires`

New declaration order: `proposal, specs, design, acceptance, tasks, review`.

- **After `design`** — design.md is where "step A leads to step B" was reasoned about, making it both the better failure detector and the source of prose for a step.
- **Before `tasks`** — the run repairs specs, and `tasks` requires specs. Written first, tasks are built against an unrepaired contract.

`requires` stays `[specs]`. Adding `[specs, design]` would leave `acceptance` reading `blocked` whenever design is skipped, and the agent would have to know to write it anyway. Declaration order already sequences it.

Upstream's `proposal, specs, design, tasks` relative order is preserved, so the fork stays reconcile-clean.

*Alternative — `acceptance` above `design`:* loses the better detector and the prose source.

### `config.yaml`: the grill gate moves to `rules.specs`

Rules fire at artifact-creation time, so a rule on `proposal` fires *before* the proposal is drafted — the wrong side of the new ordering. Its new home and wording, on `specs`: the `/mattpocock-skills:grilling` interview must have concluded against the reviewed proposal before drafting.

### `embark-apply`: a gate and a suggestion, not two gates

Distinct things, deliberately asymmetric:

- **`openspec validate --strict` before the beacon** — structural, a hard stop. Catches a malformed bundle: deltas missing without `skip_specs`, scenarios written `###` instead of `####` (which fails silently), a Purpose too brief. No point occupying the tree on a broken bundle. Does not apply to the MUSTER lane — no change directory exists to validate.
- **`/opsx:verify` after the task loop** — coherence, a closing output line. `/opsx:verify` is post-implementation ("before archiving"); run pre-apply it verifies nothing. A numbered step would invite the agent to evaluate whether to run it; a line leaves the call with the owner.

### The label machine names only the stamping member

Five members share the lane and only `embark-apply` stamps. The machine names `embark-apply` for `UNDER SAIL` and states that the four planning members flip nothing — planning artifacts are tree state recorded by the change directory, not by a label.

*Alternative — name the namespace:* would imply any member might stamp, which is exactly the ambiguity the single-beacon rule exists to prevent.

### Stale scenario names are repaired after archive

A MODIFIED delta must reproduce every scenario name the live spec has — archive refuses to drop one — so scenario headings cannot be renamed inside this change. Four land with bodies that no longer match: `Propose grilling routes out an epic`, `Embark gates on both signals`, `Propose drafts acceptance flows from scenarios`, `Propose emits a review.md scaffold`.

They are renamed by hand in `openspec/specs/**` after archive, in the same window `/finalize-spec-purposes` uses — before the seal commit is staged, so the repair rides inside it. Nothing conflicts there: the deltas are spent, and the one-change-in-apply rule means no other change is mid-flight.

*Alternative — REMOVE + ADD each requirement to get the rename inside the change:* loses the diff that makes the delta reviewable, for four headings.

## Risks / Trade-offs

- **`embark-design` buries `specs`, the binding contract, under a name that doesn't mention it.** Live hazard, not cosmetic: in the design session the owner twice went looking for where specs get written, found no member naming them, and attached it to the wrong one. → Mitigation is the frontmatter `description` line and each member naming its successor. Do not assume a reader infers it. Uniform `write-<artifact>` naming was tried and made `embark-start` and `embark-apply` look like outliers that write nothing.
- **`qualify` suggests *immediately* before the race, but `write-tasks` sits between.** → Each member names its successor, so the sequence is followed rather than inferred from the names.
- **A renamed scenario heading can strand a MUSTER plan.** `/embark-apply`'s staleness check greps every `#### Scenario:` heading a MUSTER ticket body cites, and reads a missing one as a stale plan. → Grep open `MUSTER` tickets for each of the four headings before the post-archive rename.
- **Five members is more ceremony for a small change.** → Accepted here; the proportionality gap is real and separate (Open Questions).
- **The fork gains a second reason to drift.** Reordering `artifacts:` adds a diff against the package schema on top of the `review` and `acceptance` additions. → The relative order of upstream's own four artifacts is unchanged, so a diff-and-merge still reads cleanly; `openspec validate --strict` in the pre-merge gate catches a structurally broken fork.
- **A stop can be skipped.** Nothing mechanically prevents running `/opsx:continue` past a boundary in the same chat. → Every boundary in this design rests on that same discipline; enforcing one and not the others would be inconsistent (see "No subagent for qualify").

## Migration Plan

One pass, no staged rollout — the fleet is internal tooling with a single operator.

- Two directory moves: `.claude/skills/embark/` → `embark-start/`, `.claude/skills/set-sail/` → `embark-apply/`. Three new skill directories.
- Rename sweep across `.claude/skills/anchor/`, `.claude/skills/map/` (SKILL.md, `reference/issue-cut.md`, `reference/label-machine.md`) and `CLAUDE.md` § Trunk workflow.
- Schema and config edits land with the skills — a reordered `artifacts:` list with the old two-skill arc still in place would leave `/opsx:propose` emitting the bundle in the new order, which is harmless but untested.
- Rollback is `git revert`; no data, no migrations, no deployed surface.

## Open Questions

- **Proportionality across the fleet.** The grilling skill is 13 lines with no early exit ("relentlessly", "walk down each branch"), and `skip_specs` — which would collapse a behavior-neutral change from six artifacts to three — appears nowhere in `openspec/specs`, `.claude/skills` or `CLAUDE.md`. A small charted production change gets the full interview and the full bundle. Surfaced in the same session as this change; MUSTER does not cover it (that lane is tests-only, not size-based). Deferrable: it changes no spec, approach or task here.
- **Whether `/spec-review` should absorb `/opsx:verify`.** `/spec-review` already covers the ground via its alignment brief. The closing suggestion line in `embark-apply` is the experiment that produces the usage evidence; `/landfall` is the wrong home — it is the archive wrapper, after review and push.
