## Why

Three layout-mimicking skeleton components (`ListLoading`, `ItemLoading`, `ItemFormLoading`) and their bespoke CSS were authored before the recent redesign work (`redesign-home-and-tokens`, `redesign-list-hero`, `add-list-hero-collapse`, the form-field / button standardizations) and never moved with it. They now render shapes that no longer match the post-redesign UI — pulsing 3-column chip grids in front of horizontally-scrolling rail cards, outlined pill rows in pre-redesign brand colors, etc. — making them an active source of style drift that costs design time on every subsequent visual change. The redesign archive specifically did not address loading states; that gap is what this change closes. We want to replace them with a single content-agnostic indicator that sits inside the same container the suspended content will fill, so future redesigns never have to be replayed against parallel skeleton CSS.

## What Changes

- Add a new shared primitive `<LoadingIndicator>` at `app/ui/components/LoadingIndicator.tsx` rendering a centered spinner over a min-height box, with named size variants (`rail`, `page`, `form`, `inline`) that resolve to fixed min-heights, and an `sr-only` "Loading…" label for accessibility.
- Spinner color resolves from existing `--primary-color`; no new color/shadow tokens introduced.
- Replace every `Suspense` fallback and every `loading.tsx` that currently renders `ListLoading` / `ItemLoading` / `ItemFormLoading` with `<LoadingIndicator size="…" />`, with the size chosen to match the surrounding container's natural footprint (rail-sized inside a rail, page-sized at the route level, form-sized inside the edit-item layout).
- **BREAKING (internal):** delete `ListLoading`, `ItemLoading`, `ItemFormLoading` and their CSS files (`list-loading.css`, `item-loading.css`). Remove the `import` of `list-loading.css` from `app/(main)/layout.tsx`.
- Remove the `<Suspense fallback={<ListLoading />}>` wrapper around `<MainShell>` in `app/(main)/layout.tsx`. Route-level `loading.tsx` files already provide the segment-level fallback; the layout-level boundary was the chief source of cross-route flash and is not required by any active spec.
- Keep per-rail `<Suspense>` boundaries on the home page so rails continue to stream in independently (each now showing its own rail-sized spinner instead of the misleading shared skeleton).

## Capabilities

### New Capabilities

- `loading-indicator-system`: The shared `<LoadingIndicator>` primitive and the placement rule that every Suspense fallback / route-level loading state in the app uses it, sized to the natural container of the content being awaited. Owns the requirement that no page-scoped layout-mimicking skeleton component is introduced going forward.

### Modified Capabilities

<!-- None. The `app-frame` spec does not require a Suspense boundary around `<MainShell>`, and the `home-digest` spec does not require any specific loading shape for the rails. The behavior we are introducing is net-new and is owned end-to-end by the new `loading-indicator-system` capability. -->

## Impact

- **New file:** `app/ui/components/LoadingIndicator.tsx` plus its CSS (small — a spinner keyframe and four min-height variants).
- **Deleted files:** `app/(main)/lists/ui/components/ListLoading.tsx`, `app/(main)/lists/ui/styles/list-loading.css`, `app/(main)/items/ui/components/ItemLoading.tsx`, `app/(main)/items/ui/styles/item-loading.css`, `app/(main)/items/ui/components/itemform/ItemFormLoading.tsx`.
- **Modified files (call-site swap, no logic change):** `app/(main)/layout.tsx` (also drops Suspense wrapper + CSS import), `app/(main)/HomePage.tsx` (4 fallbacks), `app/(main)/items/ui/components/ItemsContainer.tsx`, `app/(main)/items/ui/components/SortItemsContainer.tsx`, `app/(main)/items/[id]/layout.tsx`, `app/(main)/items/loading.tsx`, `app/(main)/lists/[id]/loading.tsx`, `app/(main)/lists/new/loading.tsx`, `app/(main)/purchased/loading.tsx`.
- **No DB, server-action, cache-tag, or DAL impact.** No new dependencies. No new design tokens (reuses `--primary-color`).
- **No interactive-surface primitive impact.** The spinner is a presentational indicator, not a button/link/input — it does not live in `button-system` and does not introduce a new interactive variant.
