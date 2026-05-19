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

- [ ] 1b.C1 User reviews all four rails with >5 items each. Confirms tile visual fits the card rhythm, count is correct, and tap/click navigation works on desktop + mobile.

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

- [ ] 5.0 **Open Claude Design session** for the Create / Manage surfaces. Cover: list form (name, subtitle, visibility — used by both `new` and `edit`), item form (create/edit, used from the items library and inline from choose-items), image-search modal, and the selection chrome that turns the items library into the `/lists/[id]/choose-items` picker. Save the handoff bundle.
- [ ] 5.1 Refine tasks 5.2+ from the session output.
- [ ] 5.2 Re-skin `app/(main)/lists/new/page.tsx` (consumes the resolved list form).
- [ ] 5.3 Re-skin `app/(main)/lists/[id]/edit/page.tsx` (same form, edit mode).
- [ ] 5.4 Re-skin `app/(main)/lists/[id]/choose-items/page.tsx` and the selection chrome layered onto the item primitive.
- [ ] 5.5 Re-skin the item form and image-search modal components under `app/(main)/items/ui/components/itemform/`. Includes `app/(main)/items/[id]/page.tsx` (item detail = the same item form in edit mode; moved here from Stage 4 after recognizing it's a form, not a card view).
- [x] 5.6 Pulled forward into Stage 4 after the list-collections sticky fix landed: rewrote `.sortable-item` CSS in `app/(main)/items/ui/styles/item.css` so the inner `.item` element becomes the row grid (100px image + 1fr info) instead of the outer `.item-container` (which doesn't have the image as a direct child). The `.sortable-item` row is now ~103px tall with thumbnail + name/store + price/buy-links + edit-overlay actions reading cleanly. Drag-and-drop handle behavior + the constrained-height grid scroll (set in `.container--list-details > .item-grid.sortable`) preserved.
- [ ] 5.7 Migrate any remaining `app/(main)/items/ui/styles/*.css` and list-form styles to consume tokens.
- [ ] 5.8 Smoke-test the manage flow end to end on desktop and mobile: create list → edit list metadata → choose items (with create-item-inline) → image search → save → drag-reorder.

## 6. Stage 6 — Purchased (`/purchased`)

- [ ] 6.0 reuse list-collection / items-library pattern directly.
- [ ] 6.1 Re-skin `app/(main)/purchased/page.tsx`.
- [ ] 6.2 Migrate any related CSS to consume tokens.
- [ ] 6.3 Smoke-test the purchased flow end to end.

## 7. Stage 7 — Settings + Profile (`/settings/connections`)

- [ ] 7.0 Decide whether `/settings/connections` needs a separate session or can reuse simple form/list primitives.
- [ ] 7.1 Re-skin `app/(main)/settings/connections/page.tsx` to use collasiple tab headers that the home page uses. Format rows more similar to list/items list style row with dividers.
- [ ] 7.2 Migrate the related CSS files to tokens.
- [ ] 7.3 Smoke-test follow/unfollow/block flows from the profile page; smoke-test settings.

## 8. Stage 8 — Auth pages (`(auth)/`)

- [ ] 8.0 include auth pages in this change
- [ ] 8.1 (Conditional on 8.0.) Re-skin `app/(auth)/page.tsx` (and any sibling auth routes) consuming the new tokens where they fit. Auth pages do NOT inherit the `(main)/` frame.
- [ ] 8.2 (Conditional.) Migrate `app/(auth)/ui/styles/auth.css` to tokens.
- [ ] 8.3 ensure that the sign in with google button styling is unchanged as there are strict guidelines for how these buttons much look.

### Checkpoint 8 (final)

- [ ] 8.C1 User reviews the auth pages (if included) and signs off on the site-wide revamp.
- [ ] 8.C2 Run a final visual smoke pass on every `(main)/` route to verify no late regression.
- [ ] 8.C3 Confirm `add-following-and-history` is archived (this change depended on its post-archive baseline).
- [ ] 8.C4 Mark this change ready to archive: `openspec validate redesign-home-and-tokens` passes, every stage's tasks complete or explicitly deferred.
