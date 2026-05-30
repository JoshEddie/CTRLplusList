## ADDED Requirements

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
