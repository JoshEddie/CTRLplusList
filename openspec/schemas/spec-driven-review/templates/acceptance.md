# Acceptance — <change-name>

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. A When is one
     action by the chain's root actor, carrying that actor's literal handle;
     a Then asserts what the execution emitted. Stages in strict order of
     appearance — any stage recurring after a later one (When after Then,
     Given after When) = a new flow; split it.
     Drafted at propose time by chaining the change's scenarios onto
     pre-existing canonical-spec links; refined at apply time with literal
     handles (real button text, real routes) — refine, not rewrite.
     While any finding stands, no flows are written and this file does not
     exist.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: <user journey name>

- **Given** <binary distinguishing precondition state>
- **And** <further precondition — optional, one per row>
- **When** <one concrete action by the chain's root actor, literal handle —
  `clicks Claim as Guest`, `runs npm run db:migrate`, `POSTs to the action`>
- **And** <next single action — as many rows as the journey spans>
- **Then** <one assertion on what the execution emitted>
- **And** <further single assertions — including explicit negatives>

### Flow: <operator journey name>

- **Given** <binary distinguishing precondition state>
- **When** the owner runs `npm run db:migrate`
- **Then** <one assertion on the emitted rows, stdout, or exit code>
- **And** <further single assertions — including explicit negatives>
