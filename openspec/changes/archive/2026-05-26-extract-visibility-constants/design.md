## Context

The list-visibility surface stores a 3-state enum (`'private' | 'unlisted' | 'public'`) and surfaces three labeled states in the UI ("Just me" / "Private" / "Shared"). The just-archived `relabel-and-harden-visibility` change chose to relabel without migrating the DB, which inverted two of the three label-to-value pairings:

```
┌──────────────┬──────────────┬───────────────────────────┐
│  DB value    │  UI label    │  Actual meaning           │
├──────────────┼──────────────┼───────────────────────────┤
│  'private'   │  Just me     │  Owner-only               │
│  'unlisted'  │  Private  ⚠️  │  Link-only                │
│  'public'    │  Shared      │  Followers' feed          │
└──────────────┴──────────────┴───────────────────────────┘
```

A search of the codebase finds ~12 string-literal references to these values spread across `lib/dal.ts`, `app/actions/lists.ts`, four list components, the route file, and the seed script. Each is a place where a future maintainer might read `visibility === 'private'` as the UI's "Private" (link-only) and be wrong.

**Hard constraint: dev and production share a Postgres database.** Local feature-branch development writes to the same `lists.visibility` column that production reads. Any code change that writes a DB value production does not understand breaks production for all users.

This change is **Stage 1 of a three-stage rollout** designed to fit that constraint. It introduces the constants module and decoder, replaces all string literals, and updates the user-facing "Just me" label — but writes only legacy DB values. Stages 2 and 3 follow as separate changes.

## Goals / Non-Goals

**Goals:**

- Eliminate every raw `'private' | 'unlisted' | 'public'` string literal from `app/`, `lib/`, and `scripts/` outside `lib/visibility.ts`.
- Make the DAL the sole boundary that ever sees raw DB strings; every consumer sees canonical `ListVisibility` values.
- Equip production with a tolerant decoder that already understands both legacy AND future-canonical DB strings, so a subsequent Stage 2 deploy can flip writes without coordination.
- Replace the "Just me" label with "Hidden" wherever it appears in UI copy, toast text, and modal copy.
- Update the `list-visibility` spec to bind future authors to the constants module and to the new label.

**Non-Goals:**

- Renaming the DB enum values. Stage 1 writes nothing but legacy values; the `UPDATE lists SET visibility = ...` SQL belongs to Stage 3.
- Flipping the right-hand side of the `VISIBILITY` constants. That is the entirety of Stage 2.
- Changing the visibility picker's UI structure, the `MenuItemRadio` primitive, the noindex/metadata-gating contract, or `shared_at` semantics.
- Modifying the `lists.shared` dual-write logic or scheduling its removal.
- Touching cache-tag invalidation. No new reads, no new mutations.

## Decisions

### Decision 1: Constants pattern is an `as const` object keyed by capability names

```ts
export const VISIBILITY = {
  OWNER: 'private', // Stage 2 will flip to 'owner'
  LINK: 'unlisted', // Stage 2 will flip to 'link'
  FOLLOWERS: 'public', // Stage 2 will flip to 'followers'
} as const;

export type ListVisibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];
```

**Why capability names (`OWNER` / `LINK` / `FOLLOWERS`) instead of label-tracking names (`HIDDEN` / `PRIVATE` / `SHARED`):** the whole reason this change exists is that the previous proposal coupled DB identity to a noun that would later become a UI label and drift. Capability names describe what the system _enforces_ (who is authorized to read), not what the UI currently _calls_ it. They are durable across future label revisions ("Hidden" → "Personal" → "Draft" would never touch these).

**Why an `as const` object instead of a TypeScript `enum`:** TypeScript numeric enums emit runtime objects with reverse-lookup baggage and have surprising structural-typing semantics; string enums are slightly better but still emit unfamiliar runtime shapes. The `as const` object compiles to a plain frozen object literal, narrows correctly under `typeof X[keyof typeof X]`, and is the established pattern in this codebase (see `app/(main)/items/ui/components/paginationConstants.ts`).

### Decision 2: Decoder is tolerant of BOTH legacy and canonical DB strings from day one

```ts
const LEGACY_TO_CANONICAL: Record<string, ListVisibility> = {
  private: VISIBILITY.OWNER,
  unlisted: VISIBILITY.LINK,
  public: VISIBILITY.FOLLOWERS,
};

export function fromDb(raw: string): ListVisibility {
  if (raw in LEGACY_TO_CANONICAL) return LEGACY_TO_CANONICAL[raw];
  if ((Object.values(VISIBILITY) as string[]).includes(raw)) {
    return raw as ListVisibility;
  }
  throw new Error(`Unknown visibility value: ${raw}`);
}
```

**Why include the canonical branch when Stage 1 will only ever produce legacy values:** because the shared dev/prod DB makes Stage 2 unsafe without it. The chronology of the rollout:

```
Stage 1 deploys ──► prod knows fromDb('owner') → VISIBILITY.OWNER
                    (dead code, but loaded in the running process)
       │
       │   Stage 1 soaks; only legacy strings exist in DB
       ▼
Stage 2 deploys ──► constants flip; new writes produce 'owner'/'link'/'followers'
                    Prod from Stage 1 already decodes them.
                    Old browser tabs / feature branches still on Stage 1 code
                    also decode them, because the branch was deployed.
       │
       │   DB now has mixed rows
       ▼
DB migration ───►   UPDATE lists SET visibility = CASE ...
                    Independent of any code deploy.
       │
       ▼
Stage 3 deploys ──► remove LEGACY_TO_CANONICAL entries; simplify decoder.
                    Safe because DB is now 100% canonical.
```

The canonical-branch dead code is _load-bearing future infrastructure_ — its presence in production is the entire reason Stage 2 cannot break production. A comment in the file marks it as deliberate so a future cleanup PR does not "tidy" it away early.

**Alternative considered: omit the canonical branch and add it in a separate PR before Stage 2.** Rejected because it splits a logically atomic safety property across two PRs, where the safety only holds if both are in production. The cost of carrying ~3 lines of dead code for one release is negligible compared to the cost of a confused mid-rollout where the canonical branch hasn't shipped yet.

### Decision 3: DAL is the translation boundary; raw strings do not escape `lib/dal.ts`

Every DAL function that returns a row containing `visibility` normalizes that column via `fromDb` before returning. Consumers (server actions, page components, helpers) see canonical `ListVisibility` values typed as `ListVisibility`, never raw `string`.

For WHERE clauses, the helper `visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])` expands a set of canonical values into all DB-string forms (legacy + canonical) so a single `inArray` filter matches rows in either form regardless of mid-rollout state:

```ts
const linkOrShared = visibilityDbValues([
  VISIBILITY.LINK,
  VISIBILITY.FOLLOWERS,
]);
// Stage 1: ['unlisted', 'public']        (canonical values not in DB)
// Stage 2: ['unlisted', 'public', 'link', 'followers'] (both forms tolerated)
// Stage 3: ['link', 'followers']         (legacy mapping removed)
db.query.lists.findMany({ where: inArray(lists.visibility, linkOrShared) });
```

**Why centralize at the DAL boundary instead of letting consumers compare raw strings:** consumers should never need to know that the column is currently mid-rollout. Centralizing means Stage 3's cleanup PR has _one_ file to touch (`lib/visibility.ts`) instead of chasing literal usages a second time.

**Alternative considered: use a Drizzle column transformer to normalize at the ORM level.** Rejected because Drizzle's column-level codecs are awkward to introduce mid-codebase and the transform would also have to apply on writes (which would over-engineer the symmetry — writes are always canonical via the constant, no transform needed). Hand-normalizing in DAL functions is more explicit and lower-risk.

### Decision 4: Writes always go through `VISIBILITY.X`, never string literals

`setListVisibility` continues to accept a `ListVisibility` and write it verbatim:

```ts
await db.update(lists).set({
  visibility: next,
  shared: next !== VISIBILITY.OWNER,
});
```

In Stage 1 the value of `VISIBILITY.OWNER` is `'private'`, so the SQL is byte-identical to today. In Stage 2 the right-hand side flips to `'owner'` and the same source line writes canonical values without further changes. This is the property that makes Stage 2's PR a 3-line diff.

The zod schema is rebuilt from the constants:

```ts
const VisibilitySchema = z.enum(VISIBILITY_VALUES);
```

`VISIBILITY_VALUES` is the readonly tuple `[VISIBILITY.OWNER, VISIBILITY.LINK, VISIBILITY.FOLLOWERS]`. In Stage 1 it expands to `['private', 'unlisted', 'public']` — identical to today's hand-typed enum.

### Decision 5: "Hidden" label, not "Just me", not "Personal"

**Why "Hidden":**

- **Toast grammar test.** "List is now hidden" is a natural sentence; "List is now just me" is a fragment that reads awkwardly mid-flow.
- **Cold-open clarity.** A user encountering an existing list whose visibility says "Just me" reads it as a _participant set_ (who is in the list) rather than a _state_ (the list's current concealment). "Hidden" telegraphs concealment as the active state.
- **Connotation symmetry.** All three labels become past-participle / state-describing words: Hidden / Private / Shared. That alignment is easier to scan than mixing a state ("Private") with a participant set ("Just me").

**Alternatives considered:**

- _"Personal"_ — too ambiguous; could imply personal-significance rather than visibility scope.
- _"Just me"_ (keep) — fails the toast grammar test, fails cold-open clarity.
- _"Draft"_ — wrong metaphor; implies work-in-progress, not finalized-and-private.

### Decision 6: No `migrate-visibility-db-values` migration in this change

The Stages 2 and 3 are referenced in proposal.md and design.md but are scoped as separate OpenSpec changes that will be authored when Stage 1 has soaked in production. This keeps each change's diff small, each PR independently deployable, and each migration step independently verifiable.

**Alternative considered: bundle all three stages into one change.** Rejected because the entire point of the staging is that the stages must be _separately deployed_ with verification between them. A single change implies a single PR, which collapses the safety.

## Risks / Trade-offs

- **[Risk]** A future PR's reviewer "tidies up" the dead canonical branches in `fromDb` because they look unreachable in Stage 1, breaking Stage 2's safety.
  → **Mitigation:** Inline comment block in `lib/visibility.ts` explicitly states the branches are deliberate dead code for the staged rollout and SHALL NOT be removed until Stage 3.

- **[Risk]** A new code path is added in a future PR that bypasses the DAL and reads `lists.visibility` directly via `db.query`, missing the `fromDb` normalization and getting a raw string.
  → **Mitigation:** The new spec requirement binds future authors. Reviewers should grep for `lists.visibility` references outside `lib/dal.ts` during PR review. The risk is contained because the values are still legacy strings until Stage 2; even a missed normalization in Stage 1 produces correct behavior (raw strings compare equal to `VISIBILITY.OWNER` etc.). The risk only bites if a missed normalization survives into Stage 2 territory.

- **[Risk]** A consumer compares a normalized value against a hand-typed string literal that does not match either Stage 1 or Stage 2 DB form.
  → **Mitigation:** Spec requirement forbids string literals. TypeScript narrows `ListVisibility` to the union of constant values, so `visibility === 'someTypo'` is a compile error.

- **[Risk]** The `visibilityDbValues` helper expanding to extra strings increases the size of `inArray` filters, marginally affecting query plans.
  → **Mitigation:** The affected queries already use `inArray` with the same column; doubling the candidate set from 2 to 4 strings has negligible plan-cost impact on a 3-value enum column. Re-checkable via `EXPLAIN` if needed.

- **[Trade-off]** Stage 1 ships ~12 file edits + 1 new module + 6 spec scenario updates for what feels like a "no-op" deploy (no user-visible behavior change other than the "Hidden" label and the toast text). The size is justified because Stage 1 is the foundation for the safety property in Stages 2 and 3.

- **[Trade-off]** The DB still stores `'private' | 'unlisted' | 'public'` after Stage 1, so a future developer running `SELECT visibility, count(*) FROM lists GROUP BY visibility` sees noun choices that no longer match the codebase's vocabulary. Mildly confusing in psql. Resolved when Stages 2 and 3 ship; until then, comments in `lib/visibility.ts` document the mapping.

## Migration Plan

Stage 1 (this change) has no data migration. Deploy order:

1. **PR merges to dev.** Constants module is added; literals are replaced; DAL normalizes on read; the "Hidden" label and "List is now hidden" toast ship. Dev developers can verify locally against the shared DB; no DB values change.
2. **Deploy to production.** Production now has the tolerant decoder in memory. Writes continue to produce legacy DB strings exactly as before.
3. **Soak.** Confirm the visibility picker still selects/deselects correctly, the share modal renders the new "hidden" copy, and no error surfaces from `fromDb` (which would indicate an unexpected DB string).
4. **Optionally proceed to Stage 2** by authoring the follow-up change `flip-visibility-canonical-values`, which is a ~3-line constants flip + spec note. Safety guaranteed by Stage 1 already being in prod.

**Rollback:** Stage 1 is a pure refactor with one user-visible change (the "Hidden" label and toast text). Rollback by reverting the PR; the DB requires no rollback. The "Just me" label re-appears.

## Open Questions

None blocking. Two minor judgment calls:

- Should `fromDb` throw on unknown strings or return a default (e.g. `VISIBILITY.OWNER`) and log a warning? Decision: throw. An unknown string in `lists.visibility` is a true invariant violation (the column is constrained to the enum); silently coercing would hide a data-integrity bug. The throw will surface in `getList`-fed pages, which fail closed correctly because the `<title>` falls back to the generic constant per the noindex requirement at [list-visibility/spec.md](openspec/specs/list-visibility/spec.md).

- Should `visibilityDbValues` be exported from `lib/visibility.ts` or co-located inside `lib/dal.ts`? Decision: export from `lib/visibility.ts`. It is the constants module's job to know which legacy/canonical pairs map together; the DAL is the consumer.
