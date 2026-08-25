## MODIFIED Requirements

### Requirement: ListActionsMenu and UserAvatarPopover compose their rows from the Menu primitive

`ListActionsMenu.tsx` and `UserAvatarPopover.tsx` SHALL build their dropdown internals from `<Menu>` / `<MenuItem>` / `<MenuLinkItem>`, and SHALL hold each wrapper's rows to the enumeration stated in its scenario below. The wrappers retain ownership of their trigger element, open/close state, and any modal coordination (e.g. the delete-confirmation modal in `ListActionsMenu`).

The avatar popover's rows fall into two groups. A leading **switch group** carries the profiles the viewer may act as, owned by `app-frame` and `active-profile`; the **navigation rows** that follow are the popover's destinations and its terminal sign-out action. The navigation rows SHALL be ordered identity-first — the profiles the account runs, then its social graph — with sign-out last. Each navigation row SHALL carry an icon visually distinct from its sibling **navigation** rows, so two of them are not told apart by their label alone at icon size.

The sibling-distinctness rule does not reach the switch group, and SHALL NOT be read as requiring one. A switch row's leading slot SHALL carry the profile's own avatar — its art where it has any, its initials on its accent otherwise, per `profiles-surface`'s slot — rather than an icon: the rows are told apart by the identity each names, which is what the viewer is choosing between, and a set of five invented icons would say less than the profiles' own faces. The two groups are therefore distinguishable from each other by slot content as well as by position.

#### Scenario: ListActionsMenu dropdown uses Menu primitive

- **WHEN** `ListActionsMenu.tsx` is rendered
- **THEN** its dropdown is a `<Menu>` containing `<MenuLinkItem>` (Choose items, Show/Hide spoilers, Preview/Exit preview) and `<MenuItem>` (Edit list, Delete list — with `tone="danger"` on Delete)

#### Scenario: UserAvatarPopover enumerates Profiles, Connections, then Sign out

- **WHEN** `UserAvatarPopover.tsx` is rendered
- **THEN** its popover is a `<Menu>` containing the signed-in user header (page-scoped, not a MenuItem), then a `<MenuItem>` per offered switch row (the group governed by `app-frame`, absent for a viewer who runs only their self-profile), then `<MenuLinkItem>` (Profiles, then Connections — in that order) and `<MenuItem>` (Sign out — wired to the existing sign-out server action)
- **AND** the Profiles row links to `/profiles`, carries an icon distinct from the Connections row's, and carries the viewer's profile count per `app-frame` whenever it is more than one

#### Scenario: A switch row is led by the profile's avatar, not an icon

- **WHEN** the popover renders a switch row for a profile
- **THEN** the row's leading slot holds that profile's avatar slot content — its art, or its initials on its accent — and no navigation icon

#### Scenario: Switch rows do not owe each other distinct icons

- **WHEN** the popover renders more than one switch row
- **THEN** the sibling-distinctness rule is satisfied across the navigation rows alone, and the switch rows are told apart by the profile each names

### Requirement: The profile card's management menu composes its rows from the Menu primitive

The `⋯` control on a profile card's accent band SHALL open a `<Menu>` whose rows are `<MenuLinkItem>` / `<MenuItem>`, with the card's client wrapper owning the trigger and the open/close state. The trigger SHALL be a `button-system` control in the `on-dark` variant — it sits on the accent band, which is the case that variant exists for — and SHALL carry an accessible name naming the profile, since a grid renders one trigger per card and "actions" alone would repeat.

The menu's rows are not all destinations. A row that navigates SHALL be a `<MenuLinkItem>`; a row that performs an action in place SHALL be a `<MenuItem>`. The switch row `profiles-surface` puts first is an action, not a destination — switching re-renders the Profiles page rather than leaving it — so the menu's first row SHALL NOT be required to be a link. The row to the profile's own space remains a `<MenuLinkItem>` wherever it appears in the order.

#### Scenario: The card menu is a Menu of link rows

- **WHEN** the `⋯` control is activated on the card of the profile the viewer is acting as, whose menu carries no switch row
- **THEN** a `<Menu>` opens containing a `<MenuLinkItem>` per management destination, the first of which links to that profile's space

#### Scenario: An action row may precede the destinations

- **WHEN** a profile card's `⋯` control is activated on a card the viewer is not acting as
- **THEN** the menu's first row is a `<MenuItem>` performing the switch, followed by a `<MenuLinkItem>` per management destination, the first of which links to that profile's space

#### Scenario: Each card's trigger is named for its own profile

- **WHEN** the Profiles page renders more than one card
- **THEN** each card's menu trigger carries an accessible name naming that card's profile
