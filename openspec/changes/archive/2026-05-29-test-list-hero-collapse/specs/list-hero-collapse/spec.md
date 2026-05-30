## MODIFIED Requirements

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

## ADDED Requirements

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
