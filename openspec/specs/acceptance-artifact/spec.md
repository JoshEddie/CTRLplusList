# acceptance-artifact Specification

## Purpose

`acceptance.md` is a first-class OpenSpec artifact carrying chained
Given/When/Then user-journey flows for a change: drafted during planning, after
design and before tasks, as a spec-completeness probe over the change's
scenarios and their pre-existing cross-capability links, refined at apply time
with literal UI handles. This
capability owns the artifact's registration, template, and lifecycle; flow
consumption belongs to its consumers (the owner's pre-landfall walk and
`/port-inspection`'s map-wide e2e scout).

## Requirements

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
  chain and journey scope remain those drafted during planning

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
