## Context

See `proposal.md` — Why. The constraints that actually shape the approach:

- **The schema fork is repo-owned.** `openspec/schemas/spec-driven-review/` is a
  renamed full copy of the package `spec-driven` schema (`resolveSchema` reads
  one file whole, no merge), so a local artifact is added by editing the fork,
  not by an `openspec/config.yaml` `rules` override. The cost is a standing
  reconciliation duty on `openspec update`.
- **Artifact completion is file existence only.** No `optional`, `skippable`, or
  `conditional` field exists in the schema. The sole skip mechanism is
  `skip_specs`, hardwired to artifacts whose `generates` starts with `specs/`.
  Anything declared is therefore either generated or permanently incomplete.
- **Artifacts cannot write outside their change directory.**
  `relativePathSchema` rejects `..` and `assertPathWithin` re-asserts on every
  path and glob match. The library is unreachable from generation; only
  hand-promotion at landing can populate it.
- **`/embark-design` drives generation with a loop.** `SKILL.md:52` runs
  `/opsx:continue` *until `design.md` exists*. The loop's stop condition is
  design, and `/opsx:continue` picks the next artifact by declaration order.

## Goals / Non-Goals

**Goals:**

- An `adr` artifact that is actually generated at design time, by the existing
  `/embark-design` loop, with no change to that skill.
- A library location and index shape a later disk-derivable `/landfall` check
  can verify without conversation state.
- Zero disturbance to upstream artifact ordering and `requires` edges, so
  `openspec update` reconciliation stays a copy-forward rather than a merge.

**Non-Goals:**

- Any authorship, promotion, or verification duty (the follow-on's).
- Any entry in the library. It ships empty.
- Settling whether the fork's local artifacts deserve capability specs — one
  question, settled once, in the follow-on.

## Decisions

### `adr` is declared between `proposal` and `specs`

Position is forced by two independent constraints that happen to agree.

`/embark-design` loops `/opsx:continue` until `design.md` exists, and continue
walks declaration order. An artifact declared **after** `design` is outside that
stop condition and is never reached at design time — the loop exits the moment
design lands. Declared after `tasks` it would be reached only by a later
explicit continue that nothing in the fleet runs. So `adr` must precede `design`.

Given it must precede `design`, the remaining choice is before or after `specs`.
Before `specs` preserves upstream's pairwise `proposal < specs < design < tasks`
relative order exactly, which keeps the fork a copy-forward against the package
schema instead of a reorder to re-derive on every `openspec update`.

*Alternative considered:* declare it last (after `review`), matching where the
other two local artifacts were appended. Rejected — it is exactly the case that
is never generated, and the failure is silent: `status` shows `ready` forever
and nothing errors.

### `requires: [proposal]`, and no edge onto `design`

An ADR is a decision record; the change's motivation is the only genuine
prerequisite. An edge onto `design` would be the intuitive reading (decisions
come out of design) but `design` is conditional, and `acceptance-artifact`'s
spec already documents the trap at line 20: an edge onto a conditional artifact
leaves the dependent reading `blocked` whenever design is skipped. `specs`' own
`requires` is not touched — it is upstream-verbatim and touching it would make
the fork a merge.

### `generates: adr.md` — a single delta file, not a directory glob

The delta shape mirrors `specs`: `## ADDED ADRs`, `## MODIFIED ADRs`,
`## REMOVED ADRs`, ADR bodies inline.

*Alternative considered:* `generates: adr/**/*.md`, one file per ADR, matching
the library's own layout. Rejected — a glob `generates` needs at least one
matching file to read complete, so an empty ADR set would need a placeholder
file, which needs a convention naming it, which needs a rule saying do not
promote it. A single file that is empty is just headings with no entries, and
scaffolds empty like `review.md`: a change with no architectural decision
carries an empty file rather than a permanently incomplete step.

### The library is `openspec/adr/`, entries `NNNN-kebab-title.md`

*Alternative considered:* `docs/adr/`, as the follow-on's proposal originally
named. Rejected — `docs/` has never existed in this repo, and the decision
record is a planning artifact that belongs beside the specs and changes it
adjudicates against, not in a new top-level tree with one occupant.

Verified safe against the CLI: openspec never enumerates children of
`openspec/`. It stats five hardcoded paths (`config.yaml`, `config.yml`,
`specs/`, `changes/`, `changes/archive/`). `openspec/reviews/` already sits
there as a non-standard sibling and `openspec list` runs clean.

Zero-padded four-digit ordinals give a stable, sortable, greppable ID that reads
the same in prose (`ADR-0007`) and on disk. Note the two existing dangling
`ADR-0007` / `ADR-0009` references live in **user-level** skills templated from
another project and refer to nothing here; the numbering starting at `0001`
will eventually collide with those strings textually. That is accepted — those
skills are outside the repo and are not this repo's to fix.

### ADRs are living documents, edited in place

Not immutable-with-supersede, the conventional ADR practice.

The convention exists for human readers reconstructing history, which git
already provides here. The cost in this repo is specific: superseded text
sitting in an agent's context is token waste **and** a rot risk — an agent
reading 100k of context can lose that the first 25k was superseded and act on
the retracted rule. An ADR is read to decide what to do now, so it states what
is true now. `## REMOVED ADRs` therefore has a real, if rare, use.

### A removed ADR is gutted, not deleted

The file stays at `openspec/adr/NNNN-kebab-title.md` and keeps its title. Its
entire body — `Touching`, Context, Decision, Consequences — is replaced by a
single line, in one of two forms:

    ### ADR-0001: <title>

    **Superseded** — see ADR-0007: <title>

or, where nothing replaces it:

    ### ADR-0001: <title>

    **Removed** — this rule no longer applies; do not follow older references
    to it.

*Alternative considered:* delete the file, the position this change originally
took. Rejected — an ADR number is cited outside the library (a commit message,
a code comment, a skill, another ADR), and deletion leaves those references
resolving to nothing. An agent that finds a dead reference cannot tell whether
the rule was dropped or the file was misplaced; a one-line stub answers that
outright for almost no context. The reasoning that argued for deletion was
context rot, and the stub satisfies it in full: what rots is a superseded
**body** sitting in an agent's context, and the body is exactly what is removed.

Consequences:

- A stub carries no `Touching` line, because no work should route to a dead
  decision. It therefore drops out of the index while its file remains — the
  index lists live decisions only, and the file survives purely as a redirect.
- ADR numbers are never reused, since the file never leaves.
- `## REMOVED ADRs` in a change's `adr.md` gives the resulting stub — which
  form, and the replacement's ID where there is one. The delta's **Reason**
  stays in the delta and does not go into the stub; **Migration** is subsumed
  by the `Superseded` form, which names the replacement.

### CLAUDE.md vs ADR is decided by read frequency, not content type

CLAUDE.md's one distinguishing property is being auto-fed every session, so its
scarce resource is rows, not subject matter. Needed in every chat session →
CLAUDE.md. Needed only sometimes → ADR. A topic legitimately appears in both at
different cadences: the rule in CLAUDE.md, the argument behind it in an ADR.

This is why the library gets **one** index row rather than one row per entry —
a per-entry index would make CLAUDE.md grow with the library, converting the
whole scheme into the problem it was meant to solve.

### Index entries are triggers, not titles

`Writing any multi-statement DB operation → ADR-0007`, not
`0007-neon-no-transactions`. An agent must know which ADR to open **before**
acting; a title index only helps a reader who already knows the answer. This
mirrors the existing *Read this before touching that* table, which is keyed on
"Touching…", not on document name.

### Every entry carries a `Touching` field, and the index is derived from it

The index is keyed on the trigger, but nothing in the Context / Decision /
Consequences body feeds that cell — so whoever promotes an entry invents the
trigger at landing, away from the context where the decision was made. That
makes the index hand-maintained and driftable, and a drifted index is worse than
no index: an agent trusts it and skips the file it needed.

So the entry shape opens with **`Touching`**, ahead of Context, and an index row
is that line plus the entry's number and title. Nothing is authored at index
level, so the index cannot drift from the library.

The field is named `Touching` because CLAUDE.md's *Read this before touching
that* table already uses that header for the same job: an agent scanning that
table hits the ADR row and lands in a column it already knows how to read. A
field named "when to read" would ask for a circumstance instead, and an agent
asked for a circumstance writes an essay every time. What fills the field is
settled in the decision below.

### `Touching` takes terms from a seeded bank, not free prose

The field was first specified as a noun phrase of one to seven words, with the
grammar left to cap the length. That instruction was read cold by three agents
and applied cold by three more to four real repo decisions, one set per variant.
**Breadth was the top author disagreement in every variant** — including the one
spending forty words on it, whose reader still called calibration the single
biggest gap. Prose cannot set altitude: `Any test`, `Database access`, and
`db/schema.ts` all satisfy every stated rule for the same entry, and an index
mixing all three is one an agent cannot scan.

So the field takes one or more terms from a bank kept beside the index, and the
bank sets altitude by construction. This also settles, without a rule for
either, the two questions those readings could not resolve: whether a gerund is
legal, and whether a cell may list several triggers. Terms are picked, not
phrased, and a cell carries as many as apply.

**A term names a surface by default, an action only where the action is the
trigger.** `Skills & Agents` covers authoring and editing with no rule saying
so, where `Writing a Skill` leaves an agent editing one to guess. `Running
Tests` and `Reading a GitHub Issue` stay verbs because no artifact is being
edited at that moment — under a noun-phrase-only rule that trigger shape had no
legal form at all, and the reading that hit it produced a cell listing files its
reader would never open.

**The asymmetry survives as multi-select.** A wasted read costs seconds; a
missed one ships work against a decision its author never saw. An entry
therefore takes every term that binds it, not only the central one. Under free
prose that was a judgment about phrasing width; as terms it is checkable.

**Three gates govern the bank**, stated where the bank lives:

1. *Does the decision need a row?* Only where the channel already firing at that
   trigger carries the rule without its reasoning.
2. *No term fits?* Do not force the nearest. Propose the term in the delta and
   let review promote it alongside the entry.
3. *A term must discriminate.* If nearly every task matches it, it is not a key.

Gate 3 is the too-broad rule, relocated. Written as an instruction to the author
picking a term it misfired — a cold reader took the examples beside it as the
things being banned, and narrowed away from the width the rule was asking for.
As a curation rule on admitting a term it is checkable and has nothing to
misread.

**The bank ships seeded, not empty.** An empty bank gives the first author
nothing to calibrate against, which is the failure the readings named outright:
examples are the only thing that sets altitude. Twelve terms ship, seeded where
the split is already obvious — tests divide cleanly into `Unit Test`,
`E2E Test`, `Running Tests` — and withheld where it is not. Production source
has no obvious split, so no term for it ships and real decisions draw that line.

**Terms may be parameterized**: a bank family such as `Editing <capability>
spec`, with the instance bound in the entry's own cell so index rows stay exact.
The mechanism exists to narrow a trigger that would otherwise fire on every
task. No family is in the seed.

**The bank is the ADR index's own.** CLAUDE.md's table keeps the same header and
free-prose cells; the two are one column, not one vocabulary. Sharing them is a
later question, and answering it here would put a second owner on a file whose
scarce resource is rows.

*Alternative considered:* free prose with sharper rules. Rejected on evidence —
five successive revisions each answered one objection by adding a clause, grew
the instruction 55%, and left breadth the top divergence throughout.

### The library ships empty; no backfill

The six decisions the 2026-05-22 change routed to CLAUDE.md stay in CLAUDE.md.
Migrating anything is a separate judgment per item, and doing it in the change
that builds the filing cabinet would mean the cabinet's shape is argued from
whichever items happened to be at hand.

This change's own two candidate decisions fail gate 1 and are not entered. The
fork's declaration position is stated with its whole silent-failure argument in
a YAML comment beside the declaration, which an agent editing that file reads
there. The CLAUDE.md-vs-ADR boundary is stated with its reasoning in the `adr`
artifact instruction, which ships with generation, and again in the index
lead-in. Both channels carry rule and context together, so an entry would be a
third home for a rule that already travels to the point of use — the drift the
library exists to prevent. `adr.md` therefore carries three empty headings, and
the index a header with no rows.

### No capability spec; `skip_specs: true`

The whole deliverable is repo configuration with no runtime and no observable
surface — nothing runs, nothing writes to `adr.md`, nothing promotes it. A
capability spec here would be a list of "WHEN this artifact is generated, THEN
this file exists": instructions, not testable outcomes, and precisely the shape
the follow-on change is written to fix. Recording the decisions here instead is
also the honest ordering — the ADR library cannot yet hold its own founding
ADR, since nothing promotes an `adr.md` until the follow-on lands.

*Alternative considered:* a new `adr-artifact` capability spec mirroring
`acceptance-artifact` and `review-artifact`, which is what the follow-on's
proposal currently lists. Rejected for this change; whether all three deserve
capability specs is one question, and it is settled once, in the follow-on.

### `adr` is not added to `apply.requires`

`apply.requires` is `[tasks, review, acceptance]` and stays that way. Adding
`adr` would load an always-empty file into every apply context for no gain, and
apply-time relevance is a lifecycle question the follow-on owns.

## Risks / Trade-offs

- **The declaration position is load-bearing and its failure is silent.** A
  future reconciliation that appends the fork's local artifacts in a block at
  the end would move `adr` out of the `/embark-design` loop's reach with no
  error — `status` would read `ready` forever. → The reason is stated in the
  schema comment beside the declaration, at the point of edit, not only here
  where it archives with the change.
- **An artifact nothing writes to invites deletion or drift before the
  follow-on lands.** → The follow-on lands immediately after; the window is
  short and both changes are on `dev`.
- **`openspec update` reconciliation grows a third local artifact.** → CLAUDE.md's
  duty is edited to name it, so the count is stated where the duty is stated.
- **Every change proposed between these two lands generates an empty
  `adr.md`.** → Correct behavior, not a defect: the empty file is the record
  that the change had no architectural decision, exactly as `review.md`
  scaffolds empty.
- **The bank grows out of control.** A vocabulary admitting a term per entry
  degrades into free prose with extra steps, and a bank too long to scan stops
  setting altitude — the one thing it exists to do. → Growth is gated on review
  rather than on the author: gate 2 stops at a proposal instead of adding the
  term, and gate 3 refuses one that does not discriminate. The seed is short by
  construction, withholding a term wherever the split is not already obvious.
- **The seeded terms are asserted, not derived.** Twelve terms ship before any
  entry uses one, so a term may turn out to sit at the wrong altitude or never
  be ticked. → Cheaper than the alternative: an empty bank calibrates nothing,
  and an unused term costs one row while a missing one costs a missed decision.
- **No test can guard any of this.** The change is markdown and YAML with no
  executable surface. → `openspec validate --strict` on this change plus a real
  `/opsx:continue` run on a change confirming `adr` is selected is the whole
  available check, and both are in tasks.
