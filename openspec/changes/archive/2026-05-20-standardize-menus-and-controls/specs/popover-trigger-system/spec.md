## ADDED Requirements

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

The system SHALL NOT expose a `variant` prop on `<PopoverTrigger>`. The trigger pattern has exactly one visual treatment with an `active` boolean as the only modal styling change. If a future caller surfaces a meaningfully different trigger treatment, that's a separate design exercise — not a variant of this primitive.

#### Scenario: A developer attempts to pass a variant prop
- **WHEN** code references `<PopoverTrigger variant="primary" ...>`
- **THEN** the TypeScript type check fails (no `variant` prop in the type signature)

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
