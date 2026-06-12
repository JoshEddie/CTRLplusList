## MODIFIED Requirements

### Requirement: List owners SHALL set visibility via a three-item radio menu

The list visibility UI SHALL present a popover triggered by a single visibility pill containing exactly three radio-style menu items, one per enum value. The UI labels SHALL be **Hidden** (→ `'private'`), **Private** (→ `'unlisted'`), and **Shared** (→ `'public'`). Each menu row SHALL render an icon, the label, and a one-line description; the currently-selected row SHALL render a trailing `✓` indicator and SHALL have `aria-checked="true"`. Selecting a row invokes `setListVisibility(id, visibility)` with the value the row maps to. Only the list owner SHALL be authorized to change visibility.

The row descriptions SHALL be: **Hidden** — "Only you can see this list"; **Private** — "Only people with the link can view"; **Shared** — "Anyone with the link — plus your followers see it in their feed". The Shared description SHALL frame follower visibility as an addition to link access, not a restriction, so it cannot be read as followers-only.

The trigger pill SHALL display the currently-selected row's label verbatim (no qualifier suffix) alongside an icon (`🔒` for `'private'`, `🔗` for `'unlisted'`, `👥` for `'public'`). The pill's `aria-label` SHALL include the row's description for assistive-technology disambiguation.

#### Scenario: Owner sees three radio menu items

- **WHEN** an authenticated owner opens the visibility popover for their list
- **THEN** a menu renders with exactly three radio items in order — Hidden, Private, Shared — and the item matching the current `visibility` value has `aria-checked="true"` and a trailing `✓` indicator

#### Scenario: Each row carries icon, label, and description

- **WHEN** the visibility menu is rendered
- **THEN** the Hidden row shows `🔒 Hidden` with description "Only you can see this list"; the Private row shows `🔗 Private` with description "Only people with the link can view"; the Shared row shows `👥 Shared` with description "Anyone with the link — plus your followers see it in their feed"

#### Scenario: Selecting Hidden sets private

- **WHEN** the owner activates the Hidden row
- **THEN** `setListVisibility(id, 'private')` is invoked

#### Scenario: Selecting Private sets unlisted

- **WHEN** the owner activates the Private row
- **THEN** `setListVisibility(id, 'unlisted')` is invoked

#### Scenario: Selecting Shared sets public

- **WHEN** the owner activates the Shared row
- **THEN** `setListVisibility(id, 'public')` is invoked

#### Scenario: Trigger pill label matches selected row

- **WHEN** the list's current `visibility` is `'unlisted'`
- **THEN** the visibility pill renders the icon `🔗` and the label `Private` (no `·`-qualifier)

#### Scenario: Re-selecting the current row is a no-op

- **WHEN** the owner activates the row whose value already matches the list's current `visibility`
- **THEN** no `setListVisibility` call is made (the picker treats it as a no-op, consistent with the existing `apply` early-return in `VisibilityPicker.tsx`)

#### Scenario: Non-owner submission is rejected

- **WHEN** a `setListVisibility` request is made by a non-owner
- **THEN** the action returns an unauthorized response and `lists.visibility` is unchanged
