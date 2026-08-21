## ADDED Requirements

### Requirement: ListActionsMenu and UserAvatarPopover compose their rows from the Menu primitive

`ListActionsMenu.tsx` and `UserAvatarPopover.tsx` SHALL build their dropdown internals from `<Menu>` / `<MenuItem>` / `<MenuLinkItem>`, and SHALL hold each wrapper's rows to the enumeration stated in its scenario below. The wrappers retain ownership of their trigger element, open/close state, and any modal coordination (e.g. the delete-confirmation modal in `ListActionsMenu`).

The avatar popover's navigation rows SHALL be ordered identity-first — the profiles the account runs, then its social graph — with the terminal sign-out action last. Each navigation row SHALL carry an icon visually distinct from its siblings', so two rows are not told apart by their label alone at icon size.

#### Scenario: ListActionsMenu dropdown uses Menu primitive

- **WHEN** `ListActionsMenu.tsx` is rendered
- **THEN** its dropdown is a `<Menu>` containing `<MenuLinkItem>` (Choose items, Show/Hide spoilers, Preview/Exit preview) and `<MenuItem>` (Edit list, Delete list — with `tone="danger"` on Delete)

#### Scenario: UserAvatarPopover enumerates Profiles, Connections, then Sign out

- **WHEN** `UserAvatarPopover.tsx` is rendered
- **THEN** its popover is a `<Menu>` containing the signed-in user header (page-scoped, not a MenuItem) plus `<MenuLinkItem>` (Profiles, then Connections — in that order) and `<MenuItem>` (Sign out — wired to the existing sign-out server action)
- **AND** the Profiles row links to `/profiles` and carries an icon distinct from the Connections row's

### Requirement: The profile card's management menu composes its rows from the Menu primitive

The `⋯` control on a profile card's accent band SHALL open a `<Menu>` whose rows are `<MenuLinkItem>` / `<MenuItem>`, with the card's client wrapper owning the trigger and the open/close state. The trigger SHALL be a `button-system` control in the `on-dark` variant — it sits on the accent band, which is the case that variant exists for — and SHALL carry an accessible name naming the profile, since a grid renders one trigger per card and "actions" alone would repeat.

#### Scenario: The card menu is a Menu of link rows

- **WHEN** a profile card's `⋯` control is activated
- **THEN** a `<Menu>` opens containing a `<MenuLinkItem>` per management destination, the first of which links to that profile's space

#### Scenario: Each card's trigger is named for its own profile

- **WHEN** the Profiles page renders more than one card
- **THEN** each card's menu trigger carries an accessible name naming that card's profile

## REMOVED Requirements

### Requirement: ListActionsMenu and UserAvatarPopover migrate to the Menu primitive

**Reason**: The requirement was framed as a one-time migration rather than a standing contract, and its third scenario asserted a codebase state — that a grep for the retired page-scoped classes finds no definitions "after migration" — which is not behavior any caller can rely on and cannot be re-verified once the migration has landed. This change edits the avatar popover's row enumeration, so the block is being rewritten regardless; carrying the migration framing forward would preserve a scenario that was never spec material.

**Migration**: The durable content — both wrappers composing their rows from the Menu primitive, their row enumerations, and the wrappers' retained ownership of trigger, state and modal coordination — is carried into "ListActionsMenu and UserAvatarPopover compose their rows from the Menu primitive", with the avatar popover's enumeration extended by the Profiles row. The retired classes (`.menu-item`, `.menu-item-danger`, `.menu-dropdown`, `.avatar-popover-item`, `.avatar-popover`, `.avatar-popover-divider`, `.avatar-popover-form`, `.avatar-popover-item-button`) are already deleted; that they stay deleted follows from the standing rule that every interactive surface routes through its primitive family rather than a page-scoped class, which no longer needs restating as a grep.
