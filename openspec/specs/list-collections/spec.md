# list-collections Specification

## Purpose

TBD - created by archiving change redesign-home-and-tokens. Update Purpose after archive.

## Requirements

### Requirement: List-collection pages SHALL form a known peer group

The following four routes SHALL be treated as a peer group of "list-collection" pages, each rendering a single way of seeing lists or list-owning users related to the viewer:

- `/lists` — My Lists (owned lists)
- `/lists/bookmarks` — Bookmarked lists (saved from other users)
- `/lists/history` — Recently visited lists
- `/following` — Followed users (each links into that user's lists)

These four SHALL share a peer sub-nav (see next requirement) so a viewer on any one of them can navigate directly to any peer without traversing back through Home or the global nav.

#### Scenario: All four peers reachable from any one of them

- **WHEN** the viewer is on any of `/lists`, `/lists/bookmarks`, `/lists/history`, or `/following`
- **THEN** the page renders a sub-nav containing links to the other three peers

#### Scenario: Pages outside the peer group do not render the sub-nav

- **WHEN** the viewer is on any other `(main)/` route (e.g. `/`, `/lists/[id]`, `/items`, `/u/[id]`, `/settings/connections`)
- **THEN** the page SHALL NOT render the list-collection sub-nav

### Requirement: Sub-nav SHALL render as a tab strip with the active peer marked

The sub-nav SHALL render as a horizontal strip of tab-style links, one per peer page. The link matching the current route SHALL render in an "active" visual state (filled or underlined) and the other three SHALL render in an "inactive" visual state. The active tab SHALL serve as the page heading for that surface; pages in this group SHALL NOT render a separate `<Header title>` duplicating the tab label.

#### Scenario: Active tab matches current route

- **WHEN** the viewer is on `/lists/bookmarks`
- **THEN** the "Bookmarks" tab renders active and the "My Lists", "Recently visited", and "Following" tabs render inactive

#### Scenario: Tab label is the page title

- **WHEN** any peer page renders
- **THEN** the active tab visually serves as the page heading; no separate large title text appears above or below the tabs duplicating the tab label

#### Scenario: Inactive tabs are links

- **WHEN** the viewer clicks an inactive tab
- **THEN** the browser navigates to that peer's route

### Requirement: Sub-nav SHALL host page-level primary actions on its right side

Per-page primary actions (e.g. "+ New List" on My Lists, "Clear history" on Recently visited) SHALL render on the right side of the sub-nav strip, aligned with the tabs. This replaces the action slot the per-page `<Header>` previously provided on these surfaces.

#### Scenario: My Lists shows New List CTA on the sub-nav

- **WHEN** the viewer is on `/lists`
- **THEN** a "+ New List" button renders on the right side of the sub-nav strip linking to `/lists/new`

#### Scenario: Recently visited shows Clear history CTA when history is non-empty

- **WHEN** the viewer is on `/lists/history` and has at least one history row
- **THEN** a "Clear history" button renders on the right side of the sub-nav strip

#### Scenario: Pages without per-page actions render no right-side content

- **WHEN** the viewer is on `/lists/bookmarks` or `/following`
- **THEN** the right side of the sub-nav strip is empty (or omitted entirely; only the tab links render)

### Requirement: Global nav active-state SHALL not lie about list-collection pages

When the viewer is on `/lists/bookmarks`, `/lists/history`, or `/following`, the global app-nav (Home / Lists / Items / Purchased) SHALL NOT render any pill in an active state. The peer sub-nav on the page is the canonical "where am I" signal for these surfaces; the global nav SHALL only highlight when the viewer is at `/`, `/lists` (including `/lists/[id]`, `/lists/new`), `/items`, or `/purchased`.

#### Scenario: No global pill active on Bookmarks

- **WHEN** the viewer is on `/lists/bookmarks`
- **THEN** none of the four global nav pills (Home, Lists, Items, Purchased) render in an active state; the Bookmarks tab in the sub-nav is the only active indicator

#### Scenario: No global pill active on Recently visited

- **WHEN** the viewer is on `/lists/history`
- **THEN** none of the four global nav pills render in an active state

#### Scenario: Lists pill still active on My Lists itself and on list detail

- **WHEN** the viewer is on `/lists`, `/lists/new`, or `/lists/[id]`
- **THEN** the "Lists" global nav pill renders active (the sub-nav also shows "My Lists" as the active tab on `/lists`; list detail and new-list pages do not render a sub-nav)

### Requirement: ListCard SHALL link to its list detail and render name, occasion, and a UTC-stable date

The `ListCard` component at `app/ui/components/ListCard.tsx` SHALL render as a single link (`<a class="list-card">`) whose `href` is `/lists/${list.id}`. The list name SHALL render inside `<span class="list-card-name-text">` carrying a `title` attribute equal to the full name (so a truncated name surfaces its full value as a native tooltip). The occasion SHALL render inside `<span class="list-card-occasion">`. The date SHALL render inside `<span class="list-card-date">` formatted via `toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' })` — the `timeZone: 'UTC'` option SHALL be present so the displayed calendar day does not drift by the runner's or viewer's local time zone. When `list.subtitle` is a non-empty value, `<div class="list-card-subtitle">` SHALL render with that text and the placeholder SHALL NOT render. When `list.subtitle` is absent (null / undefined / empty), `<div class="list-card-subtitle-placeholder" aria-hidden>` SHALL render in its place and `.list-card-subtitle` SHALL NOT render — the placeholder preserves uniform card height across a row of cards with mixed subtitle presence.

#### Scenario: Card links to its list detail

- **WHEN** `ListCard` renders for a list with id `abc123`
- **THEN** the rendered root is an `<a class="list-card">` with `href="/lists/abc123"`

#### Scenario: Name carries a title attribute

- **WHEN** `ListCard` renders for a list named `"Birthday Wishlist"`
- **THEN** `<span class="list-card-name-text">` contains the text `Birthday Wishlist`
- **AND** its `title` attribute equals `Birthday Wishlist`

#### Scenario: Date renders in the UTC time zone

- **WHEN** `ListCard` renders for a list whose `date` is the instant `2025-01-01T00:30:00Z` (a moment that falls on the previous calendar day in time zones west of UTC)
- **THEN** `<span class="list-card-date">` renders the UTC calendar day (`Jan 01, 2025`), not the local-time day
- **AND** the rendered string is independent of the runner's local time zone

#### Scenario: Subtitle present renders the subtitle, not the placeholder

- **WHEN** `ListCard` renders for a list whose `subtitle` is `"For the whole family"`
- **THEN** `<div class="list-card-subtitle">` renders containing that text
- **AND** no `.list-card-subtitle-placeholder` element renders

#### Scenario: Subtitle absent renders the aria-hidden placeholder

- **WHEN** `ListCard` renders for a list whose `subtitle` is null or undefined
- **THEN** `<div class="list-card-subtitle-placeholder" aria-hidden>` renders
- **AND** no `.list-card-subtitle` element renders

### Requirement: ListCard SHALL render the bookmark indicator and owner byline conditionally

The `ListCard` component SHALL render the bookmark indicator `<FaBookmark class="list-card-bookmark-indicator" aria-label="Bookmarked">` inside `.list-card-name` ONLY when its `bookmarked` prop is true; when `bookmarked` is false (the default), no element with the accessible name `"Bookmarked"` SHALL render. The owner byline `<div class="list-card-byline">` (containing an `aria-hidden` `<FaUser>` icon followed by the owner name) SHALL render ONLY when `showOwner` is true AND `list.user?.name` is a non-empty value. When `showOwner` is false (the default), or when `list.user` is null, or when `list.user.name` is null, no byline SHALL render. Because the `<FaUser>` icon is `aria-hidden`, the byline's accessible content SHALL be the owner name text alone.

#### Scenario: Bookmarked card shows the labeled indicator

- **WHEN** `ListCard` renders with `bookmarked` true
- **THEN** an element with `aria-label="Bookmarked"` (the `.list-card-bookmark-indicator`) renders inside `.list-card-name`

#### Scenario: Unbookmarked card shows no indicator

- **WHEN** `ListCard` renders with `bookmarked` false or omitted
- **THEN** no element with the accessible name `"Bookmarked"` renders

#### Scenario: Owner byline renders only when showOwner and a name are both present

- **WHEN** `ListCard` renders with `showOwner` true and `list.user.name` set to `"Alice"`
- **THEN** `<div class="list-card-byline">` renders containing the text `Alice`

#### Scenario: No byline when showOwner is false

- **WHEN** `ListCard` renders with `showOwner` false (or omitted) even though `list.user.name` is `"Alice"`
- **THEN** no `.list-card-byline` element renders

#### Scenario: No byline when the owner name is missing

- **WHEN** `ListCard` renders with `showOwner` true but `list.user` is null (or `list.user.name` is null)
- **THEN** no `.list-card-byline` element renders

### Requirement: ListCardRow SHALL render an empty state and a "+N more" affordance only when both a count and a see-all href are provided

The `ListCardRow` component at `app/ui/components/ListCardRow.tsx` SHALL render `<div class="list-card-row-empty">` containing the `emptyMessage` node when `lists` is empty, and SHALL NOT render the `role="list"` container in that case. When `lists` is non-empty, it SHALL render `<div class="list-card-row" role="list">` with one `<div class="list-card-row-item" role="listitem">` per list, in order, each wrapping a `ListCard` to which `showOwner` and `bookmarked` (computed as `bookmarkedIds?.has(list.id) ?? false`) are threaded. A trailing "+N more" affordance (`MoreCard`) SHALL render ONLY when BOTH `moreCount > 0` AND `seeAllHref` is a non-empty value; if either condition is false, no `MoreCard` SHALL render. When it renders, the `MoreCard` SHALL be the last `.list-card-row-item`. The `MoreCard` component at `app/ui/components/MoreCard.tsx` SHALL render `<a class="more-card">` with `aria-label="${moreCount} more — see all"` and a visible label `+{moreCount} more →` in which the `→` glyph is wrapped in an `aria-hidden="true"` span, so the affordance's accessible name is the count-and-intent phrase, not the decorative arrow.

#### Scenario: Empty list renders the empty-state message

- **WHEN** `ListCardRow` renders with an empty `lists` array and an `emptyMessage` of `"No lists yet"`
- **THEN** `<div class="list-card-row-empty">` renders containing `No lists yet`
- **AND** no `[role="list"]` container renders

#### Scenario: Non-empty list renders list/listitem semantics

- **WHEN** `ListCardRow` renders with three lists
- **THEN** `<div class="list-card-row" role="list">` renders with three `<div class="list-card-row-item" role="listitem">` children, in source order, each wrapping a `.list-card`

#### Scenario: bookmarkedIds threads through per card

- **WHEN** `ListCardRow` renders two lists and `bookmarkedIds` contains only the first list's id
- **THEN** the first card renders the `aria-label="Bookmarked"` indicator
- **AND** the second card does not

#### Scenario: More affordance requires both a positive count and an href

- **WHEN** `ListCardRow` renders with `moreCount` 4 and a `seeAllHref` of `/lists`
- **THEN** a trailing `MoreCard` renders as the last `.list-card-row-item`
- **AND WHEN** `moreCount` is 0, OR `seeAllHref` is omitted
- **THEN** no `MoreCard` renders

#### Scenario: MoreCard exposes an accessible name and hides the arrow

- **WHEN** `MoreCard` renders with `moreCount` 4 and `href` `/lists`
- **THEN** the rendered root is `<a class="more-card" href="/lists">` with `aria-label="4 more — see all"`
- **AND** the visible text is `+4 more →` with the `→` glyph inside an `aria-hidden="true"` span
