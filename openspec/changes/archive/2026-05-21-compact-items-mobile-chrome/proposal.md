## Why

The 1.0 redesign packed each item card with new content — a 2-line clamped description, a multi-claim counter, an inline store-links popover, and a purchase banner — without reclaiming any of the surrounding chrome's vertical footprint. On mobile (<600px) the result is a two-row toolbar plus an in-flow pagination bar that together eat ~95–110px of viewport height before the first card renders, leaving little room for the taller cards. Users perceive the page as cramped even though the cards themselves are sized appropriately for their content.

Inherited constraints from active specs (verified via grep):

- [segmented-control-system spec.md:62](openspec/specs/segmented-control-system/spec.md:62) — the grid/list view toggle in `ItemsToolbar.tsx` IS the `SegmentedControl tone="light"` primitive call site. Hiding it on mobile is a wrapper-layout decision; we do NOT change the primitive.
- [popover-trigger-system spec.md:62](openspec/specs/popover-trigger-system/spec.md:62) — the mobile filters trigger in `ItemsToolbar.tsx` IS the `PopoverTrigger` primitive call site. Hiding it conditionally is a wrapper concern; we do NOT change the primitive.
- [form-field-system spec.md:343](openspec/specs/form-field-system/spec.md:343) — the items-toolbar search uses the `SearchField` primitive. Expanding the parent grid cell on `:focus-within` / `:has(input:not(:placeholder-shown))` is a wrapper-layout decision; we do NOT change the primitive.
- [item-store-links spec.md:8](openspec/specs/item-store-links/spec.md:8) — card height SHALL be invariant to store-popover state. This change does not touch the chip row; constraint is preserved.
- [button-system spec.md:164](openspec/specs/button-system/spec.md:164) — pagination icon-only nav buttons keep their `aria-label`s; we change positioning only.

No active spec governs items-browser layout chrome (toolbar grid template, pagination flow positioning, mobile view-mode policy). This change introduces that capability.

## What Changes

- On mobile (≤599px), the grid/list view toggle is hidden, and item cards always render as the single-column list layout regardless of the `?view=` URL parameter. Desktop behavior is unchanged; the URL parameter still toggles freely at ≥600px.
- The mobile toolbar collapses to one row: search (1fr) + filters trigger (auto-width, icon-only) — replacing today's two-row `search / filters view-toggle` layout. The filters trigger's visible "Filters" text label is hidden via CSS so the button shrinks to its MdTune icon (~40-50px), letting search keep nearly the full row width. The trigger's accessible name remains "Open filters" via its existing `aria-label`, so screen readers are unaffected.
- The items pagination control floats over the bottom of the scrollable items area at 90% background alpha at **all viewports** (originally scoped to mobile only; widened during implementation per user feedback so desktop and mobile share one treatment). The items scroll container gains bottom padding equal to overlay height so the final row remains reachable. Anchored to `.container--items-library` / `.container--list-details` so the overlay spans the container's full width.
- **NOT changing** in this scope: the item-card content itself (description clamp, claim counter, purchase banner), the desktop toolbar layout, the active-filter chip row, the filters bottom-sheet behavior, or any primitive (SegmentedControl / PopoverTrigger / SearchField) APIs.

## Capabilities

### New Capabilities

- `items-browser-chrome`: Layout, positioning, and viewport-adaptive behavior for the chrome surrounding the items grid in `ItemsBrowser` — toolbar row grid template, view-mode policy by viewport, search-field expand interaction, and pagination flow vs. overlay positioning. Applies to both the items library (`.container--items-library`) and list-details (`.container--list-details`) surfaces, which share the `ItemsToolbar` + `Pagination` chrome.

### Modified Capabilities

_None._ Primitive specs (`segmented-control-system`, `popover-trigger-system`, `form-field-system`) are unchanged — this change governs wrapper-level layout decisions only, not the primitives' own behavior.

## Impact

- **Code**:
  - [app/(main)/items/ui/styles/item.css](app/(main)/items/ui/styles/item.css) — mobile media-query rules at the existing `@media (max-width: 599px)` block: toolbar grid-template, view-cell `display: none`, `:has()`-based search-expand, item-grid mobile override to use list layout, pagination positioning swap.
  - [app/(main)/items/ui/components/ItemsToolbar.tsx](app/(main)/items/ui/components/ItemsToolbar.tsx) — no logic changes expected (CSS-only solution). May add a small structural change if the search-expand can't be done cleanly with `:has()`.
  - [app/(main)/items/ui/components/Items.tsx](app/(main)/items/ui/components/Items.tsx) — possibly add a stable class name or container-id so the mobile CSS override of `.item-grid` → list layout is unambiguous.
  - [app/(main)/items/ui/components/Pagination.tsx](app/(main)/items/ui/components/Pagination.tsx) — no logic changes; positioning is CSS-only.
- **APIs / data**: none. No server actions, DAL calls, cache tags, or DB schema involved.
- **Dependencies**: relies on `:has()` selector (Safari 15.4+, Chrome 105+, Firefox 121+). The codebase already uses container queries which require equivalent baselines.
- **Tests**: visual verification via the dev preview tools using the seeded `dev-test-viewer` bypass.
- **Risk**: low. Pure presentational change behind a `≤599px` media query. Desktop UI is byte-identical post-change. Reversible by reverting CSS.
