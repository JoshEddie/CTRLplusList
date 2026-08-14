# Acceptance — acceptance-artifact

## Flows

### Flow: A new change is proposed and carries acceptance flows

- **Given** an owner on `dev` with the fork schema active (`schema: spec-driven-review` in `openspec/config.yaml`)
- **When** they run `/opsx:propose` for a new change and its delta specs are generated
- **And** artifact generation reaches the `acceptance` artifact (`requires: [specs]`)
- **Then** `openspec/changes/<name>/acceptance.md` exists with Given/When/(And…)/Then flows chaining the change's scenarios and pre-existing canonical-spec links, and `openspec status --change <name> --json` lists `acceptance` among the artifacts

### Flow: Apply loads acceptance.md and refines it

- **Given** an owner with a proposed change whose `acceptance.md` was drafted at propose time
- **When** they run `/set-sail` → `/opsx:apply` on the change
- **Then** `openspec instructions apply --change <name> --json` lists `acceptance.md` in `contextFiles` alongside `tasks.md` and `review.md`, and the apply instruction frames it as the end-state picture — implementation sessions refine the drafted flows with literal handles (real button text, real routes) without rewriting them

### Flow: The e2e scout walks archived flows

- **Given** a map whose implementation chunks have all landed, each voyage archived with its `acceptance.md` under `openspec/changes/archive/`
- **When** `/port-inspection` creates and fires the map-wide e2e scout
- **Then** the scout's subagent reads the archived acceptance.md files newest-first as walk scripts; a flow that mismatches the live app is adjudicated against current canonical specs — spec-confirmed mismatch becomes a finding, a superseded flow is discarded

## No manual path — fully automated

- An unchainable journey surfaces a spec gap — authoring-time discipline inside artifact generation; no runtime surface to walk
- Flows use uniform chained Given/When/Then rows — format contract enforced by the artifact's schema instruction at generation; no runtime surface
- review-artifact `apply.requires` fix — spec-text correction matching already-landed behavior; nothing new observable
