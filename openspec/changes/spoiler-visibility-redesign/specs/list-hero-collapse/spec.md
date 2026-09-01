## MODIFIED Requirements

### Requirement: `ListActionsMenu` SHALL accept contextual prepended items so the strip kebab can host the hero's affordances

The `ListActionsMenu` component SHALL accept an optional `prependedItems?: ReactNode` slot and an optional `isOwner?: boolean` flag (default `true`). When `prependedItems` is provided, the menu SHALL render those nodes at the top of its menu list, followed by its existing item set (filtered per `isOwner` and `previewMode`).

When `isOwner === false`, the menu SHALL suppress owner-only items (Choose items, Edit list, Preview/Exit preview, Delete list) so the menu can render for viewers without exposing forbidden affordances. Claim visibility is not one of these owner-only items: a member viewer adjusts their tier too, and the strip kebab is where they reach it once the hero's Spoilers tile has scrolled away.

The sticky strip composes `prependedItems` as follows:

- **Owner (non-preview):** `<ShareMenuItem>` (labeled "Share List"), then `<VisibilityMenuItems>` (three `<MenuItemRadio>` rows in the order Hidden / Private / Shared, mirroring `<VisibilityPicker>`'s composition via the shared `VISIBILITY_ROWS` table), then `<SpoilerMenuItems>` (four `<MenuItemRadio>` rows in the order Surprise / Progress / Claims / Identity, mirroring the hero Spoilers tile's menu via a shared row table). Choose items and Edit list are NOT included in the prepended set because they already render unconditionally in the base owner kebab.
- **Viewer (non-owner, authenticated, non-preview):** `<ShareMenuItem>` (labeled "Share List"), `<BookmarkMenuItem>` (pre-hydrated with bookmark state), `<FollowMenuItem>` (pre-hydrated with follow state and disclosure-required signal), and — for a viewer who resolves a membership on the owning profile — `<SpoilerMenuItems>` (the same four radio rows). A viewer resolving no membership gets no spoiler rows, since they have no tier to set. The Follow item SHALL be omitted when either party blocks the other, mirroring `<FollowContainer>`'s block-gating.

The contextual prepended items SHALL invoke the same actions as their hero counterparts — i.e., the Share menu item produces the same outcome as `<ShareButton>`, the Bookmark menu item produces the same outcome as `<BookmarkContainer>`, and a Spoiler row sets the same transient per-list tier as the hero Spoilers tile (`spoiler-visibility`). The visibility-row and spoiler-row labels and their ordering are each defined once in a shared row table so the hero surfaces and the strip kebab stay in lockstep.

#### Scenario: Owner kebab on the strip

- **GIVEN** an authenticated list owner with the strip pinned
- **WHEN** the user opens the strip kebab
- **THEN** the menu SHALL contain (in order): Share List, the three Visibility radio rows (Hidden / Private / Shared, with the current state checked), the four Spoiler radio rows (Surprise / Progress / Claims / Identity, with the current tier checked), Choose items, Edit list, Preview as viewer, Delete list

#### Scenario: Viewer kebab on the strip

- **GIVEN** an authenticated non-owner holding no membership on the owning profile, with the strip pinned
- **WHEN** the user opens the strip kebab
- **THEN** the menu SHALL contain (in order): Share List, Bookmark (or Bookmarked), Follow (or Following), and no owner-only items and no Spoiler rows

#### Scenario: Member viewer kebab carries the Spoiler rows

- **GIVEN** an authenticated non-owner who resolves a membership on the owning profile, with the strip pinned
- **WHEN** the user opens the strip kebab
- **THEN** the menu SHALL contain (in order): Share List, Bookmark (or Bookmarked), Follow (or Following), the four Spoiler radio rows (Surprise / Progress / Claims / Identity, with the current tier checked), and no owner-only items

#### Scenario: Owner kebab in the hero unchanged

- **GIVEN** an authenticated list owner viewing the full hero
- **WHEN** the user opens the hero's kebab
- **THEN** the menu SHALL contain only its pre-existing items (Choose items, Edit list, Preview as viewer, Delete list) — no Share, no Visibility rows, no spoiler row

#### Scenario: Visibility radios in the strip kebab change list visibility

- **GIVEN** an authenticated owner with the strip kebab open
- **WHEN** the user activates one of the three Visibility radio rows (Hidden / Private / Shared)
- **THEN** `setListVisibility(id, selectedVisibility)` SHALL be invoked exactly as it would from `<VisibilityPicker>` in the hero
- **AND** the picker semantics (Private/Shared composition + feed signaling) SHALL match the `list-visibility` capability requirements
