# Proposal: item-placeholder-art

## Why

Imageless items render a dead, empty `ItemPhoto` container — existing prod items already hit it, and the upcoming non-link item states (PRICED/BARE, MAP #233) make it more common. Fetched images can also be garbage or unwanted (racy product shots, wrong-product galleries), so users need an image option that never depends on the fetch. Owner-settled direction (issue #259, revised at embark 2026-07-17): deterministic generated placeholder art, **persisted** as an ordinary image, minted lazily for legacy items and offered as first-class selectable thumbs in the deck's photo card.

Inherited constraints found by spec sweep:

- `item-decision-deck` — photo card SHALL show only on >1 or 0 images (one-image bypass), stage + strip + add-by-URL shape, intro step-count excludes the bypassed photo step, `photoTier` helpers. The bypass rule is overturned here; the rest is extended.
- `item-image-candidates` — pool storage/active-resolution (`active ORDER BY id LIMIT 1`), candidate validation (≤10 http(s) URLs), hand-entered URL fold-in; also carries a stale `ImageCandidateGrid`/`ImageUrlInput` requirement superseded by the landed deck rework (components no longer exist).
- `product-link-prefill` — `imageUrls` normalized to at most 10 http(s) URLs; cap moves to 15.
- `server-endpoint-authorization` — unauthenticated callers of write actions SHALL be rejected unless the action is enumerated in the guest write paths clause; the lazy-mint action is guest-callable and must be enumerated. No `updateTag` on the unauthorized path.
- `item-store-links` — `.item-image-container` corner-radius SHALLs; untouched by this change (art renders inside the existing container).
- Reroll control is a button — flows through `button-system` primitives, no one-off classes.

## What Changes

- New dependency: `@dicebear/core@9.4.3` + `@dicebear/shapes@9.4.2` (single-style package; shapes has no core-10-compatible release). Coordination note with #199 (MAP #181): this change introduces the dependency first.
- New generator module: pure `seed → SVG → base64 data:image/svg+xml URI`; palette baked at generation from brand-derived hex constants (bg `#2a2060`; shapes `#cda2ff`, `#c4b8ff`, `#f0eeff`); DiceBear's per-seed color assignment supplies variety; background locked dark. No CSS tokens, no render-time theming — a rebrand reruns generation.
- Lazy mint for legacy/imageless items: `ItemPhoto`'s empty state fires a client effect calling a new server action — view-authorized, guest-callable, idempotent (existing placeholder returned without insert), seed = item id, `updateTag('items')` only on actual insert. Stored as a normal `item_images` row flagged active. Retroactive with no backfill; one-time empty→art swap on first view; the duplicate-mint race is backstopped at the DB by a partial-unique index (`item_images_one_active_idx`, at most one active row per item) with `ON CONFLICT DO NOTHING` on the mint insert — losers re-read and return the winner's row.
- Deck photo card: shown **always** (one-image bypass removed; intro step count follows). Thumbnail strip tops up with `max(1, 4 − realPhotos)` transient placeholder thumbs (distinct random seeds); a reroll control (button-system) renders only while a placeholder thumb is selected and regenerates it in place. Only a selected placeholder persists, submitted through the normal pool path.
- Candidate caps: `MAX_IMAGE_CANDIDATES` 10 → 15 (Zyte gallery max) across seam normalization and validation; server validation accepts ≤15 http(s) URLs plus at most 1 size-capped placeholder `data:image/svg+xml;base64` URI, exempt from the 15.
- Spec hygiene: retire `item-image-candidates`' stale `ImageCandidateGrid` requirement (superseded by the landed deck rework).
- Untouched: custom add-image-by-URL (hardening owned by MAP #224/#173, in flight separately); `items.image_url` stays inert. One additive index migration (the mint-race backstop above); no table or column changes.
- Companion fixes riding this change: the new-item modal now closes on successful create (`ItemsPage` wires the pre-existing `onSuccess`), and the purchased-item image treatment moves from `filter: brightness/saturate` to `opacity: 0.5` — the filter read wrong on minted SVG art, which every imageless purchased item now displays.

## Capabilities

### New Capabilities

- `item-placeholder-art`: deterministic generated placeholder artwork for items — the generator contract (seeded DiceBear shapes, baked brand palette, data-URI output), the lazy-mint action (authorization, idempotence, cache semantics), and the guarantee that imageless items materialize art on first view.

### Modified Capabilities

- `item-decision-deck`: photo card always shows (one-image bypass removed, step count follows); strip gains transient placeholder thumbs with fill rule and selected-only reroll.
- `item-image-candidates`: validation widened (cap 15 + one exempt placeholder data-URI); placeholder persistence semantics; stale `ImageCandidateGrid` requirement removed.
- `product-link-prefill`: `imageUrls` cap 10 → 15.
- `server-endpoint-authorization`: lazy-mint action enumerated as a guest write path (server-derived content, idempotent, view-gated).

## Impact

- Code: new `lib/placeholderArt.ts` (generator + palette constants); mint action in `lib/data/item.actions.ts` (or co-located actions module per `data-layer-organization`); `ItemPhoto.tsx` gains a client mint path; `PhotoEditor.tsx` + deck `viewModel`/`neededSteps` for thumbs, reroll, always-show; `lib/imageCandidates.ts` cap; `item.schema.ts` validation.
- Cache: mint consumes no new tag; bumps `items` tag on successful insert only.
- Data: `item_images` gains placeholder rows (data-URI, ~1–2KB text) and the `item_images_one_active_idx` partial-unique index (with a stray-double-active dedupe in the same migration); no table or column changes, no backfill.
- Deps: DiceBear pair enters `package.json` (server-side usage only; not in the client bundle).
