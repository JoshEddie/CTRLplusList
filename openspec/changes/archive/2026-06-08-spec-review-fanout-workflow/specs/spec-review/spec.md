## MODIFIED Requirements

### Requirement: Multi-agent orchestration

The skill SHALL run its review phases as parallel sub-agents — at minimum a
standard-review agent, a convention-audit agent, and a contract-audit agent — and
SHALL consolidate their findings into a single report. The skill SHALL perform
this parallel review fan-out by invoking a workflow bundled within the skill,
rather than by spawning the phase agents directly, such that each phase agent
returns its findings through a schema-validated structured-output shape (the
finding shape defined for the skill), not as free text. The skill instructing the
workflow invocation SHALL itself satisfy the workflow's opt-in; no separate
per-run user opt-in is required.

Because the workflow runs non-interactively and cannot prompt the user, the
skill SHALL retain — outside the workflow — every interactive or
orchestrator-judgment step: scope and change resolution (including any
`AskUserQuestion` prompts), the CI status read, consolidation of the returned
findings into the report, the verdict / clear-to-archive determination, and the
explore-mode handoff. The skill SHALL pass the workflow only fully-resolved,
non-interactive inputs (at minimum the diff source, the resolved change name, the
archive state, and the bundled brief locations) and SHALL receive the phase
findings back from the workflow for consolidation. This SHALL NOT weaken the
existing "OpenSpec change resolution" or "Optional explore-mode handoff"
requirements: their interactive steps remain in the skill.

#### Scenario: Fan-out runs via the bundled workflow

- **WHEN** `/spec-review` executes against a resolved diff
- **THEN** the skill invokes its bundled workflow, the standard-review,
  convention-audit, and contract-audit phases run concurrently within it, and
  their findings are returned to the skill and merged into one consolidated
  report

#### Scenario: Phase findings are schema-validated

- **WHEN** a phase agent in the workflow produces findings
- **THEN** each finding conforms to the skill's structured finding shape by
  schema validation rather than being emitted as free text for the orchestrator
  to parse

#### Scenario: Interactive steps stay in the skill, not the workflow

- **WHEN** scope resolution is ambiguous (more than one plausible change) or the
  explore-mode handoff is offered
- **THEN** the interaction (e.g. `AskUserQuestion`, the handoff prompt) is
  performed by the skill, never by the non-interactive workflow, which receives
  only the already-resolved inputs

#### Scenario: Workflow receives resolved inputs and returns findings

- **WHEN** the skill invokes the workflow
- **THEN** it passes the diff source, the resolved change name, the archive
  state, and the bundled brief locations, and consumes the findings the workflow
  returns rather than re-deriving them
