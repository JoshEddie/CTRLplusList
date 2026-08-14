# Tasks: item-placeholder-art

## 1. Generator foundation

- [x] 1.1 Add `@dicebear/core@9.4.3` + `@dicebear/shapes@9.4.2` to package.json (pin core to 9.x — shapes has no core-10-compatible release)
- [x] 1.2 Create `lib/placeholderArt.ts`: pure `seed → data:image/svg+xml;base64` generator with baked palette constants (bg `#2a2060`; shapes `#cda2ff`, `#c4b8ff`, `#f0eeff`), exported placeholder URI-prefix constant, server-only (no client-bundle import)
- [x] 1.3 Unit tests: same-seed determinism, different-seed variation, prefix classification

## 2. Lazy mint path

- [x] 2.1 Add `mintItemPlaceholder(itemId)` server action (item domain actions module per `data-layer-organization`; watch the file-size band — extract a cohesive sibling module if the addition crosses red): `isItemViewable` gate, idempotent on existing active image, seed = item id, insert active `item_images` row, `updateTag('items')` only on real insert, no invalidation on unauthorized/no-op paths
- [x] 2.2 Wire `ItemPhoto` empty state: client effect fires mint once, swaps returned URI into the container; imaged renders untouched
- [x] 2.3 Tests: mint idempotence, unauthorized rejection without side effects, guest-callable mint on viewable item, ItemPhoto swap + no-call-when-imaged

## 3. Caps and validation

- [x] 3.1 Raise `MAX_IMAGE_CANDIDATES` 10 → 15 (`lib/imageCandidates.ts`) and the seam's `imageUrls` cap (product-fetch normalization) to match
- [x] 3.2 Widen `item.schema.ts` candidate validation: ≤15 http(s) URLs plus ≤1 size-capped placeholder-prefix URI exempt from the 15; any other `data:` URI rejected
- [x] 3.3 Tests: 15-cap boundary, placeholder exemption, second placeholder rejected, oversized placeholder rejected, non-placeholder data URI rejected

## 4. Deck photo card

- [x] 4.1 Add authenticated preview server action returning `n` random-seed URIs (transient, no writes)
- [x] 4.2 Remove the one-image bypass: photo card always shows, single fetched image pre-selected; update `neededSteps`/intro step count
- [x] 4.3 `PhotoEditor`: append `max(1, 4 − realPhotos)` placeholder thumbs (distinct seeds, excluded from pruning and cap), zero-image state becomes stage + all-placeholder strip
- [x] 4.4 Reroll control (button-system) on the stage, rendered only while a placeholder thumb is selected; regenerates that thumb in place
- [x] 4.5 Selected placeholder flows through the normal submit path as candidate + active URL; unselected thumbs never persist
- [x] 4.6 Tests: fill rule brackets, always-show + pre-selection, reroll visibility + in-place regeneration, transient-preview non-persistence

## 5. Bookkeeping

- [x] 5.1 Comment on #199 and #259: DiceBear dependency introduced by this change (coordination note per MAP #181)

## 6. Pre-merge

- [x] 6.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.3 `npm run build` — completes clean
- [x] 6.4 `npm run test:coverage` — zero failing tests
- [x] 6.5 `npm run test:e2e` — zero failing tests
