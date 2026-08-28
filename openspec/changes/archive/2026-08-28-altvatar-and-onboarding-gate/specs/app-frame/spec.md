## MODIFIED Requirements

### Requirement: The gradient nav SHALL show the brand lockup, primary nav, and viewer avatar

The gradient nav SHALL render at 60px height on desktop and 54px on mobile. On desktop it SHALL contain three regions: the **CTRL+list** brand lockup at left, a row of primary nav pills (Home / Lists / Items / Purchased) at center, and the viewer's avatar circle at right. On mobile (≤700px, matching the actual `app-frame.css` `@media (max-width: 700px)` selector) the primary nav pills SHALL collapse behind a toggle button — the gradient nav's default mobile chrome SHALL be the brand lockup, the toggle button, and the avatar circle (three elements). The toggle button SHALL reveal the pill row as a vertical popover anchored below the toggle when activated.

The avatar circle SHALL render the **active profile** — the profile the viewer is currently acting as, per `active-profile` — and not the account. It SHALL fill from that profile's Altvatar art where it has any and its initials otherwise, per `altvatar`'s resolution chain, and SHALL carry that profile's accent as a ring, so the frame always states who the viewer is acting as. The account's own image SHALL NOT be rendered in the nav.

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

#### Scenario: Avatar shows the active profile's art

- **WHEN** an authenticated viewer whose active profile carries Altvatar art loads any `(main)/` page
- **THEN** the avatar circle renders that art, carrying the profile's accent as a ring

#### Scenario: Avatar shows viewer initials

- **WHEN** an authenticated viewer whose active profile carries no Altvatar art loads any `(main)/` page
- **THEN** the avatar circle renders the first letter of that profile's first and last name (e.g. "JE" for Josh Eddie)

#### Scenario: The avatar follows the active profile

- **WHEN** a viewer acting as a managed profile loads any `(main)/` page
- **THEN** the avatar circle renders that profile's own art or initials and carries its accent as a ring, not the viewer's own
