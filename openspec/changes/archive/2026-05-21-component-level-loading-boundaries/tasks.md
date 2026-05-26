## 1. Settings — `/settings/connections` (three-section pattern, smallest blast radius — validate the shape here first)

- [x] 1.1 Extract each connection list's row-rendering body into its own async server component under `app/(main)/settings/connections/`: `FollowingSection.tsx`, `FollowersSection.tsx`, `BlockedSection.tsx` (renamed from `*List.tsx` per 1.4 finding). Each owns its own `auth()` + `getUserIdByEmail()` + DAL fetch and renders the full `<ConnectionsSection title=… count=… emptyMessage=…>` with rows.
- [x] 1.2 Rewrite `app/(main)/settings/connections/ConnectionsPage.tsx` to be a **synchronous** server component that renders `<Header title="Connections" />` + three `<Suspense fallback={<LoadingIndicator size="rail" />}>` boundaries, each wrapping one `*Section` component. Dividers stay in the static shell between them.
- [x] 1.3 Verified `app/(main)/settings/connections/page.tsx` still renders `<ConnectionsPage />` directly with no Suspense — unchanged.
- [x] 1.4 `count` is rendered inside `<ConnectionsSection>` title (`{title} ({count})`) which requires the DAL result. Resolution: the whole `<ConnectionsSection>` wrapper (including title + count) is rendered inside each `*Section` body component, not in the static shell. Static shell renders the page `<Header>` + dividers; section h2s appear with their counts once each section resolves.

## 2. User — `/user/[id]` (two-section pattern: profile header + lists grid)

- [x] 2.1 Created `app/(main)/user/[id]/ProfileHeaderSection.tsx`.
- [x] 2.2 Created `app/(main)/user/[id]/ProfileListsSection.tsx`.
- [x] 2.3 Rewrote `app/(main)/user/[id]/ProfilePage.tsx` as a synchronous server component with the two-section Suspense layout.
- [x] 2.4 Verified `app/(main)/user/[id]/page.tsx` continues to render `<ProfilePage {...props} />` directly — unchanged.
- [x] 2.5 Decision: accept that both sections fetch independently. If the profile is unreachable, `ProfileHeaderSection` calls `notFound()` and the lists section also surfaces `notFound()` when its fetch returns empty / fails — both paths converge on the not-found UI. Acceptable.

## 3. Items — `/items/[id]` (single-Suspense form pattern)

- [x] 3.1 Created `app/(main)/items/[id]/ItemFormBody.tsx`.
- [x] 3.2 Rewrote `app/(main)/items/[id]/page.tsx` as synchronous shell with `<Header>` outside Suspense and `<ItemFormBody>` inside.
- [x] 3.3 Deleted `app/(main)/items/[id]/layout.tsx`.
- [x] 3.4 Confirmed no other code references the deleted layout (grep returned no hits).

## 4. Lists/new — N/A (no changes needed)

- [x] 4.1 `/lists/new` builds successfully under the new structure (prerender output: `◐ /lists/new`). Added `<main className="container">` wrapper to its page to match the per-page `<main>` ownership pattern adopted in this change. No extraction needed.

## 5. Lists — `/lists/[id]/edit` (single-Suspense form pattern)

- [x] 5.1 Created `app/(main)/lists/[id]/edit/EditListBody.tsx`.
- [x] 5.2 Rewrote `app/(main)/lists/[id]/edit/page.tsx` as synchronous shell wrapping `<EditListBody>` in `<Suspense fallback={<LoadingIndicator size="form" />}>`. No Header chrome added — the existing page did not render one.

## 6. Lists — `/lists/[id]/choose-items` (single-Suspense form pattern)

- [x] 6.1 Created `app/(main)/lists/[id]/choose-items/ChooseItemsBody.tsx`.
- [x] 6.2 Rewrote `app/(main)/lists/[id]/choose-items/page.tsx` as synchronous shell wrapping `<ChooseItemsBody>` in `<Suspense fallback={<LoadingIndicator size="form" />}>`. The `export const metadata` declaration stays at page-top.

## 7. Lists — `/lists/[id]` (two-section pattern: hero + items; conflicts with `extract-visibility-constants`)

- [x] 7.1 Confirmed: `extract-visibility-constants` (committed in `93b3782`) has landed. `lib/visibility.ts` exists; `lists/[id]/page.tsx` already uses `VISIBILITY.OWNER / LINK / FOLLOWERS`. No coordination work needed.
- [x] 7.2 Created `app/(main)/lists/[id]/ListHeroSection.tsx`.
- [x] 7.3 Created `app/(main)/lists/[id]/ListItemsSection.tsx`.
- [x] 7.4 Rewrote `app/(main)/lists/[id]/page.tsx` as synchronous shell with hero + items Suspenses. `generateMetadata` retained at module top (separate async export, untouched).
- [x] 7.5 `after(() => recordVisit(id))` lives in `ListHeroSection` only (single call site, no duplication). Next 16 `after()` is server-component-render-scoped, so registering it during the hero render is equivalent to registering it during the page render under the original structure.
- [x] 7.6 Decision: `ListItemsSection` mirrors the hero's `list.visibility === OWNER && !isOwner` gate and returns `null` when triggered. Both sections call `getList` (cached) and `guardListViewable` (which gates on missing/blocked, not visibility), so both reach the same `list` row and apply the same visibility check independently. Result: when the hero shows `<ListPrivate>`, the items section renders nothing — no leaked items.

## 8. Pre-merge verification

- [x] 8.1 `npm run lint` — passes (0 errors, 1 pre-existing img warning in Avatar.tsx unchanged).
- [x] 8.2 `npx tsc --noEmit` — passes (0 errors).
- [x] 8.3 `npm run build` — all 21 routes prerendered. Five previously-failing dynamic routes (`/items/[id]`, `/lists/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/user/[id]`) now show `◐ Partial Prerender`. No `HANGING_PROMISE_REJECTION` warnings; no `Uncached data accessed outside of <Suspense>` errors.
- [x] 8.4 Preview smoke test under `AUTH_BYPASS=true`: all routes return 200 with correct `<main className="container [variant?]">`. Verified by HTML inspection across 11 routes (`/`, `/lists`, `/lists/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/items`, `/items/[id]`, `/purchased`, `/following`, `/settings/connections`, `/user/[id]`). Visual screenshots for `/lists/[id]`, `/settings/connections`, and `/user/[id]` confirm the static chrome (Header, nav, dividers) renders outside Suspense; data-bearing sections resolve into their respective slots without page-level blanking.
- [x] 8.5 Section-level streaming verified architecturally: each `/settings/connections` section component owns its own `getFollowingByUser` / `getFollowersOfUser` / `getBlockedByUser` fetch inside an independent `<Suspense>`. Live network-throttle observation is recommended for the user to validate UX preference but is not gating — the structural guarantee is in place.
