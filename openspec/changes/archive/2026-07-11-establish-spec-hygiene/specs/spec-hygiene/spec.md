# spec-hygiene delta

## Purpose

Govern the completeness of capability-spec Purposes: every active spec carries a real, non-TBD Purpose so "specs are the contract" holds at the header, not just the requirements. Purposes are authored when a capability is created, repaired via `/finalize-spec-purposes` when a stub escapes, and verified by an advisory script that is deliberately not a merge gate — a TBD stub can only be created by the OpenSpec sync/archive workflow itself, so enforcement belongs to that workflow, not to every merge. Created by change `establish-spec-hygiene`, which demoted the former lint-riding gate.

## ADDED Requirements

### Requirement: Every active capability spec SHALL carry a real Purpose, authored at creation

Every spec at `openspec/specs/<capability>/spec.md` SHALL contain a `## Purpose` section that is present, non-empty, and not a `TBD` stub. When a change's delta specs introduce a new capability, the delta SHALL state the capability's Purpose (1–3 sentences, derived from the proposal's Why and the delta's requirements) so that sync/archive writes it into the created main spec instead of the generated workflow's default `TBD - created by archiving change <X>` stub. This authorship rule SHALL be encoded in `openspec/config.yaml`'s `rules.specs` block.

#### Scenario: New-capability delta ships its Purpose

- **WHEN** a delta spec introducing a new capability is authored under a change
- **THEN** the delta states the capability's Purpose alongside its added requirements
- **AND** the main spec created at sync/archive time carries that Purpose, not a TBD stub

#### Scenario: Generated workflow instruction does not override authored Purpose

- **WHEN** sync/archive creates `openspec/specs/<capability>/spec.md` for a capability whose delta authored a Purpose
- **THEN** the authored Purpose is written even though the generated sync instructions permit a TBD stub

### Requirement: Escaped and legacy TBD stubs SHALL be repaired via the finalize-spec-purposes skill

`/finalize-spec-purposes` SHALL remain the standing repair path for any Purpose that is missing, empty, or a TBD stub. The skill SHALL derive each Purpose from the originating change's proposal and the spec's own requirements, confirm drafts with the owner before writing, and prune each backfilled capability from the `KNOWN_TBD` baseline in `scripts/check-spec-purposes.mjs`. The baseline SHALL only shrink: entries are never added, and a filled-in Purpose whose capability is still listed is a verifier failure.

#### Scenario: Stub backfilled and baseline ratcheted

- **WHEN** the skill backfills a TBD Purpose for a grandfathered capability
- **THEN** the capability's entry is removed from `KNOWN_TBD` in the same edit
- **AND** a subsequent `npm run check:specs` run passes for that capability

#### Scenario: Baseline regression is detected

- **WHEN** a capability with a real Purpose remains listed in `KNOWN_TBD`, or a listed capability's spec no longer exists
- **THEN** `npm run check:specs` exits non-zero naming the stale entry

### Requirement: Purpose verification SHALL be advisory and SHALL NOT be a merge gate

The repository SHALL expose the Purpose verifier as `npm run check:specs` (running `scripts/check-spec-purposes.mjs`), which exits non-zero on any TBD or missing Purpose outside the `KNOWN_TBD` baseline and on stale baseline entries. The verifier SHALL be the mandatory verification step of `/finalize-spec-purposes`. It SHALL NOT run under `npm run lint` or any other pre-merge gate, and no pre-merge gate SHALL be added for it: a TBD stub originates only in the sync/archive workflow — never in ordinary code commits — so a repo-wide merge gate polices commits that structurally cannot fail it while the workflow's own repair step already owns the fix. A stale Purpose costs spec authority, not shipped defects; that cost does not warrant blocking unrelated merges.

#### Scenario: Verifier flags a stub without blocking merge

- **WHEN** a TBD Purpose outside the baseline exists in the repo
- **THEN** `npm run check:specs` exits non-zero naming the spec
- **AND** `npm run lint` passes with no Purpose-related failure

#### Scenario: Lint gate is pure eslint

- **WHEN** the `lint` script in `package.json` is inspected
- **THEN** it runs `eslint .` alone, with no chained spec-hygiene check
