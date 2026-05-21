## ADDED Requirements

### Requirement: The hero SHALL render as a single continuous gradient panel containing two semantic zones

The list-detail hero SHALL render as one continuous gradient panel (a `.list-hero-grid` container carrying `--hero-gradient` as its sole background) containing two semantic zones — an identity zone (`.list-hero-card-identity`) and a controls zone (`.list-hero-card-controls`). Both zones SHALL be transparent and SHALL NOT carry their own gradient backgrounds. The two zones SHALL be differentiated by their content composition (typography vs. controls), NOT by a visible vertical divider between them at desktop widths.

At viewport width ≥ 800px, the two zones SHALL render side-by-side in a single flex row.

At viewport width < 800px, the two zones SHALL stack vertically inside the same gradient panel, separated by a horizontal hairline divider rendered as the controls zone's `border-top`.

#### Scenario: Desktop renders one gradient panel with two side-by-side zones

- **WHEN** the hero renders at viewport width ≥ 1024px
- **THEN** `.list-hero-grid` carries `--hero-gradient` as its background; `.list-hero-card-identity` and `.list-hero-card-controls` render as siblings inside it with transparent backgrounds and no visible divider between them

#### Scenario: Mobile renders one gradient panel with stacked zones and a hairline divider

- **WHEN** the hero renders at viewport width ≤ 480px
- **THEN** the hero renders as a single gradient panel containing identity content on top, a horizontal hairline divider, then controls content below; no visible gap appears between the two halves

### Requirement: The identity card SHALL anchor its top group to the top edge and its footer line to the bottom edge

`.list-hero-card-identity` SHALL be a flex column with `justify-content: space-between`. Its first child SHALL be a top group (`.list-hero-identity-top`) containing — in order — an optional eyebrow, the title, and an optional subtitle. Its last child SHALL be a footer line (`.list-hero-identity-foot`) containing item count and last-updated relative time. Any interior flex slack between the two groups SHALL grow or shrink so the identity card's final height matches the controls card's final height.

The footer line SHALL render even when the list has zero items (rendering "0 items · updated …" rather than being omitted).

#### Scenario: Top group anchors top, footer anchors bottom

- **WHEN** the identity card renders at any viewport width on desktop (≥ 800px)
- **THEN** the eyebrow / title / subtitle group is positioned at the top edge of the identity card's padding box and the footer line is positioned at the bottom edge

#### Scenario: Identity card matches controls card height

- **WHEN** the controls card's content (owner: Share + status pill + secondary actions; viewer: avatar group + Share/Bookmark pair) computes to a height H at desktop widths
- **THEN** the identity card's rendered height also equals H, with the interior space between top group and footer absorbing the difference

#### Scenario: Footer line shows item count and relative time

- **WHEN** the list has N items and was last updated T ago
- **THEN** the footer line renders the literal text "N items · updated T ago" (e.g. "12 items · updated 2 days ago") with appropriate pluralization of "item" / "items" and a human-readable relative-time format

### Requirement: The occasion SHALL render as an eyebrow inside the identity zone, not as an inline chip in a meta row

When `list.occasion` is non-empty, the occasion text SHALL render as an eyebrow label inside `.list-hero-identity-top`, paired with the subtitle on the same flex row (`.list-hero-eyebrow-subtitle-wrapper`) when a subtitle exists, or standalone above the title when no subtitle exists. The eyebrow SHALL carry small-caps, 700 weight, letter-spacing, and a white-on-translucent visual treatment that matches the previous `.list-hero-chip` vocabulary.

When `list.occasion` is empty, the eyebrow slot SHALL NOT render any visible content.

The inline `.list-hero-chip` element from the prior meta-row composition SHALL no longer exist after this change.

#### Scenario: Non-empty occasion renders as eyebrow with subtitle pair

- **WHEN** a list with `occasion = "WEDDING"` and a non-empty `subtitle` renders
- **THEN** the rendered DOM contains an eyebrow element ("WEDDING") and the subtitle as siblings inside `.list-hero-eyebrow-subtitle-wrapper`
- **AND** no `.list-hero-chip` element exists in the hero

#### Scenario: Empty occasion omits the eyebrow

- **WHEN** a list with `occasion = null` or empty string renders
- **THEN** no eyebrow text is visible in the rendered hero

### Requirement: The visibility picker SHALL render in the identity zone at the top, paired with Share

On owner views (not preview mode), the `<VisibilityPicker>` component SHALL render inside `.list-hero-identity-top`, anchored at the top of the identity zone (above the title) inside a wrapper element (`.list-hero-share-wrapper`). The picker's internal composition — the trigger pill, the popover body, the three-row radio menu, and the label vocabulary (`'private'` → "Just me", `'unlisted'` → "Private", `'public'` → "Shared") — is governed by the `list-visibility` capability; this requirement specifies only its placement inside the hero.

When the list's current visibility is NOT `'private'`, the `<ShareButton>` SHALL render as a sibling of the visibility picker inside `.list-hero-share-wrapper`, so the picker and Share affordance form a single visual cluster at the top of the identity zone. When visibility IS `'private'`, the Share button SHALL be omitted (sharing a private list invokes a separate prompt-and-promote flow inside `<ShareButton>` that's redundant here).

The visibility picker SHALL NOT be rendered inside the controls zone after this change.

#### Scenario: Owner sees visibility picker + Share above the title on a shared list

- **WHEN** the owner views their own list (non-preview) with `visibility = 'public'`
- **THEN** `.list-hero-identity-top` contains, in DOM order: a `.list-hero-share-wrapper` containing `<VisibilityPicker>` and `<ShareButton>`; then the title; then (if applicable) the eyebrow + subtitle wrapper
- **AND** the controls card does NOT contain `<VisibilityPicker>`

#### Scenario: Private list omits the Share button next to the picker

- **WHEN** the owner views their own list with `visibility = 'private'`
- **THEN** `.list-hero-share-wrapper` contains only `<VisibilityPicker>` — no `<ShareButton>` sibling

#### Scenario: Picker is hidden on viewer and preview views

- **WHEN** a non-owner views the list, OR the owner views the list in preview mode
- **THEN** no `<VisibilityPicker>` is rendered anywhere in the hero

### Requirement: Owner views SHALL NOT render the owner identity inside the hero

On owner views (non-preview), no element of the hero SHALL render an avatar, owner name, owner-byline `<FaUser>` icon, or Follow button. The visibility picker and Share button (placed in the identity zone) are the only owner-context affordances that summarize the list's social state; "who owns this list" is implicit on owner views.

#### Scenario: Owner identity is absent from owner hero

- **WHEN** the list owner views their own list (non-preview)
- **THEN** no avatar element, no owner name text, and no Follow button is rendered anywhere in the hero

#### Scenario: Owner preview view follows viewer composition

- **WHEN** the owner views their own list via `?preview=viewer`
- **THEN** the hero renders the viewer composition (including the owner's own identity as if a viewer were looking at it), so the owner can preview how viewers will see their list — except no Follow button is rendered (since following yourself is meaningless)

### Requirement: Viewer views SHALL anchor on a byline group containing avatar, linked owner name, and Follow

On viewer views (the authenticated viewer is not the list owner, on a non-preview view), the controls card SHALL render — at the top of the controls card — a byline group containing in left-to-right order:

1. A 44px avatar (`<Avatar>`) resolved via the chain: `user.image` → our own initials chip generated from `users.name` → a generic `<FaUser>` icon (defensive fallback only).
2. The owner's name rendered as a link to `/user/{owner_id}` (per the `following` capability).
3. The Follow / Following button (per the `following` capability's colocation requirement), stretched to fill the byline column.

The avatar, name, and Follow button SHALL be visually grouped (flex siblings with shared alignment) such that they read as one unit anchoring the controls card. The Follow button SHALL satisfy WCAG 2.5.5 (44×44 CSS px touch target) as required by the `following` capability.

#### Scenario: Viewer sees avatar + linked name + Follow grouped

- **WHEN** an authenticated viewer (not the owner) on a non-preview view loads a non-private list
- **THEN** the controls card's top group contains a 44px avatar, the owner's name as an anchor with `href="/user/{owner_id}"`, and a Follow / Following button — all visually grouped inside `.list-hero-byline-group`

#### Scenario: Avatar falls back when user.image is null

- **WHEN** the list owner's `user.image` is null
- **THEN** the avatar renders an initials chip generated from `users.name` (first letter, on a brand-tinted background) at the same 44px size

### Requirement: The action set inside the controls card SHALL differ between owner and viewer views

The controls card's action affordances SHALL be composed as follows:

**Owner view (non-preview):**
- The controls card contains, in DOM order: an action row with Edit list + the `ListActionsMenu` kebab (Edit grows to fill, kebab pulls right at fixed size), followed by the Choose items button as a full-width affordance on its own row.
- No Share button is rendered inside the controls card on owner views — Share is paired with the visibility picker in the identity zone (per the requirement above).
- No hairline divider is required inside the owner controls card; the row + button stack reads cleanly without one.

**Viewer view (non-preview, authenticated):**
- Top: byline group (avatar + linked name + Follow) — defined by the requirement above.
- A hairline divider separates the byline group from the action block.
- Action block: Share and Bookmark rendered as two equal peer buttons (50/50 width split).

**Owner preview mode:** the action block renders only the preview-related controls already governed by the existing preview UX (the spoiler/preview toggles inside `ListActionsMenu` and the "Exit preview" affordance); the visibility status pill and the secondary action pair (Choose items / Edit) SHALL be hidden in preview mode, mirroring current behavior.

#### Scenario: Owner controls card has Edit+kebab row, then Choose items

- **WHEN** the owner views their own list (non-preview)
- **THEN** the controls card contains, in DOM order: a `.list-hero-action-row` with Edit list and the `ListActionsMenu` kebab inside; then a full-width Choose items link below
- **AND** no Share button is rendered inside the controls card (Share is paired with the visibility picker in the identity zone)

#### Scenario: Viewer sees Share and Bookmark as 50/50 peers below the byline

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** the controls card's action block contains exactly two buttons (Share and Bookmark) rendered at equal width, with no Follow button in the action block (Follow lives in the byline group above the divider)

#### Scenario: Viewer Share button has the same behavior as today

- **WHEN** a viewer clicks Share
- **THEN** the existing `<ShareButton>` behavior runs unchanged (desktop: copy URL to clipboard with toast; mobile: invoke `navigator.share`)

### Requirement: All hero text SHALL meet WCAG 2.1 AA contrast against its actual rendered background

Every text node rendered inside `.list-hero` (or its mobile single-panel equivalent) SHALL meet the WCAG 2.1 AA contrast ratio against the background pixel directly behind it, computed via the standard sRGB relative-luminance formula. The applicable ratio SHALL be:

- 4.5:1 for normal text (regular weight under 24px, or bold weight under 18.66px).
- 3:1 for large text (regular weight ≥ 24px, or bold weight ≥ 18.66px) and for non-decorative icons that convey information.

Because gradient text-background pairings vary across the rendered card region, the worst-case (lightest) pixel of the gradient inside the text's bounding box SHALL be used for evaluation. Text rendered over a composite (e.g., an eyebrow with translucent fill over the gradient) SHALL be evaluated against the composited result.

#### Scenario: Eyebrow text meets normal-text contrast against its composite

- **WHEN** an eyebrow renders over its translucent fill on top of the card gradient
- **THEN** the rendered text color achieves ≥ 4.5:1 contrast against the composited background

#### Scenario: Footer line meets normal-text contrast

- **WHEN** the footer line renders inside the identity card
- **THEN** the rendered text color achieves ≥ 4.5:1 contrast against the lightest pixel of the card gradient under the text

#### Scenario: Title meets large-text contrast

- **WHEN** the title renders inside `.list-hero-identity-top`
- **THEN** the rendered text color achieves ≥ 3:1 contrast against the lightest pixel of the card gradient under the text

### Requirement: Hero presentation SHALL NOT introduce a page-scoped override of any interactive primitive's class

The hero SHALL consume `<Button>`, `<PopoverTrigger>`, `<SegmentedControl>`, `<CheckboxField>`, and `ListActionsMenu` (Menu primitive) via their public APIs only. Page-scoped CSS rules that override the geometry, padding, border-radius, or core color tokens of `.btn`, `.popover-trigger`, `.segmented`, or `.menu-item` SHALL NOT be introduced.

The existing on-dark `<CheckboxField>` color overrides in `.list-hero-side .visibility-picker .checkbox_field` are pre-existing per the `standardize-form-fields` design decision and MAY be preserved (relocated as needed inside the popover body) but SHALL NOT be expanded to override additional properties.

#### Scenario: No new page-scoped class overrides

- **WHEN** the redesign ships
- **THEN** no new CSS rule in `app/(main)/lists/ui/styles/list.css` targets `.btn`, `.popover-trigger`, `.segmented`, or `.menu-item` (or their descendants) to override geometry, padding, border-radius, or palette tokens; any required visual adjustments are handled by the consuming primitive's API or by adding a normative variant to the primitive's spec via a separate change
