## Why

The just-archived `relabel-and-harden-visibility` change rewrote the visibility UI labels (Just me / Private / Shared) but explicitly held the DB enum at `'private' | 'unlisted' | 'public'`. The result is a load-bearing semantic disconnect: the DB value `'private'` now means the UI's **Just me**, while the DB value `'unlisted'` is what the UI now calls **Private**. A future maintainer reading `list.visibility === 'private'` will reasonably interpret it as the UI's "Private" (link-only) and be wrong. The active spec at [openspec/specs/list-visibility/spec.md:14](openspec/specs/list-visibility/spec.md:14) reinforces the trap by pairing every label with its inverted-meaning DB value across six scenarios.

Separately, the "Just me" label reads awkwardly in toast copy ("List is now just me" is a sentence fragment, per the toast requirement at [openspec/specs/list-visibility/spec.md:55](openspec/specs/list-visibility/spec.md:55)) and on first encounter with a list — the label describes a _participant set_ rather than the list's _state_. "Hidden" works in both places and telegraphs the actual concealment.

Both problems share a root cause: identity strings used for the DB column double as the user-facing vocabulary. Decoupling them — by routing every code reference through a constants module — fixes the immediate bug AND prevents the same trap from recurring when future label revisions land.

This change is **Stage 1 of a three-stage rollout** required by the shared dev/prod database. Stage 1 (this change) introduces the constants module with values still pointing at the legacy DB strings, plus a tolerant decoder. Stage 2 (follow-up change) flips the constant values; Stage 3 (follow-up change) runs the DB `UPDATE` and removes the decoder's legacy branches. The decoder's tolerance for new values is deliberate dead code during Stage 1 — its purpose is to be already-deployed in production by the time Stage 2 lands, so feature-branch dev work writing new values to the shared DB cannot break production.

## What Changes

### Constants module (new)

- Add `lib/visibility.ts` exporting:
  - `VISIBILITY` — frozen `as const` object with keys `OWNER`, `LINK`, `FOLLOWERS`. In Stage 1, **values point at legacy DB strings** (`'private'`, `'unlisted'`, `'public'`).
  - `ListVisibility` — derived type union.
  - `VISIBILITY_VALUES` — readonly tuple of canonical values for `z.enum` consumption.
  - `fromDb(raw: string): ListVisibility` — tolerant decoder accepting BOTH legacy strings (`'private' | 'unlisted' | 'public'`) AND future canonical strings (`'owner' | 'link' | 'followers'`). The canonical branches are intentional dead code in Stage 1; they become live in Stage 2.
  - `visibilityDbValues(values: readonly ListVisibility[]): string[]` — expands a set of canonical values into all DB-string forms (legacy + canonical) for use in Drizzle `inArray` filters.
- The module is server- and client-safe (no JSX, no React imports).

### Replace every string literal with constants

- Replace every `'private'` / `'unlisted'` / `'public'` literal across the codebase with `VISIBILITY.OWNER` / `VISIBILITY.LINK` / `VISIBILITY.FOLLOWERS`. Confirmed call sites:
  - `app/actions/lists.ts` — `z.enum(...)` definition; comparisons in `setListVisibility`; dual-write derivation of `lists.shared`.
  - `lib/dal.ts` — `inArray(lists.visibility, ['unlisted', 'public'])`; `eq(lists.visibility, 'public')` filters in feed/profile queries.
  - `app/(main)/lists/[id]/page.tsx` — three comparisons (owner gate, metadata gating, public-feed check).
  - `app/(main)/lists/ui/components/ListDetails.tsx` — `visibility !== 'private'` gate for ShareButton.
  - `app/(main)/lists/ui/components/VisibilityPicker.tsx` — option list values.
  - `app/(main)/lists/ui/components/ShareButton.tsx` — `setListVisibility(list.id, 'unlisted')` call.
  - `app/(main)/lists/ui/components/HeroCollapsedItems.tsx` — `setListVisibility(list.id, 'unlisted')` call.
  - `scripts/seed-dev-users.ts` — `l.visibility !== 'private'` derivation.

### DAL becomes the translation boundary

- Every `lib/dal.ts` query that returns a row containing `visibility` SHALL normalize that column via `fromDb(...)` before returning, so all consumers (server actions, page components, helpers) only ever see canonical `ListVisibility` values. Raw DB strings SHALL NOT escape `lib/dal.ts`.
- WHERE-clause filters by visibility SHALL use `visibilityDbValues([...])` + `inArray(...)` so they match both legacy and (future) canonical forms in a single query, regardless of which DB-string form is stored on any given row.

### Schema default unchanged

- `db/schema.ts` keeps `default('private')`. The DB column's stored default is unchanged in this change. Stage 3 will flip both together (`'private' → 'owner'`).

### Re-label "Just me" → "Hidden"

- `VisibilityPicker.tsx` option list:
  - Label `Just me` → **`Hidden`**, description unchanged ("Only you can see this list"), icon unchanged (`🔒`), toast `"List is now just me"` → **`"List is now hidden"`**.
- `ShareButton.tsx` modal copy in [ShareButton.tsx](<app/(main)/lists/ui/components/ShareButton.tsx>) that currently says "This list is just me. Make private & share?" → **"This list is hidden. Make private & share?"**

### Spec deltas

- `list-visibility` requirement at [spec.md:14](openspec/specs/list-visibility/spec.md:14) — the "three-item radio menu" requirement keeps its structure but the **Just me** label is replaced with **Hidden** in the prose, the icon-pairing scenario, the row-content scenario, the action scenario, and the trigger-pill scenario.
- `list-visibility` toast scenarios — toast text "List is now just me" → "List is now hidden".
- `list-visibility` — **new** requirement: code SHALL reference list visibility identities via the `VISIBILITY` constants exported from `lib/visibility.ts`. String literals (`'private'`, `'unlisted'`, `'public'`, and the future `'owner'`, `'link'`, `'followers'`) SHALL NOT appear in `app/`, `lib/`, or `scripts/` except inside `lib/visibility.ts` itself. DAL functions SHALL normalize raw DB strings to canonical constants via `fromDb` before returning rows; raw strings SHALL NOT cross the DAL boundary into consumers.

### Not changing in this change

- The data model. `lists.visibility` still stores `'private' | 'unlisted' | 'public'` after Stage 1 ships. No migration runs.
- `setListVisibility`'s signature, the `lists.shared` dual-write contract, or `shared_at` semantics.
- The visibility picker's structure, the `MenuItemRadio` primitive, the noindex/metadata-gating contract, or any other behavioral requirement in the active spec.
- Cache invalidation patterns. `getList` still consumes tag `lists`; `setListVisibility` still calls `revalidateTag('lists')`.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `list-visibility`: relabel "Just me" → "Hidden" across the radio-menu requirement and toast scenarios; add a new requirement covering the `VISIBILITY` constants module and DAL normalization boundary.

## Impact

### Routes

- [app/(main)/lists/[id]/page.tsx](<app/(main)/lists/[id]/page.tsx>) — three string comparisons swap to `VISIBILITY.X` (no behavior change).

### Components

- [app/(main)/lists/ui/components/VisibilityPicker.tsx](<app/(main)/lists/ui/components/VisibilityPicker.tsx>) — option list uses constants, "Just me" → "Hidden", toast text update.
- [app/(main)/lists/ui/components/ShareButton.tsx](<app/(main)/lists/ui/components/ShareButton.tsx>) — modal copy "just me" → "hidden"; literal swap.
- [app/(main)/lists/ui/components/HeroCollapsedItems.tsx](<app/(main)/lists/ui/components/HeroCollapsedItems.tsx>) — literal swap.
- [app/(main)/lists/ui/components/ListDetails.tsx](<app/(main)/lists/ui/components/ListDetails.tsx>) — literal swap.

### Data layer

- _New:_ [lib/visibility.ts](lib/visibility.ts) — constants, type, decoder, query helper.
- [lib/dal.ts](lib/dal.ts) — every read returning `visibility` normalizes via `fromDb`; WHERE filters expand via `visibilityDbValues`. Cache tags unchanged (`lists`, `home-rails` etc.).
- [app/actions/lists.ts](app/actions/lists.ts) — `VisibilitySchema = z.enum(VISIBILITY_VALUES)`; comparisons use constants; `lists.shared` dual-write derivation `next !== VISIBILITY.OWNER` (semantically identical to today's `next !== 'private'`).

### Scripts

- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — literal swap; seed continues writing legacy DB strings via `VISIBILITY.OWNER = 'private'`.

### Schema / data

- No DB change in this change. `db/schema.ts` default unchanged. No migration runs.

### Cross-cutting design systems

- _(none implicated)_. The picker continues to consume `<Menu>` and `<MenuItemRadio>` from `menu-system`; this change does not touch primitives, only the option array's `label` strings.

### Cache freshness

- No new reads, no new mutations. Existing `revalidateTag('lists')` in `setListVisibility` and existing `cacheTag('lists')` on the affected DAL reads (lines [89](lib/dal.ts:89), [114](lib/dal.ts:114), [137](lib/dal.ts:137), [345](lib/dal.ts:345)) continue to apply unchanged.

### Follow-up changes (not part of this change)

- **Stage 2 — `flip-visibility-canonical-values`:** flip `VISIBILITY` right-hand sides to `'owner' | 'link' | 'followers'`. Safe to ship because the decoder from Stage 1 — already in production — tolerates both forms. Newly-written rows then use canonical values; existing rows remain legacy.
- **Stage 3 — `migrate-visibility-db-values`:** run `UPDATE lists SET visibility = CASE ...` to sweep remaining legacy rows; flip the schema default `'private' → 'owner'`; delete the decoder's legacy branches and the `visibilityDbValues` helper.
