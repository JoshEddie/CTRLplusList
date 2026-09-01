## MODIFIED Requirements

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

- **WHEN** a toggle button on a light surface is rendered as `<Button variant="secondary" pressed={true}>` or `<Button variant="ghost" pressed={true}>`
- **THEN** the pressed-state CSS for that variant applies — the system MUST provide pressed-state styling for every variant that supports toggle callers, not only `on-dark`. Variant-switching to fake pressed-state (e.g. swapping `primary` ↔ `secondary` based on state) is an antipattern and MUST be migrated to a single variant + `pressed`
