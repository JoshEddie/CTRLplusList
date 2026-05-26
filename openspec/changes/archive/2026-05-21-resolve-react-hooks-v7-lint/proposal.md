## Why

`npm run lint` currently fails with 7 errors and 6 warnings, blocking CI. The errors aren't regressions in our code — `eslint-config-next@16` pulled in `eslint-plugin-react-hooks@7.1.1`, which promotes three new rules to default-error: `set-state-in-effect`, `use-memo` (complex deps), and `immutability`. We need to clear the backlog so lint is green again, and we want to do it in one focused pass rather than absorbing the cleanup into the five other in-flight changes (each of which would otherwise gain off-scope tasks).

## What Changes

- Resolve 4 `react-hooks/set-state-in-effect` errors across `EditItemButton.tsx`, `ItemsToolbar.tsx`, `PriceFilterPopover.tsx`, and `AppNav.tsx`. Each case gets a per-file decision (refactor vs. justified disable) documented in `design.md`.
- Resolve 2 `react-hooks/use-memo` errors in `ItemsBrowser.tsx` and `ChooseItemsForm.tsx` by extracting `selectedStores.join('|')` into a named variable.
- Resolve 1 `react-hooks/immutability` error in `ItemsToolbar.tsx` by hoisting `updateParams` above the effect that depends on it.
- Clear 6 warnings: `StoreLinks.tsx` memo dep, `ListSelection.tsx` missing `aria-selected`, an unused `eslint-disable` directive in `ChooseItemsForm.tsx`, and an unused `tags` variable in `app/api/image-search/route.ts`.
- No public behavior changes. The `PriceFilterPopover` refactor (key-based reset) incidentally fixes a latent bug where local edits could be stomped mid-typing by URL state — calling that out but not gating the change on it.

## Capabilities

### New Capabilities

- `react-hooks-lint-conformance`: codifies that the codebase MUST pass `eslint-plugin-react-hooks@7.x` rules — establishes the standard the cleanup achieves and gives a checkable contract for future code.

### Modified Capabilities

_None._ No existing capability's requirements change.

## Impact

- **Files touched** (10): `app/(main)/items/ui/components/EditItemButton.tsx`, `ItemsBrowser.tsx`, `ItemsToolbar.tsx`, `PriceFilterPopover.tsx`, `StoreLinks.tsx`, `itemform/ListSelection.tsx`; `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx`; `app/ui/components/AppNav.tsx`; `app/api/image-search/route.ts`.
- **CI**: `npm run lint` returns to passing; no other CI surface changes.
- **No dependency changes.** The `eslint-plugin-react-hooks@7.1.1` bump that surfaced these errors is already in `package-lock.json` via `eslint-config-next@16.2.4`.
- **Coordination with in-flight changes**: five other proposals (`replace-storelinks-expand-with-popover`, `standardize-form-fields`, `standardize-buttons`, `redesign-home-and-tokens`, `add-following-and-history`) touch overlapping files. This change should land before or after them as a single hygiene commit; per-file conflicts are mechanical to resolve since the lint fixes are localized.
