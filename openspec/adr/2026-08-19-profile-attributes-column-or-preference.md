# Profile attributes: column or preference

**Touching**: `DB Schema`, `DAL`

**Context**: `profile_preferences` is a normalized catalog keyed by a stable identifier with values stored as generic text, shipped empty pending its first consumer. This change needed homes for two per-profile attributes at once — an accent colour and a tagline — and they landed in different places, so the rule that separated them is worth stating rather than re-deriving.

**Decision**: An attribute whose value is chosen, has a defined resolution when absent, and needs no database constraint goes in `profile_preferences`. Identity content that renders wherever the profile renders, or that might ever be required or bounded at the database, goes in a `profiles` column — a preference value is generic text keyed by catalog id, so nothing per-preference can carry `notNull` or a check. "Required" throughout means required at the database: an attribute a single writer demands of its own callers is not a database constraint and stays eligible for a preference. Optional identity text follows `lists.subtitle`'s contract: nullable, empty normalized to NULL, an explicit character cap, and a render contract distinguishing absent from blank. A feature introducing a preference owns its catalog row, per `profiles-data-model`.

**Consequences**: Later per-profile settings route to preferences without re-deciding the question. An attribute that might become required has to start as a column, since converting a preference afterwards is a migration plus a backfill. Reads needing both shapes pay a join that a column-only profile avoids.
