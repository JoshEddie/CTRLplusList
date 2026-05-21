<!--
Staged rollout. After every numbered stage, the **Checkpoint** subsection is a hard pause:
verify the work, decide whether the next stage runs in this change or spins out into a new
OpenSpec change, and (for stages flagged "Claude Design session required") open that session
before any implementation tasks start.
-->

## 0. Stage 0 — Foundation: design tokens

- [x] 0.1 Add the new custom properties to `:root` in `app/ui/styles/global.css`: `--page-frame-gradient`, `--heading-text-color`, `--subtitle-text-color`, `--meta-text-color`, `--date-text-color`, `--divider-color`, `--card-border-color`, `--card-border-hover-color`, `--card-hover-background-color`, `--card-shadow`, `--card-shadow-hover`, `--surface-shadow`. Use the values listed in `design.md` D3.
- [x] 0.2 Rewrite `body::before` in `global.css` to use `background-image: var(--page-frame-gradient);` and remove the ad-hoc composition over black. Keep `--primary-color-transparent` and `--secondary-color-transparent` declared (they may be used elsewhere).
- [x] 0.3 Run the dev server and smoke-test every existing route: `/`, `/lists`, `/lists/[id]`, `/lists/new`, `/lists/bookmarks`, `/lists/history`, `/following`, `/items`, `/items/[id]`, `/purchased`, `/settings/connections`, `/user/[id]`, and the auth pages. Confirm no visual regression beyond the body background going slightly darker.

### Checkpoint 0

- [x] 0.C1 User reviewed the body background and incidental visual changes; approved (the new dark gradient body is in place, no regressions noted on existing pages).

## 1. Stage 1 — App frame: gradient nav + white-card surface

- [x] 1.1 Create `app/ui/components/AppLogo.tsx` rendering the "CTRL + list" lockup (white "CTRL" chip with purple text, white "+", italic Crimson Pro "list"). Size variant for mobile.
- [x] 1.2 Create `app/ui/components/AppNav.tsx`. **Post-checkpoint revision:** the first cut had a `nav-hide` row of four icon pills that became too cramped on mobile; the user asked for a hamburger pattern. Rewrote AppNav as a single client component that owns `open` state and iterates `NAV_ITEMS` once. CSS (`.app-nav-toggle`, `.app-nav-items`, `[data-open]`) renders inline pills on desktop and a hamburger button + dropdown on mobile. Active-state still computed from `usePathname()` per the prefix rules.
- [x] 1.3 ~~Create `app/ui/components/AppAvatar.tsx`~~ **Deviation:** reused existing `<User />` / `UserAvatarPopover` component in the avatar slot (provides the same circle visual plus working sign-out dropdown — building a static replacement would have regressed functionality). Wrapped in `<div className="app-nav-avatar">` inside `<AppFrame>`.
- [x] 1.4 Compose the gradient nav bar in `app/(main)/layout.tsx` (via `<AppFrame>`): 60px desktop / 54px mobile, `--page-frame-gradient`, `AppLogo` left, `AppNav` middle, `AppAvatar` right. **Post-checkpoint revision:** on mobile the hamburger sits **before** the logo (the user noted the centered hamburger felt out of place). Implemented via CSS `order` on `.app-nav-wrap`, `.app-logo`, `.app-nav-avatar` inside `@media (max-width: 800px)`; markup/JSX unchanged.
- [x] 1.5 Wrap the layout's children in the white content surface with rounded top corners (`14px` desktop / `12px` mobile), gradient bleed at the sides (~20px desktop, ~12px mobile), max-width 1700px centered, `box-shadow: var(--surface-shadow)`.
- [x] 1.6 Verify `MainShell` still works inside the frame, including the `container--list-details` variant.
- [x] 1.7 Verified the existing per-page `<Header>` renders inside the white surface (confirmed on `/`, `/lists` during the auth-bypass preview review).
- [x] 1.8 Smoke-tested each route under the new frame; nav active-state confirmed on `/` (Home active) and `/lists` (Lists active) with the user reviewing in the preview.

### Checkpoint 1

- [x] 1.C1 User reviewed the new chrome on `/` and `/lists` in the preview. Active-pill behavior, mobile hamburger (with the post-checkpoint hamburger-left-of-logo fix), and frame wrapping all confirmed working. Other `(main)/` routes (`/lists/[id]`, `/items`, `/purchased`, `/following`, `/settings/connections`, `/user/[id]`) inherit the frame automatically and were explicitly accepted as "OK if untouched pages start breaking" — they'll get visual attention at their own stage.

## 1b. Stage 1b — "+N more" trailing tile on home rails

<!--
Surfaced after Stage 2 landed and the seed grew enough to expose the gap: when each
rail caps at 5, there's no signal whether the underlying set has 5 or 50. A trailing
6th tile (same dimensions as the cards, faint brand tint, centered "+N more →") makes
the remainder legible and gives a second tap target for "See all". Spec delta is in
`specs/home-digest/spec.md` under "Rails SHALL render a trailing 'see more' tile".
-->

- [x] 1b.1 Created `app/ui/components/MoreCard.tsx`: a `<Link>` rendering centered "+N more →" with `aria-label="${count} more — see all"`. Width comes from the parent slot (`.list-card-row-item` or `.user-card-grid > li`) so the tile inherits the per-breakpoint sizing — no per-breakpoint width overrides needed inside the component.
- [x] 1b.2 Added `--card-accent-background-color: #f7f3ff` to `:root` in `global.css`. MoreCard consumes it via `.more-card` (see 1b.3). Easy to swap to a different tint later if `#f7f3ff` doesn't land (e.g. reuse `--buy-link-bg`).
- [x] 1b.3 Added `.more-card` rule + `:hover` variant to `following-and-history.css` adjacent to the existing `.list-card` / `.user-card` blocks. `height: 100%` lets it stretch to the row's flex-stretched height (matches card height exactly — confirmed 236×95 in preview). Compact `padding: 14px 16px; font-size: 13px;` variant under `@media (max-width: 800px)`.
- [x] 1b.4 `ListCardRow` accepts `moreCount?: number` and `seeAllHref?: string`. Appends `<MoreCard />` as an extra `.list-card-row-item` when `moreCount > 0 && seeAllHref`. Default behavior unchanged when props absent.
- [x] 1b.5 `UserCardGrid` accepts the same two props. Appends `<li><MoreCard /></li>` as the final grid cell.
- [x] 1b.6 `RecentlyVisitedRail`'s inline `list-card-row` markup now appends `<MoreCard moreCount={...} href="/lists/history" />` when its dataset has > 5 entries.
- [x] 1b.7 All four rails (`MyListsRail`, `BookmarksRail`, `RecentlyVisitedRail`, `FollowingRail`) fetch the full dataset, compute `moreCount = Math.max(0, all.length - shown.length)` after `slice(0, 5)`, and pass `moreCount` + `seeAllHref` through. The `RecentlyVisitedRail` DAL call uses `{ limit: 50 }` since `getVisitHistoryByUser` requires an explicit limit — a tighter total-count query would be a perf follow-up if visit history rows grow large.
- [x] 1b.8 Smoke-tested in the auth-bypass preview at 1400×900 and 375×812. Verified four `.more-card` tiles render with the correct copy (`+10 more →` My Lists, `+1 more →` Following, `+10 more →` Recently visited, `+3 more →` Bookmarks). Each links to the right destination (`/lists`, `/following`, `/lists/history`, `/lists/bookmarks`). Dimensions match the regular cards (236×95 at desktop). Brand tint background resolves to `#f7f3ff`, text resolves to `--primary-color`.

### Checkpoint 1b

- [x] 1b.C1 User reviews all four rails with >5 items each. Confirms tile visual fits the card rhythm, count is correct, and tap/click navigation works on desktop + mobile.

## 2. Stage 2 — Home digest + My Lists page

- [x] 2.1 Add `subtitle: text('subtitle')` to the `lists` table in `db/schema.ts`. Generate the Drizzle migration (`drizzle/0002_ordinary_maximus.sql`) and verify it is purely additive.
- [x] 2.2 Update `app/actions/lists.ts` create/update actions to accept and persist `subtitle`. Treat empty string as NULL on write. (Also updated `lib/types.ts` `ListTable`.)
- [x] 2.3 Add a subtitle input to the list edit form (`ListForm.tsx` or equivalent). Optional, placeholder copy "e.g. Brandy Family".
- [x] 2.4 Move `app/(main)/lists/HomePage.tsx` to `app/(main)/HomePage.tsx`. Move `app/(main)/lists/page.tsx` (currently rendering the digest) to `app/(main)/page.tsx`. **Deviation:** the existing `app/(auth)/page.tsx` also resolved to `/`, causing a "parallel pages" build error. Moved the sign-in entry to `app/(auth)/sign-in/page.tsx` (so it serves `/sign-in`), updated `SignInPage` to redirect signed-in users to `/` (was `/lists`), and updated `HomePage` to redirect signed-out users to `/sign-in` (was a self-redirecting `/`). Other pages that `redirect('/')` still work — they bounce through `/` to `/sign-in` for signed-out users.
- [x] 2.5 Rewrite `app/(main)/lists/page.tsx` as the **My Lists** full page: thin shell delegating to new `MyListsPage.tsx` which renders `<Header title="My Lists">` with `+ New List` CTA and the viewer's lists in a `my-lists-grid` (auto-fill grid of `home-card` instances).
- [x] 2.6 Update the digest's `seeAllHref` for the My Lists rail from `/lists/all` to `/lists`. Grep verified no `/lists/all` references remain.
- [x] 2.7 Remove the **+ New list** affordance from the My Lists rail header in `HomePage.tsx` per the `home-digest` MODIFIED requirement. (The previous home-level `<Header>` with the New List CTA is also gone — the home page is now header-less, with rails rendering directly.)
- [x] 2.8 Rewrite the rail body via new `HomeListRow.tsx` (`display: flex; overflow-x: auto;`). Card widths 236 / 260 / 190 via `.home-list-row-item` width per breakpoint. Updated `MyListsRail`, `BookmarksRail`, `RecentlyVisitedRail` to use `HomeListRow`. Deleted dead `HomeListGrid.tsx`. (FollowingRail still uses its own `UserCardGrid` — Stage 3 will reconcile.)
- [x] 2.9 Rewrote `HomeListCard.tsx` with new markup (`home-card`, `home-card-name`, `home-card-subtitle`, `home-card-meta`, `home-card-occasion`, `home-card-date`) consuming the new tokens. Subtitle falls back to owner name when `showOwner` and no explicit subtitle. No `translateY` on hover; only background/border/shadow swap.
- [x] 2.10 Added 1px dividers between rails via `<div className="home-rail-divider" role="separator" />` using `--divider-color`.
- [x] 2.11 Updated `following-and-history.css` rail + card styles to consume new tokens. `list.css` left mostly untouched — it's used by list-detail / item-row views which are Stage 4 territory and explicitly tolerated per the spec's "pre-existing literals are tolerated until that feature's stage" requirement.
- [x] 2.12 Smoke-tested via the auth-bypass preview. Home digest renders at `/` with the new cards (Crimson Pro names, subtitles, neutral chips, no hover lift) in horizontal-scrolling rails with dividers; `/lists` renders the dedicated My Lists page; subtitle edit field present on the list form. **Follow-up fix folded in:** the pre-existing `cacheComponents: true` "Uncached data accessed outside <Suspense>" warning that surfaced under the auth bypass was silenced by wrapping `<HomePage />` (and `<MyListsPage />`) in `<Suspense>` at the route shell level — keeps HomePage/MyListsPage as normal async components and pushes the Suspense boundary as low as possible. Server logs verified clean (no Uncached-data warnings on subsequent renders).

### Checkpoint 2

- [x] 2.C1 User reviewed the home digest and My Lists page on desktop (1400×900) and mobile (375×812). Verified: gradient nav with real logo image, four nav pills on desktop / hamburger on mobile, horizontal-scrolling rails of new `home-card` instances with subtitles + neutral chips, dividers, "SEE ALL →" links, bookmark indicator on the Recently visited rail. Post-checkpoint fixes folded in: real logo image (replaced text recreation), hamburger menu for mobile (replaced cramped 4-icon row), hamburger repositioned to the left of the logo on mobile, page-level Suspense to silence the Cache Components warning.
- [x] 2.C2 Decision: Stage 3 reuses the home rail card primitive (`HomeListCard`) in a `home-card-grid` — no Claude Design session needed.

## 3. Stage 3 — List collections (`/lists/bookmarks`, `/lists/history`, `/following`)

<!--
Reuses the home rail card. No design session.
-->

- [x] 3.1 Re-skinned `/lists/bookmarks` to use `HomeListCard` in a shared `home-card-grid`. `BookmarksList` now renders the grid; `BookmarkRow.tsx` deleted as dead. Suspense wrap added at the route shell for the `cacheComponents` warning.
- [x] 3.2 Re-skinned `/lists/history` with `HomeListCard` (bookmark indicator preserved via the existing `bookmarked` prop). New `HistoryCard.tsx` wraps the card and overlays `RemoveVisitButton` (small circle X, top-right, hidden until card hover, disabled+visible when bookmarked with the same tooltip). `HistoryRow.tsx` deleted. Suspense wrap added at the route shell.
- [x] 3.3 Re-skinned `/following` user cards via CSS only — `.user-card` now uses `--light-color` surface, `--card-border-color`, `--card-shadow` + hover swap (matching `home-card`); name uses Crimson Pro / `--heading-text-color`, sub uses `--meta-text-color`. Grid `minmax` tuned to `140px` so mobile renders 2-up. Markup unchanged. Suspense wrap added at the route shell.
- [x] 3.4 Migrated literal theme values in `following-and-history.css` for the Stage 3 surfaces. Remaining literals (`.visibility-option` hover/active, `.history-clear-modal` scrim) are Stage 4 territory (visibility picker lives on the list edit form) or a single-use scrim with no existing token analog — left as-is per the spec's "pre-existing literals tolerated until that feature's stage" rule.
- [x] 3.5 Smoke-tested `/lists/bookmarks`, `/lists/history`, `/following` on desktop (1280×800) and mobile (375×812) via the auth-bypass preview. Cards render with the new tokens; bookmark indicator and disabled-X behavior confirmed on history; following shows 2-up on mobile. Console clean for the three Stage 3 routes (no more `cacheComponents` warnings). `/lists/[id]` still warns — Stage 4 territory. **Regression caught during user review:** `MainShell`'s `LIST_DETAILS_ROUTE` regex was matching `/lists/bookmarks` and `/lists/history` (negative lookahead only excluded `new`), applying the `container--list-details` variant which has zero horizontal padding. Cards were hugging the white-surface edge. Fixed by extending the lookahead to `(?!new$|bookmarks$|history$)`; verified `/lists/dev-list-viewer-housewarming` still gets the detail variant.

<!--
Scope expansion (Checkpoint 2 follow-up): the bookmarks/history pages felt
"stranded" because the global Lists pill highlights on them but clicking it
goes to a different page. Resolution: introduce a peer sub-nav across the
four list-collection surfaces (My Lists, Bookmarks, Recently visited,
Following), and narrow the global Lists pill so it does not lie about the
bookmarks/history pages. Plus a small same-shape regression fix on the
public-list cards on `/user/[id]` which now render as floating text because
`.profile-list-card` uses `--background-color` (≈white) on the new white
surface. Spec capture: `specs/list-collections/spec.md`.
-->

- [x] 3.6 Renamed the site-wide list card primitive. `HomeListCard` → `ListCard`, `HomeListRow` → `ListCardRow`, type `HomeListCardData` → `ListCardData`. Files moved from `app/(main)/lists/ui/components/` to `app/ui/components/` to reflect site-wide usage. Renamed all CSS classes in `following-and-history.css` (`.home-card*` → `.list-card*`, `.home-list-row*` → `.list-card-row*`). Updated every import and JSX reference: `HomePage` rails, `MyListsPage`, `BookmarksList`, `HistoryCard`, `RecentlyVisitedRail`. Verified in preview: home renders with 7 cards across 3 rails and zero residual `.home-card` selectors.
- [x] 3.7 Built `ListCollectionsNav` at `app/ui/components/ListCollectionsNav.tsx` (client component, reads `usePathname()` for the active tab). Renders four tab links — My Lists, Bookmarks, Recently visited, Following — plus a `children` slot on the right for per-page actions. CSS in `following-and-history.css`: Crimson Pro 300 tab labels matching the page-title visual register, `--meta-text-color` inactive / `--heading-text-color` active with a `--primary-color` underline. Tabs scroll horizontally on mobile (`overflow-x: auto`, scrollbar hidden) so "Following" stays reachable when all four don't fit.
- [x] 3.8 Replaced the per-page `<Header title>` on `MyListsPage`, `BookmarksPage`, `HistoryPage`, `FollowingPage` with `<ListCollectionsNav>`. Moved CTAs into the right-side slot: `+ New List` on My Lists, `Clear history` on Recently visited. Bookmarks and Following render the sub-nav with no right-side content. Verified the active tab serves as the page heading — no duplicate title.
- [x] 3.9 Narrowed `AppNav.isActive` so the **Lists** global nav pill does NOT match `/lists/bookmarks` or `/lists/history`. Implemented via a `LISTS_PEERS_EXCLUDED_FROM_ACTIVE` set checked before the prefix match. Verified in preview: zero global pills active on `/lists/bookmarks`, `/lists/history`, `/following`; Lists pill remains active on `/lists` and on `/lists/dev-list-viewer-housewarming`.
- [x] 3.10 Replaced `app/(main)/users/ui/components/PublicListCard.tsx` (now deleted) by switching `PublicListsGrid` to render `ListCard` directly with `showOwner={false}` and `.list-card-grid`. `getPublicListsByUser` already returned `subtitle`, `date`, `occasion`, and `user` (it's `db.query.lists.findMany` with a user join), so no DAL extension was needed. Pruned dead CSS (`.profile-list-grid`, `.profile-list-card`, `.profile-list-name`, `.profile-list-occasion`); kept `.profile-empty` re-tokened. Verified on `/u/dev-friend-alice`: visible cards with borders, occasion chip, date; no redundant "Alice Example" subtitle on every card.
- [x] 3.11 Smoke-tested on desktop (1280×800) and mobile (375×812). Tab strip renders correctly, active tab matches route on each of the four pages, peer-tab navigation works, right-side actions render and function. `/u/dev-friend-alice` shows the new card design. Global active-pill behavior verified: zero pills active on the three peer pages, Lists pill active on `/lists` and on list detail. Mobile: tabs scroll horizontally so all four remain reachable. Console clean on the Stage 3 routes (only remaining `cacheComponents` warning is on `/user/[id]` — Stage 7 territory).

### Checkpoint 3

- [x] 3.C1 User reviewed the three list-collection pages, the peer sub-nav across the four surfaces, the global-nav active-pill change, and the `/user/[id]` card re-skin. Stage 3 scope expanded mid-review to include: peer sub-nav (`list-collections` capability), `HomeListCard` → `ListCard` rename + move to `app/ui/components/`, `/u/[id]` → `/user/[id]` URL fix, bookmark-preserving remove-from-history (schema + action + UI), `MainShell` regex regression fix, and AppNav Suspense wrap silencing all `cacheComponents` warnings across `(main)/` routes.
- [x] 3.C2 Stage 4 (View / Browse — `/lists/[id]`, `/items`, `/items/[id]`, Purchase modal) decision: **proceed within this change**. Claude Design session already conducted in parallel during Stage 3 review. Stage 4 implementation begins in the next session.

## 4. Stage 4 — View / Browse (`/lists/[id]`, `/items`, Purchase modal)

<!--
`/items/[id]` was originally listed here; reassigned to Stage 5 because it's
the item edit form, not a card/view, and lands cleaner with the rest of the
create/edit forms.
-->


<!--
Splits the old Stage 4 ("list interior") and Stage 5 ("items library") by USER MODE
rather than URL prefix. This stage establishes the item card/row primitive in the
presence of both read contexts (inside a list AND in the library), so the primitive
is designed once against both, and downstream stages inherit it. Stage 5 (Create /
Manage) consumes this primitive and adds selection / form chrome on top.
-->

- [x] 4.0 Claude Design session conducted; handoff bundle (`List views designs-handoff.zip` → `List Views Design v2.html`) read and understood. Locked decisions: unified item card primitive (image 4:3, name, price, optional claim CTA, store labels + BuyLinks pills, optional purchased banner footer), gradient purple list-detail hero with title/owner/date/chip/claimed-count + Share/Follow/Bookmark actions, underline-tab Active/Archived on items library, search + sort + purchases + stores + price + grid/list view-toggle toolbar, pill-button pagination.
- [x] 4.1 Tasks reconciled: removed `/items/[id]` (moved to Stage 5 with the other forms) and renumbered 4.4→4.4 (Purchase modal), 4.5→4.5 (CSS migration), 4.6→4.6 (smoke test). User constraint folded in: **keep existing `.item-grid` column counts and breakpoints** (1/2/3/4/6 at 0/415/640/890/1300px container widths) so paginated pages never orphan rows.
- [x] 4.2 Re-skinned `/lists/[id]` (viewer view): purple gradient `.list-hero` with title, owner, date, occasion chip, and Share/Follow/Bookmark (or owner Manage actions). Owner sortable view deferred to Stage 5 (see 5.6). The 2-column sidebar layout from Stage 1 is gone — hero now spans the full surface above the toolbar + items grid.
- [x] 4.3 Re-skinned `/items` (library): underline Active/Archived tabs (new `.container--items-library` variant in MainShell.tsx), restyled toolbar (search + sort + purchases + stores + price + grid/list view toggle). Item cards consume the new shared primitive (Item.tsx → 4:3 image, name, price, claim CTA / purchased banner, store labels + buy-link pills). Grid columns kept at the existing 1/2/3/4/6 breakpoints per the user's pagination constraint.
- [x] 4.4 Re-skinned the Purchase modal (lighter dark-blur scrim, white card with 14px radius, retokenized guest-name input).
- [x] 4.5 Migrated `item.css`, `purchase.css`, `store-links.css`, `list.css`, and `modal.css` to consume tokens (`--card-border-color`, `--card-shadow*`, `--success-*`, `--buy-link-*`, `--hero-gradient`, `--light-color`, `--neutral-text-color`, `--muted-text-color`, `--secondary-background-color`). Added Stage 4 tokens to `global.css` (`--hero-gradient`, `--buy-link-bg/border/text/hover-*`, `--success-bg/border/text`).
- [x] 4.5a Added grid/list **view toggle** (URL `?view=list`) to `ItemsToolbar`/`ItemsBrowser`/`Items.tsx`. New `.item-list` row CSS in `item.css` reshapes the same Item card markup into a horizontal row (52px thumbnail + name/meta/buy-links + price + claim/edit actions). Mobile collapses to a tighter 48px thumbnail + 2-col layout.
- [x] 4.5b Architectural fix for header/toolbar staying visible during scroll. Replaced the original sticky-with-magic-numbers approach with a constrained-height flex-column on `.container--list-details`, `.container--items-library`, and the new `.container--list-collections` (`height: calc(100vh - var(--app-sticky-top)); overflow: hidden`). Inside, hero/header/tabs/toolbar/pagination are `flex-shrink: 0`; the inner grid (`.item-grid-container` / `.item-grid.sortable` / `.list-card-grid` / `.user-card-grid`) is `flex: 1; overflow-y: auto` and scrolls internally. Added `--app-nav-height`, `--app-surface-bleed-top`, `--app-sticky-top` tokens in `app-frame.css`. `MainShell.tsx` registers the new `list-collections` variant for `/lists`, `/lists/bookmarks`, `/lists/history`, `/following` so their peer tab strip stays at the top while only the card grid scrolls.
- [x] 4.6 Smoke-tested desktop (1400×900) and mobile (375×812) in the auth-bypass preview: home → list detail → claim CTA + purchase modal; items library grid + list view + pagination; sticky hero/header/tabs/toolbar; Active↔Archived tab switching; view-toggle URL persistence. All states render: claim CTA, "You claimed this — Undo", "Claimed by <name>", "Fully claimed" lock, and the purchased-banner footer. (Note: `/items/[id]` is the item edit form; deferred to Stage 5 with the other create/edit forms. Owner sortable view on `/lists/[id]` also deferred — see 5.6.)
- [x] 4.7 Store-links expand polish — widen the collapse boundary from the chip row to the item card. The Stage-4 multi-store row in [StoreLinks.tsx](app/(main)/items/ui/components/StoreLinks.tsx) attaches `onMouseLeave` (→ `scheduleCollapse`) and `onMouseEnter` (→ `cancelCollapse`) to the `.storeLinks` div itself, so once the user opens the row via `+N`, moving the cursor up to read the item name or sideways toward the photo crosses out of the small pill-row and triggers the 220ms collapse. The collapse should only fire when leaving the whole item card. Fix: in [Item.tsx](app/(main)/items/ui/components/Item.tsx) create a `useRef<HTMLDivElement>` on the `.item-container` element and pass it to `StoreLinks` as a new `collapseBoundaryRef` prop; in `StoreLinks.tsx` drop the `onMouseEnter`/`onMouseLeave` from the `.storeLinks` JSX and attach the listeners to the ref'd element via `useEffect` (cleanup on unmount). Keep the existing `onFocus`/`onBlur` on `.storeLinks` as-is — focus is a separate concern from pointer position and keyboard users have no card-hover affordance. Boundary is `.item-container` (not `.item`) so hovering the purchased banner still counts as "on this card". Sortable rows (`.sortable-item` where the inner `.item` is the row grid per 5.6) inherit the same behavior — verify the ref still resolves to the outer container in that layout. Touch devices unaffected (no hover); verify `+N` tap → tap-outside still collapses via the existing `onBlur` path.

### Checkpoint 4

- [x] 4.C1 User reviews the View / Browse surfaces and confirms the item primitive reads well in both contexts.
- [x] 4.C2 Decide on Stage 5 (Create / Manage — `/lists/new`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, item form, image-search modal). Claude Design session required, but smaller — the item primitive is locked.

## 5. Stage 5 — Create / Manage (`/lists/new`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, item form, image-search modal)

<!--
The item primitive is locked by Stage 4. This stage resolves form patterns
(list create/edit, item create/edit) and the selection chrome layered onto the
items picker for choose-items. Image-search modal lands here because it lives
inside the item form.
-->

- [x] 5.0 Claude Design session conducted; "Ctrl+List Flows" handoff received. Locked decisions: **list form = modal** (L1 "Simple": name, subtitle, occasion dropdown, date). **Item form = modal**, V2 split-pane on viewport >=900px (left pane purple-tinted live preview + selected-lists chips, right pane scrollable form) degrading to V1 sectioned single-column (DETAILS / IMAGE / STORES & PRICES / ORGANIZE) on narrower viewports. **Choose-items = full page** (not modal) — full toolbar (search + sort + store filter + show filter), store-link chips visible on each row, change-tracking banner ("N added · N removed · Undo all" in manage mode), sticky footer with selection count. **Footer convention everywhere:** `[Cancel] ········ [Delete] [Save]` — Cancel anchored bottom-left, Delete and Save paired bottom-right.
- [x] 5.1 Subtasks refined from the session output (5.2–5.8 below reflect handoff scope).
- [x] 5.2 Re-skin `app/(main)/lists/new/page.tsx` — consumes `ListForm`. The page route stays as a fallback for direct/deep links; primary entry is now a **local-state modal** from `MyListsPage` via `NewListButton` (matches the "+ New Item" pattern — no URL change, no parallel route). Replaces the previous session's `@modal/(.)lists/new` intercept (deleted).
- [x] 5.3 Re-skin `app/(main)/lists/[id]/edit/page.tsx` — same `ListForm`, edit mode. Primary entry is now `EditListButton` (local-state modal) used by both the `ListDetails` hero "Edit list" button and the `ListActionsMenu` "Edit list" item. Page route remains as a fallback. Replaces the previous session's `@modal/(.)lists/[id]/edit` intercept (deleted).
- [x] 5.4 Re-skin `app/(main)/lists/[id]/choose-items/page.tsx` — new `.choose-items-pg-hd` page header with serif Crimson Pro title, list name emphasized as italic `--primary-color` `<em>`, "← Back to list" link above the title, and a purple-outline `.choose-items-new-btn` ghost button on the right. Selection chrome (checkbox + "IN LIST" badge + change-tracking banner + sticky footer) preserved.
- [x] 5.5 Re-skin the item form and image-search modal components under `app/(main)/items/ui/components/itemform/` — V2 split-pane on desktop (`.form-shell-split-left` purple-tinted live preview + selected-lists chips; `.form-shell-split-right` scrollable sections), degrading to V1 sectioned (DETAILS / IMAGE / STORES & PRICES / ORGANIZE) below 900px. Includes `app/(main)/items/[id]/page.tsx` (item detail = item form in edit mode); intercepted via `@modal/(.)items/[id]` so card edit-pencils open as modals without leaving the list/items context. Direct URL renders the modal over the white surface.
- [x] 5.6 Pulled forward into Stage 4 after the list-collections sticky fix landed: rewrote `.sortable-item` CSS in `app/(main)/items/ui/styles/item.css` so the inner `.item` element becomes the row grid (100px image + 1fr info) instead of the outer `.item-container` (which doesn't have the image as a direct child). The `.sortable-item` row is now ~103px tall with thumbnail + name/store + price/buy-links + edit-overlay actions reading cleanly. Drag-and-drop handle behavior + the constrained-height grid scroll (set in `.container--list-details > .item-grid.sortable`) preserved.
- [x] 5.7 Migrated remaining list/item form styles to consume tokens via the shared `app/ui/styles/form-shell.css` (overlay scrim, modal card, header/body/footer, `.if-input`, `.if-store-row` grid, `.if-prev-full` preview card, `.if-lp` list picker, `.form-shell-split-*` for V2). `list.css` adds the `.choose-items-*` page-header, change-tracking banner, row, sticky-footer rules — all consuming `--primary-color`, `--card-accent-background-color`, `--divider-color`, `--neutral-text-color`, `--muted-text-color`.
- [x] 5.8 Smoke-tested the manage flow end to end at 1400×900 and 375×812 via the auth-bypass preview: `/lists` → `+ New List` (local-state modal opens, URL stays `/lists`) → `Edit list` on `/lists/[id]` hero (local-state modal opens, URL stays at the list) → `Choose Items` page (new header treatment renders correctly, sticky footer + change-tracking banner work) → `Create new item` from inside choose-items (item form V2 split-pane opens). Edit Item from `/items` cards still uses the surviving `@modal/(.)items/[id]` intercept (URL changes to `/items/[id]` but modal renders) — intentional, gives shareable edit URLs.
- [ ] 5.9 Choose-items footer polish — eliminate layout shift on first selection. The conditional `.choose-items-changes-bar` (rendered when `mode === 'manage' && hasChanges`) inserts a ~50px element above the items list at the 0→1 changes boundary, shifting the row the user just tapped out from under their finger. Fold the change summary (`+A added · −R removed · Undo all`) into the existing sticky footer's count slot so it shares the always-present footer real estate; the count slot already lives there, so the bar simply disappears. Diff summary visible on ≥600px only; below that, footer keeps just `N selected` + buttons (per-row strikethrough / "In list" badge already conveys state on mobile, and any change can be reverted by retapping the row). Remove the `.choose-items-changes-bar` JSX block and CSS rule. **Also drop the manage-mode `Done →` label morph:** the primary footer button now reads `Save changes →` in both manage states, disabled when `!hasChanges`. Eliminates the prior "Done + disabled" contradiction (label said "you're finished, leave" while the button refused taps) and the two-label morph that read like a state-machine glitch. Cancel button remains as the exit when there's nothing to save. Create mode ("Add N items" / "Skip for now") unchanged.

## 5b. Stage 5b — Mobile rescue for `/items` and `/lists/[id]` (D9)

<!--
Stage-4 user testing on iPhone (393px) found the items library and list-detail
views unusable: the new ItemsToolbar adds ~170px of vertical chrome and the
item-grid 1→2 column container-query threshold (415px) sits wider than every
iPhone, so items render single-column. Both fixes from design D9 are scoped
here. List-hero compression on /lists/[id] is intentionally out of scope —
follow-up.
-->

- [x] 5b.1 Lowered the `.item-grid` 1→2 column container-query threshold in [app/(main)/items/ui/styles/item.css:15](app/(main)/items/ui/styles/item.css:15). **Spec deviation:** dropped to `300px` (not 340px). The design.md D9 math overlooked the `.app-surface-bleed` mobile padding (~12px each side); at 375px viewport the inner `.item-grid-container` measures ~311px, below the 340 threshold. 300 lets every iPhone-class device flip to 2-col (verified 311→2-col at 375px, 329→2-col at 393px). Smallest 2-col cell is ~148px — Item primitive still renders cleanly (4:3 image, name, price, store-label pills). 640/890/1300 thresholds unchanged.
- [x] 5b.2 Added a mobile filter-sheet to [ItemsToolbar.tsx](app/(main)/items/ui/components/ItemsToolbar.tsx). Mobile (<550px) row collapses to `[ 🔍 Search ] [ ⚙ Filters ] [ view-toggle ]`. The four filter controls (Sort, Purchases/Show, Stores, Price) live inside a `.items-toolbar-filters-group` wrapper that uses `display: contents` on desktop (so children participate in the parent grid via their existing `grid-area` declarations) and transforms into a fixed bottom sheet (with scrim + Done button + close X) at `<550px`. Existing `<select>` and `StoreFilterPopover`/`PriceFilterPopover` components are relocated, not rewritten. Filters button shows a badge with the count of active non-default filters. Bottom sheet composes with the constrained-height flex-column from 4.5b — the sheet is `position: fixed` so it sits above the scroll container without affecting it.
- [x] 5b.3 Active non-default filters render as a dismissable chip row beneath the toolbar (e.g. `[Newest ×] [Etsy ×] [$10–50 ×]`). Tapping a chip clears that single filter. Chip row is hidden when all controls are at defaults. Sort chip renders only when `sort ≠ defaultSort` (per-mode). Purchases chip only when `≠ 'hide'`. Show chip (choose mode) only when `≠ 'all'`. One chip per selected store; one chip for the price range (formatted `$min–$max`, `$min+`, or `Up to $max`).
- [x] 5b.4 Updated the toolbar CSS grid in [item.css](app/(main)/items/ui/styles/item.css) — the `<550px` `grid-template-areas` now collapses to a single row `'search filters view'`. Added `.items-toolbar-cell--filters` grid area and `.items-toolbar-filters-trigger` button styling (mobile-only). 900px medium breakpoint and desktop (>900px) single-row layout unchanged.
- [x] 5b.5 Smoke-tested via auth-bypass preview:
  - 2-col grid renders at 375×812 (cells 148.5px) and 393×852 (cells 157.5px) ✓
  - Filters button opens the bottom sheet; all four controls present and functional; X / Done / scrim all dismiss the sheet ✓
  - Active chips: verified "Oldest ×" chip after changing sort via the sheet; filterCount badge increments correctly ✓
  - View-toggle and search-clear still reachable in the single-row layout ✓
  - Sortable view on `/lists/[id]` (owner) unaffected — `.item-grid.sortable { grid-template-columns: 1fr; }` overrides the container-query rule. Confirmed visually on `/lists/dev-list-viewer-spring-garden` (1-col sortable rows preserved at 393px).
  - Desktop (995px) verified unchanged: filters trigger `display: none`, all filter cells inline in the original `'search sort purchases stores price view'` grid.
  - Console clean on `/items` and `/lists/[id]` viewer view on mobile.
- [x] 5b.6 `/lists/[id]/choose-items` verified end-to-end against the in-flight Stage-5 working-tree changes (uncommitted modifications to `ChooseItemsForm.tsx` already in the local tree). At 393px on `/lists/dev-list-viewer-birthday/choose-items`:
  - Toolbar collapses to single row `[Search][Filters][view-toggle]` ✓
  - Filters sheet opens; renders the choose-mode-specific "Show: All" filter (correctly switched from the items-mode "Purchases: Hide") + Sort + Stores + Price + Done ✓
  - Sticky footer (`.choose-items-sticky-ft`, position: fixed, bottom: 0) is properly occluded by the sheet's higher z-index (60 vs the footer's stacking) — sheet sits above the page chrome until dismissed ✓
  - Console clean throughout. Stage-5's in-flight rewrite renders choose-items in list-view (rows with checkboxes), so there's no `.item-grid` to test the 2-col threshold on this page — that's by design for choose-items.

### Checkpoint 5b

- [ ] 5b.C1 User reviews `/items` and `/lists/[id]` on iPhone at typical widths (375/390/393/430). Confirms (a) 2-col grid restores production-equivalent item density and (b) filter sheet + active chips deliver all the filtering capability without the 3-row toolbar overhead. Sign off before moving to Stage 6.

## 6. Stage 6 — Purchased (`/purchased`)

- [x] 6.0 Reuses the items-library pattern: `/purchased` now resolves to `container--items-library` via [MainShell.tsx](app/(main)/MainShell.tsx). The existing `<Items />` component (already re-skinned in Stage 4) renders the purchased items in the new card primitive.
- [x] 6.1 Re-skinned [purchased/page.tsx](app/(main)/purchased/page.tsx): replaced the outer `<div>` wrapper with a fragment so children (`<Header />`, `<Items />`) become direct children of the MainShell container. This lets the constrained-height flex column reach the item grid and engage the internal scroll boundary.
- [x] 6.2 No new CSS needed — `/purchased` consumes the same `.container--items-library`, `.item-grid`, `.item-container` rules from `item.css` already migrated to tokens in Stage 4.
- [x] 6.3 Smoke-tested at 1280×800 (4-col grid) and 393×852 (2-col grid, cells 157.5px). Header sticky at top, item grid scrolls internally, purchased-banner footer + claim-related state read correctly on each card. Console clean. Active nav pill switches to "Purchased".

## 7. Stage 7 — Settings + Profile (`/settings/connections`)

- [x] 7.0 Reused simple primitives — no separate design session needed. Section headers mirror the home rail visual register; rows mirror the list-view item-row treatment.
- [x] 7.1 Re-skinned [ConnectionsPage.tsx](app/(main)/settings/connections/ConnectionsPage.tsx) and the connections CSS in [following-and-history.css](app/(main)/lists/ui/styles/following-and-history.css):
  - Section headers (`Following (N)`, `Followers (N)`, `Blocked (N)`) now use `var(--font-crimson-pro)` weight 300 / `--heading-text-color` matching home rail header register.
  - Rows shed the card-background look (`background-color: var(--background-color); border-radius: 6px`) and now look like list-view item rows: full-width, 1px bottom border per row (`--card-border-color`), hover background (`--card-hover-background-color`), no row gap, last-child loses its border.
  - Sections separated by 1px `.home-rail-divider` (same primitive as home digest).
  - Name link uses `--heading-text-color` w/ `--primary-color` hover; "since X" subline uses `--meta-text-color`.
- [x] 7.2 CSS migrated to tokens in the same block — only the connections rules in `following-and-history.css` touched (single source of truth for the page).
- [x] 7.3 Smoke-tested at 1280×800 and 393×852 in the auth-bypass preview: Following/Followers/Blocked sections render with the new section headers, row dividers, action buttons (Unfollow / Remove / Block / Unblock). Mobile layout reads cleanly. Console clean. Follow/unfollow/block click flows not exhaustively exercised (would mutate seed state) — the existing `btn secondary` styling and `ConnectionsAction` client component were not touched, so behavior is unchanged.

## 8. Stage 8 — Auth pages (`(auth)/`)

- [x] 8.0 Auth pages included — minimal re-skin to align with the new surface visual.
- [x] 8.1 Re-skinned [SignInPage.tsx](app/(auth)/ui/components/SignInPage.tsx) via the shared `.auth-container` rule. Auth pages still do NOT inherit the `(main)/` frame — they're a fullscreen overlay with the same `--page-frame-gradient` background as the main app's `body::before`, so the visual register is consistent on sign-in.
- [x] 8.2 Migrated [auth.css](app/(auth)/ui/styles/auth.css) to tokens:
  - `.sign-in-page` background: ad-hoc `linear-gradient(...primary, secondary)` → `var(--page-frame-gradient)` (matches the main app body gradient).
  - `.auth-container`: `--background-color` → `--light-color`, `border-radius: 8px` → `14px`, ad-hoc `box-shadow: 10px 10px 15px rgba(0,0,0,0.4)` → `var(--surface-shadow)` (matches the main app's `.app-surface` card).
  - `--third-background-color` (avatar-popover borders + dividers) → `--card-border-color`.
  - All `--background-color` references in the file → `--light-color`.
- [x] 8.3 Sign-in-with-Google button styling untouched — `SignInButton.tsx` and any Google brand button CSS were not modified. Per the user's note about strict Google brand guidelines, the button retains its existing classes and visual treatment.
- [ ] 8.4 **Verification gap:** the auth-bypass session redirects `/sign-in` → `/` for the seeded `dev-test-viewer`, so live preview verification of the sign-in card was not possible without disabling the bypass. CSS changes are pure token swaps with valid existing tokens; no preview-visible regression expected. User to verify by disabling `AUTH_BYPASS` and visiting `/sign-in`.

### Checkpoint 8 (final)

- [ ] 8.C1 User reviews the auth pages (if included) and signs off on the site-wide revamp.
- [ ] 8.C2 Run a final visual smoke pass on every `(main)/` route to verify no late regression.
- [ ] 8.C3 Confirm `add-following-and-history` is archived (this change depended on its post-archive baseline).
- [ ] 8.C4 Mark this change ready to archive: `openspec validate redesign-home-and-tokens` passes, every stage's tasks complete or explicitly deferred.
