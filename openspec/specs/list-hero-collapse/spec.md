# list-hero-collapse Specification

## Purpose

Behavior contract for the user-controlled collapse affordance on the list-detail hero at `/lists/[id]`. The expanded state is defined by the `list-hero-header` capability; this capability adds an opt-in collapsed state plus the toggle that switches between them, the URL-persisted state model, and the `ListActionsMenu` extension that absorbs the hidden actions while collapsed.

## Requirements

### Requirement: The list-detail hero SHALL be collapsible via a user-controlled toggle

The list-detail hero at `/lists/[id]` SHALL render a user-controlled toggle that switches the hero between an **expanded** state (the full composition defined by the `list-hero-header` capability) and a **collapsed** state (a single-line strip showing only the list title, a chevron icon, and the `ListActionsMenu` kebab). The toggle SHALL render at all viewport widths — there SHALL NOT be a breakpoint above which the toggle is suppressed.

The toggle exposes two affordances depending on state:

- **Expanded state:** a chevron handle at the bottom edge of the hero gradient panel. Full panel width as the hit target; the visible chevron sits centered. Activation collapses the hero.
- **Collapsed state:** the entire collapsed strip is the activation surface, EXCEPT the `ListActionsMenu` kebab and its menu (which are an exclusion zone for click bubbling). Activation expands the hero.

Each affordance SHALL satisfy WCAG 2.5.5 (≥44×44 CSS px touch target) and SHALL expose `aria-expanded` reflecting the current state (`true` when expanded, `false` when collapsed), with accessible name "Collapse list info" when expanded and "Expand list info" when collapsed.

#### Scenario: Owner expanded → collapsed → expanded

- **GIVEN** an authenticated list owner viewing `/lists/[id]` with no `hero` URL param
- **WHEN** the page first renders
- **THEN** the hero SHALL render in the expanded state per the `list-hero-header` capability
- **AND** the bottom collapse handle SHALL render with `aria-expanded="true"` and the accessible name "Collapse list info"
- **WHEN** the user activates the handle
- **THEN** the hero SHALL render in the collapsed state (title + chevron + kebab only)
- **AND** the collapsed strip SHALL expose `aria-expanded="false"` with the accessible name "Expand list info"
- **WHEN** the user activates the collapsed strip (clicking anywhere outside the kebab exclusion zone)
- **THEN** the hero SHALL return to the expanded state with `aria-expanded="true"`

#### Scenario: Viewer expanded → collapsed

- **GIVEN** an authenticated non-owner viewing a `'public'` or `'unlisted'` list at `/lists/[id]`
- **WHEN** the user activates the bottom collapse handle
- **THEN** the hero SHALL render in the collapsed state (title + chevron + kebab only)
- **AND** the byline sub-row containing avatar, linked owner name, and Follow button SHALL no longer render on the hero surface

#### Scenario: Toggle renders at all widths

- **GIVEN** a list page rendered at any viewport width (verified at 390px, 800px, 1024px, 1440px)
- **WHEN** the hero is in either state
- **THEN** the toggle affordance for that state SHALL be visible and operable
- **AND** there SHALL NOT be a viewport-width breakpoint at which the affordance is `display: none` or otherwise removed from the DOM

#### Scenario: Collapsed strip click target excludes the kebab

- **GIVEN** the hero is collapsed
- **WHEN** the user clicks the `ListActionsMenu` kebab (the `⋯` button)
- **THEN** the kebab menu SHALL open
- **AND** the hero SHALL remain collapsed (the click SHALL NOT propagate to the strip's expand handler)

### Requirement: The collapsed hero SHALL render only the title, a chevron icon, and the kebab inside the hero gradient panel

When the hero is in the collapsed state, the surface SHALL render only three elements: a chevron icon (leading), the list title (after the chevron), and the `ListActionsMenu` kebab (trailing edge). All other hero content — eyebrow, subtitle, visibility status pill, footer line, byline sub-row, primary action buttons, secondary action buttons, and the bottom collapse handle — SHALL NOT render in the collapsed state.

The collapsed strip SHALL render inside the same gradient surface used by the expanded hero, preserving the brand-gradient continuity established by the `list-hero-header` capability. The panel's border-radius and outer width SHALL be preserved; only interior height and padding change.

#### Scenario: Collapsed strip content for owner

- **GIVEN** an authenticated list owner viewing `/lists/[id]`
- **WHEN** the hero is collapsed
- **THEN** the visible hero content SHALL be exactly: a chevron-down icon, the list title, and the `ListActionsMenu` kebab
- **AND** the visibility status pill SHALL NOT render
- **AND** the eyebrow (occasion label) SHALL NOT render
- **AND** the subtitle SHALL NOT render
- **AND** the footer line ("N items · updated X ago") SHALL NOT render
- **AND** the Share, Choose items, and Edit buttons SHALL NOT render as first-class affordances
- **AND** the bottom collapse handle SHALL NOT render

#### Scenario: Collapsed strip content for viewer

- **GIVEN** an authenticated non-owner viewing `/lists/[id]` for a `'public'` or `'unlisted'` list
- **WHEN** the hero is collapsed
- **THEN** the visible hero content SHALL be exactly: a chevron-down icon, the list title, and the `ListActionsMenu` kebab
- **AND** the byline sub-row (avatar + linked owner name + Follow button) SHALL NOT render
- **AND** the Share and Bookmark buttons SHALL NOT render as first-class affordances

#### Scenario: Gradient surface continuity preserved on collapse

- **GIVEN** the hero is collapsed
- **WHEN** the strip renders
- **THEN** it SHALL render inside the existing hero gradient surface with shared background and border-radius
- **AND** the strip SHALL NOT render as a separate panel with its own background

### Requirement: `ListActionsMenu` SHALL accept contextual prepended items so the collapsed kebab can host the hidden affordances

The `ListActionsMenu` component SHALL accept an optional `prependedItems?: ReactNode` slot and an optional `isOwner?: boolean` flag (default `true`). When `prependedItems` is provided, the menu SHALL render those nodes at the top of its menu list, followed by its existing item set (filtered per `isOwner` and `previewMode`).

When `isOwner === false`, the menu SHALL suppress owner-only items (Choose items, Edit list, Preview/Exit preview, Delete list, Show/Hide spoilers) so the menu can render for viewers without exposing forbidden affordances.

The collapsed hero composes `prependedItems` as follows:

- **Owner (non-preview):** `<ShareMenuItem>` (labeled "Share List"), then `<VisibilityMenuItems>` (three `<MenuItemRadio>` rows in the order Hidden / Private / Shared, mirroring `<VisibilityPicker>`'s composition via the shared `VISIBILITY_ROWS` table). Choose items and Edit list are NOT included in the prepended set because they already render unconditionally in the base owner kebab.
- **Viewer (non-owner, authenticated, non-preview):** `<ShareMenuItem>` (labeled "Share List"), `<BookmarkMenuItem>` (pre-hydrated with bookmark state), `<FollowMenuItem>` (pre-hydrated with follow state and disclosure-required signal). The Follow item SHALL be omitted when either party blocks the other, mirroring `<FollowContainer>`'s block-gating.

The contextual prepended items SHALL invoke the same actions as their expanded-state counterparts — i.e., the Share menu item produces the same outcome as `<ShareButton>`, the Bookmark menu item produces the same outcome as `<BookmarkContainer>`, etc. The three visibility-row labels (Hidden / Private / Shared) and their ordering are defined once in the shared `VISIBILITY_ROWS` table so the expanded popover and the collapsed kebab stay in lockstep.

#### Scenario: Owner kebab in collapsed mode

- **GIVEN** an authenticated list owner viewing `/lists/[id]` with the hero collapsed
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain (in order): Share List, the three Visibility radio rows (Hidden / Private / Shared, with the current state checked), Choose items, Edit list, Show/Hide spoilers, Preview as viewer, Delete list

#### Scenario: Viewer kebab in collapsed mode

- **GIVEN** an authenticated non-owner viewing `/lists/[id]` with the hero collapsed
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain (in order): Share List, Bookmark (or Bookmarked), Follow (or Following), and no owner-only items

#### Scenario: Owner kebab in expanded mode unchanged

- **GIVEN** an authenticated list owner viewing `/lists/[id]` with the hero expanded
- **WHEN** the user opens the kebab
- **THEN** the menu SHALL contain only its pre-existing items (Choose items, Edit list, Show/Hide spoilers, Preview as viewer, Delete list) — no Share, no Visibility rows

#### Scenario: Visibility radios in collapsed owner kebab change list visibility

- **GIVEN** an authenticated owner with the hero collapsed and the kebab open
- **WHEN** the user activates one of the three Visibility radio rows (Hidden / Private / Shared)
- **THEN** `setListVisibility(id, selectedVisibility)` SHALL be invoked exactly as it would from `<VisibilityPicker>` in the expanded state
- **AND** the picker semantics (Private/Shared composition + feed signaling) SHALL match the `list-visibility` capability requirements

### Requirement: Collapse state SHALL be reflected in the URL via a `hero` search param

The collapsed state SHALL be expressed in the URL as the search param `?hero=closed`. The expanded state SHALL be expressed by the _absence_ of the `hero` param. The string `?hero=open` SHALL NOT be used — the open state is signaled exclusively by the param's absence.

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

### Requirement: Shared URLs SHALL NOT carry the `hero` param

The URL written to the clipboard or passed to `navigator.share` from the list-detail hero's Share affordances (whether the expanded `<ShareButton>` or the collapsed-kebab `<ShareMenuItem>`) SHALL NOT contain the `hero` search param, regardless of the sharer's current collapse state.

This requirement is satisfied by construction: the Share path builds the URL from `list.id` (e.g., `https://www.ctrlpluslist.com/lists/${list.id}`) rather than from `window.location.href`. Any future change to the Share path SHALL preserve this property.

#### Scenario: Sharing while hero is collapsed

- **GIVEN** an owner is on `/lists/abc123?hero=closed`
- **WHEN** the owner activates the Share button (whether via the expanded-hero affordance or the collapsed-kebab `<MenuItem>`)
- **THEN** the URL written to the clipboard (or passed to `navigator.share`) SHALL be the canonical `/lists/abc123` form — with no `hero` param

### Requirement: The collapsed hero strip SHALL be keyboard-operable

The collapsed-hero strip is the expand activation surface (per the collapse-toggle requirement). In addition to pointer activation, the strip SHALL be reachable by keyboard focus and operable without a pointer: it SHALL expose `role="button"` and be focusable (`tabIndex={0}`), and pressing **Enter** or **Space** while it is focused SHALL expand the hero, with the default scroll/submit behavior of those keys suppressed (`preventDefault`).

The kebab exclusion zone is preserved under keyboard interaction as it is under pointer interaction: activating the strip via Enter/Space SHALL expand the hero, while interacting with the `ListActionsMenu` kebab inside the strip SHALL NOT propagate to the strip's expand handler.

#### Scenario: Enter key expands the collapsed strip

- **GIVEN** the hero is collapsed and the collapsed strip has keyboard focus
- **WHEN** the user presses the Enter key
- **THEN** the hero SHALL return to the expanded state
- **AND** the key's default behavior SHALL be suppressed

#### Scenario: Space key expands the collapsed strip

- **GIVEN** the hero is collapsed and the collapsed strip has keyboard focus
- **WHEN** the user presses the Space key
- **THEN** the hero SHALL return to the expanded state
- **AND** the key's default behavior SHALL be suppressed

#### Scenario: Collapsed strip is exposed as a focusable button

- **GIVEN** the hero is collapsed
- **WHEN** the collapsed strip renders
- **THEN** it SHALL expose `role="button"` and be focusable (`tabIndex={0}`)
- **AND** it SHALL carry `aria-expanded="false"` with the accessible name "Expand list info"
