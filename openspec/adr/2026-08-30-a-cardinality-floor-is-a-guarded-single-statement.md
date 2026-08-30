# A cardinality floor is a guarded single statement

**Touching**: `DATABASE.md`, `DAL`

**Context**: A profile must keep at least one owner, and `neon-http` offers no interactive transaction to read the count and act on it. A unique index cannot express the invariant — uniques bound a set from above, not below — and `2026-08-18-atomic-writes-in-one-cte` does not reach the case either, since the hazard is one write racing a concurrent one rather than a pair half-applying, and two concurrent single-statement CTEs race identically.

**Decision**: A cross-row cardinality floor is enforced by folding its guard into the mutating statement itself — `DELETE … AND EXISTS (SELECT 1 … WHERE <the survivor condition>)` — so the check evaluates at statement time rather than at request time, and zero rows affected is the refusal. A read-then-write pair is not used for this. The residual window under true concurrency is named in the spec rather than assumed away, and is acceptable only where the state it lands in is one the application already tolerates by another route.

**Consequences**: The invariant costs one round trip instead of two and narrows the race to a single statement's duration, but does not close it, so any such floor must have a tolerable failure state before this shape is chosen. It also makes the guard's *absence* meaningful: where an operation's own actor is necessarily a survivor, adding the `EXISTS` clause would be a redundant guard, and the reasoning has to be recorded or a later reader will add one back.
