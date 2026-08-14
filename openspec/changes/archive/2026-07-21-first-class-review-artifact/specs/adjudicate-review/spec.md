# adjudicate-review Specification

## MODIFIED Requirements

### Requirement: Concise re-grounding then a one-finding-at-a-time interview

For the latest round's findings, the skill SHALL re-ground each proposed
disposition in the code the finding cites — including findings dispositioned
`Drop` — by explicitly invoking the `/opsx:explore` skill: "explore" here names
that skill, not a loose reading pass, and the invocation is required. It SHALL
treat the persisted dispositions as proposals to confirm or reopen, not as settled.
It SHALL then interview the owner one finding, or one merge-group, at a time via
`AskUserQuestion`, each question naming the finding ID(s) it covers (including
merged findings, e.g. "A1+C3 are the same defect; this question covers both") with
the re-grounded evidence and a recommended disposition. The skill SHALL NOT skip
the interview or batch unrelated findings into a single question.

#### Scenario: Re-grounding invokes the explore skill

- **WHEN** the skill re-grounds the latest round's findings before the interview
- **THEN** it does so by explicitly invoking `/opsx:explore`, following each
  finding's citation into the cited code under that skill

#### Scenario: Every disposition is re-grounded before the interview

- **WHEN** the latest round contains findings dispositioned `Fix now`, `File issue`,
  and `Drop`
- **THEN** the skill re-grounds each in its cited code — Drops included — before
  putting any question to the owner

#### Scenario: Questions name their finding IDs

- **WHEN** the skill puts a finding to the owner, including a merge of two findings
- **THEN** the question names the covered finding ID(s) and carries the re-grounded
  evidence and a recommended disposition
