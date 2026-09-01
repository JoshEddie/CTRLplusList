## ADDED Requirements

### Requirement: The hero SHALL render a Spoilers tile for a member viewer

Where the viewer resolves a membership on the list's owning profile (`spoiler-visibility`), the hero SHALL render a **Spoilers tile** in the identity zone's control cluster — beside the visibility picker on an owner view, and standalone on a member view that is not acting as the owner. The tile's face SHALL display the viewer's current resolved tier, and activating it SHALL open a menu offering the four stages as an ordered progression — Surprise, Progress, Claims, Identity — with the current stage marked. Choosing a stage SHALL set the transient per-list tier in the page URL (`spoiler-visibility`); it SHALL NOT write the viewer's stored baseline.

A viewer resolving no membership — a non-member or a signed-out viewer — SHALL see no Spoilers tile, since a viewer shown the maximal projection has no tier to adjust. The Spoilers tile SHALL follow the visibility picker's preview suppression: it SHALL NOT render in owner preview mode. On hero collapse the tile's menu is hoisted into the sticky-strip kebab, per `list-hero-collapse`.

The tile is the only spoiler affordance in the hero, and claim visibility is adjusted from it rather than from the items toolbar (`items-browser-chrome` carries no Claims control after this change).

#### Scenario: An owner sees the Visibility and Spoilers tiles together

- **WHEN** the list owner views their own list (non-preview)
- **THEN** the identity zone's control cluster contains the visibility picker and, beside it, the Spoilers tile displaying the owner's resolved tier

#### Scenario: A cross-profile member sees the Spoilers tile without owner controls

- **WHEN** an account holding a membership on profile B opens a list owned by B while acting as profile A
- **THEN** the hero renders the Spoilers tile displaying that account's resolved tier
- **AND** no visibility picker or other owner control renders

#### Scenario: A non-member sees no Spoilers tile

- **WHEN** a viewer resolving no membership on the owning profile opens the list
- **THEN** no Spoilers tile renders in the hero

#### Scenario: Choosing a stage sets the transient tier

- **WHEN** a member opens the Spoilers tile menu and chooses a stage above their baseline
- **THEN** the page URL carries that tier for the current list
- **AND** the viewer's stored baseline is unchanged

## MODIFIED Requirements

### Requirement: The identity card SHALL anchor its top group to the top edge and its footer line to the bottom edge

`.list-hero-card-identity` SHALL be a flex column with `justify-content: space-between`. Its first child SHALL be a top group (`.list-hero-identity-top`) containing — in order — an optional eyebrow, the title, and an optional subtitle. Its last child SHALL be a footer line (`.list-hero-identity-foot`) containing item count, last-updated relative time, and — where the viewer's resolved spoiler tier is `progress` or above (`spoiler-visibility`) — a claimed-progress bar reporting the count of the list's claimed items against its total. Any interior flex slack between the two groups SHALL grow or shrink so the identity card's final height matches the controls card's final height.

The footer line SHALL render even when the list has zero items (rendering "0 items · updated …" rather than being omitted).

**The claimed-progress bar.** Where the resolved tier is `progress`, `claims`, or `identity`, the footer line SHALL additionally carry a progress bar and a "N / M claimed" readout for the list's claimed and total item counts. The count describes the list rather than the visible item set, which is why it sits here and not above the grid: rendered beside a filtered result, a claimed count would read as counting the page. Where the resolved tier is `surprise`, the footer line SHALL carry item count and relative time alone, with no progress bar and no placeholder for one. There is no separate shopper-names affordance in the footer; the who-has-been-shopping disclosure is dropped from the hero.

#### Scenario: Top group anchors top, footer anchors bottom

- **WHEN** the identity card renders at any viewport width on desktop (≥ 800px)
- **THEN** the eyebrow / title / subtitle group is positioned at the top edge of the identity card's padding box and the footer line is positioned at the bottom edge

#### Scenario: Identity card matches controls card height

- **WHEN** the controls card's content (owner: Share + status pill + secondary actions; viewer: avatar group + Share/Bookmark pair) computes to a height H at desktop widths
- **THEN** the identity card's rendered height also equals H, with the interior space between top group and footer absorbing the difference

#### Scenario: Footer line shows item count and relative time

- **WHEN** the list has N items and was last updated T ago
- **THEN** the footer line renders the literal text "N items · updated T ago" (e.g. "12 items · updated 2 days ago") with appropriate pluralization of "item" / "items" and a human-readable relative-time format

#### Scenario: The progress bar joins the footer when the tier discloses the count

- **WHEN** the viewer's resolved tier is `progress` and twelve of the list's thirty-six items carry claims
- **THEN** the footer line additionally renders a progress bar and a "12 / 36 claimed" readout

#### Scenario: Surprise leaves the footer bare

- **WHEN** the viewer's resolved tier is `surprise`
- **THEN** the footer line carries item count and relative time alone, with no progress bar or placeholder for it

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
- Where the viewer holds a membership on the list's owning profile but is acting as a different profile, the action block SHALL additionally render an inline offer to switch to the owning profile, naming it. The offer SHALL be inline and non-blocking rather than an interstitial, which would fire on every such visit while the viewer browses rails as another profile. It SHALL render for any membership — owner or manager — and on every such visit, and SHALL be independent of the viewer's resolved spoiler tier: it reports what the viewer may act as, not what they may see.

**Owner preview mode:** the action block renders only the preview-related controls already governed by the existing preview UX (the "Exit preview" affordance and the preview toggle inside `ListActionsMenu`); the visibility status pill, the Spoilers tile, and the secondary action pair (Choose items / Edit) SHALL be hidden in preview mode, mirroring current behavior. Outside preview, claim visibility is adjusted from the Spoilers tile in the identity zone (per the added requirement above), not from the items toolbar.

Preview mode SHALL render claim information at the **owner's own resolved spoiler tier**, not at the tier a non-member viewer would resolve to. A preview honest about claim data would show every claim with names and spoil the person who opened it; the preview is honest about layout and affordances, and deliberately not about claim data.

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

#### Scenario: A member acting as another profile is offered the switch

- **WHEN** an account holding a manager membership on profile B opens a list owned by B while acting as profile A
- **THEN** the action block renders an inline offer to switch to B, naming B
- **AND** no owner controls render, since the acting profile does not own the list

#### Scenario: The switch offer does not depend on spoiler tier

- **WHEN** the same account's resolved tier is `identity` rather than `surprise`
- **THEN** the switch offer still renders

#### Scenario: Preview renders claim data at the owner's own tier

- **WHEN** the owner enters preview mode with their resolved tier at `surprise`
- **THEN** no claim information renders, exactly as outside preview mode
- **AND** the viewer layout and its affordances render as a non-member would see them
