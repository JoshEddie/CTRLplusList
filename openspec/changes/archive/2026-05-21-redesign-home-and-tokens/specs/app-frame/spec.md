## ADDED Requirements

### Requirement: The `(main)` route group SHALL render a persistent app frame around every page

Every route under `app/(main)/` SHALL render inside a shared frame consisting of (a) a gradient navigation bar across the top of the viewport, and (b) a white content surface with rounded top corners floating on the gradient. The frame SHALL be rendered from `app/(main)/layout.tsx` so individual page files do not repeat the chrome. Page-level `<Header>` components SHALL continue to render inside the white surface for page titles and CTAs.

#### Scenario: Frame is shared across routes

- **WHEN** an authenticated user navigates between any two routes under `(main)/` (e.g. from `/` to `/lists` to `/items`)
- **THEN** the gradient nav and white content surface remain mounted; only the inner page content swaps

#### Scenario: Page header lives inside the white surface

- **WHEN** a page renders a `<Header>` (e.g. `/lists` shows "My Lists" with a "+ New List" CTA)
- **THEN** the `<Header>` renders inside the white content surface, not over the gradient nav

#### Scenario: Routes outside `(main)/` opt out

- **WHEN** a route lives outside the `(main)/` group (e.g. `app/(auth)/...`)
- **THEN** the app frame is NOT rendered for that route

### Requirement: The gradient nav SHALL show the brand lockup, primary nav, and viewer avatar

The gradient nav SHALL render at 60px height on desktop and 54px on mobile. On desktop it SHALL contain three regions: the **CTRL+list** brand lockup at left, a row of primary nav pills (Home / Lists / Items / Purchased) at center, and the viewer's avatar circle at right. On mobile (≤800px, matching the existing `nav-hide` breakpoint) the primary nav pills SHALL be hidden, leaving only the lockup and avatar.

#### Scenario: Desktop nav renders all four pills

- **WHEN** the viewer is on a desktop viewport above 800px wide
- **THEN** the gradient nav shows the brand lockup at left, Home / Lists / Items / Purchased pills in the center, and the avatar circle at right

#### Scenario: Mobile nav drops the pill row

- **WHEN** the viewport is 800px wide or narrower
- **THEN** the gradient nav shows only the brand lockup at left and the avatar circle at right

#### Scenario: Avatar shows viewer initials

- **WHEN** an authenticated user with a known name loads any `(main)/` page
- **THEN** the avatar circle renders the first letter of their first and last name (e.g. "JE" for Josh Eddie)

### Requirement: The active nav pill SHALL reflect the current route

The primary nav pill matching the current route SHALL render in an "active" visual state (filled background, bolder weight); the other pills SHALL render in an "inactive" visual state. Matching SHALL use route prefix: `/` matches Home; `/lists` (and any `/lists/...` descendant) matches Lists; `/items` matches Items; `/purchased` matches Purchased.

#### Scenario: Home pill active on root

- **WHEN** the viewer is on `/`
- **THEN** the Home pill renders active and Lists / Items / Purchased render inactive

#### Scenario: Lists pill active on list detail

- **WHEN** the viewer is on `/lists/abc123`
- **THEN** the Lists pill renders active

#### Scenario: No pill is active on routes outside the four primary destinations

- **WHEN** the viewer is on a `(main)/` route that doesn't match any primary destination (e.g. `/settings/connections`)
- **THEN** no pill renders in the active state

### Requirement: `global.css` SHALL declare the design-token set used by the frame and downstream pages

`app/ui/styles/global.css` SHALL declare custom properties for every design value not already covered by existing role-named tokens. Existing tokens (`--primary-color`, `--secondary-color`, `--light-color`, `--secondary-background-color`) SHALL continue to drive their existing roles and SHALL be reused wherever the new design's value matches that role. The token set SHALL include at minimum: `--page-frame-gradient`, `--heading-text-color`, `--subtitle-text-color`, `--meta-text-color`, `--date-text-color`, `--divider-color`, `--card-border-color`, `--card-border-hover-color`, `--card-hover-background-color`, `--card-shadow`, `--card-shadow-hover`, `--surface-shadow`.

#### Scenario: New tokens are defined

- **WHEN** `global.css` is loaded
- **THEN** `:root` declares every token in the list above with a non-empty value

#### Scenario: Frame consumes tokens, not literals

- **WHEN** the gradient nav and white-card frame are inspected
- **THEN** their gradient and shadow values resolve from `--page-frame-gradient` and `--surface-shadow` (not inline literals)

#### Scenario: `body::before` consumes the gradient token

- **WHEN** the body's `::before` overlay is inspected
- **THEN** its `background-image` resolves to `--page-frame-gradient`, replacing the previous ad-hoc composition from `--primary-color-transparent` / `--secondary-color-transparent`

### Requirement: Pages under `(main)/` SHALL consume design tokens rather than literal theme values

CSS rules for any component rendered under the `(main)/` route group SHALL resolve theme-bearing properties (color, gradient, shadow, border, divider) from custom properties declared in `global.css`. Hard-coded color literals, raw gradient declarations, and raw shadow values SHALL NOT be introduced in feature-folder CSS files for theme-bearing properties. Existing literals in feature CSS predating this change MAY remain until that feature's stage in the staged rollout; once a feature has been re-skinned as part of its rollout stage, its literal theme values MUST be replaced with token references.

#### Scenario: New component CSS uses tokens

- **WHEN** a component's CSS is added or modified as part of a rollout stage covered by this change
- **THEN** color, gradient, shadow, border, and divider values reference custom properties from `global.css` rather than literal values

#### Scenario: Pre-existing literals are tolerated until that feature's stage

- **WHEN** a feature CSS file has literal theme values from before this change AND its stage in the staged rollout has not yet executed
- **THEN** the literals MAY remain (no immediate change required); they MUST be replaced when that feature's rollout stage executes

#### Scenario: Brand-color literals continue to use existing brand tokens

- **WHEN** a component needs the brand purple or brand blue
- **THEN** it references `--primary-color` or `--secondary-color` (the existing tokens), not the literal hex values
