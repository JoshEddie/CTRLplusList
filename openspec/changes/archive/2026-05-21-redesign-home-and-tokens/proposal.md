## Why

A Claude Design pass produced a locked-in visual direction for the app — dark gradient nav, white-card frame floating on the gradient, horizontally-scrolling rails of compact cards on the home digest. The direction is intended to extend across the **entire site**, not just the home. Today the only meaningful tokens in `global.css` are a handful of color variables; every feature folder writes raw values into its own CSS file, so re-skinning ad-hoc would compound drift across pages.

This change is the **governing change** for the visual revamp: it lays down the token layer, the persistent app frame, and the home + My Lists pages that establish the new pattern. Subsequent pages roll in through staged work tracked here; some stages will require their own Claude Design session before implementation, and each stage ends with an explicit checkpoint where the user reviews progress before the next stage begins. The spec deltas (especially `app-frame`) apply site-wide and govern every page that lives in the `(main)` route group, even when those pages are skinned in later stages.

## What Changes

### Foundation (lands in this change)

- Extend `app/ui/styles/global.css` with the design-token residue that doesn't map to existing variables: `--page-frame-gradient`, `--heading-text-color`, `--subtitle-text-color`, `--meta-text-color`, `--date-text-color`, `--divider-color`, `--card-border-color`, `--card-border-hover-color`, `--card-hover-background-color`, `--card-shadow`, `--card-shadow-hover`, `--surface-shadow`. Reuse `--primary-color`, `--secondary-color`, `--light-color`, and `--secondary-background-color` wherever the mockup's color matches their existing role (see design.md for the full mapping).
- Rewrite `body::before` to consume `--page-frame-gradient` directly instead of compositing transparents over black.

### App frame (lands in this change, applies to every `(main)/` page)

- Add a persistent **app frame** rendered from `app/(main)/layout.tsx`:
  - Gradient nav bar (60px desktop / 54px mobile) using `--page-frame-gradient`.
  - "CTRL+list" brand lockup at left; Home / Lists / Items / Purchased pill buttons (desktop only); avatar at right.
  - White content surface with rounded top corners (`14px` desktop / `12px` mobile) floating on the gradient, ~20px gradient visible at the sides on desktop, ~12px on mobile.
  - Active nav pill computed from `pathname`.
  - Existing per-page `<Header>` continues to render inside the white surface for page-level titles + CTAs.

### Home + My Lists (lands in this change)

- Close the implementation gap on the route shape already specified by `add-following-and-history`: digest renders at `/` and `/lists` is the dedicated **My Lists** full page. The in-flight change's spec for `home-digest` already calls for this; the current code still serves the digest from `/lists/page.tsx` and has no `/`. This change builds the new My Lists page and moves the digest entry point.
- Re-skin the home rails:
  - **Horizontal-scrolling row** of cards per rail (replaces the current responsive grid). `overflowX: auto`, fixed card widths per breakpoint (236 / 260 / 190).
  - Card name uses **Crimson Pro 300**; meta uses Roboto Condensed. New **subtitle** slot between name and the occasion/date row.
  - **No hover lift** — only background tint, border tint, and shadow deepen on hover (the lift clipped against scroll-container overflow in the mockup).
  - 1px dividers between rails. Existing `CollapsibleRail` API unchanged.
- Add `lists.subtitle text NULL` (additive migration) to surface secondary context that today is encoded inside the list name (e.g. "Brandy Family", "Josh Family"). Edit UI added to the list form. No backfill.
- Build the new **My Lists** page at `/lists` with the page-level `<Header>` containing the **+ New List** CTA. Update the digest's `seeAllHref="/lists/all"` to `/lists`.

### Staged rollout for remaining pages (tracked here; checkpoints between stages)

The token layer + app frame govern every page in `(main)/`. After Foundation + App Frame + Home + My Lists land, the remaining pages roll in staged groups. **Each stage ends with an explicit checkpoint where the user verifies the previously-completed work before the next stage begins.** Stages flagged "Claude Design session" pause for a dedicated design pass that resolves layout, density, and any net-new components before implementation.

The current planned stages (subject to revision at each checkpoint):

1. **Stage 0 — Foundation.** Tokens + `body::before`.
2. **Stage 1 — App frame.** Gradient nav, white-card frame, active-pill logic.
3. **Stage 2 — Home + My Lists.** Route move, rail/card re-skin, subtitle field.
4. **Stage 3 — List collections** (`/lists/bookmarks`, `/lists/history`, `/following`, plus a re-skin of the `/u/[id]` public-list cards as a same-shape regression fix). Reuses the home rail's card primitive. **Scope expanded at Checkpoint 2** to also introduce the `list-collections` capability — a peer sub-nav across `/lists`, `/lists/bookmarks`, `/lists/history`, `/following` — after the checkpoint surfaced a real "stranded" feeling on the bookmarks/history pages (the global "Lists" pill highlights but clicking it goes to a different page). No Claude Design session required; the sub-nav uses simple tab-style links sitting where the per-page `<Header>` previously sat.
5. **Stage 4 — View / Browse** (`/lists/[id]`, `/items`, `/items/[id]`, Purchase modal). **Claude Design session required** — establishes the item card/row primitive in its two read contexts (inside a list and in the library) plus the list-as-container chrome and item detail layout.
6. **Stage 5 — Create / Manage** (`/lists/new`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, item form, image-search modal). **Claude Design session required** — smaller session that consumes the now-locked item primitive and resolves list/item form patterns plus the selection chrome layered onto the items picker.
7. **Stage 6 — Purchased** (`/purchased`). **Claude Design session required** if the page has bespoke layout; otherwise consume the list-collection or view-mode item pattern.
8. **Stage 7 — Settings + Profile** (`/settings/connections`, `/u/[id]`). **Claude Design session required** for the public profile; settings may reuse simple form primitives.
9. **Stage 8 — Auth pages** (`(auth)/`). Outside the `(main)/` frame; visual treatment TBD at the checkpoint — may stay current or get its own change.

The Stage 4 / Stage 5 split is by **user mode** (view vs. manage), not by URL prefix. The item card/row is a shared primitive consumed by both `/lists/[id]` and `/items`; designing it once in Stage 4 (in the presence of both contexts) and then layering selection chrome onto it in Stage 5 honors the actual component dependency, while keeping the list-form and item-form work clustered together in the Create/Manage stage.

Whether each stage lands within this change as additional commits or spins out into its own change is decided at the checkpoint. The spec deltas in this change are the contract that governs them all; later stages add task work, not spec work, unless they introduce net-new capabilities.

## Capabilities

### New Capabilities

- `app-frame`: The persistent application chrome (gradient nav, logo lockup, primary nav, avatar, white content surface) shared across all `(main)/` routes, plus the design-token layer in `global.css` that the chrome and every downstream page consume. The capability also governs the site-wide requirement that pages consume tokens rather than literal values for theme-bearing properties.
- `list-metadata`: List-level metadata fields beyond `name`. This change introduces `subtitle`; future list-level fields (tags, color, etc.) would extend this capability rather than overloading `list-item-management`.
- `list-collections`: The four list-collection surfaces (`/lists`, `/lists/bookmarks`, `/lists/history`, `/following`) as a peer group, with a shared sub-nav that lets a viewer move between them without bouncing through Home. Also constrains the global nav's active-pill behavior so the Lists pill does not lie about the bookmarks/history pages being "under Lists". Surfaced at Checkpoint 2 as the resolution to the "stranded" feeling on `/lists/bookmarks` and `/lists/history` where the global nav highlights "Lists" but clicking it goes elsewhere.

### Modified Capabilities

- `home-digest`: Rails switch from grid to horizontal-scrolling row with fixed-width cards. Home rail card visual changes (Crimson Pro name, optional subtitle, neutral occasion chip, date) with shadow/border/background-tint hover (no `translateY` lift). The **New list** affordance is removed from the My Lists rail header (it moves to the dedicated `/lists` page's header).

## Impact

### Routes

- `app/(main)/lists/page.tsx` becomes the new **My Lists** full page.
- The digest moves to `app/(main)/page.tsx` (renders at `/`, inherits the `(main)` layout/frame).
- `app/(main)/lists/HomePage.tsx` moves alongside the new digest entry point.
- The string `/lists/all` is replaced with `/lists` everywhere it appears.

### Layout & shared chrome

- `app/(main)/layout.tsx` gains the gradient nav + white-card frame and renders `MainShell` inside the white surface.
- `app/(main)/MainShell.tsx` — the `container--list-details` variant continues to work; the frame wraps it.

### Styles

- `app/ui/styles/global.css` — new tokens added; `body::before` rewritten to consume `--page-frame-gradient`. The transparent brand vars (`--primary-color-transparent`, `--secondary-color-transparent`) are kept.
- `app/(main)/lists/ui/styles/list.css` and `following-and-history.css` — rail/card styles updated to consume new tokens and the horizontal-scroll layout.

### Schema

- Drizzle migration adding `lists.subtitle text` (nullable, no default). Existing rows unaffected.
- `db/schema.ts` — adds the `subtitle` column to the `lists` table definition.

### Server actions

- The list create/update actions in `app/actions/lists.ts` accept and persist `subtitle`.

### Component changes

- `app/(main)/lists/ui/components/HomeListCard.tsx` — adds subtitle slot, replaces hover lift with shadow/border tint, swaps to new tokens.
- `app/(main)/lists/ui/components/rails/*` — switch from grid to horizontal-scrolling row layout.
- `app/(main)/lists/ui/components/ListForm.tsx` (or equivalent) — adds a subtitle input.
- New components for the app frame chrome (e.g. `app/ui/components/AppNav.tsx`, `AppLogo.tsx`).

### Staged rollout artifacts

- This change's `tasks.md` enumerates the staged work for Stages 3–8 as task groupings with explicit checkpoints. Stages that require a Claude Design session reference that requirement as the first task in the group. Whether each later stage executes within this change or spins out as a follow-up is a decision made at the checkpoint.
