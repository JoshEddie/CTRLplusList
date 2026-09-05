# Row types are hand-declared, never inferred from the schema

`lib/types.ts` hand-mirrors the shape of database rows instead of deriving them
with Drizzle's `$inferSelect`. Two reasons: inferred types are hard to read and
produce inconsistent downstream errors, and more structurally, `lib/types.ts`
has **zero imports** — which is what lets `db/schema.ts` import `RoleShape` from
it without a cycle. Inferring would invert that dependency.

**Consequence:** the mirrors can drift from the schema silently. The guard for
that belongs in test scope, where `$inferSelect` is available and a mismatch
fails a test rather than production.
