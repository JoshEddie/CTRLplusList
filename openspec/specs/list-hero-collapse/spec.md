# list-hero-collapse Specification

## Purpose

Behavior contract for how the list-detail hero at `/lists/[id]` yields screen space on scroll. The expanded composition is defined by the `list-hero-header` capability; this capability defines the document-flow scroll-away model that replaced the stored-state collapse toggle: the full hero scrolls off-screen naturally, a sticky strip (list title + `ListActionsMenu` kebab) pins below the app nav while it is away, and the `ListActionsMenu` extension absorbs the hero's affordances into the strip's kebab.

## Requirements

### Requirement: The list-detail page SHALL scroll as a document and the hero SHALL scroll away naturally

`.container--list-details` SHALL be normal document flow — the document scrolls; the page SHALL NOT use a fixed-height inner scroller for the items region. The hero SHALL be plain content at the top of the page that slides off-screen as the user scrolls down and returns by geometry as the user scrolls back to the top. There SHALL be no stored collapse state, no collapse toggle, and no `hero` URL search param: hero visibility SHALL be a pure function of scroll position.

#### Scenario: Scrolling hides and reveals the hero by geometry

- **GIVEN** a list page whose items overflow the viewport
- **WHEN** the user scrolls down past the hero
- **THEN** the full hero SHALL scroll off-screen with the document — with no collapse event, reflow of the items region, or layout jump
- **WHEN** the user scrolls back to the top
- **THEN** the full hero SHALL be visible again, with no toggle interaction required

#### Scenario: No collapse state survives in the URL

- **WHEN** a user opens `/lists/abc123?hero=closed` (a stale link minted by the removed toggle model)
- **THEN** the page SHALL render identically to `/lists/abc123` — the param is ignored and never written back

### Requirement: A sticky strip SHALL pin below the app nav while the hero is scrolled away

A strip rendering the list title and the `ListActionsMenu` kebab SHALL sit in document flow after the hero and SHALL be `position: sticky`, pinned below the app nav while the page scrolls past it. The strip SHALL be revealed only while pinned: at rest (hero fully visible) it SHALL be visually hidden and inert — its kebab SHALL NOT be reachable by pointer, keyboard, or assistive technology, so the hero's own kebab is the single interactive instance. While pinned, the strip SHALL render on the hero gradient surface with the title and kebab operable.

The pinned-state transition SHALL be detected by a single IntersectionObserver sentinel and SHALL drive presentation only (reveal styling, shadow) — no scroll handlers, and no layout geometry SHALL depend on the observer. Without JavaScript the strip stays hidden and the page still scrolls normally.

#### Scenario: Mid-list scroll shows the strip

- **GIVEN** the user has scrolled past the hero
- **WHEN** the strip pins below the app nav
- **THEN** it SHALL display the list title (single line, ellipsized) and the `ListActionsMenu` kebab on the hero gradient
- **AND** the kebab SHALL be operable by pointer and keyboard

#### Scenario: At rest the strip is inert

- **GIVEN** the page is scrolled to the top with the full hero visible
- **THEN** the strip SHALL be visually hidden and inert — excluded from the tab order and the accessibility tree
- **AND** the hero's own kebab SHALL be the only kebab exposed

#### Scenario: No thresholded re-expand

- **GIVEN** the user is mid-list and scrolls up without reaching the top
- **THEN** the pinned strip SHALL remain the visible hero surface — the full hero SHALL NOT re-expand as an overlay mid-list

### Requirement: The sort toolbar SHALL pin under the sticky strip

On `.container--list-details`, the `.items-toolbar` SHALL be `position: sticky`, stacked directly under the sticky strip's pinned position, with an opaque background so items scroll beneath it without showing through. The strip SHALL stack above the toolbar, and the toolbar above the grid and pagination.

#### Scenario: Toolbar stays available mid-list

- **GIVEN** a viewer scrolls deep into a long list
- **WHEN** the toolbar's natural position has scrolled past the nav
- **THEN** the toolbar SHALL remain pinned below the sticky strip and fully operable, with items scrolling beneath it

### Requirement: `ListActionsMenu` SHALL accept contextual prepended items so the strip kebab can host the hero's affordances

The `ListActionsMenu` component SHALL accept an optional `prependedItems?: ReactNode` slot and an optional `isOwner?: boolean` flag (default `true`). When `prependedItems` is provided, the menu SHALL render those nodes at the top of its menu list, followed by its existing item set (filtered per `isOwner` and `previewMode`).

When `isOwner === false`, the menu SHALL suppress owner-only items (Choose items, Edit list, Preview/Exit preview, Delete list, Show/Hide spoilers) so the menu can render for viewers without exposing forbidden affordances.

The sticky strip composes `prependedItems` as follows:

- **Owner (non-preview):** `<ShareMenuItem>` (labeled "Share List"), then `<VisibilityMenuItems>` (three `<MenuItemRadio>` rows in the order Hidden / Private / Shared, mirroring `<VisibilityPicker>`'s composition via the shared `VISIBILITY_ROWS` table). Choose items and Edit list are NOT included in the prepended set because they already render unconditionally in the base owner kebab.
- **Viewer (non-owner, authenticated, non-preview):** `<ShareMenuItem>` (labeled "Share List"), `<BookmarkMenuItem>` (pre-hydrated with bookmark state), `<FollowMenuItem>` (pre-hydrated with follow state and disclosure-required signal). The Follow item SHALL be omitted when either party blocks the other, mirroring `<FollowContainer>`'s block-gating.

The contextual prepended items SHALL invoke the same actions as their hero counterparts — i.e., the Share menu item produces the same outcome as `<ShareButton>`, the Bookmark menu item produces the same outcome as `<BookmarkContainer>`, etc. The three visibility-row labels (Hidden / Private / Shared) and their ordering are defined once in the shared `VISIBILITY_ROWS` table so the hero popover and the strip kebab stay in lockstep.

#### Scenario: Owner kebab on the strip

- **GIVEN** an authenticated list owner with the strip pinned
- **WHEN** the user opens the strip kebab
- **THEN** the menu SHALL contain (in order): Share List, the three Visibility radio rows (Hidden / Private / Shared, with the current state checked), Choose items, Edit list, Show/Hide spoilers, Preview as viewer, Delete list

#### Scenario: Viewer kebab on the strip

- **GIVEN** an authenticated non-owner with the strip pinned
- **WHEN** the user opens the strip kebab
- **THEN** the menu SHALL contain (in order): Share List, Bookmark (or Bookmarked), Follow (or Following), and no owner-only items

#### Scenario: Owner kebab in the hero unchanged

- **GIVEN** an authenticated list owner viewing the full hero
- **WHEN** the user opens the hero's kebab
- **THEN** the menu SHALL contain only its pre-existing items (Choose items, Edit list, Show/Hide spoilers, Preview as viewer, Delete list) — no Share, no Visibility rows

#### Scenario: Visibility radios in the strip kebab change list visibility

- **GIVEN** an authenticated owner with the strip kebab open
- **WHEN** the user activates one of the three Visibility radio rows (Hidden / Private / Shared)
- **THEN** `setListVisibility(id, selectedVisibility)` SHALL be invoked exactly as it would from `<VisibilityPicker>` in the hero
- **AND** the picker semantics (Private/Shared composition + feed signaling) SHALL match the `list-visibility` capability requirements

### Requirement: Shared URLs SHALL be canonical

The URL written to the clipboard or passed to `navigator.share` from the list-detail Share affordances (whether the hero `<ShareButton>` or the strip-kebab `<ShareMenuItem>`) SHALL be the canonical `/lists/[id]` form, carrying no presentation-state params.

This requirement is satisfied by construction: the Share path builds the URL from `list.id` (e.g., `https://www.ctrlpluslist.com/lists/${list.id}`) rather than from `window.location.href`. Any future change to the Share path SHALL preserve this property.

#### Scenario: Sharing mid-scroll

- **GIVEN** an owner has scrolled mid-list with the strip pinned
- **WHEN** the owner activates Share from the strip kebab
- **THEN** the URL written to the clipboard (or passed to `navigator.share`) SHALL be the canonical `/lists/abc123` form
