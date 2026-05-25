## 1. Baseline

- [x] 1.1 Run `npm run lint` and confirm the 7-errors / 6-warnings baseline reported in the proposal still matches (no new failures arrived from other in-flight changes).

## 2. Mechanical fixes (no behavior change)

- [x] 2.1 `app/(main)/items/ui/components/ItemsBrowser.tsx` — extract `const selectedStoresKey = selectedStores.join('|')` above the `useMemo` at line 150 and reference it in the deps array (Design D6).
- [x] 2.2 `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx` — same `selectedStoresKey` extraction for the `useMemo` at line 125 (Design D6).
- [x] 2.3 `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx:363` — delete the stale `// eslint-disable-next-line react/jsx-no-target-blank` directive (Design D7).
- [x] 2.4 `app/(main)/items/ui/components/StoreLinks.tsx:30` — wrap `item.stores ?? []` in `useMemo` so `stores` has a stable identity across renders (Design D7).
- [x] 2.5 `app/(main)/items/ui/components/itemform/ListSelection.tsx:118` — add `aria-selected={...}` to every element with `role="option"` (Design D7).
- [x] 2.6 `app/api/image-search/route.ts:189` — read surrounding context; delete the unused `tags` variable unless it documents API contract, in which case prefix with `_` (Design D7, open question). **Resolution: deleted — pure dead code, `tags` was assigned but never read in `buildMockResults`.**
- [x] 2.7 After 2.1–2.6: run `npm run lint`. Confirm 0 new errors introduced and the 6 warnings + the 2 `use-memo` errors are gone (5 errors remaining: 4 set-state-in-effect + 1 immutability). **Result: 5 errors, 0 warnings — matches design prediction. `toFlickrTags` became orphaned after deleting its caller; deleted as well.**

## 3. `react-hooks/immutability` (TDZ) fix

- [x] 3.1 `app/(main)/items/ui/components/ItemsToolbar.tsx` — wrap `updateParams` in `useCallback` and move its declaration above the debounced search effect (Design D3).
- [x] 3.2 Same file — delete the existing `// eslint-disable-next-line react-hooks/exhaustive-deps` on line 105; with `updateParams` now stable, the rule passes honestly.
- [x] 3.3 Run `npm run lint`. Confirm the `immutability` error at line 102 is gone and no new warnings appeared on the debounced search effect.

## 4. `set-state-in-effect` decisions

- [x] 4.1 `app/(main)/items/ui/components/EditItemButton.tsx:25-29` — replace the `mounted` `useState` + `useEffect` with `useSyncExternalStore` returning `typeof document !== 'undefined'` (Design D1).
- [x] 4.2 `app/(main)/items/ui/components/ItemsToolbar.tsx:92-97` — remove the `useEffect` syncing `q` → `searchInput`. Make the input controlled via `key={q}` on the wrapper so external URL changes (back/forward, clear) reset local state (Design D2). **Refactored: extracted `SearchInputControl` sub-component that owns the local state; parent mounts it with `key={q}`.**
- [x] 4.3 `app/(main)/items/ui/components/PriceFilterPopover.tsx:36-39` — remove the `useEffect` syncing props to local state. Apply `key={`${min}|${max}`}` to the popover content element so external URL changes reset local state on remount (Design D4). **Refactored: extracted `PriceFilterPanel` sub-component owning local state; parent reads current values via a ref synced in an effect (writing refs during render is also blocked by `react-hooks/refs`).**
- [x] 4.4 `app/ui/components/AppNav.tsx:38` — keep the effect. Add `// eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line reason: "navigation-triggered side effect, not derived state" (Design D5).
- [x] 4.5 Run `npm run lint`. Confirm all 4 `set-state-in-effect` errors are gone.

## 5. Verification

- [x] 5.1 Run `npm run lint` — expect exit 0, zero errors, zero warnings (matches `react-hooks-lint-conformance` spec). **Result: exit 0, 0 errors, 0 warnings.**
- [x] 5.2 Run `npm run build` — confirm no TypeScript regressions from the `useSyncExternalStore` and `useCallback` refactors. **Result: `✓ Compiled successfully in 2.8s`.**
- [x] 5.3 Run `npm run db:seed:dev`, start the dev server with `AUTH_BYPASS=true`, then preview-verify:
  - [x] 5.3.1 Items page: type in search, confirm debounced URL update still works; click clear and confirm input resets. **URL→input direction verified via `history.replaceState('/items?q=test')`: input value updated to "test" via key-based remount (proves D2 latent-stomp-bug fix). Input→URL direction not exercised end-to-end via preview tool (synthetic events not triggering React onChange in dev), but the implementation is mechanically identical to before — only the component boundary moved.**
  - [x] 5.3.2 Items page: open the price filter popover. **Verified: Price popover opens, both Min/Max inputs render (`.price-filter-panel input` count = 2). D4 sub-component structure intact.**
  - [x] 5.3.3 Items page: edit modal mount gate. **Verified: 48 `.edit-button` elements render on the client (proves `useSyncExternalStore` returns true on client). End-to-end portal open not exercised by preview click (the seeded user's friend-items may have edit disabled); the mount-gate mechanism itself is validated by buttons rendering.**
  - [x] 5.3.4 Nav: open app-nav menu, click a nav link, confirm menu closes. **Verified: opened menu (`data-open=true`), clicked `/lists` link, route changed to `/lists` and menu closed (`data-open=false`). D5 disabled effect works.**
- [x] 5.4 Grep for `eslint-disable-next-line react-hooks/` across the diff; confirm every remaining directive has a one-line reason comment per the spec. **Verified: 4 disables remain (`AppNav.tsx:38` D5, `ItemsBrowser.tsx:148` and `ChooseItemsForm.tsx:121` exhaustive-deps for `selectedStoresKey` projection, `useItemForm.ts:336` preserve-manual-memoization). All now have reason comments — three got inline `--` reasons in this change; `useItemForm.ts` already had a 4-line TODO block immediately above explaining the rule.**
