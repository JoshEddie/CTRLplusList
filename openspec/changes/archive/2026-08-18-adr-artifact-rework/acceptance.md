# Acceptance — adr-artifact-rework

## Finding: no flow is sourceable

No flows are written. This is not an empty walk — it is the recorded outcome of
the artifact's own sourcing rule.

This change sets `skip_specs: true`, so there are no `#### Scenario:` blocks to
chain, and no active spec governs the surface it changes (grepping the corpus
returns only the routing label `ADRIFT`). The instruction is explicit that
`design.md` never sources behavior and that a step it alone asserts *"is not
sourced: surface it"*. Every candidate row here would be design-sourced or
sourced to the schema declaration this change writes.

The substantive reason is upstream of that. Almost everything this change does
is instruction text an agent reads — where a decision is filed, how a
destination delta is written, when one entry supersedes another. An agent
following instructions emits no exit code, no stdout, and no row, so no test
attaches. What remains is base-tooling behavior under a changed configuration
value, which is a smoke check on someone else's code rather than a journey
through this repository's.


**Owner ruling, 2026-08-18:** proceed with the finding recorded and the file
scaffolded, so the artifact exists for the workflow gate. The ruling is the
owner's; this artifact did not grant it to itself.
