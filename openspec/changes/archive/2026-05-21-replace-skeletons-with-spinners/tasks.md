## 1. Add the `<LoadingIndicator>` primitive

- [x] 1.1 Create `app/ui/components/LoadingIndicator.tsx` accepting `size: 'inline' | 'rail' | 'form' | 'page'` (required); render `<div role="status" aria-live="polite">` with a visually-hidden "Loading…" label and an `aria-hidden` spinner element inside, flex-centered.
- [x] 1.2 Create the colocated CSS (`app/ui/components/LoadingIndicator.css` or equivalent) declaring `.loading-indicator` (outer flex-center box), `.loading-indicator--rail/--form/--page/--inline` (min-height modifiers per design table), `.loading-indicator__spinner` (CSS-only circle with `border-top-color: var(--primary-color)`, sized 32px or 16px depending on variant), and a `@keyframes spin` rotation. Import the CSS once at the component file or from `app/ui/styles/global.css` if global imports are conventional in this codebase (verify via existing primitives).
- [x] 1.3 Add the `sr-only` visually-hidden utility class if not already present in `global.css` (check first); reuse if it exists.
- [x] 1.4 `npx tsc --noEmit` passes; component renders correctly in isolation under the dev bypass (`AUTH_BYPASS=true`) — verify by temporarily dropping `<LoadingIndicator size="rail" />` into a page and refreshing.

## 2. Swap route-segment `loading.tsx` files

- [x] 2.1 `app/(main)/items/loading.tsx`: replace `<ItemLoading />` with `<LoadingIndicator size="page" />`.
- [x] 2.2 `app/(main)/purchased/loading.tsx`: replace `<ItemLoading />` with `<LoadingIndicator size="page" />`.
- [x] 2.3 `app/(main)/lists/[id]/loading.tsx`: replace `<ItemLoading />` with `<LoadingIndicator size="page" />`.
- [x] 2.4 `app/(main)/lists/new/loading.tsx`: keep the existing `<Header title="Loading..." />` wrapper, replace the empty `.list-container` body with `<LoadingIndicator size="page" />`.

## 3. Swap inline `<Suspense>` fallbacks

- [x] 3.1 `app/(main)/HomePage.tsx`: replace each of the four `<Suspense fallback={<ListLoading />}>` boundaries with `<Suspense fallback={<LoadingIndicator size="rail" />}>` — preserving the four independent boundaries (one per rail).
- [x] 3.2 `app/(main)/items/ui/components/ItemsContainer.tsx`: replace `<Suspense fallback={<ItemsLoading />}>` (both branches — `listId` and non-`listId`) with `<Suspense fallback={<LoadingIndicator size="page" />}>`.
- [x] 3.3 `app/(main)/items/ui/components/SortItemsContainer.tsx`: replace `<Suspense fallback={<ItemsLoading />}>` with `<Suspense fallback={<LoadingIndicator size="page" />}>`.
- [x] 3.4 `app/(main)/items/[id]/layout.tsx`: keep the `<Header title="Edit Item" />` inside the fallback wrapper, replace `<ItemFormLoading />` with `<LoadingIndicator size="form" />`.

## 4. Remove the `(main)/layout.tsx` Suspense wrapper, restore page-level coverage

- [x] 4.1 In `app/(main)/layout.tsx`: delete the `<Suspense fallback={<ListLoading />}>` wrapper, leaving `<MainShell>{children}</MainShell>` rendered directly.
- [x] 4.2 Remove the no-longer-needed imports from `app/(main)/layout.tsx`: `Suspense` from `react`, `ListLoading`, and the `./lists/ui/styles/list-loading.css` side-effect import.
- [x] 4.3 In `app/(main)/page.tsx`: wrap `<HomePage />` in `<Suspense fallback={<LoadingIndicator size="page" />}>` to catch `HomePage`'s in-component `await auth()` and suppress Next 16's blocking-route warning.
- [x] 4.4 Add `app/(main)/loading.tsx` rendering `<LoadingIndicator size="page" />` as the segment-level navigation fallback for routes in `(main)` that don't ship their own `loading.tsx`.

## 5. Delete legacy skeleton components and CSS

- [x] 5.1 Delete `app/(main)/lists/ui/components/ListLoading.tsx`.
- [x] 5.2 Delete `app/(main)/lists/ui/styles/list-loading.css`.
- [x] 5.3 Delete `app/(main)/items/ui/components/ItemLoading.tsx`.
- [x] 5.4 Delete `app/(main)/items/ui/styles/item-loading.css`.
- [x] 5.5 Delete `app/(main)/items/ui/components/itemform/ItemFormLoading.tsx`.
- [x] 5.6 Grep the repo for `ListLoading`, `ItemLoading`, `ItemsLoading`, `ItemFormLoading`, `list-loading.css`, `item-loading.css` — confirm no remaining references (other than git history).

## 6. Verify

- [x] 6.1 `npx tsc --noEmit` passes.
- [x] 6.2 With `AUTH_BYPASS=true` and seeded dev data, start the dev server and visit `/`, `/lists`, `/items`, `/purchased`, `/lists/[id]` for a seeded list, and `/items/[id]` for a seeded item — confirm each shows the new spinner (or resolves instantly when cached) and the resolved content fills the same container the spinner occupied without a visible layout jump.
- [x] 6.3 Throttle network or open a fresh incognito session with cache cleared and observe the home page rails resolving independently with rail-sized spinners (per `loading-indicator-system` Requirement: fallback inside the suspended container).
- [x] 6.4 Navigate between two `(main)/` routes (e.g., `/` → `/settings/connections`) and confirm no layout-level skeleton flash appears between them.
- [x] 6.5 Test the screen-reader announcement: with VoiceOver (or equivalent) enabled, navigate to a loading route and confirm "Loading" is announced once per indicator mount.
