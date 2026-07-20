## MODIFIED Requirements

### Requirement: Multi-agent orchestration

The skill SHALL run its review phases as parallel sub-agents — at minimum a
standard-review agent, a convention-audit agent, and a contract-audit agent — and
SHALL consolidate their findings into a single report. The skill SHALL perform
this parallel review fan-out by spawning the phase agents directly as Agent-tool
sub-agents, issued together so they run concurrently, with no dependency on the
Workflow tool or any bundled workflow script.

Each phase agent SHALL be instructed to reply with only a JSON object
`{"findings": [...], "deferredToCI": [...]}` whose findings carry exactly the
fields of the skill's finding shape (as defined in the skill's finding-format
reference), with `phase` set to the agent's own phase key. The skill SHALL parse
and validate each reply against that shape — required fields present and the
enumerated `phase` / `severity` / `disposition` values respected. On a malformed
reply the skill SHALL retry exactly once by sending a follow-up message to the
same agent requesting only the corrected JSON; if the reply is still malformed
after that single retry, the skill SHALL abort the review, naming the failed
phase and surfacing the raw reply, and SHALL NOT persist a partial round.

The skill SHALL retain in the orchestrating session every interactive or
orchestrator-judgment step: scope and change resolution (including any
`AskUserQuestion` prompts), the CI status read, consolidation of the returned
findings into the report, the verdict / clear-to-archive determination, and the
adjudication handoff. The skill SHALL pass each phase agent only fully-resolved,
non-interactive inputs (at minimum the diff source, the resolved change name and
archive state where applicable, and the agent's bundled brief location) and
SHALL consume the findings the agents return for consolidation. This SHALL NOT
weaken the existing "OpenSpec change resolution" requirement: its interactive
steps remain in the skill.

#### Scenario: Fan-out runs as direct parallel sub-agents

- **WHEN** `/spec-review` executes against a resolved diff
- **THEN** the skill spawns the standard-review, convention-audit, and
  contract-audit phase agents as Agent-tool sub-agents issued together so they
  run concurrently, without invoking the Workflow tool, and their findings are
  returned to the skill and merged into one consolidated report

#### Scenario: Phase findings arrive as validated JSON replies

- **WHEN** a phase agent produces findings
- **THEN** it replies with only a JSON object matching the skill's finding
  shape, and the skill validates the reply — required fields and enumerated
  values — before consolidating, rather than consuming free-text prose

#### Scenario: Malformed reply is retried once with the same agent

- **WHEN** a phase agent's reply fails to parse or validate against the finding
  shape
- **THEN** the skill sends that same agent one follow-up message requesting only
  the corrected JSON object, reusing the agent's existing review context rather
  than re-running the phase

#### Scenario: Persistent malformed reply aborts the review

- **WHEN** a phase agent's reply is still malformed after the single retry
- **THEN** the skill aborts the review, names the failed phase, surfaces the raw
  reply, and persists no round

#### Scenario: Interactive steps stay in the orchestrating session

- **WHEN** scope resolution is ambiguous (more than one plausible change)
- **THEN** the interaction (e.g. `AskUserQuestion`) is performed by the skill in
  the orchestrating session, never by a phase agent, which receives only the
  already-resolved inputs

#### Scenario: Phase agents receive resolved inputs and return findings

- **WHEN** the skill spawns the phase agents
- **THEN** it passes each one the diff source, its bundled brief location, and —
  for the contract agent — the resolved change name and archive state, and
  consumes the findings the agents return rather than re-deriving them
