## ADDED Requirements

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
