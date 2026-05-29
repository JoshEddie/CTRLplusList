## ADDED Requirements

### Requirement: Sub-agent briefs are bundled within the skill

The skill SHALL define each sub-agent review brief — standard-review,
convention-audit, and contract-audit — within the skill itself, and SHALL NOT
factor any brief into a separately invocable skill. The orchestrator SHALL
deliver each brief to its sub-agent by reference to the brief's bundled location
together with the review inputs (the diff or the command to produce it, the
resolved change name, and the archive state where relevant), such that no review
phase takes a runtime dependency on a skill external to `spec-review`. Any
contract shared across the orchestrator and a brief — the structured finding
shape, and the archive-state definitions and reconciliation-latitude data — SHALL
be defined in a single source rather than duplicated per brief.

This generalizes, without weakening, the self-containment already required for
the standard-review dimensions: the same protection now covers the convention
and contract phases.

#### Scenario: Each brief is bundled, not a separate skill

- **WHEN** the `spec-review` skill is packaged
- **THEN** each of the standard-review, convention-audit, and contract-audit
  briefs exists as a file bundled within the `spec-review` skill, and none is
  registered as its own invocable skill

#### Scenario: All phases run without any external skill present

- **WHEN** `/spec-review` runs and no skill other than `spec-review` is installed
- **THEN** all three review phases execute using their bundled briefs without
  error

#### Scenario: A brief is delivered by reference with the review inputs

- **WHEN** the orchestrator spawns a review sub-agent
- **THEN** it passes the sub-agent the location of that agent's bundled brief
  together with the diff, the resolved change name, and the archive state where
  relevant, rather than reproducing the brief's body in the orchestrator's own
  working context

#### Scenario: A shared contract has a single source

- **WHEN** the structured finding shape or the archive-state definitions are
  needed by both the orchestrator and a brief
- **THEN** that contract is defined in one place and referenced, not copied into
  each brief
