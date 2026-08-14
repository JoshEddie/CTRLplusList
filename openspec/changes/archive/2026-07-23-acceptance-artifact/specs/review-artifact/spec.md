# review-artifact Delta Specification

## MODIFIED Requirements

### Requirement: The scaffold keeps the change lifecycle free of review drag

The `review` artifact SHALL be listed in the schema's `apply.requires`; because
the scaffold exists from propose onward, the entry never blocks apply. The change
SHALL report `isComplete` independent of review round content, and
`/opsx:continue` SHALL NOT route to generating review round content as pending
work during the pre-review lifecycle.

#### Scenario: Pre-review status is unaffected by the review artifact

- **WHEN** a change has completed `tasks` but has not yet been reviewed
- **THEN** its status is `isComplete: true` with the `review` artifact resolved
  (its scaffold present), and `/opsx:continue` does not offer to generate
  review round content

#### Scenario: The review entry in apply.requires never blocks apply

- **WHEN** `/opsx:apply` runs on a change whose `review.md` is still the
  `round: 0` scaffold
- **THEN** apply proceeds normally with the scaffold loaded as context
