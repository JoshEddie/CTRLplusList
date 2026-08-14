## MODIFIED Requirements

### Requirement: Adverse rounds append a gate section to tasks.md

When the persisted round's verdict is `findings remain`, the skill SHALL append a
numbered `## <N>. Gates — round <n>` section to the resolved change's `tasks.md`,
continuing the file's section numbering. The section SHALL carry, as separate
checkable items: one item per open `Fix now` finding referenced by durable ID, and
the five pre-merge verification gates (`npm run lint`, `npx tsc --noEmit`, `npm run
build`, `npm run test:coverage`, `npm run test:e2e`) restated so each partial
failure is visible — minus any gate omitted under the doc-only exemption, which
SHALL carry no checklist item, its omission and rationale named in the section's
lead-in instead. A lead-in under the heading SHALL point fix sessions to
`review.md` Round `<n>` by durable ID for each finding's severity, location,
citation, and reconcile side. Prior gate sections SHALL never be unchecked or
edited; a clearing verdict appends no section. `/landfall`'s all-tasks-checked
gate is the enforcement mechanism and needs no change of its own.

#### Scenario: Adverse round appends a gate section with restated gates

- **WHEN** round 1 persists with verdict `findings remain` and open findings `A1`
  and `B4`
- **THEN** `tasks.md` gains a numbered `## Gates — round 1` section listing `A1` and
  `B4` plus the five pre-merge gates as separate checkable items, under a lead-in
  pointing to `review.md` Round 1 by durable ID

#### Scenario: Doc-only round omits the exempt gates

- **WHEN** the round's change touches no executable file, so the two test gates are
  exempt
- **THEN** the appended section carries no `test:coverage` or `test:e2e` item, and
  its lead-in names both as omitted under the doc-only exemption

#### Scenario: Clearing verdict appends nothing

- **WHEN** the persisted round's verdict is `clear to land`
- **THEN** no gate section is appended

#### Scenario: Finding lines reference review.md by durable ID

- **WHEN** a fix session opens the gate section in a fresh chat
- **THEN** the lead-in directs it to `review.md` Round `<n>`, where each finding's
  durable ID resolves its full severity, `path:line`, citation, and disposition
