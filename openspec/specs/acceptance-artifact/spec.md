# acceptance-artifact Specification

## Purpose

`acceptance.md` is a first-class OpenSpec artifact carrying chained
Given/When/Then user-journey flows for a change: drafted at propose time as a
spec-completeness probe over the change's scenarios and their pre-existing
cross-capability links, refined at apply time with literal UI handles. This
capability owns the artifact's registration, template, and lifecycle; flow
consumption belongs to its consumers (the owner's pre-landfall walk and
`/port-inspection`'s map-wide e2e scout).

## Requirements

### Requirement: acceptance.md is a schema-registered artifact drafted at propose

The project-local schema fork at `openspec/schemas/spec-driven-review/schema.yaml` SHALL register an
`acceptance` artifact that `generates: acceptance.md` with `requires: [specs]`,
driven by an artifact template
(`openspec/schemas/spec-driven-review/templates/acceptance.md`); the content
contract (format, lifecycle, exclusions) lives in the artifact's schema
instruction — the fork is repo-owned, so no `openspec/config.yaml` rules
override is needed. Propose-time generation
SHALL draft user-journey flows by chaining the change's touched `#### Scenario:`
blocks together with pre-existing links found in canonical
`openspec/specs/**/spec.md` — the same grep-the-corpus discipline
`rules.proposal` mandates. The draft is a spec-completeness probe: a journey
that cannot be chained from existing scenarios indicates missing connective
tissue, and the gap SHALL fold back into the change's delta specs rather than
be papered over in the flow.

#### Scenario: Propose drafts acceptance flows from scenarios

- **WHEN** a change's artifacts are generated through propose after its delta
  specs exist
- **THEN** `openspec/changes/<name>/acceptance.md` exists with flows chaining
  the change's scenarios and any pre-existing cross-capability links from
  canonical specs

#### Scenario: An unchainable journey surfaces a spec gap

- **WHEN** drafting a flow reveals a step no existing or delta scenario
  covers
- **THEN** the missing behavior is added to the change's delta specs and the
  flow chains through it, rather than the flow inventing unspecified behavior

### Requirement: Flows use uniform chained Given/When/Then rows

Every flow in `acceptance.md` SHALL be one Given→When→Then arc in strict
order of appearance — a stage recurring after a later one (When after
Then, Given after When) SHALL start a new flow. Rows SHALL be atomic:
one concrete user action (literal UI verbs and handles) or one
observable assertion per row, **And** continuing the current stage.
Givens SHALL open on the binary distinguishing state, with no `And`
restating what it implies. Thens SHALL state implied negatives
explicitly and carry no parenthetical commentary or unobservable claims.
Vague proposal prose SHALL be converted to a concrete observable;
failure to find one is a spec gap the artifact exists to surface. A
requirement with no human-observable surface SHALL be marked "no manual
path — fully automated" and never forced into a flow. Canonical spec
scenarios remain WHEN/THEN; the GWT format is exclusive to
acceptance.md.

#### Scenario: A journey spanning multiple arcs splits into multiple flows

- **WHEN** a user journey would need a stage after a later one (e.g. a
  When after a Then)
- **THEN** acceptance.md carries a separate flow per arc, each with its
  own Given

#### Scenario: Compound rows are split into atoms

- **WHEN** a draft row bundles several actions or several assertions
- **THEN** the flow renders one action or assertion per row

#### Scenario: A fully-automated requirement is exempt

- **WHEN** a requirement in the change has no human-observable surface
- **THEN** acceptance.md lists it as "no manual path — fully automated"
  instead of a forced flow

### Requirement: Apply refines flows with literal handles

The `acceptance` artifact SHALL be listed in the schema's `apply.requires`
(`[tasks, review, acceptance]`) so `/opsx:apply` auto-loads `acceptance.md`
into its context files. The apply instruction SHALL frame acceptance.md as the
end-state picture the implementation works toward, and apply-time work SHALL
refine the drafted flows with literal handles — real button text, real routes —
refining, not rewriting. No tasks.md checkbox enforces the refinement.

#### Scenario: Apply loads acceptance.md as context

- **WHEN** `/opsx:apply` runs on a change
- **THEN** `acceptance.md` appears in the apply instructions' context files
  alongside `tasks.md` and `review.md`

#### Scenario: Apply-time refinement keeps flow identity

- **WHEN** implementation lands concrete UI surfaces for a drafted flow
- **THEN** the flow's steps gain literal handles while its Given/When/Then
  chain and journey scope remain those drafted at propose

### Requirement: Archived acceptance flows are hints, not truth

Consumers of archived `acceptance.md` files SHALL treat them as point-in-time
walk scripts, not living contracts: archives receive no delta-sync, so a later
change can supersede a flow. `/port-inspection`'s map-wide e2e scout SHALL
read the archived acceptance.md files of the map's landed voyages, newest
first, as walk scripts; on mismatch between a flow and the live app, current
canonical specs adjudicate — only a spec-confirmed mismatch is a finding.

#### Scenario: The e2e scout walks archived flows

- **WHEN** `/port-inspection` runs its map-wide e2e scout
- **THEN** the scout reads archived acceptance.md files from the map's landed
  changes instead of reconstructing behavior from commits and summaries

#### Scenario: A superseded flow is not a finding

- **WHEN** an archived flow mismatches the live app but current canonical
  specs confirm the live behavior
- **THEN** the mismatch is discarded as a superseded flow, not reported as a
  defect
