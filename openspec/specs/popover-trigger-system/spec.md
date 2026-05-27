# popover-trigger-system Specification

## Purpose

TBD - created by archiving change standardize-menus-and-controls. Update Purpose after archive.

## Requirements

### Requirement: PopoverTrigger primitive provides a form-input-styled button

The system SHALL provide a `<PopoverTrigger>` component at `app/ui/components/popover-trigger/PopoverTrigger.tsx` that renders a `<button>` styled as a form-input-shaped dropdown affordance — bordered rectangle, optional left icon, label, optional right-side count badge, chevron-right indicator. `<PopoverTrigger>` is a sibling primitive of `<Button>`, NOT a `<Button>` variant — its geometry (rectangle, not pill) is fundamentally different.

#### Scenario: PopoverTrigger renders with label and chevron

- **WHEN** `<PopoverTrigger label="Stores" onClick={fn} aria-haspopup="dialog" aria-expanded={open} />` is rendered
- **THEN** the rendered element is a `<button type="button">` containing the label and a chevron-right indicator, styled as a form input

#### Scenario: PopoverTrigger with icon and count badge

- **WHEN** `<PopoverTrigger icon={<MdFilterList />} label="Stores" count={3} active={true} ...>` is rendered
- **THEN** the rendered element contains (in order): the icon, the label, a count badge showing "3", and the chevron — and has an `active` visual treatment indicating filters are applied

#### Scenario: PopoverTrigger forwards aria-haspopup and aria-expanded

- **WHEN** the caller passes `aria-haspopup="dialog"` (or `"menu"` / `"listbox"` per the popover body) and `aria-expanded={open}`
- **THEN** the rendered `<button>` has those exact ARIA attributes

### Requirement: PopoverTrigger has no variant prop

The system SHALL NOT expose a `variant` prop on `<PopoverTrigger>`. Visual variants (primary/secondary/ghost-style families) are an explicit non-feature — the trigger has exactly one _control treatment_: bordered rectangle, optional left icon, label, optional right-side count badge, chevron indicator.

The system MAY expose a `tone` prop on `<PopoverTrigger>` for **surface adaptation** — the same dimension `<SegmentedControl tone="...">` already covers. `tone` SHALL be limited to `'light' | 'on-dark'`, default `'light'`. `tone` SHALL change only surface colors (background fill, border, text, focus-ring) — NOT geometry, padding, border-radius, chevron treatment, or the count-badge color contract. The `active` boolean continues to be the only modal styling change layered on top of `tone`.

#### Scenario: A developer attempts to pass a variant prop

- **WHEN** code references `<PopoverTrigger variant="primary" ...>`
- **THEN** the TypeScript type check fails (no `variant` prop in the type signature)

#### Scenario: tone="on-dark" renders translucent-white-on-dark treatment

- **WHEN** `<PopoverTrigger tone="on-dark" label="Shared · in feed" ...>` is rendered on a saturated dark surface
- **THEN** the rendered button has a translucent-white background, a light border, and light label/chevron colors — consistent with the visual language of `<Button variant="on-dark">` and `<SegmentedControl tone="on-dark">`

#### Scenario: tone="light" is the default and matches existing behavior

- **WHEN** `<PopoverTrigger label="Stores" ...>` is rendered without a `tone` prop
- **THEN** the rendered button has the existing form-input-shaped light-surface treatment, unchanged from the prior spec

#### Scenario: tone does not change geometry

- **WHEN** the same `<PopoverTrigger>` is rendered with `tone="light"` and then with `tone="on-dark"`
- **THEN** the rendered `min-height`, `padding`, `border-radius`, chevron position/size, and count-badge geometry are identical across both renders; only surface colors differ

### Requirement: PopoverTrigger consumes the button system's focus and touch contract

The system SHALL ensure `<PopoverTrigger>` reuses the `--btn-focus-ring-color` token and `:focus-visible` model from `button-system`, guards `:hover` with `@media (hover: hover)`, and meets the 44×44 minimum touch target per the `button-system` contract.

#### Scenario: Keyboard user tabs to a PopoverTrigger

- **WHEN** the user reaches a `<PopoverTrigger>` via keyboard
- **THEN** a `:focus-visible` indicator appears with the same contrast contract as `<Button>` focus indicators

#### Scenario: PopoverTrigger meets the 44px touch floor

- **WHEN** a `<PopoverTrigger>` is rendered at any viewport width
- **THEN** its computed height is at least 44 CSS pixels (form-input-shaped doesn't exempt it from the touch target floor)

### Requirement: Filter popovers and list-selection trigger migrate to PopoverTrigger

The system SHALL migrate the trigger button in `StoreFilterPopover.tsx`, `PriceFilterPopover.tsx`, the mobile filters-trigger in `ItemsToolbar.tsx`, and the list-picker trigger in `ListSelection.tsx` (`.if-lp-trigger`) to `<PopoverTrigger>`. Wrappers retain ownership of their popover bodies (which stay page-scoped) and their open/close state. The page-scoped CSS classes `.store-filter-trigger`, `.items-toolbar-filters-trigger`, `.items-toolbar-filters-badge`, `.if-lp-trigger`, `.if-lp-trigger-label`, `.store-filter-badge` MUST be deleted after migration.

#### Scenario: StoreFilterPopover uses PopoverTrigger

- **WHEN** `StoreFilterPopover.tsx` is rendered after migration
- **THEN** its trigger is `<PopoverTrigger icon={<MdFilterList />} label="Stores" count={selectedStores.length || undefined} active={selectedStores.length > 0} onClick={...} aria-haspopup="dialog" aria-expanded={open}>`; the popover panel body remains page-scoped

#### Scenario: PriceFilterPopover uses PopoverTrigger

- **WHEN** `PriceFilterPopover.tsx` is rendered after migration
- **THEN** its trigger is `<PopoverTrigger icon={<MdAttachMoney />} label="Price" count={activeCount || undefined} active={activeCount > 0} ...>`; the price-input body remains page-scoped

#### Scenario: ItemsToolbar filters-trigger uses PopoverTrigger

- **WHEN** `ItemsToolbar.tsx` is rendered after migration
- **THEN** its mobile-filters trigger is `<PopoverTrigger icon={<MdTune />} label="Filters" count={filterCount || undefined} active={filterCount > 0} ...>`

#### Scenario: ListSelection trigger uses PopoverTrigger

- **WHEN** `ListSelection.tsx` is rendered after migration
- **THEN** the `.if-lp-trigger` button is replaced by `<PopoverTrigger label={placeholder-or-add-another} aria-haspopup="listbox" aria-expanded={open}>`; the listbox dropdown body (`.if-lp-menu` + `.if-lp-opt` rows) remains page-scoped per the menu-vs-listbox boundary decision

### Requirement: Popover-body content is not unified by this change

The system SHALL leave the body content of each popover (the floating panel that appears below the trigger) page-scoped. Each popover's body has specialized content — search input + checklist for stores, two number inputs for price, listbox of options for list-selection — and unifying them is out of scope. The trigger is unified; the body is not.

#### Scenario: StoreFilterPopover's body stays page-scoped

- **WHEN** `StoreFilterPopover.tsx` is migrated
- **THEN** `.store-filter-panel`, `.store-filter-search`, `.store-filter-list`, `.store-filter-item`, `.store-filter-empty`, `.store-filter-footer` CSS classes remain in place; only `.store-filter-trigger` is removed

#### Scenario: PriceFilterPopover's body stays page-scoped

- **WHEN** `PriceFilterPopover.tsx` is migrated
- **THEN** `.price-filter-panel`, `.price-filter-inputs`, `.price-filter-field` CSS classes remain in place

#### Scenario: ListSelection's listbox body stays page-scoped

- **WHEN** `ListSelection.tsx` is migrated
- **THEN** `.if-lp` (wrapper), `.if-lp-menu` (listbox container), `.if-lp-opt` (listbox option), `.if-lp-empty`, `.if-lp-top`, `.if-lp-chip` (already absorbed by `standardize-buttons`'s Chip primitive) treatment remains — only the trigger button class is removed

### Requirement: Shared dismiss behavior is provided via a usePopoverDismiss hook

The system SHALL provide a `usePopoverDismiss({ open, onClose, ref })` hook at `app/ui/hooks/usePopoverDismiss.ts` that wires up click-outside detection and Escape-key dismissal. The hook MUST be consumed internally by `<Menu>` and SHOULD be consumed by wrapper components that still own their popover bodies (filter popovers, list-selection) to replace their hand-rolled equivalents.

#### Scenario: Hook closes on outside mousedown

- **WHEN** a component using `usePopoverDismiss({ open: true, onClose, ref })` is mounted and the user mousedowns outside the ref'd element
- **THEN** `onClose` is called

#### Scenario: Hook closes on Escape

- **WHEN** the popover is open and the user presses Escape
- **THEN** `onClose` is called

#### Scenario: Hook does nothing when closed

- **WHEN** `usePopoverDismiss({ open: false, ... })` is mounted
- **THEN** no event listeners are registered (no work is done while the popover is closed)

#### Scenario: Wrapper components consume the hook in place of hand-rolled effects

- **WHEN** `StoreFilterPopover.tsx`, `PriceFilterPopover.tsx`, and `ListSelection.tsx` are migrated
- **THEN** their existing `useEffect`-based click-outside + Escape logic is replaced by `usePopoverDismiss`; the per-component effect duplication is removed

### Requirement: List-detail hero status pill consumes PopoverTrigger tone="on-dark"

The system SHALL render the list-detail hero's visibility-summary status pill as a `<PopoverTrigger tone="on-dark" />`. The trigger SHALL include an icon slot occupied by a state-encoding glyph whose identity changes with the current visibility (`<FaLock />` for `'private'`, `<FaShareAlt />` for `'unlisted'`, `<FaUsers />` for `'public'`), a label derived from the current visibility, and a chevron indicating popover affordance.

#### Scenario: Status pill renders with state-encoded icon, label, and chevron

- **WHEN** the list hero status pill is rendered for a list with `visibility = 'public'`
- **THEN** the rendered element is a `<PopoverTrigger tone="on-dark">` containing (in order): a users/audience icon in the icon slot, the label text "Shared · in feed", and the chevron

### Requirement: PopoverTrigger count badge SHALL render IFF count is a positive number

The `<PopoverTrigger>` component at `app/ui/components/popover-trigger/PopoverTrigger.tsx` SHALL render its count badge `<span class="popover-trigger-count">` if and only if the `count` prop is both `!== undefined` AND `> 0`. A `count` value of `0` SHALL produce no badge span (NOT a `'0'`-text badge); a `count` value of `undefined` (or the prop omitted entirely) SHALL produce no badge span. A `count` value greater than zero SHALL render the badge span with the numeric `count` as its text content. This is the zero-suppression contract: filter affordances that summarize "N filters applied" SHALL render no badge when no filters are applied, not a `0` badge that falsely implies an active filter state.

#### Scenario: count={3} renders the count badge

- **WHEN** `<PopoverTrigger label="Stores" count={3}>` is rendered
- **THEN** the rendered tree contains a `<span class="popover-trigger-count">3</span>` inside the trigger button

#### Scenario: count={0} renders NO badge span

- **WHEN** `<PopoverTrigger label="Stores" count={0}>` is rendered
- **THEN** the rendered tree contains NO `<span class="popover-trigger-count">` element (the `count > 0` half of the gate suppresses the zero case)

#### Scenario: count={undefined} renders NO badge span

- **WHEN** `<PopoverTrigger label="Stores" count={undefined}>` is rendered
- **THEN** the rendered tree contains NO `<span class="popover-trigger-count">` element

#### Scenario: count prop omitted renders NO badge span

- **WHEN** `<PopoverTrigger label="Stores">` is rendered (no `count` prop)
- **THEN** the rendered tree contains NO `<span class="popover-trigger-count">` element

### Requirement: PopoverTrigger chevron SHALL carry aria-hidden="true"

The inline chevron `<svg>` rendered by `<PopoverTrigger>` SHALL carry the attribute `aria-hidden="true"` so assistive technologies do NOT announce the SVG (which would otherwise be read as a generic graphic, or, depending on AT and platform, as the path's `d`-attribute data). The popover-affordance semantic is carried by the consumer-supplied ARIA attributes on the rendered `<button>` (typically `aria-haspopup="menu"` / `aria-haspopup="dialog"` / `aria-haspopup="listbox"` and `aria-expanded={open}`), NOT by the chevron itself; the chevron is purely a visual decoration.

#### Scenario: Chevron is aria-hidden

- **WHEN** `<PopoverTrigger label="Stores">` is rendered
- **THEN** the rendered tree contains a `<svg class="popover-trigger-chevron" aria-hidden="true" …>` descendant of the trigger `<button>`

#### Scenario: Chevron has no role and no accessible name

- **WHEN** `<PopoverTrigger label="Stores">` is rendered
- **THEN** the chevron `<svg>` has no `role` attribute and no `aria-label` — its `aria-hidden="true"` removes it from the accessibility tree entirely

### Requirement: triggerClasses SHALL compose the wrapper class string in fixed token order

The `triggerClasses` helper at `app/ui/components/popover-trigger/triggerClasses.ts` SHALL compose its returned string as `['popover-trigger', tone === 'on-dark' && 'tone-on-dark', active && 'active', extra].filter(Boolean).join(' ')`. The token order SHALL be: (1) `'popover-trigger'` always first; (2) `'tone-on-dark'` second IFF `tone === 'on-dark'` (the `'light'` tone — including the omitted default — does NOT emit a tone token); (3) `'active'` third IFF the `active` argument is truthy; (4) `extra` fourth IFF `extra` is truthy (empty-string and `undefined` `extra` values are filtered out). The composition SHALL be the single source of class strings for `<PopoverTrigger>`, and CSS selectors that combine these classes (e.g. `.popover-trigger.tone-on-dark.active` in `popover-trigger.css`) depend on the fixed order remaining stable across changes.

#### Scenario: No arguments returns the base token

- **WHEN** `triggerClasses()` (or `triggerClasses({})`) is called
- **THEN** the return value is the string `'popover-trigger'` (no leading or trailing whitespace, no tone token, no active token, no extra token)

#### Scenario: Light tone does not emit a tone token

- **WHEN** `triggerClasses({ tone: 'light' })` is called
- **THEN** the return value is the string `'popover-trigger'`

#### Scenario: On-dark tone adds tone-on-dark after popover-trigger

- **WHEN** `triggerClasses({ tone: 'on-dark' })` is called
- **THEN** the return value is the string `'popover-trigger tone-on-dark'` (exactly one space, in order)

#### Scenario: Active adds the active token after the tone token

- **WHEN** `triggerClasses({ tone: 'on-dark', active: true })` is called
- **THEN** the return value is the string `'popover-trigger tone-on-dark active'` (order: base, tone, active)
- **AND** `triggerClasses({ active: true })` returns `'popover-trigger active'`

#### Scenario: Extra is appended last

- **WHEN** `triggerClasses({ tone: 'on-dark', active: true, extra: 'foo' })` is called
- **THEN** the return value is the string `'popover-trigger tone-on-dark active foo'` (order: base, tone, active, extra)
- **AND** `triggerClasses({ active: true, extra: 'foo' })` returns `'popover-trigger active foo'`

#### Scenario: Falsy values are filtered

- **WHEN** `triggerClasses({ active: false })` or `triggerClasses({ extra: '' })` or `triggerClasses({ extra: undefined })` is called
- **THEN** the returned string contains no `'active'` token and no empty-string segment (the falsy value is removed by `.filter(Boolean)`)

### Requirement: usePopoverDismiss SHALL no-op the outside-click handler when ref.current is null

The `usePopoverDismiss({ open, onClose, ref })` hook at `app/ui/hooks/usePopoverDismiss.ts` SHALL guard its `mousedown` document handler with a `ref.current && !ref.current.contains(e.target)` composite check. When `ref.current === null` (the popover body has not yet mounted, or the ref callback has not yet resolved), the handler SHALL do nothing — `onClose` SHALL NOT be called, and `contains` SHALL NOT be invoked on the null reference. This is the mount-race safety: between `setState(open: true)` and the ref-callback resolution that attaches `ref.current`, an outside `mousedown` would otherwise immediately close the popover on the same frame it opened.

#### Scenario: Outside click with null ref does NOT close the popover

- **WHEN** `usePopoverDismiss({ open: true, onClose: spy, ref })` is mounted with `ref.current === null` (a freshly-created `useRef(null)` never attached to any DOM element), and a `mousedown` event is dispatched on `document.body`
- **THEN** `spy` is NOT invoked
- **AND** no `TypeError` is thrown (the `ref.current && …` short-circuit prevents the subsequent `.contains` call)

#### Scenario: Outside click with populated ref does close the popover

- **WHEN** `usePopoverDismiss({ open: true, onClose: spy, ref })` is mounted with `ref.current` populated (pointing at a DOM element), and a `mousedown` event is dispatched on `document.body` (target outside the ref'd element)
- **THEN** `spy` is invoked exactly once (the populated-ref happy path is preserved)

#### Scenario: Inside click with populated ref does NOT close the popover

- **WHEN** `usePopoverDismiss({ open: true, onClose: spy, ref })` is mounted with `ref.current` populated, and a `mousedown` event is dispatched on a descendant of `ref.current`
- **THEN** `spy` is NOT invoked (the `!ref.current.contains(target)` half of the gate flips to false for an inside click)
