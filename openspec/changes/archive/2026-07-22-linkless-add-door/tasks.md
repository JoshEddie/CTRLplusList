# Tasks: linkless-add-door

## 1. Dead image-search cluster removal

- [x] 1.1 Delete `ImageSearch.tsx`, `ImageResultsViewer.tsx`, `__tests__/ImageSearch.test.tsx`, `__tests__/ImageResultsViewer.test.tsx` under `app/(main)/items/ui/components/itemform/`
- [x] 1.2 Delete `app/api/image-search/route.ts` (and its directory) plus any tests covering it
- [x] 1.3 Delete `image-search.css`; remove `ImageSearchResult` from `lib/types.ts`; remove the `/api/image-search` section from LOCALDEV.md and the pointer text in CLAUDE.md; fix the stale image-search comment in `app/api/product-fetch/route.ts:21`; sweep for any remaining references (env vars, docs, test-config carve-outs like `test-image-search-api`)

## 2. Door entry

- [x] 2.1 Add the quiet linkless-door affordance to `UrlEntryStep.tsx` — text-level secondary action below the fetch footer, copy addressed to non-link gifts, wired to a new `onLinkless` prop
- [x] 2.2 In `ItemFormContainer.tsx`, handle the door: seed `blankItem()` (no URL) and set `screen='deck'`; pass an intro-skip prop to `Deck`
- [x] 2.3 Add the `showIntro` initial-visibility prop to `Deck.tsx` (fetch path unchanged, door passes false)
- [x] 2.4 Make `PriceCard` tolerate an empty `productUrl` — no source-page link affordance renders on the door path
- [x] 2.5 Branch deck card copy (PhotoCard, TitleCard, PriceCard, TitleEditor's inline note helper) on `isLinkless` so fetch-framed language never shows on the door path

## 3. Link-derived store membership and lock

- [x] 3.1 In `neededSteps.ts`, include the `store` step only when the item is not linkless (store name and link both empty) at entry
- [x] 3.2 Add the `isLinkless(vm)` helper co-located with the tier helpers in `deck/utils.ts`
- [x] 3.3 Hide Preview's "Store" action row for linkless items (`Preview.tsx`)
- [x] 3.4 Omit the store row from Triage for linkless items (`Triage.tsx` / its row source)

## 4. Tests

- [x] 4.1 `neededSteps`: linkless entry yields photo/title/price(/note) with no store step; linked entry unchanged
- [x] 4.2 Door flow: activating the door opens the deck directly (no intro, no fetch), nothing pre-marked done
- [x] 4.3 Door exits: save with valid price → PRICED; save with empty price → BARE (submit adapter produces the right store shape)
- [x] 4.4 Linkless lock: Preview hides the Store row and Triage omits the store row for a linkless item; both render for a linked item
- [x] 4.5 `PriceCard`: no source-link affordance with empty `productUrl`
- [x] 4.6 Fetch-failure manual path regression: still link-seeded, store row present, FULL-only advance

## 5. Gates

- [x] 5.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 5.2 `npx tsc --noEmit`
- [x] 5.3 `npm run build`
- [x] 5.4 `npm run test:coverage`
- [x] 5.5 `npm run test:e2e`

## 6. Seeded coverage (owner-directed at apply)

- [x] 6.1 Seed hand-authored linkless items (`*-linkless-N`: cash/gift-card/homemade shapes, PRICED + BARE, viewer- and friend-owned) in `scripts/seed-dev-users.ts`; document in LOCALDEV.md

## 7. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 7.1 A1+C8 Door entry inherits stale `pastedUrl` — intro card + source-page link on a linkless item — resolved
- [x] 7.2 A2+B6 Two definitions of linkless (`isLinkless` vs `pricePairTier`) — orphaned store name unrepairable — resolved
- [x] 7.3 A3 `isStepComplete('price')` non-empty condition contradicts the retained good-tier-is-done SHALL — resolved
- [x] 7.4 A4 Linkless card copy branch documented by no task and no SHALL — resolved
- [x] 7.5 A5 Placeholder pre-selection fires on the FocusEditor edit path, outside spec scope — resolved
- [x] 7.6 B7 `isStepValid` lacks the price carve-out — StepTracker Price never reads done on a blank BARE price — resolved
- [x] 7.7 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.8 `npx tsc --noEmit` — zero errors
- [x] 7.9 `npm run build` — completes successfully
- [x] 7.10 `npm run test:coverage` — run result
- [x] 7.11 `npm run test:e2e` — run result

## 8. Door elevation (owner-directed, post-round-1)

> Owner decision (2026-07-22 explore session): linkless is a different path, not a
> degraded one — the door elevates from text-level `link` variant to a subordinate
> ghost button; wrapped mobile copy tightens. Delta amended in
> `specs/product-link-prefill/spec.md`; header/subtitle stay link-first.

- [x] 8.1 `UrlEntryStep.tsx`: door becomes `<Button variant="ghost" width="full">` below the primary fetch action (44px floor satisfied by the variant)
- [x] 8.2 Tighten door copy to button-label length naming non-link gift categories (e.g. "No link? Cash, gift cards & more") — single line at mobile widths, no wrap
- [x] 8.3 Update the UrlEntryStep test asserting the door affordance (variant/copy) if it pins the old text
- [x] 8.4 `npm run lint` — zero errors, zero non-size warnings
- [x] 8.5 `npx tsc --noEmit` — zero errors
- [x] 8.6 `npm run build` — completes successfully
- [x] 8.7 `npm run test:coverage` — run result
- [x] 8.8 `npm run test:e2e` — run result

## 9. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.
> B9's fix is spec-markdown-only; under the doc-only exemption the two test gates
> are omitted — any executable change in the fix voids the exemption and both
> must run.

- [x] 9.1 B9 Live `form-field-system` spec still references deleted image-search surfaces (no delta in change) — resolved
- [x] 9.2 `npm run lint` — zero errors, zero non-size warnings
- [x] 9.3 `npx tsc --noEmit` — zero errors
- [x] 9.4 `npm run build` — completes successfully
