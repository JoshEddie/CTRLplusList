## ADDED Requirements

### Requirement: Concise, progressively-disclosed authoring

The skill SHALL be authored for conciseness and progressive disclosure: its
`SKILL.md` body SHALL stay under 500 lines and contain only the orchestrator's
job (scope resolution, fan-out invocation, CI read, consolidation, verdict,
handoff), with shared contracts and agent-facing detail placed in bundled
reference files rather than inline. Each reference file SHALL be a terminal leaf
(it SHALL NOT reference further files) and SHALL be referenced **one level deep**
from each entry point that needs it — `SKILL.md` and each sub-agent brief link to
it directly, and no brief SHALL reach a shared contract by pointing back through
`SKILL.md`. Any bundled markdown file longer than 100 lines SHALL begin with a
table of contents. This builds on, and does not weaken, the "Sub-agent briefs are
bundled within the skill" single-sourcing requirement: the single source MAY move
to a leaf reference file, but remains single.

#### Scenario: SKILL.md stays under the size limit

- **WHEN** the `spec-review` skill is packaged
- **THEN** its `SKILL.md` body is under 500 lines and carries the orchestrator's
  job rather than the agent-facing review contracts

#### Scenario: Shared contracts live in terminal leaf reference files

- **WHEN** a contract is shared between the orchestrator and a brief (e.g. the
  archive-state latitude table or the finding format)
- **THEN** it lives in a bundled reference file that itself references no further
  file, single-sourced rather than duplicated

#### Scenario: References are one level deep from each entry point

- **WHEN** `SKILL.md` or a brief needs a shared contract
- **THEN** it links to that reference file directly, and no brief obtains the
  contract by pointing back through `SKILL.md`

#### Scenario: Long reference files carry a table of contents

- **WHEN** a bundled markdown file exceeds 100 lines
- **THEN** it begins with a table of contents listing its sections

### Requirement: Bundled evaluation scenarios

The skill SHALL ship with at least three bundled evaluation scenarios that cover
its core verdict outcomes — at minimum a false-complete contract mismatch (a
task marked complete with no implementing work, yielding a not-clear-to-archive
verdict), a merged-archive conformance violation (a Type-2 change yielding a
`Request changes` verdict under directional framing), and a clean PR (no `Fix now`
findings, yielding an `Approve` verdict). Each scenario SHALL state its inputs and
its expected behavior so it can serve as a source of truth for future iteration,
independent of whether an automated runner exists.

#### Scenario: At least three evaluations are bundled

- **WHEN** the `spec-review` skill is packaged
- **THEN** at least three evaluation scenarios are bundled with it

#### Scenario: Evaluations cover the core verdict outcomes

- **WHEN** the bundled evaluation scenarios are read
- **THEN** they include at minimum a false-complete contract mismatch, a
  merged-archive conformance violation, and a clean approving PR

#### Scenario: Each evaluation states inputs and expected behavior

- **WHEN** an individual evaluation scenario is read
- **THEN** it specifies the review inputs and the expected behavior, so it is
  checkable by hand even without an automated runner
