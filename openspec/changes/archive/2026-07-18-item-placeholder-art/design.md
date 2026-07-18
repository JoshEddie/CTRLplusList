# Design: item-placeholder-art

## Context

`ItemPhoto` renders an empty `.item-image-container` when an item has no image. Item images resolve from the `item_images` pool (`active ORDER BY id LIMIT 1`, per `item-image-candidates`); `items.image_url` is inert. The deck's photo card (`PhotoEditor`) shows a stage + thumbnail strip + add-by-URL, and is bypassed when exactly one image was fetched. The neon-http driver forbids transactions; cross-statement atomicity is backstopped or accepted as residual (DATABASE.md). No dark theme is live; `global.css`'s dark block is commented out.

Owner decisions were settled in the #259 embark grilling (2026-07-17) and re-synced onto MAP #233; several overturned the originally charted approach — the record below keeps the rejected paths so they are not re-discovered.

## Goals / Non-Goals

**Goals:**

- Every imageless item shows deterministic generated art — retroactively, with no backfill; the only schema touch is an additive index.
- Placeholder art is a first-class, selectable, re-rollable image option in the deck photo card, independent of fetch quality.
- One generation code path, server-side only; persisted output; regeneration possible later (rebrand, library swap).

**Non-Goals:**

- No live/theme-reactive placeholder rendering (overturned — see Decisions).
- No removal or gating of the add-image-by-URL affordance (URL hardening is MAP #224/#173, in flight separately).
- No blob storage; no `items` schema changes; no backfill script.
- No client-bundle DiceBear.

## Decisions

### D1 — Persisted image, not render-time generation

Placeholder art is generated once and saved as a base64 `data:image/svg+xml` URI in an ordinary `item_images` row (active like any candidate). It then rides every existing mechanism — active-resolution, cascade delete, cache tags, `<img>` rendering in all five image sites — with zero display-layer special-casing beyond the mint trigger.

Rejected:
- *Inline SVG with `var(--placeholder-*)` sentinel swap, nothing persisted* (the originally charted approach): theme-live rendering has no consumer (no live dark theme) and per-load generation was declined by the owner; a rebrand is handled by regenerating saved art instead.
- *CSS token aliases (`--placeholder-*`)*: dead once colors are baked at generation; palette lives as hex constants in the generator module. Drift hazard vs `global.css` brand tokens is accepted and documented in the module.
- *Blob storage*: new infrastructure for ~1–2KB SVGs; overkill.
- *New `placeholder_seed` column*: violates the map's no-schema-change rule; pool row needs no new write-path semantics.

### D2 — Lazy mint via client effect + server action

Imageless `ItemPhoto` fires a client effect calling `mintItemPlaceholder(itemId)`:

- **Authorization**: `isItemViewable` (same gate the guest-callable purchase actions use). Guest-callable by design — public lists viewed signed-out still mint. Enumerated as a guest write path in `server-endpoint-authorization` (content fully server-derived, idempotent, view-gated; no identity fields).
- **Idempotence**: if the item already has any active image or an existing placeholder row, return the existing URI without insert.
- **Seed** = item id — deterministic, so concurrent mints produce identical art.
- **Cache**: `updateTag('items')` only on actual insert; never on the unauthorized or no-op path (spec rule: invalidation only on success).
- **First paint**: empty container → art on action response; one-time flash per item accepted.

Rejected:
- *Render live + persist via `after()`*: instant first paint, but owner chose the action round-trip; keeps writes out of the RSC render path entirely.
- *Mint inside the DAL read*: a side effect inside `'use cache'` scope fires only on cache miss — fragile, violates read/write separation.
- *Backfill script (one-shot or standing regenerate tool)*: declined; lazy mint covers legacy items as they are actually viewed.
- *Auto-mint in the create/update save path*: unnecessary once the lazy path exists; one mint point, not two.

**Race backstop** (no transactions): concurrent first-viewers race the check-then-insert. Per DATABASE.md's atomicity rule the DB backstops it: `item_images_one_active_idx` (partial-unique, at most one active row per item) + `ON CONFLICT DO NOTHING` on the mint insert; a losing call re-reads and returns the winner's row. The index also hardens the pre-existing one-active-per-item invariant `replaceItemImages` maintains in the write path.

### D3 — Deck photo card: always shown, placeholder thumbs, selected-only reroll

- The one-image bypass is removed: the photo card always renders, because there is now always a real choice (fetched image vs placeholder). Intro step count and `neededSteps` follow.
- Strip fill rule: `max(1, 4 − realPhotos)` transient placeholder thumbs with distinct random seeds (0 real → 4 thumbs, 1 → 3, 2 → 2, 3+ → 1; a placeholder option always exists). Thumbs are generated via the server action (no client DiceBear); unselected thumbs are never persisted.
- Reroll: a `button-system` control on the stage, rendered only while a placeholder thumb is the current selection; regenerates that thumb in place with a fresh random seed.
- Persistence: only the selected placeholder submits, flowing through the existing pool path as a candidate + active URL.

Rejected:
- *2×2 grid framing*: based on the stale `ImageCandidateGrid` requirement; the landed deck UI is a stage + strip. The stale requirement is removed in this change's `item-image-candidates` delta.
- *Fixed single placeholder tile + reroll only*: owner wants multiple options at a glance when real candidates are scarce.
- *Keep the one-image bypass*: owner chose always-show so the placeholder option is offered in every create flow.

### D4 — Caps: 15 real + 1 exempt placeholder

`MAX_IMAGE_CANDIDATES` and the `product-link-prefill` seam cap move 10 → 15 (Zyte gallery max). Server validation (`item.schema.ts`) accepts ≤15 http(s) URLs plus at most one placeholder `data:image/svg+xml;base64` URI exempt from the 15, size-capped (protects the DB text column; SVG-in-`<img>` executes no script). A placeholder never displaces a real fetched image.

Rejected: *stub the 10th real image with the placeholder* (drops user data); *hard total including placeholder* (same).

### D5 — Generator contract

`lib/placeholderArt.ts`: pure, server-only; `(seed) → data:image/svg+xml;base64,...` via DiceBear `shapes` (`@dicebear/core@9.4.3` + `@dicebear/shapes@9.4.2` — shapes has no core-10-compatible release, so core pins to 9.x). Palettes (revised at apply, owner direction 2026-07-17): a small brand-derived set — dark-primary (`#2a2060` bg), light (`#c4b8ff` bg), dark-secondary (`#05155d` bg), each with its own muted shape-color trio (the vibrant `--primary-color`/`--secondary-color` are deliberately excluded) — picked deterministically from a hash of the seed, so art varies in background and color scheme, not just shape layout, while same-seed output stays byte-identical. DiceBear's per-seed color assignment from the palette's shape array adds further variety. A recognizable URI prefix constant is exported so validation and UI can classify placeholder URIs without parsing SVG.

### D6 — Placement

Mint action joins the item domain's actions module per `data-layer-organization`. `lib/data/item.actions.ts` sits in the yellow file-size band (~353 raw lines); if the addition crosses red, the action extracts to a cohesive sibling module within the domain pair convention rather than eslint-disabling.

## Risks / Trade-offs

- [Guest-triggered writes: crawlers/anonymous viewers of public lists cause inserts] → idempotent, one row per item ever (steady state), view-gated; write volume bounded by imageless-item count.
- [Mint burst on first view of an imageless list: N actions + up to N `updateTag('items')` bumps] → one-time per item; subsequent views hit the saved row. Accepted.
- [Palette constants can drift from `global.css` brand tokens] → single documented constant block in the generator module; rebrand procedure is "update constants, regenerate" (reroll/edit path exists; a bulk regenerate tool can be added later if ever needed).
- [Client-submitted placeholder data-URI cannot be proven server-generated] → strict shape (`data:image/svg+xml;base64` prefix + size cap); threat is no worse than the already-allowed arbitrary http image URLs; content moderation owned by MAP #224.
- [Duplicate placeholder rows under concurrent first views] → prevented at the DB by `item_images_one_active_idx`; losers return the winner's row.
- [Photo card always showing adds a step to previously bypassed one-image flows] → deliberate owner trade: offer the placeholder choice everywhere.

## Migration Plan

One additive index migration (`item_images_one_active_idx`, with a stray-double-active dedupe in the same DO block); no table or column changes, no backfill. Deploy order-free: legacy items mint on first view post-deploy. Rollback = revert; already-minted placeholder rows are ordinary pool rows and remain valid (or are removable by hand if a rollback must scrub them — none of the read paths special-case them).

## Open Questions

None — all decisions owner-settled in the embark grilling; remaining choices (exact size cap value, reroll icon) are implementation-level and resolve at apply. A placeholder-thumb badge was considered and dropped at review: the generated-art appearance is the distinguisher.
