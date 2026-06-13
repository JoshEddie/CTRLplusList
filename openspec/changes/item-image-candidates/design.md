# Design: item-image-candidates

## Context

Product fetch normalizes to a single `imageUrl` (`lib/product-fetch/zyte.ts:67` — `mainImage?.url || images?.[0]?.url`); the rest of the extractor's image set is discarded. Items store one `image_url` text column (`db/schema.ts` `items`). The item form's only alternative-image affordance is the Google-powered image search (`ImageUrlInput.tsx` → `ImageSearch.tsx` → `GET /api/image-search`), which the owner wants unwired from the form but retained dormant for a future generic-lists feature.

Constraints in force:

- neon-http driver — no transactions; pool replacement is delete + insert as separate statements.
- `lib/data` reads use `'use cache'` + `cacheTag('items')`; item mutations call `updateTag('items')`.
- `list-item-management` binds `ImageSearch.tsx` capacity-error UI and cites it as the `Modal` portal exemplar; both survive because the component survives.
- Primitive-family specs govern buttons/fields — picker affordance must be an existing `button-system` variant, field stays `TextField` per `form-field-system`.

## Goals / Non-Goals

**Goals:**

- Persist the extractor's full (capped) image-candidate set per item.
- Let the user switch the active image among candidates, at create-after-fetch and on later edit, via an inline grid in the slot the search affordance occupied.
- Unwire image search from the item form with zero behavior change to the dormant components.
- Feed candidates from the product fetch (Zyte AI extraction).

**Non-Goals:**

- Deleting image search (route, components, tests, env keys all stay).
- User-managed pools (manual add/remove/reorder of candidates).
- Image proxying/downloading; URLs are hotlinked exactly like `image_url` today.
- Generic-lists image picking (future feature; dormancy of ImageSearch is its only accommodation).

## Decisions

### D1. Storage: `item_images` owns both the pool and the active pointer

```
item_images
  id        serial PK          -- also the display order (insertion = extractor order, main first)
  item_id   text NOT NULL REFERENCES items(id) ON DELETE CASCADE
  url       text NOT NULL
  active    boolean NOT NULL DEFAULT false   -- the active-image pointer
```

A `serial` id is used (not a deterministic/text id): `item_images` is not a guessable-URL surface like lists, and the serial doubles as the order key — so there is **no separate `position` column** and no `(item_id, position)` unique index.

The active image lives in `item_images.active`, **not** `items.image_url`. The first cut kept `image_url` as a text pointer to dodge a non-atomic two-row flag flip and a read-path migration — correct for a *single* image, but the model is now a pool, so the active selection belongs with the pool. The non-atomicity worry dissolves: writes do `DELETE` then one batch `INSERT` with `active` set inline, so exactly one row is active after a single insert — no flip, no two-active window, no partial unique index needed. At-most-one-active is enforced by the action; reads resolve `active ORDER BY id LIMIT 1`, so a stray double-active is deterministic and self-heals on the next write.

`items.image_url` is retained but inert — the EXPAND step of an expand/contract migration; a later CONTRACT migration drops it once it's confirmed unused (tracked in issue #161). Nothing reads or writes it after this change (reads source `image_url` from the active row in `lib/data/item.ts`).

Rejected: (a) session-only candidates (loses pool on re-edit); (b) `text[]`/jsonb on `items` (owner prefers the relational shape); (c) a FK from `items` into `item_images` (circular with the `item_id` FK).

### D2. Write semantics: replace pool + set active, every chosen image saved

`createItem`/`updateItem` persist the set via `replaceItemImages(candidates, activeUrl, itemId)`: the URL set = `candidates ∪ {activeUrl}` — the `activeUrl` (the form's `image_url`, possibly a hand-entered URL outside the extractor set) is always folded in, so *every image the user picked* is saved. Then `DELETE` the item's rows and one batch `INSERT` in order with `active = (url === activeUrl)`. No transactions, so the delete→insert gap can leave an empty pool — accepted residual; the next save repopulates.

On update with **no** candidate list (a manual edit that didn't refetch), the existing pool is read first and used as the base, so the pool is preserved while the active image is re-pointed (and a new hand-entered URL appended as active). `items.image_url` is no longer written.

Cap and dedupe happen in the seam normalization (D4) and are re-enforced in `item.schema.ts` (max 10, each a valid http(s) URL) so the action never trusts client-shaped arrays.

### D3. Data layer placement and cache tags

- Read: item reads in `lib/data/item.ts` load `item_images` ordered by `id` and source `image_url` from the active row (`active ORDER BY id LIMIT 1`); ride the existing `cacheTag('items')` — no new tag, matching current granularity (all item reads share one tag).
- Write: pool replacement lives inside the existing `createItem`/`updateItem` server actions in `lib/data/item.actions.ts`, which already call `updateTag('items')` on success — pool freshness comes for free. No new action endpoints.
- Schema: candidate-list field added to `item.schema.ts` Zod schema (optional array, validated as above).

### D4. Seam shape: `imageUrls: string[]` added to `ExtractedProduct`

`lib/product-fetch/types.ts` gains `imageUrls?: string[]` — ordered, first element identical to `imageUrl`, deduped (exact-string), capped at 10, populated from `[mainImage?.url, ...images.map(i => i.url)]`. `imageUrl` remains and remains first — the route response is additive, no client breakage, and `product-link-prefill`'s existing prefill requirement ("Image URL = fetched image URL") is satisfied by `imageUrls[0]`.

Rejected: replacing `imageUrl` with the array only — breaks the existing spec'd response shape for no gain.

### D4a. Fetch strategy: Zyte-only (tier 1 removed)

Originally a three-tier waterfall: tier 1 (our own page fetch + JSON-LD/OG parse), tier 2 (Zyte), tier 3 (manual). In practice tier 1 **won** for any site exposing structured data (Shopify, most retailers) and returned its bare extraction — typically a single `og:image` — so users never reached Zyte and never saw the full gallery, while the owner had been benchmarking against the Zyte playground. The rule-based tier 1 was simply inferior and was short-circuiting the good path.

Decision: **delete tier 1 entirely; Zyte is the sole extractor** (with `ai: true` for the full gallery). When `ZYTE_API_KEY` is unset (dev/e2e) the fetch fails fast to manual entry; e2e already stubs the route, so no key is needed there. Consequences: every production fetch bills one Zyte call (accepted — quality over the free path, owner's call); `lib/product-fetch/tier1.ts` and its tests are removed, `normalizePrice` moves to `utils.ts`; the app no longer fetches arbitrary user URLs server-side, so the DNS-rebinding SSRF guard (`isUnsafeFetchTarget`/`resolvesToPrivateIp`/`isPrivateIp`) is removed with tier 1 in the same pass and `lib/product-fetch/ssrf.ts` is deleted — only the route's string-level `isPrivateHostname` pre-check stays (now living in `utils.ts` alongside the other small helpers), as cheap hygiene on what we forward to Zyte.

### D4b. Bot-wall reliability: two retry layers, no browser rendering

Etsy and similar bot-walled sites extract intermittently through Zyte's `httpResponseBody` mode — the same link can return a product in ~13s, a no-product page in ~30s, or hang past the budget. Browser rendering (`browserHtml`) would be more consistent but is slower and bills higher on *every* fetch. Instead, a cheap server-side re-roll: the seam retries once on a no-title result (`MAX_ATTEMPTS = 2`, both attempts under the shared abort signal) to re-roll the bot wall — Zyte rotates IPs per call, so the retry gets a fresh shot. This is fully automatic; an earlier manual "Try again" button was dropped in favor of the automatic retry (a client re-request burns a second rate-limit token and a full auth/DB round-trip for no reliability gain over the server re-roll). Browser rendering is left on the table if this proves insufficient. The shared `FETCH_TIMEOUT_MS` is a single budget across both server attempts — short enough that a slow first attempt still leaves room to retry and that we return a graceful `timeout` under any platform function cap (Vercel Hobby kills the route at 60s; local `next dev` has no cap).

### D5. UI: inline candidate grid as the primary selector, URL field demoted

The candidate pool renders **inline** in the item form's IMAGE section — the grid is the primary selector and shows by default, no modal and no click-to-reveal. `ImageUrlInput.tsx` renders `ImageCandidateGrid` when `candidates.length >= 2`, click → `onChange(url)`. The Image URL `TextField` is demoted to the secondary affordance: hidden behind an "Edit image URL" link-variant `Button` (per `button-system`) and shown only when the user activates it, when there's a validation error to surface, or when there are too few candidates to show a grid at all (the field is then the only control).

`ImageCandidateGrid` is a **dedicated** component — a compact paginated **2×2** grid (4 tiles/page) with prev/next arrows — not the dormant search's `ImageResultsViewer`. The two started shared (D5's first cut reused `ImageResultsViewer`), but the candidate picker's presentation diverged: it needs bounded height (a tall auto-fill grid dominated the form), pagination, and mark-**in-place** (clicking a tile must not reorder, which was causing a jumpy layout). `ImageResultsViewer` stays as-is for the dormant `ImageSearch` (D6) — bolting pagination + a no-reorder mode onto it is the fragile-coupling smell the repo names, so the concepts are split. The grid opens on the active image's page and marks it in extractor order. Tile-level CSS (`.image-thumbnail`, etc.) is still shared in `image-search.css`; the grid container/pager classes (`.cand-grid*`) are new there.

Rejected: a modal `ImageCandidatePicker` opened from an "N other images found" link (the change's first cut). The owner wants the candidates visible by default with the current one selected, and editing the URL by hand as an afterthought — a behind-a-link modal inverts that emphasis, so the picker is inline and the URL field is the thing behind a link. Also rejected: active-first reordering of the tiles — it makes the layout jump on every selection; the active tile is marked in place instead.

Selection routes through the existing `onChange` → `useItemForm.handleImageUrlChange` → image-load validation — identical path to today's manual entry, no new validation code. `useItemForm` holds `imageCandidates: string[]` — seeded from fetch result (create) or from the loaded item's pool (edit) — and submits it with the form payload.

**Undersized-candidate pruning.** Extractors return thumbnails of varied size; Amazon in particular emits 40px `_AC_US40_` variants that are worthless as the item image. Since image bytes are never fetched server-side (the no-SSRF stance), natural size is only knowable in the browser: `ImageUrlInput` probes each candidate via `new Image()` and prunes any whose width/height is below a `MIN_IMAGE_PX` floor (200px), and any that fail to load. Two URLs are exempt so they stay reselectable: the active image (what's set) and the extractor's main (`pool[0]`) — exempting only the active would make a small main vanish unreselectably the instant the user picks another tile. Pruning is display-only — the persisted pool keeps the extractor's full set, so a later threshold change or a re-render can re-surface a candidate without a refetch. Rejected: a server-side URL heuristic (parsing Amazon's `_US40_` size token) — CDN-specific, fragile, and can't see non-Amazon sizes; the pixel probe is general.

### D6. Image search dormancy: unwire only

`ImageSearch.tsx`, `ImageResultsViewer.tsx`, `image-search.css`, component tests, `app/api/image-search/route.ts` + tests, `ImageSearchResult` type, env keys, CLAUDE.md section: all retained, no deletion. `list-item-management` capacity-error requirement is reworded to bind the retained component rather than "the item-form modal"; its scenarios and the component tests stay verbatim. Rejected alternative — full deletion per issue #155 — overruled by owner for future generic-lists reuse; keeping the tested feature dormant also matches the repo's "don't tear down a clean, working, tested abstraction" rule.

## Risks / Trade-offs

- [Delete/insert gap leaves empty pool on crash] → degrades to current single-image behavior; affordance hides when pool < 2; next refetch repopulates.
- [Dormant code rots unnoticed] → tests stay in the suite, so CI keeps exercising route + components; rot surfaces as test failures, not silent decay.
- [Candidate URLs go stale (sites rotate CDN URLs)] → same exposure `image_url` already has; pool is best-effort, no new guarantee claimed.
- [Client submits forged candidate arrays] → Zod caps length, validates URL shape; rows are scoped to the caller's own item via existing ownership checks in the actions.
- [SSRF-ish: candidate URLs rendered client-side only] → URLs are never fetched server-side, so no SSRF surface; rendering is `<img>` hotlinking as today.

## Migration Plan

1. Drizzle migration: create `item_images` (additive; no backfill — existing items have empty pools and simply show no affordance).
2. Ship seam + persistence + UI together (single change); response-shape addition is backward compatible.
3. Rollback: revert deploy; table can stay (orphaned but harmless) or drop in a follow-up migration.

## Open Questions

- Resolved during implementation: `item_images.id` is a `serial` (not a deterministic text id) — the table isn't a guessable-URL surface, and the serial doubles as the display-order key, removing the `position` column. The seed stays idempotent via delete-then-insert per item.
