# trunk-workflow (delta)

## MODIFIED Requirements

### Requirement: /start-change SHALL gate on trunk preconditions and route by issue label

The `/start-change <issue#>` skill SHALL hard-stop unless the working copy is on `dev`, the working tree is clean, and `dev` is up to date with its remote. It SHALL read the issue via `gh issue view`. When the issue carries an `IDEA` or `EXPLORE NEEDED` label, the skill SHALL run an interactive OpenSpec explore session and nothing else — the invocation ends with the explore route; it SHALL NOT chain into propose, even when every open question appears answered. When the issue carries a `HOLD` label, the skill SHALL surface the most recent hold comment and ask the owner whether to re-explore before proceeding; otherwise it SHALL run propose seeded from the issue body — propose's grilling interview runs in-conversation and concludes only on the owner's explicit confirmation of shared understanding, never self-certified (answers gathered during a past explore do not count as the interview). The skill SHALL NOT create commits.

#### Scenario: Dirty tree blocks start
- **WHEN** `/start-change 42` runs with uncommitted changes in the working tree
- **THEN** the skill stops before touching the issue, reporting that the in-flight change must land (or be stashed deliberately) first

#### Scenario: Unlabeled issue goes straight to propose
- **WHEN** `/start-change 42` runs against an issue with no routing label
- **THEN** the skill runs propose using the issue body as the seed, with no explore session

#### Scenario: EXPLORE NEEDED runs an explore session only
- **WHEN** the issue carries the `EXPLORE NEEDED` label
- **THEN** the skill runs an interactive explore session and stops at its conclusion — no proposal artifact is drafted in that invocation; propose happens when the owner asks for it or re-runs `/start-change` against the now-unlabeled issue

#### Scenario: HOLD issue requires explicit confirmation
- **WHEN** `/start-change` runs against an issue labeled `HOLD`
- **THEN** the skill surfaces the hold comment and proceeds to re-explore only on the owner's explicit yes

### Requirement: Explore outcomes SHALL be written back to the issue

When `/start-change` runs an explore session, the session SHALL be conducted as a conversation across turns — findings and open threads surfaced in chat for the owner to react to, not a batched one-shot questionnaire. The distilled outcome SHALL be presented in chat for the owner's sign-off before any issue edit; only after that approval SHALL it be written into the issue body (the issue remains the single source propose reads) and the routing label (`IDEA` / `EXPLORE NEEDED`) removed. The skill then stops, reporting the issue is propose-ready. When an `IDEA` explore concludes the idea is not viable (never viable, not currently viable, or not worth the churn), the skill SHALL post the findings and rationale as an issue comment, swap the label to `HOLD`, leave the issue open, and stop without creating a change.

#### Scenario: Viable explore updates the issue and stops

- **WHEN** an explore session for an `EXPLORE NEEDED` issue reaches a buildable shape and the owner approves the distilled outcome
- **THEN** the issue body is updated with that outcome, the label is removed, and the invocation ends without running propose

#### Scenario: Write-back waits for owner approval

- **WHEN** an explore session reaches what looks like a buildable shape but the owner has not yet signed off on the distilled outcome
- **THEN** no issue edit is made — the outcome is presented in chat and the session continues until the owner approves or redirects

#### Scenario: Non-viable IDEA is parked, not closed
- **WHEN** an `IDEA` explore concludes the idea should not move forward now
- **THEN** the skill comments the findings and why, replaces `IDEA` with `HOLD`, leaves the issue open, and creates no change
