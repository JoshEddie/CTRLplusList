## MODIFIED Requirements

### Requirement: A profile card SHALL carry the profile's identity, the viewer's role, its counts, and a management menu

Each card SHALL render the profile's name, its avatar, the viewer's role on it, its tagline, its counts, and its accent.

The avatar is a **slot**: it SHALL render the profile's avatar art where the profile has any, and its initials otherwise. Until the change that gives profiles avatar art, every profile renders the initials fallback. The slot SHALL paint the accent's light stop behind whatever fills it, so a faceless card is still told apart from its neighbours by colour, and filling the slot later SHALL NOT change the card's shape.

The role label SHALL read `You` on the viewer's self-profile, `Owner` on a profile they own, and `Manager` on a profile they manage. The label is non-interactive text, not a removable chip.

Counts SHALL be the number of lists the profile owns, at every visibility, and the number of its **active** items — items with no archive timestamp. Archived items are excluded so the card agrees with the Items view it leads to, which defaults to active.

The card body SHALL switch the active profile on click, per `active-profile`. Clicking the card SHALL NOT navigate: the viewer stays on the Profiles page, which re-renders with the active mark moved. The card's management menu SHALL be excluded from that click target, so opening the menu does not also switch. Because the card body's click target is not itself a control, it SHALL NOT be the only way to switch from this surface — the management menu carries the switch as a row, which is the path available to a viewer who does not use a pointer.

Management SHALL be carried by a menu opened from a control on the card's accent band, routed through the `menu-system` primitive family. The menu SHALL carry one row per management destination the surface can reach, and SHALL NOT wait until it has more than one: it is the card's management home from the start, so a later change adds a row rather than reshaping the card. Its row to the profile's own space SHALL read `Edit <name>` rather than `Manage <name>` — *managed* already names a kind of profile in this model, so "Manage" on a card labelled `Owner` invites the reading that it opens something managed. The menu SHALL additionally carry a switch row reading `Switch to <name>`, ordered before `Edit <name>` because switching is the more frequent act. The switch row SHALL be absent from the card of the profile already being acted as.

#### Scenario: Role label matches the viewer's membership

- **WHEN** the page renders the viewer's self-profile, a profile they own, and a profile they manage
- **THEN** the three cards' role labels read `You`, `Owner`, and `Manager` respectively

#### Scenario: Counts exclude archived items and include every list

- **WHEN** a profile owns 3 lists — one private, one unlisted, one shared — and 5 items of which 2 are archived
- **THEN** its card reports 3 lists and 3 items

#### Scenario: The card body does not navigate

- **WHEN** the viewer clicks a card anywhere outside its management menu
- **THEN** no navigation occurs

#### Scenario: The card body switches the active profile

- **WHEN** the viewer clicks the body of a card for a profile they are not currently acting as
- **THEN** the active profile becomes that profile, and the Profiles page re-renders with the active mark moved to that card

#### Scenario: Opening the menu does not switch

- **WHEN** the viewer clicks the management menu's control on a card they are not acting as
- **THEN** the menu opens and the active profile is unchanged

#### Scenario: A card renders no link until its menu is opened

- **WHEN** a card renders
- **THEN** it contains no link

#### Scenario: The management menu opens the profile's space

- **WHEN** the viewer opens a card's management menu and activates its `Edit <name>` row
- **THEN** the browser navigates to that profile's space

#### Scenario: The management menu switches without a pointer

- **WHEN** the viewer opens a card's management menu and activates its `Switch to <name>` row
- **THEN** the active profile becomes that profile

#### Scenario: The active profile's card offers no switch row

- **WHEN** the viewer opens the management menu on the card of the profile they are acting as
- **THEN** the menu carries `Edit <name>` and no switch row

#### Scenario: The avatar slot falls back to initials

- **WHEN** a profile carrying no avatar art renders as a card
- **THEN** the slot renders the profile's initials on the accent's light stop

### Requirement: The card of the active profile SHALL be marked as active

Exactly one profile is active at any time, and which one it is is owned by `active-profile`. The card of the profile the viewer is currently acting as SHALL carry the active mark, and no other card SHALL — so the mark moves as the viewer switches, and rests on the viewer's self-profile whenever they are acting as themselves.

The mark SHALL be carried by the card's own surface — its accent painted across the whole face, with the body held clear of the edges so the accent reads as a frame — and by a badge on the avatar. The badge SHALL carry a text alternative naming the state, so the mark is never colour alone.

#### Scenario: The self-profile card is marked active

- **WHEN** a viewer acting as their own profile renders the Profiles page
- **THEN** their self-profile's card carries the active mark
- **AND** a badge on its avatar carries a text alternative naming the active state

#### Scenario: A profile the viewer owns or manages is not marked active

- **WHEN** a profile the viewer holds `owner` or `manager` on renders as a card while the viewer is acting as a different profile
- **THEN** the card carries no active mark and no badge

#### Scenario: The mark follows a switch

- **WHEN** a viewer acting as their own profile switches to a profile they own
- **THEN** the active mark and badge move to that profile's card, and the self-profile's card carries neither
