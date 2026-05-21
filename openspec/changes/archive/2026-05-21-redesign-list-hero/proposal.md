## Why

The list-detail hero today is a single tall purple band that does one job — "tell you what list this is and who made it" — through six independent planes: gradient, title, subtitle, owner icon, date icon, occasion chip, action row, and (for owners) visibility picker. Each plane was tuned independently, so they compete: the title towers over its own metadata, action buttons read louder than the facts they act on, and (for viewer views) ~50% of the band is dead canvas because the visibility picker that fills the right side is owner-only. The in-flight `refine-list-hero-readability` change patched the worst contrast and sizing symptoms but couldn't fix the underlying composition without restructuring the surface. This change tears that down and rebuilds the hero as a *composed* two-card surface: list identity on the left, people-and-actions on the right, with explicit roles for every element.

The product priorities reshape what's primary:

- For an **owner**, Share is the most common action (sharing the link is the whole point of making a list). The owner's own identity is redundant — they don't need to see "Alice (you)" on their own list. Visibility deserves a status-pill summary, not a 260px segmented widget eating the right rail.
- For a **viewer**, the owner *is* the visual anchor (whose registry am I shopping?), and Follow belongs adjacent to that anchor (already a binding requirement of the `following` capability).

**Inherited constraints (preserved by this change):**

- The `following` capability's normative requirement ([openspec/specs/following/spec.md](openspec/specs/following/spec.md)): "The Follow button SHALL be rendered in a byline sub-row of the list hero adjacent to the owner's name... and SHALL NOT be rendered in the list-hero action row alongside list-actions such as Share and Bookmark." This change places the avatar + linked owner name + Follow as a single byline group on viewer views; it does NOT relocate Follow.
- The `list-visibility` capability ([openspec/specs/list-visibility/spec.md](openspec/specs/list-visibility/spec.md)): the **Private / Shared** binary toggle plus the conditional "Show in followers' feed" checkbox is normative for the picker's control composition. This change wraps that exact composition inside a popover triggered by a status pill — no behavior change, container change only.
- The `popover-trigger-system` capability defines the status-pill primitive (`<PopoverTrigger>`) we'll use. No new variant, no page-scoped override of the primitive geometry.
- The `redesign-home-and-tokens` change explicitly deferred "list-hero compression on mobile" to a separate decision — this is that decision.

## What Changes

- **BREAKING (presentation):** Replace the current single-column hero with a two-card layout at ≥800px (list identity on the left, controls strip on the right) and a stacked single-column layout below the breakpoint. The full-bleed gradient band is replaced with two gradient-tinted panels separated by the white surface.
- **Owner identity removed from owner views.** No avatar, no name, no `FaUser` icon on owner views. The right strip is pure controls.
- **Viewer byline becomes the people-anchor.** Real 36px avatar (sourced from `users.image` → fall back to our own initials chip if null), linked owner name, Follow button — grouped into one visual block at the top of the right strip.
- **Eyebrow replaces the inline occasion chip.** The occasion graduates from a small chip wedged into the meta row into an above-title eyebrow label (small-caps, white-on-translucent — same visual vocabulary as the current chip, just relocated).
- **Status pill replaces the always-visible segmented + checkbox.** A single `<PopoverTrigger>` showing the current visibility ("Private" / "Shared" / "Shared · in feed") opens a popover hosting the *existing* Private/Shared segmented control + "Show in followers' feed" checkbox. No control behavior change.
- **Share is owner-primary.** On owner views, Share renders as the largest action affordance at the top of the right strip's action block. On viewer views, Share remains one of two peer actions paired with Bookmark.
- **Hero footer line.** New small-text line under the title/subtitle group: "*N* items · updated *X* ago." Sourced from items already in the page tree (`items.length`) and `lists.updated_at` (existing column).
- **Action set for owner reduces to three peers + kebab.** Share (primary) at top of action block; Choose items + Edit as a paired secondary row; kebab `⋯` (existing `ListActionsMenu`) as the tertiary affordance.
- **Left-card flex composition: `space-between`.** Top group (eyebrow + title + subtitle) anchors to the top; footer line anchors to the bottom; the interior flex slack absorbs height differences between owner and viewer right-strip heights so the two cards always land at equal final height.

## Capabilities

### New Capabilities

- `list-hero-header`: Visual composition contract for the list-detail hero — two-card layout at desktop and merged-panel-with-hairline at mobile; eyebrow + title + subtitle + footer line inside the identity card; status pill, action set, and (viewer-only) byline group inside the controls card; owner identity removal on owner views; avatar resolution chain; contrast and size hierarchy as natural consequences of card geometry.

### Modified Capabilities

- `popover-trigger-system`: Add a `tone` prop (`'light' | 'on-dark'`, default `'light'`) to `<PopoverTrigger>` so the primitive can render on saturated dark surfaces (the list hero's gradient card). The existing spec normatively forbids variants — this change relaxes that to allow `tone` specifically, mirroring the pattern already established by `<SegmentedControl tone="on-dark">` in `segmented-control-system`. `active`-state and chevron semantics are unchanged; the addition is purely surface adaptation.

> **Adjacent changes that landed alongside (NOT in redesign-list-hero's scope).** Two follow-on changes layered atop this redesign and have already archived:
> - `2026-05-21-relabel-and-harden-visibility` — replaced the binary segmented + feed-checkbox picker with a three-row radio menu (`Just me` / `Private` / `Shared`), introduced `<MenuItemRadio>` to the menu primitive, and added crawler-noindex/metadata guards. Modifies `list-visibility` and `menu-system`. Owns the picker's current internals; redesign-list-hero only specifies that a `<VisibilityPicker>` is consumed in the identity zone.
> - `2026-05-21-add-list-hero-collapse` — added the `HeroCollapseShell` wrapper, the `?hero=closed` URL state, the collapsed strip composition, and the kebab `prependedItems` mechanism. Introduces a new `list-hero-collapse` capability. Layered atop the redesigned hero; this proposal's expanded composition is its expanded state, unchanged.

> **Note on orphaned change.** The in-flight `refine-list-hero-readability` change (not yet archived) also proposes the `list-hero-header` capability with three narrower requirements (contrast floor, size hierarchy, action-row right-align). Those requirements are absorbed by this redesign and no longer make sense as standalone — the gradient-under-text failure mode the contrast requirement guards against is structurally removed by the new card composition, and the right-aligned-action-row pattern is replaced by the two-card layout. The narrow change's folder under `openspec/changes/refine-list-hero-readability/` should be removed as housekeeping; it will never archive. This change does not formally depend on that removal — both proposals can coexist in `openspec/changes/` until one archives.

## Impact

**Cross-cutting primitives consumed (no primitive modifications):**

- `<Button variant="on-dark">` for Share / Choose items / Edit / Bookmark / Follow (per `button-system`).
- `<PopoverTrigger>` for the status pill, with `<Popover>` body hosting the segmented + checkbox (per `popover-trigger-system`).
- `<SegmentedControl tone="on-dark">` inside the popover for Private/Shared (already migrated per `segmented-control-system`); the page-scoped `<CheckboxField>` on-dark override stays as-is per the `standardize-form-fields` decision.
- `ListActionsMenu` (the kebab) keeps its existing Menu-primitive wrapper per `menu-system`.

**Files touched (estimate):**

- `app/(main)/lists/ui/components/ListDetails.tsx` — full DOM restructure into two-card layout.
- `app/(main)/lists/ui/components/VisibilityPicker.tsx` — wrap the existing segmented + checkbox in a `<PopoverTrigger>` + `<Popover>` shell; preserve all state/server-action semantics. (Behavior unchanged; presentation moves into the popover body.)
- `app/(main)/lists/ui/styles/list.css` — large rewrite of `.list-hero-*` rules; new card classes; mobile breakpoint reshape.
- `app/(main)/users/ui/components/Avatar.tsx` (new or extracted) — 36px avatar with `users.image` → Google initials → our initials-chip fallback. If a similar component exists elsewhere (e.g. in nav), prefer extraction over duplication.
- `lib/dal.ts` — no new function. `getList(id)` already eager-loads `user` (which has `image`). Item count comes from items already fetched. `lists.updated_at` already returned.

**Server-side reads / cache:**

- Hero data is served by `getList(id)`, which this change extends to also eager-load `list_items.item_id` so the hero can compute `itemCount = result.items.length` without a separate DAL call. To match its new payload's invalidation surface, `getList(id)` now carries BOTH `cacheTag('lists')` and `cacheTag('items')`. Existing mutation paths in `app/actions/lists.ts` and `app/actions/items.ts` already call `updateTag('lists')` and `updateTag('items')`, so the hero invalidates correctly on either a list-row or item-row mutation.
- Avatar source `user.image` is already on the eager-loaded `user` relation — no DAL change.
- "*X* ago" comes from `lists.updated_at` already on the `getList` response — no DAL change.
- **No new DAL function and no new cache tag.** The coarseness of the existing `'lists'` / `'items'` tags is **out of scope** — a separate `narrow-dal-cache-tags` change is the right home for that perf work.

**Out of scope (separate changes):**

- Tag granularity refactor on the DAL (separate `narrow-dal-cache-tags` change).
- Follow button placement / behavior (owned by `following`; this change preserves the byline colocation requirement verbatim).
- Item-grid changes below the hero.
- The first-follow disclosure dialog (already specified under `following`).
- A new `Avatar` design-system primitive — if avatar usage spreads beyond the hero + nav, that's the moment for a primitive; for now, a co-located component is sufficient.

**Visual regression surface:** the `/lists/[id]` route exclusively. No other surface consumes `.list-hero-*` classes.

**Rollback:** revert the PR. No data migration, no token deprecation, no feature flag.
