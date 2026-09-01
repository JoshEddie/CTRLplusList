## MODIFIED Requirements

### Requirement: ListActionsMenu and UserAvatarPopover compose their rows from the Menu primitive

`ListActionsMenu.tsx` and `UserAvatarPopover.tsx` SHALL build their dropdown internals from `<Menu>` / `<MenuItem>` / `<MenuLinkItem>`, and SHALL hold each wrapper's rows to the enumeration stated in its scenario below. The wrappers retain ownership of their trigger element, open/close state, and any modal coordination (e.g. the delete-confirmation modal in `ListActionsMenu`).

`ListActionsMenu`'s **base** enumeration SHALL carry no spoiler affordance. Claim visibility is adjusted from the hero's Spoilers tile (`list-hero-header`) and from the viewer's baseline (`profiles-surface`); on hero collapse the strip kebab receives spoiler rows through its `prependedItems` slot (`list-hero-collapse`), not from this base enumeration, so the component never grows a spoiler row of its own that would duplicate the tile.

The avatar popover's rows fall into two groups. A leading **switch group** carries the profiles the viewer may act as, owned by `app-frame` and `active-profile`; the **navigation rows** that follow are the popover's destinations and its terminal sign-out action. The navigation rows SHALL be ordered identity-first — the profiles the account runs, then its social graph — with sign-out last. Each navigation row SHALL carry an icon visually distinct from its sibling **navigation** rows, so two of them are not told apart by their label alone at icon size.

The sibling-distinctness rule does not reach the switch group, and SHALL NOT be read as requiring one. A switch row's leading slot SHALL carry the profile's own avatar — its art where it has any, its initials on its accent otherwise, per `profiles-surface`'s slot — rather than an icon: the rows are told apart by the identity each names, which is what the viewer is choosing between, and a set of five invented icons would say less than the profiles' own faces. The two groups are therefore distinguishable from each other by slot content as well as by position.

#### Scenario: ListActionsMenu dropdown uses Menu primitive

- **WHEN** `ListActionsMenu.tsx` is rendered
- **THEN** its dropdown is a `<Menu>` containing `<MenuLinkItem>` (Choose items, Preview/Exit preview) and `<MenuItem>` (Edit list, Delete list — with `tone="danger"` on Delete)
- **AND** no spoiler row is present in its base enumeration (strip-kebab spoiler rows arrive via `prependedItems`, per `list-hero-collapse`)

#### Scenario: UserAvatarPopover enumerates Altvatars, Connections, then Sign out

- **WHEN** `UserAvatarPopover.tsx` is rendered
- **THEN** its popover is a `<Menu>` containing the signed-in user header (page-scoped, not a MenuItem), then a `<MenuItem>` per offered switch row (the group governed by `app-frame`, absent for a viewer who runs only their self-profile), then `<MenuLinkItem>` (Altvatars, then Connections — in that order) and `<MenuItem>` (Sign out — wired to the existing sign-out server action)
- **AND** the Altvatars row links to `/altvatar`, carries an icon distinct from the Connections row's, and carries the viewer's profile count per `app-frame` whenever it is more than one

#### Scenario: A switch row is led by the profile's avatar, not an icon

- **WHEN** the popover renders a switch row for a profile
- **THEN** the row's leading slot holds that profile's avatar slot content — its art, or its initials on its accent — and no navigation icon

#### Scenario: Switch rows do not owe each other distinct icons

- **WHEN** the popover renders more than one switch row
- **THEN** the sibling-distinctness rule is satisfied across the navigation rows alone, and the switch rows are told apart by the profile each names
