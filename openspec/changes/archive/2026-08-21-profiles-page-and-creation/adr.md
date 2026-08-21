<!-- The delta against the ADR library at `openspec/adr/`. Contract: the adr
     artifact instruction in schema.yaml. -->

## ADDED ADRs

### 2026-08-19-profile-attributes-column-or-preference

**Touching**: `DB Schema`, `DAL`

**Context**: `profile_preferences` is a normalized catalog keyed by a stable identifier with values stored as generic text, shipped empty pending its first consumer. This change needed homes for two per-profile attributes at once — an accent colour and a tagline — and they landed in different places, so the rule that separated them is worth stating rather than re-deriving.

**Decision**: An attribute whose value is chosen, has a defined resolution when absent, and needs no database constraint goes in `profile_preferences`. Identity content that renders wherever the profile renders, or that might ever be required or bounded at the database, goes in a `profiles` column — a preference value is generic text keyed by catalog id, so nothing per-preference can carry `notNull` or a check. "Required" throughout means required at the database: an attribute a single writer demands of its own callers is not a database constraint and stays eligible for a preference. Optional identity text follows `lists.subtitle`'s contract: nullable, empty normalized to NULL, an explicit character cap, and a render contract distinguishing absent from blank. A feature introducing a preference owns its catalog row, per `profiles-data-model`.

**Consequences**: Later per-profile settings route to preferences without re-deciding the question. An attribute that might become required has to start as a column, since converting a preference afterwards is a migration plus a backfill. Reads needing both shapes pay a join that a column-only profile avoids.

## MODIFIED ADRs

<!-- The entry's position is unchanged — a reader following it today still acts
     correctly, so this is MODIFIED rather than a new name. What it never said
     is which writes need atomicity in the first place; this change had to
     decide that to rule its third write out, and the rule belongs with the
     mechanism it gates. Touching is unchanged, so INDEX.md needs no new row. -->

### 2026-08-18-atomic-writes-in-one-cte

**Touching**: `DATABASE.md`

**Context**: `neon-http` gives every statement its own HTTP round trip and no interactive transaction, so a write pair that must not half-apply has no session to hold it. Guarding the second write with `NOT EXISTS` plus `ON CONFLICT DO NOTHING` still strands the first row under true concurrency, and a compensating delete costs a third round trip and orphans anyway if the process dies mid-sequence (verified on PostgreSQL 15.18 and PGlite 0.4.6). Which writes need this is decided by fixability: a partial write leaving an unfixable state needs atomicity, and one a user or a later write can correct does not — the tell is whether any actor still holds a handle onto the damage, since a row orphaned beyond every access path is permanent while a value that is merely absent can be written again.

**Decision**: Two or more writes needing atomicity go in one data-modifying CTE. One statement is one implicit transaction, so a constraint violation anywhere in it rolls back every branch, the inner INSERT included. FK triggers fire at end of statement, so a child row may reference a parent created in the same statement. Drizzle expresses it as `db.$with()` over an INSERT body, type-checked under strict, with no raw-SQL escape hatch.

**Consequences**: The uniqueness backstop raises rather than returns, so a caller wanting idempotency catches the SQLSTATE — and must narrow it to the index it means, or it swallows unrelated violations from the same statement. Application code cannot branch between the writes; anything conditional has to be expressible in SQL. Drizzle's insert-select rejects a projection that is not the target table's own columns in order, so a CTE-fed insert restates every column, defaults included; these costs are why the fixability test gates reaching for a CTE at all.

## REMOVED ADRs

<!-- None. -->
