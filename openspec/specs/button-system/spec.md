# button-system Specification

## Purpose

TBD - created by archiving change standardize-buttons. Update Purpose after archive.
## Requirements
### Requirement: Shared button design tokens

The system SHALL expose button visual properties as CSS custom properties in `app/ui/styles/global.css` so that every button style file consumes the same source of truth. Tokens MUST cover at minimum: radius, padding (x and y), font size, font weight, minimum height, minimum width, and focus-ring color. Token names MUST use the `--btn-` prefix to avoid collisions with other in-flight token work.

#### Scenario: A new button-related stylesheet needs sizing values

- **WHEN** a developer writes a new button-related CSS rule
- **THEN** they consume `--btn-*` tokens rather than hardcoding pixel values, and updating a token changes every button uniformly

#### Scenario: Token surface coexists with the in-flight redesign tokens

- **WHEN** the `redesign-home-and-tokens` change introduces its own tokens
- **THEN** button tokens are namespaced under `--btn-` so there is no collision

### Requirement: Standard buttons meet WCAG 2.5.8 touch-target size at every viewport

The system SHALL render standard-size buttons at no less than 44 CSS pixels in both height and width at every viewport, including mobile. This applies to every button rendered via `<Button>` or `<LinkButton>` with the default (`md`) size.

#### Scenario: Button rendered on a desktop viewport

- **WHEN** a `<Button variant="primary">` is rendered at viewport widths above 1000px
- **THEN** its computed height and width are at least 44 CSS pixels

#### Scenario: Button rendered on a mobile viewport

- **WHEN** the same button is rendered at viewport widths at or below 1000px
- **THEN** its computed height and width remain at least 44 CSS pixels — mobile rules MUST NOT reduce a standard button below the floor

#### Scenario: Pre-existing mobile-shrink rule is removed

- **WHEN** the form-shell stylesheet is inspected after this change
- **THEN** the rule at `form-shell.css:632-634` that reduced padding/font for `.form-shell-btn-*` under 1000px no longer exists; the class itself is deleted after call-site migration

### Requirement: Small-size button opt-out with documented spacing

The system SHALL provide a `sm` size variant for genuinely-small contexts (pagination, chips, dense toolbars). Small buttons MAY render below 44 CSS pixels but MUST be at least 24×24 CSS pixels and MUST be spaced so that a 24 CSS-pixel circle centered on each button does not overlap a neighboring interactive target, satisfying the WCAG 2.5.8 spacing exception.

#### Scenario: Pagination uses small buttons

- **WHEN** the items pagination renders multiple page-number buttons via `<Button size="sm">` (or equivalent)
- **THEN** each is at least 24×24 CSS pixels and adjacent buttons have margin sufficient for the 24px spacing exception to hold

#### Scenario: A standard button is mistakenly placed in a dense layout

- **WHEN** a developer uses the default (`md`) size in a dense layout
- **THEN** the 44px floor still applies; the resolution is to opt into `size="sm"` with a documented inline reason, not to override the floor

### Requirement: Buttons render a visible focus indicator on keyboard focus

The system SHALL render a visible focus indicator on every button when reached by keyboard navigation. The indicator MUST be styled via `:focus-visible` so mouse clicks do not produce a persistent focus ring, and MUST meet WCAG 1.4.11 contrast (3:1 against the adjacent background) for every variant including `on-dark`.

#### Scenario: User tabs to a light-surface button

- **WHEN** a keyboard user tabs to a `<Button variant="primary">` or `secondary` or `ghost` or `danger`
- **THEN** a visible focus indicator appears and meets 3:1 contrast against the button's background

#### Scenario: User tabs to an on-dark button

- **WHEN** a keyboard user tabs to a `<Button variant="on-dark">` on a saturated purple surface
- **THEN** a visible focus indicator appears with sufficient contrast against the dark surface (typically a white or light-colored ring)

#### Scenario: User clicks a button with a mouse

- **WHEN** a mouse user clicks any button
- **THEN** no persistent focus ring appears (the `:focus-visible` rule does not fire for mouse interaction in modern browsers)

### Requirement: Hover styles do not stick on touch devices

The system SHALL guard every button `:hover` rule with `@media (hover: hover)` so touch-only devices (iOS Safari, Android Chrome) do not retain hover-state colors after a tap.

#### Scenario: User taps a button on an iOS device

- **WHEN** a user taps any button on a touch-only device
- **THEN** after the tap completes the button returns to its rest state — it does not remain in the hover color until another tap

#### Scenario: User hovers a button on a desktop with a pointer

- **WHEN** a user hovers any button with a mouse or trackpad on a `hover: hover` device
- **THEN** the hover style applies as before

### Requirement: Loading state disables the button and announces busy status

The system SHALL ensure that when `<Button>` receives `isLoading={true}`, the underlying `<button>` element has both the `disabled` attribute and `aria-busy="true"` set, and renders a visual spinner alongside (not replacing) its children. Loading state MUST NOT be communicated by label change alone. `<LinkButton>` does NOT support a loading state in this change.

#### Scenario: `<Button>` is rendered with isLoading

- **WHEN** the component receives `isLoading={true}`
- **THEN** the rendered `<button>` has `disabled` and `aria-busy="true"`, a visual spinner is rendered alongside the children, and click events do not fire

#### Scenario: Loading button is announced to assistive tech

- **WHEN** a screen reader user encounters a loading button
- **THEN** the button is announced as busy via `aria-busy`, not solely via a label change

### Requirement: Toggle state is orthogonal to variant and uses aria-pressed

The system SHALL treat toggle behavior as a `pressed` prop independent of `variant`. When `pressed` is defined on `<Button>` or `<LinkButton>`, the rendered element has `aria-pressed={String(pressed)}` and the CSS applies pressed-state styling via the `[aria-pressed="true"]` attribute selector. When `pressed` is undefined, no `aria-pressed` attribute is emitted.

#### Scenario: Bookmark button is in the bookmarked state

- **WHEN** `<Button variant="on-dark" pressed={true} aria-label="Remove bookmark">` is rendered
- **THEN** the element has `aria-pressed="true"` and visually reflects the pressed state per its variant's pressed-state CSS

#### Scenario: Bookmark button is in the unbookmarked state

- **WHEN** `<Button variant="on-dark" pressed={false} aria-label="Bookmark list">` is rendered
- **THEN** the element has `aria-pressed="false"` and visually reflects the unpressed state

#### Scenario: A non-toggle button does not advertise toggle semantics

- **WHEN** a standard `<Button variant="primary">` is rendered without `pressed`
- **THEN** no `aria-pressed` attribute is emitted on the element

#### Scenario: A toggle button on a light surface uses a non-on-dark variant

- **WHEN** a toggle button on a light surface (e.g. `SpoilerToggle` in the items toolbar) is rendered as `<Button variant="secondary" pressed={true}>` or `<Button variant="ghost" pressed={true}>`
- **THEN** the pressed-state CSS for that variant applies — the system MUST provide pressed-state styling for every variant that supports toggle callers, not only `on-dark`. Variant-switching to fake pressed-state (e.g. swapping `primary` ↔ `secondary` based on state) is an antipattern and MUST be migrated to a single variant + `pressed`

### Requirement: Variant set is purely visual and includes on-dark and link

The system SHALL expose exactly these variants for `<Button>` and `<LinkButton>`: `primary`, `secondary`, `ghost`, `danger`, `on-dark`, `link`. Variant names MUST describe visual treatment, not domain or page-region. The previous `.nav` class is replaced by `on-dark`, which serves every saturated-purple surface in the app (header nav, list hero) with one treatment. The `link` variant is a text-button affordance — no border, no background, no horizontal padding, primary-color text, underline on hover — for cases where a button is semantically required but the visual intent is "inline text link" (disclosure affordances, "See all" links).

#### Scenario: Nav header buttons use on-dark

- **WHEN** the nav header renders its links
- **THEN** they are `<LinkButton variant="on-dark">` and produce the same visual output the previous `.btn.nav` did

#### Scenario: Bookmark and follow buttons use on-dark

- **WHEN** bookmark or follow buttons are rendered on the list hero
- **THEN** they are `<Button variant="on-dark" pressed={…}>`, replacing the previous `.btn.secondary.bookmark-button` / `.btn.secondary.follow-button` treatment (which incorrectly used a light-surface variant on a dark surface)

#### Scenario: A developer attempts to use a removed variant name

- **WHEN** code references `variant="nav"`
- **THEN** the TypeScript type check fails (the variant union does not include `nav`)

#### Scenario: Text-button affordance uses link variant

- **WHEN** a button is needed for a disclosure affordance (e.g. "Can't find a URL? Search for an image") or a "See all" link inside body content
- **THEN** the call site uses `<Button variant="link">` or `<LinkButton variant="link">`; the rendered element has no border, no background, no horizontal padding, primary-color text, and underlines on hover

#### Scenario: Link variant opts out of the 44px touch floor

- **WHEN** a `variant="link"` button is rendered inside body copy
- **THEN** the WCAG 2.5.8 spacing exception applies — `min-height`/`min-width` are not enforced on the text-button itself, and the surrounding layout provides adequate spacing to neighboring interactive targets

### Requirement: Two components share a canonical class builder

The system SHALL provide two components at `app/ui/components/button/`: `<Button>` rendering a native `<button>` element, and `<LinkButton>` rendering a Next `<Link>`. Both MUST delegate class composition to a shared `buttonClasses({ variant, size, pressed, extra })` function exported from the same directory, so there is exactly one source of truth for class composition. Both components MUST accept `variant` and `size` props; component-specific props (`isLoading`, `type` for `<Button>`; `href` for `<LinkButton>`) live on the relevant component.

#### Scenario: A developer renders a button

- **WHEN** a developer writes `<Button variant="primary" type="submit">Save</Button>`
- **THEN** the rendered element is a native `<button type="submit">` with classes produced by `buttonClasses({ variant: 'primary' })`

#### Scenario: A developer renders a link styled as a button

- **WHEN** a developer writes `<LinkButton variant="primary" href="/lists">View lists</LinkButton>`
- **THEN** the rendered element is a Next `<Link>` to `/lists` with classes produced by `buttonClasses({ variant: 'primary' })` — visually identical to the `<Button>` equivalent

#### Scenario: Class composition changes affect both components

- **WHEN** the `buttonClasses` function is modified (e.g. to add a new modifier class)
- **THEN** both `<Button>` and `<LinkButton>` reflect the change without per-component edits

### Requirement: All button call sites flow through the components

The system SHALL ensure that after this change, no application code (excluding the components in `app/ui/components/button/` themselves and the explicitly exempt `.gsi-material-button`) uses `className=".*btn.*"` directly on a `<button>` or `<Link>`. All ~47 existing call sites MUST be migrated to `<Button>` or `<LinkButton>`. The legacy classes `.form-shell-btn-primary`, `.form-shell-btn-ghost`, `.form-shell-btn-delete`, `.bookmark-button`, and `.follow-button` (color/layout rules) MUST be deleted. The duplicate wrapper components `app/ui/components/Form/FormButton.tsx` (superseded by `<Button isLoading>`) and `app/(main)/lists/ui/components/EditListButton.tsx` (className-passthrough used at two semantically-different call sites) MUST be deleted, with their callers migrated to use system primitives directly.

#### Scenario: Repo-wide audit finds no legacy button classnames

- **WHEN** the codebase is grepped for `className=.*\bbtn\b` outside `app/ui/components/button/` and outside Google sign-in
- **THEN** no matches exist on application call sites

#### Scenario: Legacy CSS classes are removed

- **WHEN** the codebase is grepped for `.form-shell-btn-`, `.bookmark-button`, or `.follow-button` in CSS files after migration
- **THEN** only the `<Button>`/`<LinkButton>` components reference button classes; the legacy class definitions are gone

#### Scenario: Duplicate wrapper components are removed

- **WHEN** the codebase is grepped for `FormButton` or `EditListButton` imports/JSX after migration
- **THEN** no application code references either; both files are deleted

### Requirement: Icon-only buttons expose an accessible name

The system SHALL ensure every button whose visible content is an icon (no rendered text) carries an `aria-label` describing the action. This applies to `DeleteListButton`, `DeleteItemButton`, `BookmarkButton`, the `ListActionsMenu` trigger, and `Pagination` navigation arrows.

#### Scenario: Screen reader user encounters the delete-list button

- **WHEN** assistive tech reads the icon-only delete-list button
- **THEN** the button is announced with a descriptive name (e.g. "Delete list")

#### Scenario: Screen reader user encounters the bookmark button

- **WHEN** assistive tech reads the icon-only bookmark button
- **THEN** the button is announced with a state-aware descriptive name (e.g. "Bookmark list" vs "Remove bookmark") AND the pressed state is announced via `aria-pressed` per the toggle-state requirement

### Requirement: Vendor sign-in button is excluded from the unified system

The system SHALL leave the `.gsi-material-button` (Google Sign-In) styling unchanged, as it is a vendor brand requirement.

#### Scenario: Google sign-in button is rendered

- **WHEN** the auth flow renders the Google Sign-In button
- **THEN** it retains its existing `.gsi-material-button` styling and is exempt from the `--btn-*` token surface, the 44px floor, and the call-site migration rule

