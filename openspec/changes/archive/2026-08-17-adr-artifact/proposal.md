## Why

`acceptance-no-exemptions` needs somewhere to write. Its central finding — that
the acceptance exemption section collects **non-behavioral requirements**, which
OpenSpec's own `specs` instruction rules out of a spec — has a repair route
("the scenario leaves the spec and the rule is rehomed to an ADR") that points
at a library this repo does not have. A finding whose repair names a
non-existent destination repeats the `UNTITLED` failure the follow-on is written
to fix: a correct conclusion nothing obliges anyone to act on.

This change ships that destination and nothing else. It is deliberately light —
an artifact nothing yet writes to and nothing yet promotes — so that the
follow-on lands as one coherent argument about acceptance rather than an
argument plus a filing-system build-out. Splitting also isolates the one piece
with a hard external constraint: the artifact's **declaration position** in the
fork is forced by how `/opsx:continue` walks artifacts, and getting it wrong
produces an artifact that is silently never generated.

**No ADR library has ever existed here.** `docs/` has never existed;
`git log --all --name-only | grep -i adr` returns nothing. A change on
2026-05-22 resolved explicitly against ADRs
(`openspec/changes/archive/2026-05-22-complete-1.0-release-readiness/tasks.md:7`)
and cancelled a planned five-entry backfill. Two dangling `ADR-0007` /
`ADR-0009` references exist, but in **user-level** skills
(`~/.claude/skills/release-check`, `~/.claude/skills/council`) templated from
another project; repo `CLAUDE.md` has zero ADR mentions. Those two IDs refer to
nothing here and are not resolved by this change.

Inherited constraints found in the active specs:

- `acceptance-artifact` — the fork's declaration order and the `requires: [specs]`
  edge are fixed by spec; a new artifact SHALL NOT disturb either, and SHALL NOT
  become a dependency that reads `blocked` when it is empty. Both bind directly:
  `adr` is declared adjacent to those artifacts, and takes `requires: [proposal]`
  alone for the reason that spec already documents at line 20 — an edge onto the
  conditional `design` artifact reads `blocked` whenever design is skipped.
- `trunk-workflow` — `/landfall` *"SHALL be state-driven and self-healing"*. No
  landfall duty is added here (it is the follow-on's), but the library layout is
  chosen so a future check is derivable from disk: entries are files at a fixed
  path, indexed in a file, both greppable.
- `spec-hygiene`, `map-workflow` — untouched; nothing is migrated out of any
  spec by this change.

## What Changes

### The `adr` artifact is registered in the fork

- **`openspec/schemas/spec-driven-review/schema.yaml`** gains an artifact:
  `id: adr`, `generates: adr.md`, `requires: [proposal]`, with a template and
  an instruction stating the delta shape and the CLAUDE.md-vs-ADR boundary.
- **Declared BETWEEN `proposal` and `specs`.** This is forced, not preference.
  `/embark-design` (`SKILL.md:52`) runs `/opsx:continue` in a loop *until
  `design.md` exists*, and that loop walks declaration order — an artifact
  declared after `design` falls outside the stop condition and is never
  generated at design time. Declaring `adr` before `specs` also preserves
  upstream's pairwise `proposal < specs < design < tasks` order, so the fork
  stays reconcile-clean on `openspec update`.
- **No edge onto `design`**, per the trap `acceptance-artifact` already
  documents. **`specs`' own `requires` is not touched** — it is
  upstream-verbatim.

### The template is a single delta file

- **`openspec/schemas/spec-driven-review/templates/adr.md`** — `## ADDED ADRs`,
  `## MODIFIED ADRs`, `## REMOVED ADRs`, with ADR bodies inline, mirroring the
  delta shape of `specs`.
- **Not a directory glob.** A glob `generates` needs at least one matching file
  to read complete, which would force a placeholder-file convention plus a rule
  saying do not promote the placeholder. A single file that is empty is just
  headings with no entries — scaffolded empty like `review.md`, so a change with
  no architectural decision carries an empty file rather than a blocked step.

### The library lives at `openspec/adr/`

- Entries at `openspec/adr/NNNN-kebab-title.md`, plus an index in the same
  directory. The index file also carries the **term bank** the `Touching` field
  draws from, and the rules for growing it.
- **Verified safe**: the openspec CLI never enumerates children of `openspec/`
  — it stats five hardcoded paths (`config.yaml`/`.yml`, `specs/`, `changes/`,
  `changes/archive/`). `openspec/reviews/` already exists as a non-standard
  sibling and `openspec list` runs clean.
- Artifacts cannot write outside their change directory (`relativePathSchema`
  rejects `..`; `assertPathWithin` re-asserts on every path and glob match), so
  `adr.md` is necessarily a delta inside the change dir and the library is
  reached only by hand-promotion at landing. Promotion itself is the follow-on's.

### CLAUDE.md gains exactly two edits

- **One row** in *Read this before touching that*, pointing at the ADR index.
  One row, not one per ADR: CLAUDE.md is auto-fed every session, so it must not
  grow with the library.
- **The `openspec update` fork-reconciliation duty** currently names `acceptance`
  and `review`; it is extended to `adr`.

### Index entries are triggers, not titles — and every entry carries the trigger

`Writing any multi-statement DB operation → ADR-0007`, not
`0007-neon-no-transactions`. An agent has to know which ADR to open **before**
acting; a title index only helps someone who already knows the answer.

Every ADR body therefore opens with a **`Touching`** field, ahead of Context,
and the index is **derived** from it: a row is one entry's `Touching` line plus
its number and title. Without it the trigger is invented at landing, away from
the context where the decision was made, and the index becomes hand-maintained
and driftable — worse than no index, because an agent trusts it and skips the
file it needed.

The field takes **one or more terms from a seeded bank**, kept in the library's
index file, not free-form prose. The bank sets altitude by construction. Free
text leaves every author to invent it, and an index whose cells are pitched at
different altitudes cannot be scanned: one entry reads `Database access`, the
next `db/schema.ts`, and an agent matching its own task against them has no
consistent thing to match. The bank ships seeded with twelve terms and grows
only through review — an entry that fits no term proposes one in its delta
rather than forcing the nearest match, because a near-miss term is a silent
miss: the reader whose work the entry binds never matches it, and the bank
learns nothing.

Named `Touching` because CLAUDE.md's *Read this before touching that* table
already uses that header for the same job, so an agent crossing from one to the
other reads the same column. The **vocabularies are not shared**: CLAUDE.md's
cells stay free prose and only the ADR index draws from the bank.

### Settled decisions this change encodes

- **ADRs are living documents, edited in place** — not immutable-with-supersede.
  Superseded text sitting in an agent's context is token waste and a rot risk
  (an agent reading 100k of context can lose that the first 25k was superseded).
  `## REMOVED ADRs` therefore has a real, if rare, use.
- **A removed ADR is gutted, not deleted.** The file stays and keeps its title;
  the entire body — `Touching`, Context, Decision, Consequences — is replaced by
  one line, `**Superseded** — see ADR-NNNN`, or `**Removed** — this rule no
  longer applies`. Deleting the file leaves an ADR number cited in a commit, a
  comment, a skill, or another ADR resolving to nothing, and an agent finding a
  dead reference cannot tell whether the rule was dropped or the file was
  misplaced. The stub costs almost no context and satisfies the context-rot
  reason for deletion outright: what rots is a superseded **body**, and the body
  is exactly what goes. Consequences: a stub has no `Touching` line, so it
  leaves the index while its file remains; ADR numbers are never reused.
- **CLAUDE.md vs ADR is decided by READ FREQUENCY, not content type.** Needed in
  every chat session → CLAUDE.md, because that file's one distinguishing
  property is being auto-fed every session. Needed only sometimes → ADR. A topic
  legitimately appears in both at different cadences: the rule in CLAUDE.md, the
  argument behind it in an ADR.
- **A decision earns an entry only where the channel already firing at its
  trigger carries the rule WITHOUT its reasoning.** A lint error states a
  threshold and never the argument behind it, so the decision behind it earns an
  entry and a row. An OpenSpec artifact instruction carries rule and context in
  one payload, so a decision encoded there needs neither — a second home for a
  rule that already travels with its reasoning is a drift risk, not a service.
- **No backfill.** The library ships EMPTY. The six decisions the 2026-05-22
  change routed to CLAUDE.md stay there. Whether to migrate anything is a later
  decision. This change's own two candidate decisions fail the test above: the
  fork's declaration position is stated with its full silent-failure argument in
  a YAML comment beside the declaration, and the CLAUDE.md-vs-ADR boundary is
  stated with its reasoning in the artifact instruction and again in the index
  lead-in. So `adr.md` ships with three empty headings and the index ships with
  a header and no rows — the change that builds the filing cabinet files
  nothing, because everything it decided already travels to the point of use.

## Out of scope — belongs to `acceptance-no-exemptions`

- `/embark-design` gaining ADR-authorship duty
- `/landfall` gaining ADR promotion and verification
- Removing `acceptance.md`'s *"No manual path — fully automated"* exemption
- The acceptance row-grammar rewrite
- `/embark-qualify`'s third failure type
- Any migration of existing spec content into ADRs

This change ships an artifact nothing yet writes to and nothing yet promotes.
That is intended; the follow-on lands immediately after. Note the follow-on's
proposal currently names `docs/adr/` and lists an `adr-artifact` **New
Capability** — both are superseded here (`openspec/adr/`, and `skip_specs`); the
follow-on's proposal is updated as part of its own work, not this one's.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

`skip_specs: true` is set in `.openspec.yaml`. The whole deliverable is repo
configuration — a schema artifact declaration, a template file, an empty
directory, an index, two CLAUDE.md edits. Nothing runs, nothing writes to
`adr.md`, and nothing promotes it, so there is no observable behavior to
contract. A capability spec here would be a list of "WHEN this artifact is
generated, THEN this file exists" — instructions, not testable outcomes, and
precisely the shape the follow-on change is being written to fix. The binding
decisions (declaration position, single-file-not-glob, living-not-superseded,
triggers-not-titles) are recorded in `design.md`. Whether `adr-artifact`,
`acceptance-artifact`, and `review-artifact` deserve capability specs at all is
one question, settled once, in the follow-on.

## Impact

Documentation and configuration only — no application code, no DB, no runtime,
no tests.

- `openspec/schemas/spec-driven-review/schema.yaml` — new `adr` artifact
  declaration, positioned between `proposal` and `specs`
- `openspec/schemas/spec-driven-review/templates/adr.md` — new template
- `openspec/adr/` — new library directory, shipping with an index, a seeded
  twelve-term bank, and no entries
- `CLAUDE.md` — one index row in *Read this before touching that*; the
  `openspec update` reconciliation duty extended to name `adr`

Not affected: `openspec/config.yaml` (the fork is repo-owned, so no `rules`
override is needed), every existing artifact's `requires` edges, and every
in-flight and archived change (an artifact added to the fork is generated for
changes that reach it; existing changes already past that point are unaffected
because completion is file-existence only and `adr` is not in `apply.requires`).

Non-executable change — markdown and schema text only. Per CLAUDE.md's
five-gates rule the two test gates are omitted, with the omission named in the
tasks lead-in.
