## ADDED Requirements

### Requirement: The list-detail hero SHALL be collapsible via an explicit toggle

The list-detail hero at `/lists/[id]` SHALL render a single user-controlled toggle that switches the hero between an **expanded** state (the full composition defined by the `list-hero-header` capability) and a **collapsed** state (a single-line strip showing only the list title and the `ListActionsMenu` kebab). The toggle SHALL render at all viewport widths — there SHALL NOT be a breakpoint above which the toggle is suppressed.

The toggle SHALL be a button with `aria-expanded` reflecting the current state, an accessible name of "Collapse list info" when the hero is expanded and "Expand list info" when collapsed, and a hit target satisfying WCAG 2.5.5 (≥44×44 CSS px). Its visible affordance is a chevron icon (matching the iconography used by the `CollapsibleRail` component on the home page for consistency).

#### Scenario: Owner expanded → collapsed → expanded
- **GIVEN** an authenticated list owner viewing `/lists/[id]` with no `hero` URL param
- **WHEN** the page first renders
- **THEN** the hero SHALL render in the expanded state per the `list-hero-header` capability
- **AND** the collapse toggle SHALL render with `aria-expanded="true"` and the accessible name "Collapse list info"
- **WHEN** the user activates the toggle
- **THEN** the hero SHALL render in the collapsed state (title + kebab only)
- **AND** the toggle's `aria-expanded` SHALL update to `"false"` and its accessible name to "Expand list info"
- **WHEN** the user activates the toggle again
- **THEN** the hero SHALL return to the expanded state with `aria-expanded="true"`

#### Scenario: Viewer expanded → collapsed
- **GIVEN** an authenticated non-owner viewing a `'public'` or `'unlisted'` list at `/lists/[id]`
- **WHEN** the user activates the collapse toggle
- **THEN** the hero SHALL render in the collapsed state (title + kebab only)
- **AND** the byline sub-row containing avatar, linked owner name, and Follow button SHALL no longer render on the hero surface

#### Scenario: Toggle renders at all widths
- **GIVEN** a list page rendered at any viewport width (verified at 390px, 800px, 1024px, 1440px)
- **WHEN** the hero is in either state
- **THEN** the collapse toggle SHALL be visible and operable
- **AND** there SHALL NOT be a viewport-width breakpoint at which the toggle is `display: none` or otherwise removed from the DOM

### Requirement: The collapsed hero SHALL render only the title and kebab inside the hero gradient panel

When the hero is in the collapsed state, the surface SHALL render only two elements: the list title (leading edge) and the `ListActionsMenu` kebab (trailing edge). All other hero content — eyebrow, subtitle, visibility status pill, footer line, byline sub-row, primary action buttons, secondary action buttons — SHALL NOT render in the collapsed state.

The collapsed strip SHALL render inside the SAME gradient panel (`.list-hero-grid`) used by the expanded hero, preserving the brand-gradient continuity established by the `list-hero-header` capability. The panel's border-radius and outer dimensions SHALL be preserved; only the interior height and padding change.

#### Scenario: Collapsed strip content for owner
- **GIVEN** an authenticated list owner viewing `/lists/[id]`
- **WHEN** the hero is collapsed
- **THEN** the visible hero content SHALL be exactly: the list title and the `ListActionsMenu` kebab
- **AND** the visibility status pill SHALL NOT render
- **AND** the eyebrow (occasion label) SHALL NOT render
- **AND** the subtitle SHALL NOT render
- **AND** the footer line ("N items · updated X ago") SHALL NOT render
- **AND** the Share, Choose items, and Edit buttons SHALL NOT render as first-class affordances

#### Scenario: Collapsed strip content for viewer
- **GIVEN** an authenticated non-owner viewing `/lists/[id]` for a `'public'` or `'unlisted'` list
- **WHEN** the hero is collapsed
- **THEN** the visible hero content SHALL be exactly: the list title and the `ListActionsMenu` kebab
- **AND** the byline sub-row (avatar + linked owner name + Follow button) SHALL NOT render
- **AND** the Share and Bookmark buttons SHALL NOT render as first-class affordances

#### Scenario: Gradient panel continuity preserved on collapse
- **GIVEN** the hero is collapsed
- **WHEN** the strip renders
- **THEN** it SHALL render inside the existing `.list-hero-grid` element with its existing gradient background and border-radius
- **AND** the strip SHALL NOT render as a separate panel with its own background

### Requirement: `ListActionsMenu` SHALL contextually expand its item set when the hero is collapsed

The `ListActionsMenu` component SHALL accept a `heroCollapsed` boolean prop (default `false`). When `heroCollapsed` is `true`, the menu SHALL prepend additional `<MenuItem>` rows that mirror the actions normally rendered as first-class affordances in the expanded hero, then render its existing item set unchanged. When `heroCollapsed` is `false` or omitted, the menu SHALL render only its existing item set.

For **owners**, the prepended items SHALL include: Share, Choose items, Edit, and Visibility (a `<MenuItem>` labeled with the current visibility state, which on activation SHALL open the same `<VisibilityPicker>` UI used by the expanded state — preserving the Private/Shared two-state toggle + feed checkbox composition required by the `list-visibility` capability).

For **viewers** (non-owner, authenticated, non-preview), the prepended items SHALL include: Share, Bookmark, and Follow / Following (a `<MenuItem>` whose label and action reflect the current follow state per the `following` capability).

The contextual prepended items SHALL invoke the same actions as their expanded counterparts — i.e., the Share `<MenuItem>` SHALL produce the same outcome as the expanded `<ShareButton>`, the Bookmark `<MenuItem>` SHALL produce the same outcome as the expanded `<BookmarkContainer>`, etc.

#### Scenario: Owner kebab in collapsed mode
- **GIVEN** an authenticated list owner viewing `/lists/[id]` with the hero collapsed
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain (in order): Share, Choose items, Edit, Visibility (current state), and the existing items (Spoilers toggle, Preview/Exit preview, Delete)

#### Scenario: Viewer kebab in collapsed mode
- **GIVEN** an authenticated non-owner viewing `/lists/[id]` with the hero collapsed
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain (in order): Share, Bookmark, Follow (or Following), and any existing viewer-applicable items (e.g., Spoilers toggle if reveal is permitted)

#### Scenario: Owner kebab in expanded mode unchanged
- **GIVEN** an authenticated list owner viewing `/lists/[id]` with the hero expanded
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain only its pre-existing items (Spoilers toggle, Preview, Delete) — no Share, no Choose items, no Edit, no Visibility row

#### Scenario: Visibility item in collapsed owner kebab opens the existing picker
- **GIVEN** an authenticated owner with the hero collapsed and the kebab open
- **WHEN** the user activates the Visibility `<MenuItem>`
- **THEN** the `<VisibilityPicker>` UI SHALL open
- **AND** it SHALL present the Private/Shared two-state toggle and the "Show in followers' feed" checkbox per the `list-visibility` capability
- **AND** selecting a value SHALL invoke `setListVisibility(id, visibility)` exactly as it would from the expanded-mode picker

### Requirement: Collapse state SHALL be reflected in the URL via a `hero` search param

The collapsed state SHALL be expressed in the URL as the search param `?hero=closed`. The expanded state SHALL be expressed by the *absence* of the `hero` param. The string `?hero=open` SHALL NOT be used — the open state is signaled exclusively by the param's absence.

The initial render of `/lists/[id]` SHALL derive the hero's state from the URL: if `searchParams.hero === 'closed'`, render collapsed; otherwise render expanded.

When the user activates the toggle, the component SHALL update the URL to reflect the new state. Adding `?hero=closed` (on collapse) or removing the `hero` param (on expand) SHALL be done via `window.history.replaceState`. The component SHALL NOT use `window.history.pushState`, `router.push`, or any other API that creates a new history entry on toggle.

#### Scenario: Fresh visit with no param renders expanded
- **WHEN** a user opens `/lists/abc123` with no `hero` search param
- **THEN** the hero SHALL render in the expanded state

#### Scenario: Visit with `?hero=closed` renders collapsed
- **WHEN** a user opens `/lists/abc123?hero=closed`
- **THEN** the hero SHALL render in the collapsed state

#### Scenario: Toggle updates the URL
- **GIVEN** a user is on `/lists/abc123` (no `hero` param)
- **WHEN** the user activates the toggle to collapse
- **THEN** the browser's URL SHALL update to `/lists/abc123?hero=closed`
- **AND** no new history entry SHALL be created
- **WHEN** the user activates the toggle to expand again
- **THEN** the browser's URL SHALL update to `/lists/abc123` (with the `hero` param removed)
- **AND** no new history entry SHALL be created

#### Scenario: Back-button skips toggle interactions
- **GIVEN** a user navigated `/lists → /lists/abc123` and then activated the collapse toggle three times
- **WHEN** the user presses the browser back button
- **THEN** the browser SHALL navigate to `/lists` — NOT to any intermediate `?hero` state of `/lists/abc123`

#### Scenario: Page refresh preserves collapsed state
- **GIVEN** the user has collapsed the hero on `/lists/abc123` (URL is now `/lists/abc123?hero=closed`)
- **WHEN** the user refreshes the page
- **THEN** the hero SHALL render in the collapsed state on the new page load

#### Scenario: Browser back to a previously-collapsed list restores the state
- **GIVEN** the user is on `/lists/abc123?hero=closed`, clicks a link to `/lists/def456`, then presses the browser back button
- **WHEN** the back navigation completes
- **THEN** the URL SHALL be `/lists/abc123?hero=closed`
- **AND** the hero SHALL render in the collapsed state

### Requirement: `<ShareButton>` SHALL strip the `hero` param from the URL before sharing

When the `<ShareButton>` on the list-detail hero copies the URL to the clipboard or invokes `navigator.share`, it SHALL normalize the URL by removing the `hero` search param. The shared URL SHALL NOT contain `?hero=closed` regardless of the sharer's current collapse state.

#### Scenario: Sharing while hero is collapsed
- **GIVEN** an owner is on `/lists/abc123?hero=closed`
- **WHEN** the owner activates the Share button (whether via the expanded-hero affordance or the collapsed-kebab `<MenuItem>`)
- **THEN** the URL written to the clipboard (or passed to `navigator.share`) SHALL be `/lists/abc123` — with no `hero` param
- **AND** any other search params present on the URL (e.g., none on a non-preview owner view) SHALL be preserved unchanged
