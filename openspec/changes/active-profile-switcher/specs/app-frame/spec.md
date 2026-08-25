## MODIFIED Requirements

### Requirement: The gradient nav SHALL show the brand lockup, primary nav, and viewer avatar

The gradient nav SHALL render at 60px height on desktop and 54px on mobile. On desktop it SHALL contain three regions: the **CTRL+list** brand lockup at left, a row of primary nav pills (Home / Lists / Items / Purchased) at center, and the viewer's avatar circle at right. On mobile (≤700px, matching the actual `app-frame.css` `@media (max-width: 700px)` selector) the primary nav pills SHALL collapse behind a toggle button — the gradient nav's default mobile chrome SHALL be the brand lockup, the toggle button, and the avatar circle (three elements). The toggle button SHALL reveal the pill row as a vertical popover anchored below the toggle when activated.

The avatar circle SHALL render the **active profile** — the profile the viewer is currently acting as, per `active-profile` — and not the account. It SHALL render that profile's initials, and SHALL carry that profile's accent as a ring, so the frame always states who the viewer is acting as. The account's own image SHALL NOT be rendered in the nav; where a profile has avatar art, the change that introduces it fills this slot as it fills the profile card's.

#### Scenario: Desktop nav renders all four pills

- **WHEN** the viewer is on a desktop viewport above 700px wide
- **THEN** the gradient nav shows the brand lockup at left, Home / Lists / Items / Purchased pills in the center, and the avatar circle at right

#### Scenario: Mobile nav collapses pills behind a toggle

- **WHEN** the viewport is 700px wide or narrower
- **THEN** the gradient nav shows the brand lockup, a toggle button (closed state: `LuMenu` icon, `aria-label="Open menu"`, `aria-expanded="false"`), and the avatar circle
- **AND** the four primary nav pills are NOT visible in the gradient bar
- **AND WHEN** the toggle is activated (clicked / Enter / Space)
- **THEN** the toggle's `aria-expanded` flips to `"true"`, its `aria-label` flips to `"Close menu"`, its icon flips to `LuX`
- **AND** the four primary nav pills render as a vertical menu anchored below the toggle

#### Scenario: Avatar shows viewer initials

- **WHEN** an authenticated user with a known name loads any `(main)/` page
- **THEN** the avatar circle renders the first letter of their first and last name (e.g. "JE" for Josh Eddie)

#### Scenario: The avatar follows the active profile

- **WHEN** a viewer acting as a managed profile loads any `(main)/` page
- **THEN** the avatar circle renders that profile's initials and carries its accent as a ring, not the viewer's own

## ADDED Requirements

### Requirement: The avatar dropdown SHALL carry the profile switcher

The avatar's dropdown SHALL offer the viewer's other profiles as switch rows, placed above its existing destinations so that identity leads the menu. Activating a row SHALL switch the active profile, per `active-profile`.

The rows SHALL exclude the profile currently being acted as, so no row is inert. The row for the viewer's own profile SHALL read `Back to <self name>` whenever the active profile is not their own. A viewer who runs only their self-profile SHALL be offered no switch rows at all, leaving the dropdown as it is without them.

The rows SHALL be capped at five, ordered most-recently-acted-as first per `active-profile`. The cap is the surface's limit, not the viewer's: the Profiles page lists every profile the viewer runs and switches from there, so a viewer past the cap reaches the rest through the dropdown's existing `Profiles` destination. That destination SHALL carry the count of profiles the viewer runs whenever it is more than one, so the capped group does not read as the whole set.

#### Scenario: The dropdown offers the viewer's other profiles

- **WHEN** a viewer who runs three profiles opens the avatar dropdown while acting as their own
- **THEN** the dropdown carries a switch row for each of the other two, above its existing destinations

#### Scenario: The active profile is not offered

- **WHEN** a viewer opens the dropdown
- **THEN** no row names the profile they are currently acting as

#### Scenario: Returning to the viewer's own profile is named as such

- **WHEN** a viewer acting as a managed profile opens the dropdown
- **THEN** the row for their own profile reads `Back to <self name>`

#### Scenario: A single-profile viewer sees no switcher

- **WHEN** a viewer who runs only their self-profile opens the dropdown
- **THEN** it carries no switch rows and no profile count

#### Scenario: The dropdown caps at five and the count carries the rest

- **WHEN** a viewer who runs twelve profiles opens the dropdown
- **THEN** at most five switch rows are offered, ordered most-recently-acted-as first
- **AND** the `Profiles` destination carries the count of all twelve
