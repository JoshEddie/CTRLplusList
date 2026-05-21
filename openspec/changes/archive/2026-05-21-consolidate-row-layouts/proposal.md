## Why

`.choose-items-row` at `/lists/[id]/choose-items` is the last surviving parallel row-layout in the codebase. The archived change `replace-storelinks-expand-with-popover` explicitly scoped the migration of choose-items onto the shared row primitive (proposal §"Choose-items migration"), but at implementation time §13 was pragmatically downscoped to *mobile card-feel + descriptions only* and the literal grid-template / JSX consolidation was **deferred to a focused follow-up change `consolidate-row-layouts`** (the active spec for `item-store-links` even names this change by slug — see the "Note (deferred)" under the choose-items requirement).

This is that change. Closing the gap removes:

- The bespoke `.choose-items-row` 4-col grid (`22px 56px 1fr auto`) that diverges from the shared `.item-list .item-container` / `.sortable-item .item-container` 5-col grid (`52px 1fr auto auto auto / auto auto`).
- The hand-rolled `.choose-items-chip` / `.choose-items-chip-static` pseudo-buy-links that bypass the `item-store-links` primitive (no tall pill, no `+N` popover, no token clean-up — they predate the popover spec entirely).
- A `<button aria-pressed>` row wrapping a real `<a>` chip — a semantic conflict that today works only because of `e.stopPropagation()` on the chip's `onClick`. Replacing with the `<CheckboxField>` primitive from `form-field-system` restores native a11y semantics and lights up the system's 44×44 touch-target floor for free.
- `:focus-visible` blindness on the row (today's `.choose-items-row` only styles `:hover`, no keyboard indicator).
- Hard-coded color literals `#fff5f5`, `#fee2e2`, `#f87171` on the `.is-removing` state modifiers that dodged the Stage 5.7 token migration.

Inherited constraints already binding via active specs:

- `item-store-links` SHALL NOT permit page-scoped chip implementations to bypass the popover primitive — the spec says the chip row "SHALL render in a single line at all times" via the `.storeLinks` primitive (with the `+N` `<Menu>` for extras). Choose-items violates this today.
- `form-field-system` SHALL render every checkbox via `<CheckboxField>` (which wraps `<input type="checkbox">` in a 44×44 `<label>` — see Requirement "Checkbox sizing"). Choose-items violates this with a `<span>`-with-conditional-`<svg>` pseudo-checkbox today.
- `item-store-links` Requirement "Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions" explicitly carries a deferred-piece note that names this change as the resolution.
- `list-item-management` Requirements about page behavior (toolbar URL params, save diffing, selection preservation, archived-badge rendering) are NOT changing — this change is layout-only.

## What Changes

- **MIGRATE** `.choose-items-row` JSX to consume the shared row primitive. The row body (image + name + price + leader-dots + store chips + price column) is delegated to `<Item preview />`, which already exists for exactly this kind of non-interactive embed (used today in the item-form V2 split-pane preview). The choose-items page adds a leading **checkbox slot** (analog of how `.sortable-item` adds a leading drag-handle slot) and lets `Item` render the rest. **BREAKING (visual)**: row anatomy changes from "hand-rolled 4-col grid with 56px thumb" to "shared 5-col grid + leading 22px checkbox slot, 52px square thumb, leader-dotted price row, tall buy-link pill" at ≥600px, and to the shared mobile horizontal-card layout (52px thumb upper-left, name/price stacked right, description full-width row, store-chip + action row full-width) at `<600px`. The change preserves every behavior the page already exposes — selection toggle, "IN LIST" badge, archived badge, change-tracking count + Undo, sticky footer, save diff.

- **REPLACE** the `<button aria-pressed>` row wrapper + nested `<a>` chips with a `<label>`-wrapped `<CheckboxField>` plus the shared `<Item preview />` body. The whole `<label>` toggles selection; the buy-link chips inside `Item` render via the shared `<StoreLinks>` primitive (which inherits the `+N` popover behavior). **`preview` mode of `<Item>` renders chips as live `<LinkButton>` pills, not static labels** — clicking a buy-link opens the store; clicking anywhere else on the label toggles selection. The stopPropagation hack goes away because the elements have distinct interactive semantics now (label-click vs anchor-click), not stacked semantics on one button.

- **DELETE** `.choose-items-row`, `.choose-items-cb`, `.choose-items-cb.is-on`, `.choose-items-cb.is-removing`, `.choose-items-thumb`, `.choose-items-thumb-empty`, `.choose-items-main`, `.choose-items-name`, `.choose-items-name.is-strike`, `.choose-items-from`, `.choose-items-description`, `.choose-items-chips`, `.choose-items-chip`, `.choose-items-chip:hover`, `.choose-items-chip-static`, `.choose-items-right`, `.choose-items-price`, `.choose-items-price.is-muted`, `.choose-items-stores-count`, the mobile `@media (max-width: 599px)` override for `.choose-items-row` / `.choose-items-thumb`, and the `@media (max-width: 500px)` override for `.choose-items-row` / `.choose-items-thumb` / `.choose-items-from` — the shared row CSS in `item.css` already provides these treatments via the same selectors that drive `.item-list` and `.sortable-item`.

- **RETAIN** as additive modifier rules (these are page-scoped state for the picker, not row-layout primitives): `.choose-items-in-badge`, `.choose-items-archived-badge`, `.choose-items-list`, `.choose-items-list > li`, the **`.is-on` and `.is-removing` background-color modifiers** (now applied to the `<label>` wrapper as additive overrides on top of the shared row's default background), the **strike-through `.is-strike` modifier** for the item name in the removing-from-list state, the `.choose-items-pg-hd*` page header (unchanged from Stage 5.4), and the `.choose-items-sticky-ft*` footer (unchanged).

- **TOKEN-IZE** the `.is-removing` color values: `#fff5f5` → a new `--remove-bg` token (or reuse `--secondary-background-color` if visual review accepts it); `#fee2e2` / `#f87171` only existed on the deleted `.choose-items-cb.is-removing` so they disappear with the rule. The single remaining `.is-removing` background literal on the row gets a token.

- **REMOVE** the `<button>`-on-row + `aria-pressed` + `onClick={toggle}` + `e.stopPropagation()` plumbing in `ChooseItemsForm.tsx`. The `<label>`-wrapping-`<input>` model handles toggle natively via React `onChange`.

- **NO CHANGE** to `list-item-management` requirements (page behavior, server actions, toolbar URL params, redirect rules, returnTo plumbing, archived-badge rendering — all preserved by construction since this is a row-shape migration, not a feature change).

## Capabilities

### New Capabilities

<!-- None. This change consolidates onto existing primitive contracts. -->

### Modified Capabilities

- `item-store-links`: tightens the "Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions" requirement — the deferred "literal grid-template unification" piece is no longer deferred; choose-items SHALL share the same outer grid, the same mobile reflow rules, and SHALL render its buy-link chips via the shared `<StoreLinks>` primitive (not via the page-scoped `.choose-items-chip` rule). The "Note (deferred)" paragraph naming this change as the follow-up is removed (resolved here).

- `list-item-management`: tightens the row-rendering contract for the choose-items page. Today's requirements (toolbar, save diff, selection preservation, archived badge, returnTo) are unchanged in BEHAVIOR. The page's row-rendering MUST consume the shared row primitive (`<Item preview />` body + leading checkbox via `<CheckboxField>`) — establishing that choose-items rows are layout-equivalent to items-library rows with a checkbox added, not a parallel implementation. The "IN LIST" badge, archived badge, strike-through on removing, and selection background modifiers (`.is-on`, `.is-removing`) SHALL remain as additive page-scoped modifiers on top of the shared row.

## Impact

### Components
- **`app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx`** — significant rewrite of the row JSX (~150 lines simplify to ~30): drop the `<button>` row wrapper, the hand-rolled checkbox `<svg>`, the inline `<img>`/empty-thumb, the name/description/from-label/chips/right-column markup, the `e.stopPropagation()` on chip onClick. Replace with `<label class="choose-items-select">` wrapping `<CheckboxField>` + `<Item preview />`. Toggle state moves from `onClick` to `onChange` on the checkbox input.

### Styles
- **`app/(main)/lists/ui/styles/list.css`** — delete the ~250 lines of `.choose-items-row` / `.choose-items-cb` / `.choose-items-thumb*` / `.choose-items-main` / `.choose-items-name` / `.choose-items-from` / `.choose-items-description` / `.choose-items-chips*` / `.choose-items-chip*` / `.choose-items-right` / `.choose-items-price*` / `.choose-items-stores-count` rules plus their `@media (max-width: 599px)` and `@media (max-width: 500px)` overrides. Retain `.choose-items-list`, `.choose-items-list > li`, `.choose-items-in-badge`, `.choose-items-archived-badge`, `.choose-items-pg-hd*`, `.choose-items-sticky-ft*`, `.choose-items-count*`, `.choose-items-undo`. Add `.choose-items-select` (the new `<label>` wrapper — `display: block; cursor: pointer; position: relative;`) plus state modifier rules (`.choose-items-select.is-on { background: var(--card-accent-background-color); }`, `.choose-items-select.is-removing { background: var(--remove-bg); }`) and a strike-through rule for the item name inside `.is-removing` rows.

### Tokens
- **`app/ui/styles/global.css`** — add `--remove-bg` (the tokenized replacement for `#fff5f5`) if visual review confirms a distinct removing-state background is needed. Else reuse `--secondary-background-color` and skip the token addition.

### Spec deltas (delivered with this change)
- `openspec/changes/consolidate-row-layouts/specs/item-store-links/spec.md` — MODIFIED delta to the existing Requirement "Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions" (tightens to full grid-template parity; removes the deferred-note paragraph).
- `openspec/changes/consolidate-row-layouts/specs/list-item-management/spec.md` — MODIFIED delta adding a new Requirement on choose-items row composition (MUST consume the shared row primitive + `<CheckboxField>`).

### Primitives consumed (unchanged contracts)
- `<Item preview />` from `app/(main)/items/ui/components/Item.tsx` — already exists; used today by the item-form V2 split-pane preview. The `preview` prop suppresses the modal-and-mutations branch and renders a non-interactive card body. Buy-link chips inside `<StoreLinks>` remain live `<a>` elements (good — picker users wanting to research a store mid-pick can do so without breaking selection state). `<CheckboxField>` from `app/ui/components/field/CheckboxField.tsx` — already exists; `form-field-system` mandates its use for every checkbox.
- `<StoreLinks>` (and the `+N` `<Menu>` popover) inherit by composition through `<Item>` — no direct consumption from `ChooseItemsForm.tsx`.

### Cache tags
- No reads or mutations change. `setListItems` server action and its `items` / `lists` cache-tag invalidation are untouched.

### Risk
- **Click-target tension on chips**: the buy-link chips inside `<Item preview />` are live `<a target="_blank">`. A user trying to *tap-toggle* an item but landing on a chip will navigate to the store instead. Mitigation: chips inside the picker label are visually small relative to the row, but if user testing shows real misclicks, the fallback is to set `pointer-events: none` on `.choose-items-select .storeLinks a` (the chips remain visible for context but become non-interactive in picker mode). This is a deliberate scope choice — start with live chips since that matches what the items library shows, fall back only if needed.
- **`<Item preview />` not visually tested as a picker-row body**: today `preview` is only used in the item-form modal. Verify the row reads cleanly at every breakpoint covered by the items-library row (≥600px D3, 400–599px M1, <400px M1-kebab — though kebab is owner-actions and won't render in the picker since the picker viewer is by definition the owner of the items but not editing them in this flow). Owner edit/archive icons in col 5 are not relevant in the picker context and should be suppressed via a new `previewActions={false}` (or equivalent) prop on `<Item>` — TBD in design.md.
- **Strike-through state on the removing label**: today the `<button>` row applies `is-strike` to `.choose-items-name`. In the new shape, the name is rendered by `<Item>` (which doesn't know about removing state). Resolution: apply the strike via the page-scoped `.choose-items-select.is-removing .itemName` selector (additive CSS, no component prop needed). Documented as a page-scoped exception in `list.css`.

### Out of scope
- Any change to the `.choose-items-pg-hd*` page header (Stage 5.4 work, intentionally preserved).
- Any change to the `.choose-items-sticky-ft*` footer or the change-tracking count logic (preserved by construction).
- Any change to URL-driven toolbar behavior or the `setListItems` server action.
- Any change to the items library's row layout (the shared primitive is the source of truth and is already correct).
- Any change to the `<Item>` component's grid/list/preview rendering in its existing contexts.
- Any new primitive — this change consumes existing primitives only.
