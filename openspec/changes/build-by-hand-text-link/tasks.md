# Tasks: build-by-hand-text-link

## 1. FetchFailure component

- [x] 1.1 In `FetchFailure.tsx`, replace the "Build it by hand" `secondary` `<Button>` with `<Button variant="link" onClick={onManual}>Fill in details manually →</Button>` rendered below the button stack (last child of `.deck-failure-actions`, matching `UrlEntryStep`'s idiom), uniform across all three states
- [x] 1.2 Update the capped-state sub-copy in `copyFor` to "Try a different one, or fill in the details manually."
- [x] 1.3 Verify spacing visually satisfies the 2.5.8 exception (8px gap under a 44px button); only if separation reads cramped, add a margin for the link slot in `deck.css` — _owner-verified live; separation reads fine, so no `deck.css` change (design decision 2). `.deck-failure-actions` is the same layout math as the accepted `.prefill-url-actions` precedent: column, 8px gap, stretch_

## 2. Tests

- [x] 2.1 Update `FetchFailure.test.tsx`: assertions target the "Fill in details manually →" name, assert it invokes `onManual`, is present in all three states, and no longer renders with stacked-button classes (`btn` variant class `link`, not `secondary`)
- [x] 2.2 Update `ItemFormContainer.test.tsx` references to the failure screen's "Build it by hand" name
- [x] 2.3 Update `e2e/paste-prefill.auth.spec.ts`'s failure-arc test to the new name — _not in the authored task list; the same rename, and 3.5 fails without it_

## 3. Pre-merge

- [x] 3.1 `npm run lint` — zero errors, zero non-size warnings — _one pre-existing size warning in `app/api/image-search/route.ts` (310 lines), untouched by this change_
- [x] 3.2 `npx tsc --noEmit` — zero errors
- [x] 3.3 `npm run build` — completes successfully
- [x] 3.4 `npm run test:coverage` — zero failing tests — _236 files, 2564 tests_
- [x] 3.5 `npm run test:e2e` — zero failing tests — _43 passed_
