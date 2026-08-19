<!-- The delta against the ADR library at `openspec/adr/`. Contract: the adr
     artifact instruction in schema.yaml. -->

## ADDED ADRs

### 2026-08-18-atomic-writes-in-one-cte

**Touching**: `DATABASE.md`

**Context**: `neon-http` gives every statement its own HTTP round trip and no interactive transaction, so a write pair that must not half-apply has no session to hold it. Guarding the second write with `NOT EXISTS` plus `ON CONFLICT DO NOTHING` still strands the first row under true concurrency, and a compensating delete costs a third round trip and orphans anyway if the process dies mid-sequence. Verified on PostgreSQL 15.18 and PGlite 0.4.6.

**Decision**: Two or more writes needing atomicity go in one data-modifying CTE. One statement is one implicit transaction, so a constraint violation anywhere in it rolls back every branch, the inner INSERT included. FK triggers fire at end of statement, so a child row may reference a parent created in the same statement. Drizzle expresses it as `db.$with()` over an INSERT body, type-checked under strict, with no raw-SQL escape hatch.

**Consequences**: The uniqueness backstop raises rather than returns, so a caller wanting idempotency catches the SQLSTATE — and must narrow it to the index it means, or it swallows unrelated violations from the same statement. Application code cannot branch between the writes; anything conditional has to be expressible in SQL.

## MODIFIED ADRs

## REMOVED ADRs
