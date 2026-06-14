# Tasks: item-image-candidates

## 1. Schema & migration

- [x] 1.1 Add `item_images` table to `db/schema.ts` (`serial` id PK, item_id FK cascade, url, `active` boolean) and the Drizzle migration that creates it + backfills one active row per item from `items.image_url` (expand step; `items.image_url` left inert for a later contract migration)
- [x] 1.2 Extend `scripts/seed-dev-users.ts` so every item gets an active `item_images` row and a couple get multi-candidate pools (idempotent delete-then-insert) — picker / no-picker states reachable from the seed

## 2. Product-fetch seam (Zyte-only)

- [x] 2.1 Add `imageUrls?: string[]` to `ExtractedProduct` in `lib/product-fetch/types.ts` + shared `normalizeImageUrls` (dedupe exact-string, cap 10, first = `imageUrl`)
- [x] 2.2 Zyte (`zyte.ts`): `extractFrom: httpResponseBody` + `ai: true`; populate `imageUrls` from `[mainImage.url, ...images[].url]`
- [x] 2.3 Remove tier 1 entirely — it was winning for structured-data sites and returning single-image results, short-circuiting Zyte. Delete `tier1.ts` + the now-dead DNS-rebind SSRF guard; `fetchProduct` is Zyte-only; move `normalizePrice` / `isPrivateHostname` to `utils.ts`
- [x] 2.4 Auto-retry once on a no-title result (`MAX_ATTEMPTS = 2`, shared abort signal); `FETCH_TIMEOUT_MS` sits under the route's `maxDuration` (Hobby 60s cap)
- [x] 2.5 Unit tests: Zyte dedupe/cap/order, `imageUrl === imageUrls[0]`, key set/unset, nameless→retry→`fetch_failed`, retry-recovers, caller-abort→`timeout`, store derivation

## 3. Data layer (active-flag storage)

- [x] 3.1 `lib/data/item.schema.ts`: optional `image_candidates` array (max 10, http(s)-validated)
- [x] 3.2 `lib/data/item.actions.ts`: `replaceItemImages(candidates, activeUrl, itemId)` folds the active URL into the set (every chosen image saved), delete + batch-insert with `active` set inline; on update without candidates, preserve the pool and re-point active; stop writing `items.image_url`; existing `updateTag('items')` covers freshness
- [x] 3.3 `lib/data/item.ts`: reads load pool ordered by `id` and source `image_url` from the active row (`active ORDER BY id LIMIT 1`) under existing `cacheTag('items')`
- [x] 3.4 Integration tests (real DB): fetched-create marks active, manual URL folds in as active, manual edit preserves pool, refetch replaces, cascade delete, validation rejection

## 4. UI

- [x] 4.1 `ImageUrlInput.tsx`: remove search affordance + `ImageSearch`; render the candidate pool inline as the primary selector (≥2 candidates) and demote the Image URL `TextField` behind a secondary "Edit image URL" toggle (forced visible on error / when no grid)
- [x] 4.2 New `ImageCandidateGrid.tsx`: compact paginated 2×2 grid (4/page, prev/next arrows, short-page padding for stable footprint), active marked **in place** (no reorder) — dedicated component, not the dormant `ImageResultsViewer` (left untouched for the retained image search)
- [x] 4.3 Client-side size filter: probe each candidate's natural dimensions, prune < 200px / failed-load; exempt the active image and the extractor main (`pool[0]`) so a small main stays reselectable
- [x] 4.4 `useItemForm` holds `image_candidates` (seed from fetch on create / stored pool on edit), submits with payload; selection routes through `handleImageUrlChange` image-load validation. Prefill passes `imageUrls` into the form session
- [x] 4.5 Component tests: grid render/hide thresholds, mark-in-place / no-reorder, pagination + short-page padding, size-filter prune + exemptions, pick-updates-field-through-validation, edit-mode seeding, no path opens `ImageSearch`; plus `SortItems` re-sync on image edit (preexisting list-grid staleness fix)

## 5. Specs & docs

- [x] 5.1 Verify delta specs match implemented behavior (item-image-candidates, product-link-prefill, list-item-management); adjust deltas where implementation diverged (Zyte-only, active-flag storage, paginated grid)
- [ ] 5.2 Comment on issue #155 after merge: image search unwired, retained dormant for generic-lists future; link this change for #156

## 6. Pre-merge

- [x] 6.1 `npm run lint` — zero errors (the two yellow file-size advisories on `useItemForm.ts` / `route.ts` are the tolerated band)
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.4 `npm run test:coverage` — full unit suite green (2426) this session
- [ ] 6.3 `npm run build` — re-run after the Zyte-only + schema redesign
- [ ] 6.5 `npm run test:e2e` — re-run against a freshly-migrated local DB (the migration history was squashed)
