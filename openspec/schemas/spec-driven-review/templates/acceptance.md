# Acceptance — <change-name>

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. Stages in
     strict order of appearance — any stage recurring after a later one
     (When after Then, Given after When) = a new flow; split it.
     Drafted at propose time from the change's scenarios + pre-existing
     canonical-spec links; refined at apply time with literal handles
     (real button text, real routes) — refine, not rewrite.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: <user journey name>

- **Given** <binary distinguishing precondition state>
- **And** <further precondition — optional, one per row>
- **When** <one concrete user action, literal UI handle>
- **And** <next single action — as many rows as the journey spans>
- **Then** <one observable assertion>
- **And** <further single assertions — including explicit negatives>

## No manual path — fully automated

<!-- Requirements with no human-observable surface. List each; never force
     one into a flow. Delete this section if empty. -->

- <requirement name> — <why no manual path>
