## MODIFIED Requirements

### Requirement: Recheck SHALL verify findings inline in a single pass

The skill SHALL run as one inline pass — no sub-agents, no workflow fan-out, no review briefs. It SHALL read the latest round **as amended** by its `### Adjudications` subsection (per the reader rule in `reference/finding-format.md`): a finding's effective disposition is the one set by the latest `### Adjudications` entry for its ID, and re-dispositioned findings SHALL NOT be re-litigated. For each finding whose effective disposition is an open `Fix now` it SHALL classify: resolved (the delta addresses it), still open, or fix-introduced-new-issue (the delta creates a fresh defect, reported as a new finding). Findings whose effective disposition is `File issue` or `Drop` SHALL NOT be re-litigated. The appended round SHALL reference prior findings by their durable IDs.

#### Scenario: Each open finding gets a resolution status
- **WHEN** a recheck runs against a report with three findings whose effective disposition is open `Fix now`
- **THEN** the appended round lists each of the three, by ID, as resolved, still open, or superseded by a new finding introduced by the fix

#### Scenario: Adjudicated findings are read as amended
- **WHEN** the latest round's `**Verdict:**` line reads `findings remain` but its `### Adjudications` subsection re-dispositions the only open `Fix now` finding to `File issue`
- **THEN** the recheck treats that finding as `File issue`, does not re-litigate it, and resolves the round's effective verdict from the amended dispositions

#### Scenario: No fan-out is used
- **WHEN** `/recheck-review` executes
- **THEN** no sub-agents or workflow invocations occur; the pass runs in the orchestrating session
