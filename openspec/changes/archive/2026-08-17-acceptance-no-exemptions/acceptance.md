# Acceptance — acceptance-no-exemptions

**Sourcing basis.** Both deltas are pure `## REMOVED Requirements` blocks, so
this change has no delta `#### Scenario:` block to chain, and the canonical
scenarios that governed these surfaces are the ones it removes. Every row below
sources to a **Migration** paragraph in one of the two delta specs — which state
what each removed contract becomes and where it now lives — or to the matching
entry in `proposal.md`'s **What Changes**. None is asserted on the flow's own
authority. That is a deviation from the artifact's normal contract, stated here
rather than worked around, and it is the deviation this change's own rule
produces: a contract that roots at an agent following instructions has no spec
home to chain from.

**Grammar.** The root actor is the repo owner at a shell. Each Then asserts what
the execution emitted — a file the run wrote, a file it declined to write, or
the run's own output. The state of hand-written source (the `acceptance` and
`adr` instructions in `schema.yaml`, the artifact template, the three
`SKILL.md` files, `TESTING.md`, `CLAUDE.md`) appears only as a Given: those
edits are verified by the tasks checklist, not walked. Asserting their text
through a command that prints it back is the laundering `design.md` rejects, so
no flow below does it.

**Not walkable at this landing.** The three `/landfall` ADR flows need a change
whose `adr.md` declares an entry. This change writes `adr.md` empty and the
library ships at zero entries, so the walk requires a scratch change authored
for it; the flows are stated because the behavior lands here, not because an
instance exists.

**No exemption section.** This change deletes `## No manual path — fully
automated`, so its own artifact omits it. What that section used to collect is
surfaced as an **Unreachable** finding instead.

## Flows

### Flow: An unplaceable delta scenario withholds the artifact

- **Given** a change whose delta holds a scenario no flow chain reaches
- **And** a chat that did not write that change's specs or design
- **When** the owner runs `/embark-qualify`
- **Then** the output names the scenario under the failure type `Unreachable`
- **And** the output names which exit it took — `behavioral but unreachable`,
  the scenario leaving the spec as a dead requirement, or `not behavior`, the
  rule being rehomed to the prose channel that carries it
- **And** the output names what it is removing
- **And** `acceptance.md` does not exist
- **And** no flow is written for the scenarios that did place
- **And** the finding is not recorded as an exemption

### Flow: Every unplaceable scenario surfaces in one run

- **Given** a change whose delta holds three scenarios no flow chain reaches
- **And** a requirement in that delta holding four scenarios, of which one places
- **When** the owner runs `/embark-qualify`
- **Then** the output names all three unplaceable scenarios
- **And** the output names the three unrooted scenarios of the four-scenario
  requirement
- **And** the run did not stop at the first finding
- **And** no canonical scenario the chains passed through is reported

### Flow: A clean run writes flows carrying no exemption section

- **Given** a change every one of whose delta scenarios places into a flow chain
- **When** the owner runs `/embark-qualify`
- **Then** `acceptance.md` exists
- **And** it contains no `## No manual path — fully automated` heading
- **And** no delta scenario is listed as exempt anywhere in the file

### Flow: An operator-rooted scenario chains instead of being exiled

- **Given** a delta scenario whose chain roots at `npm run db:migrate` and whose
  outcome is a database constraint rejecting an insert
- **When** the owner runs `/embark-qualify`
- **Then** `acceptance.md` holds a flow whose When reads `the owner runs
  npm run db:migrate`
- **And** a Then in that flow asserts the failed write
- **And** the scenario is not reported as `Unreachable`

### Flow: A row the run cannot write correctly is raised, not written

- **Given** a delta scenario the run cannot classify under the stated rules
- **When** the owner runs `/embark-qualify`
- **Then** the output states that it cannot rule on the scenario
- **And** the output does not state which file the owner must change
- **And** no flow row is written for that scenario
- **And** the run does not drop the scenario silently

### Flow: A scenario contradicting the proposal disqualifies the change

- **Given** a delta spec scenario asserting behavior the change's `proposal.md`
  denies
- **And** a `design.md` that agrees with the scenario
- **When** the owner runs `/embark-qualify`
- **Then** the output names the conflict as a contradiction
- **And** the output leaves the choice of file to the owner

### Flow: An Unreachable finding is repaired through opsx:update

- **Given** `/embark-qualify` has reported a scenario as `Unreachable` on the
  dead-requirement exit
- **When** the owner runs `/opsx:update`
- **Then** the named delta spec no longer carries that scenario
- **And** no other scenario in that requirement was removed
- **And** no spec file was edited outside `/opsx:update`

### Flow: Design keeps a non-behavioral rule out of the spec

- **Given** a concluded `/mattpocock-skills:grilling` interview that has settled
  a rule stating no testable outcome
- **When** the owner runs `/embark-design`
- **Then** no delta spec file carries a scenario for that rule
- **And** the run's output names the prose channel it wrote the rule to
- **And** the owner is not asked to rule on the placement

### Flow: Landing promotes an ADR entry into the library

- **Given** a change whose `adr.md` declares one entry under `## ADDED ADRs`
- **And** `openspec/adr/` holds no file for that entry
- **When** the owner runs `/landfall`
- **Then** `openspec/adr/NNNN-<kebab-title>.md` exists carrying the entry body
- **And** `NNNN` is the next unused ordinal in `openspec/adr/INDEX.md`
- **And** `openspec/adr/INDEX.md` carries a row for the entry, its left cell the
  entry's own **Touching** line
- **And** the entry is not left only in the archived change

### Flow: A declared ADR missing from the library stops the seal

- **Given** a change whose `adr.md` declares an entry
- **And** `openspec/adr/` holds no file for it
- **And** the promotion step has not run
- **And** a session that did not write that `adr.md`
- **When** the owner runs `/landfall`
- **Then** the output names the declared entry
- **And** the output names the missing `openspec/adr/NNNN-<kebab-title>.md` path
- **And** no seal commit is staged
- **And** the change is not archived

### Flow: A removed ADR stays resolvable

- **Given** a change whose `adr.md` declares ADR `0003` under `## REMOVED ADRs`
- **And** `openspec/adr/0003-<kebab-title>.md` exists carrying a body
- **When** the owner runs `/landfall`
- **Then** `openspec/adr/0003-<kebab-title>.md` still exists
- **And** its title is unchanged
- **And** its body is the single redirect line the delta gave —
  `**Superseded** — see ADR-NNNN: <title>` or the `**Removed**` form
- **And** the file was not deleted
