## MODIFIED Requirements

### Requirement: The visibility picker SHALL render in the identity zone at the top, paired with Share

On owner views (not preview mode), the `<VisibilityPicker>` component SHALL render inside `.list-hero-identity-top`, anchored at the top of the identity zone (above the title) inside a wrapper element (`.list-hero-share-wrapper`). The picker's internal composition — the trigger pill, the popover body, the three-row radio menu, and the label vocabulary (`'private'` → "Just me", `'unlisted'` → "Private", `'public'` → "Shared") — is governed by the `list-visibility` capability; this requirement specifies only its placement inside the hero.

When the list's current visibility is NOT `'private'`, the `<ShareButton>` SHALL render as a sibling of the visibility picker inside `.list-hero-share-wrapper`, so the picker and Share affordance form a single visual cluster at the top of the identity zone. When visibility IS `'private'`, the Share button SHALL be omitted (sharing a private list invokes a separate prompt-and-promote flow inside `<ShareButton>` that's redundant here).

The visibility picker SHALL NOT be rendered inside the controls zone after this change.

Exactly one `.list-hero-share-wrapper` element SHALL render on owner non-preview views, and it SHALL be the direct container of the `<VisibilityPicker>` (and `<ShareButton>` when applicable). On viewer views and on owner preview views, NO `.list-hero-share-wrapper` element SHALL render in the hero at all — neither a populated one nor an empty placeholder. (This forbids a redundant outer wrapper or an empty `.list-hero-share-wrapper` left in `.list-hero-identity-top` when the picker is hidden.)

#### Scenario: Owner sees visibility picker + Share above the title on a shared list

- **WHEN** the owner views their own list (non-preview) with `visibility = 'public'`
- **THEN** `.list-hero-identity-top` contains, in DOM order: a `.list-hero-share-wrapper` containing `<VisibilityPicker>` and `<ShareButton>`; then the title; then (if applicable) the eyebrow + subtitle wrapper
- **AND** the controls card does NOT contain `<VisibilityPicker>`
- **AND** exactly one `.list-hero-share-wrapper` element exists in the hero

#### Scenario: Private list omits the Share button next to the picker

- **WHEN** the owner views their own list with `visibility = 'private'`
- **THEN** `.list-hero-share-wrapper` contains only `<VisibilityPicker>` — no `<ShareButton>` sibling

#### Scenario: Picker is hidden on viewer and preview views

- **WHEN** a non-owner views the list, OR the owner views the list in preview mode
- **THEN** no `<VisibilityPicker>` is rendered anywhere in the hero

#### Scenario: No empty share-wrapper on viewer or preview views

- **WHEN** a non-owner views the list, OR the owner views the list in preview mode
- **THEN** NO `.list-hero-share-wrapper` element is present in the rendered hero (not a populated one, and not an empty placeholder inside `.list-hero-identity-top`)
