# Proposal: item-image-candidates

## Why

Product fetch (issue #156) currently collapses the extractor's image set to a single URL (`lib/product-fetch/zyte.ts` keeps `mainImage?.url || images?.[0]?.url` and discards the rest). Users get whatever image the extractor ranked first, with no way to pick a better one from the same product page. Zyte returns a full `images[]` array and JSON-LD `image` is frequently an array too — the candidates exist; we throw them away.

Separately, issue #155 planned to remove the standalone image search after link-prefill bake-in. The owner's decision (this change): **unwire** image search from the item form but **retain** the components, route, and tests dormant — a future "generic lists" feature (party signups etc.) may re-use it. The candidate picker takes over the slot the search affordance occupied.

Inherited spec constraints found by survey:

- `list-item-management` §"image-search modal SHALL distinguish capacity errors" binds `ImageSearch.tsx` UI behavior — component stays, so the requirement stays, but its framing as the *item-form* modal must be reworded to dormant/retained status, and the item form's entry point to it is removed (spec-level change).
- `list-item-management` §"Modal portal" cites `ImageSearch.tsx` as the portal pattern exemplar — unaffected (component remains in tree).
- `product-link-prefill` §"successful fetch SHALL prefill" and §"tiered waterfall" normalize to a single `imageUrl` — extending the seam result with an image-candidate list and surfacing a picker is a spec-level change to this capability.
- `server-endpoint-authorization` and `testing-foundation` reference `/api/image-search` as the metered-endpoint and mock-boundary exemplar — route stays live, no spec change.
- `form-field-system` mentions of image-search are incidental (token freeze scenario, search-input migration) — no spec change.
- Cross-cutting primitives: the picker reuses the existing portal `Modal` pattern and `button-system` affordances; the candidate-pool affordance in the form is a link-variant button per `button-system`. No new primitive families.

## What Changes

- `ExtractedProduct` gains `imageUrls: string[]` (ordered, main image first, deduped, capped at 10). Tier 1 (JSON-LD `image` arrays + OG fallback) and tier 2 (Zyte `[mainImage, ...images]`) both populate it; `imageUrl` remains the first candidate for backward-compatible prefill.
- New `item_images` table: `(serial id, item_id FK cascade, url, active)`. Holds both the candidate pool and the active-image pointer (`active` flag). `items.image_url` is retained inert (expand/contract) and dropped by a later migration. The serial id doubles as display order, so there's no `position` column.
- Item create/update flows persist the candidate pool when the item originated from a link fetch; refetch/repaste replaces the pool (delete + batch insert).
- New inline candidate grid: `ImageUrlInput` renders the item's stored candidates (reusing the image-search tile/grid presentation via `ImageResultsViewer`) directly in the IMAGE section, active image first/marked, shown by default whenever candidates exist (create-after-fetch and edit alike). Selecting a tile routes through the existing `image_url` change + image-load validation path. The grid is the primary selector; the Image URL `TextField` is demoted to a secondary "Edit image URL" affordance, revealed on demand (or forced open by a validation error / absence of a grid).
- `ImageUrlInput` drops the "Can't find a URL? Search for an image" affordance and its modal-open state. `ImageSearch.tsx`, `ImageResultsViewer.tsx`, `image-search.css`, their tests, and `GET /api/image-search` are **retained dormant** — no deletion, no behavioral change to them beyond having no caller in the item form.
- Candidate reads ride the item read path (`lib/data/item.ts`, existing item cache tags); mutations that touch the pool revalidate the same tags they already revalidate for `image_url` changes (exact tag names confirmed in design).

## Capabilities

### New Capabilities

- `item-image-candidates`: storage, persistence semantics (save/replace/cascade/cap), and picker UI for the per-item image-candidate pool produced by product fetch.

### Modified Capabilities

- `product-link-prefill`: seam result normalization extends with `imageUrls[]`; the prefill-success requirement gains candidate hand-off to the form (image URL prefill itself unchanged).
- `list-item-management`: the item form's image-search entry point is removed (ImageUrlInput requirement change); the image-search capacity-error requirement is reworded from "item-form image-search modal" to a retained-but-unwired component contract (tests and behavior preserved verbatim).

## Impact

- **DB**: new `item_images` table + Drizzle migration. No change to `items`.
- **Data layer**: `lib/data/item.ts` (read pool), `lib/data/item.actions.ts` (persist/replace pool), `lib/data/item.schema.ts` (accept candidate list on create/update). Cache: reuse item tags; every pool mutation revalidates them.
- **Product fetch**: `lib/product-fetch/types.ts`, `zyte.ts`, tier-1 extractor, `app/api/product-fetch/route.ts` response shape (additive field).
- **UI**: `app/(main)/items/ui/components/itemform/` — `ImageUrlInput.tsx` (inline candidate grid + demoted URL field, reusing `ImageResultsViewer`; + css), `useItemForm` plumbing for candidates.
- **Dormant, untouched**: `app/api/image-search/route.ts`, `ImageSearch.tsx`, `ImageResultsViewer.tsx`, their tests, SerpAPI/Serper env keys, CLAUDE.md image-search section.
- **Issues**: implements #156; partially supersedes #155 (unwire instead of delete — comment on issue after merge, owner decides close/repurpose).
