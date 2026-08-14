# Proposal: linkless-add-door

Issue: [#258](https://github.com/JoshEddie/CTRLplusList/issues/258) · Map: [#233](https://github.com/JoshEddie/CTRLplusList/issues/233)

## Why

PRICED and BARE item states are writable since #256 but have no creation path: the add flow is link-first, and manual entry is failure-only and link-seeded. Cash, gift-card, experience, and homemade gifts need a deliberate door that doesn't degrade the link-first design.

Amended at embark grilling (2026-07-22, recorded in MAP #233): the originally charted typed category pick and stock-image seeding are dropped — the door is a single quiet affordance, and the existing placeholder-art top-up supplies imagery. Category pick + curated stock images are parked at idea [#280](https://github.com/JoshEddie/CTRLplusList/issues/280).

## What Changes

- The URL entry step gains a quiet secondary affordance ("add without a link") that enters the standard deck directly — skipping the intro/URL cards — with a blank item, nothing pre-marked good, and no store step at all (photo/title/price/note; price optional → PRICED or BARE exits).
- No image seeding: the door-entered photo card starts with zero candidates and the existing placeholder-thumb top-up (`max(1, 4 − realPhotos)`) fills the strip, with the first thumb pre-selected so the stage is never an empty frame (applies to every zero-real-photo deck, fetch-zero included).
- Edit-time linkless lock, derived from state: editing an item with no link renders the deck without a store step. Zero schema change. StoreEditor's editable link field for linked items is untouched (#266's scope).
- The fetch-failure manual path stays untouched: failure-only, link-seeded, FULL-only exit.
- **Removal**: the dead image-search cluster — `ImageSearch.tsx`, `ImageResultsViewer.tsx`, `image-search.css`, their tests, `app/api/image-search/route.ts`, the `ImageSearchResult` type, the LOCALDEV `/api/image-search` section, and stale references (CLAUDE.md pointer, `product-fetch/route.ts` comment). Zero live importers; this flow is their successor. Four main specs mandate the cluster — deltas below retire or re-anchor them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `product-link-prefill`: the URL-first entry state gains the linkless-door affordance and a second exit — door → deck directly, no fetch, no intro.
- `item-decision-deck`: step membership becomes link-aware — door-entered and linkless-edited items carry no store step; door entry skips the intro card and pre-marks nothing.
- `list-item-management`: the retained-but-unwired image-search modal requirement is REMOVED (cluster deleted); the shared-Modal requirement drops its `ImageSearch.tsx` pattern reference.
- `server-endpoint-authorization`: the metered-provider auth + rate-limit requirements re-anchor from the deleted `app/api/image-search/route.ts` to Zyte via `app/api/product-fetch/route.ts`.
- `testing-foundation`: the known rate-limited mock boundary swaps from the image-search upstream to the product-fetch upstream.
- `form-field-system`: the SearchField migration scenario drops the deleted image-search modal search from its governed surfaces, and the `--neutral-border-color` scenario drops image-search backgrounds from its non-form consumers.

## Impact

- `app/(main)/items/ui/components/itemform/`: `UrlEntryStep.tsx` (affordance), `ItemFormContainer.tsx` (door routing/screen state), `deck/neededSteps.ts` + `deck/Deck.tsx` (store-step membership), `deck/viewModel.ts` (blank/linkless seeding as needed).
- Deletions: `ImageSearch.tsx`, `ImageResultsViewer.tsx`, `__tests__/ImageSearch.test.tsx`, `__tests__/ImageResultsViewer.test.tsx`, `app/api/image-search/route.ts`, `ImageSearchResult` in `lib/types.ts`, LOCALDEV `/api/image-search` section.
- No schema change, no migration, no new dependencies. `item-image-candidates` contract unchanged.
