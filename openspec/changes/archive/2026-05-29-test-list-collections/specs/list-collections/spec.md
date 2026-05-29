## ADDED Requirements

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
