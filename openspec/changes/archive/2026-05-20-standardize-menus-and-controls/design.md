## Context

`standardize-buttons` consolidated the button surface (`<Button>` + `<LinkButton>` + `<Chip>` + tokens + focus/hover/min-touch contract) and explicitly deferred three patterns whose ARIA models and keyboard semantics didn't fit: dropdown menus, segmented controls, and form-input-shaped popover triggers. Today these patterns live as parallel one-off implementations across ~6 wrapper components:

| Wrapper                          | Pattern                            | Today's primitive                                      |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `ListActionsMenu.tsx`            | Action-list popover                | `.menu-item` `<Link>` rows + danger `<button>`         |
| `UserAvatarPopover.tsx`          | Action-list popover                | `.avatar-popover-item` `<Link>` rows + form `<button>` |
| `VisibilityPicker.tsx`           | Segmented control (Private/Shared) | Two `.visibility-option` `<button role="radio">`       |
| `ItemsToolbar.tsx` (view toggle) | Segmented control (grid/list)      | Two `.view-toggle-btn` `<button aria-pressed>`         |
| `StoreFilterPopover.tsx`         | Form-input-styled popover trigger  | `.store-filter-trigger` raw `<button>`                 |
| `PriceFilterPopover.tsx`         | Form-input-styled popover trigger  | `.store-filter-trigger` (reused class)                 |
| `ItemsToolbar.tsx` (filters)     | Form-input-styled popover trigger  | `.items-toolbar-filters-trigger` raw `<button>`        |
| `ListSelection.tsx` (item form)  | Form-input-styled popover trigger  | `.if-lp-trigger` `<button>` styled as `form-input`     |

Each reimplements its own keyboard handling, click-outside detection, focus model, and visual treatment. Some are accessible (`VisibilityPicker` correctly uses `role="radio"`); some are partially accessible (`ListActionsMenu` has `role="menu"` but no arrow-key navigation); the toggle pair in `ItemsToolbar` uses `aria-pressed` instead of `aria-checked`/`role="radio"`, which is the wrong primitive for a mutually-exclusive choice.

The wrappers themselves are also tangled — `ListActionsMenu` mixes orchestration concerns (state, click-outside, modal coordination) with row markup that should be a primitive. The StoreLinks pattern established in `standardize-buttons` (wrapper owns state + orchestration; internals are system primitives) is the right shape here too, but it requires the primitives to exist first.

This change builds the missing primitives and re-shapes the wrappers around them, in a single focused diff that mirrors the slice-and-sweep cadence of `standardize-buttons`.

## Goals / Non-Goals

**Goals:**

- A11y model correctness: menus get `role="menu"` + arrow-key navigation + Escape + focus return; segmented controls get `role="radiogroup"` + arrow-key navigation (NOT tab); triggers get `aria-haspopup` + `aria-expanded`.
- Visual consistency: any "menu item" anywhere in the app produces identical pixels; any "segmented control" produces identical pixels; any "popover trigger" produces identical pixels.
- Wrapper components retain state ownership and orchestration — they shrink (sometimes substantially) but stay as the right home for app-specific logic.
- Reuse of `standardize-buttons`'s focus-ring / hover-guard / min-touch / token contract — no parallel `--menu-*` / `--seg-*` token surfaces; consume `--btn-*` where the visual permits.
- The primitives compose cleanly with `<Button>` / `<LinkButton>` — a `<Menu>` triggered by a `<Button>`, a `<PopoverTrigger>` that opens a popover containing `<Button>` footer actions.

**Non-Goals:**

- Building a `<Listbox>` primitive. Only one current caller (`ListSelection.tsx`'s `.if-lp-opt` rows). Documented forward-reference for if a second appears.
- Replacing the existing `Modal.tsx` / `ConfirmDialog.tsx` with a `<Dialog>` primitive. Separate concern.
- Building a `<Tooltip>` primitive. Not in current need.
- Portal-based popover positioning (escape from `overflow:hidden`). No current caller needs it; all existing popovers live inside their wrapper's DOM subtree and that works.
- Restyling the popover _bodies_ — the panels themselves (search input + checklist for stores, two number inputs for price, listbox rows for list-selection) stay page-scoped. Only the _trigger_ is unified.
- Fixing the `.if-lp-opt` listbox options. They stay page-scoped (one caller; not a menu).
- Anything in the `button-system` contract — that change is sealed.

## Decisions

### Decision 1: Three separate primitive families, not one

`<Menu>`, `<SegmentedControl>`, and `<PopoverTrigger>` are three distinct ARIA patterns with three distinct keyboard models:

- Menu: `role="menu"` / `role="menuitem"`. Arrow up/down moves between items. Enter/Space activates. Escape closes + returns focus. Home/End jump.
- Segmented control: `role="radiogroup"` / `role="radio"`. Arrow keys move between options AND select (a key difference from listbox/menu). Tab moves between the group and the next focusable, not between options.
- Popover trigger: a single button with `aria-haspopup` + `aria-expanded`. No keyboard model of its own beyond standard button — the popover _body_ owns its own keyboard model after open.

Folding them into one "popover" primitive would either leak ARIA roles through props (`role={'menu'|'radiogroup'|undefined}`) or force the wrong keyboard model on at least one of them. They share _infrastructure_ (click-outside, Escape, focus model), but that's an implementation detail that can be extracted as a hook (`usePopoverDismiss`, see Decision 7) without forcing API conflation.

Alternative considered: a single `<Popover>` primitive with role/keyboard-model props. Rejected — see above. The role and keyboard model are the primitive's identity, not a configuration.

### Decision 2: `<MenuItem>` and `<MenuLinkItem>` split, mirroring `<Button>` / `<LinkButton>`

Same rationale as the button split (Decision 4 of `standardize-buttons`): `<button>` and `<a>` have different native attributes. The split also matches the call-site shape — `ListActionsMenu`'s dropdown is a mix of `<Link>` rows (navigation: "Choose items", "Preview as viewer") and `<button>` rows (action: "Delete list"). One primitive per element type, both consuming a shared `menuClasses()` builder.

`<MenuItem>` accepts `onClick`, `tone: 'default' | 'danger'`, and an optional `icon` slot. `<MenuLinkItem>` accepts `href` and the same `tone` + `icon`. Both render the `role="menuitem"` element.

Alternative considered: polymorphic `<MenuItem as="a">` / `asChild`. Rejected for the same reasons as in `standardize-buttons`: worse types, marginal DX benefit.

### Decision 3: `<Menu>` is a controlled container; the trigger is the caller's choice

`<Menu>` accepts `open: boolean`, `onClose: () => void`, and optionally an `anchorRef` (for positioning). The _trigger_ (the button that opens the menu) stays in the wrapper's hands — typically a `<Button variant="on-dark">` for `ListActionsMenu` (kebab three-dot trigger) or a `<button className="avatar-container">` for `UserAvatarPopover` (avatar image). This lets each wrapper own its trigger's visual contract.

API:

```tsx
<div ref={anchorRef}>
  <Button
    variant="on-dark"
    onClick={() => setOpen(true)}
    aria-haspopup="menu"
    aria-expanded={open}
  >
    <MdMoreVert />
  </Button>
  <Menu
    open={open}
    onClose={() => setOpen(false)}
    anchorRef={anchorRef}
    aria-label="List actions"
  >
    <MenuLinkItem href={`/lists/${id}/choose-items`} icon={<MdChecklist />}>
      Choose items
    </MenuLinkItem>
    <MenuItem icon={<MdModeEdit />} onClick={openEdit}>
      Edit list
    </MenuItem>
    ...
    <MenuItem icon={<MdDeleteForever />} tone="danger" onClick={openDelete}>
      Delete list
    </MenuItem>
  </Menu>
</div>
```

Alternative considered: `<Menu trigger={<Button .../>}>...children</Menu>` — `<Menu>` owns the trigger too. Rejected — that forces the trigger's `aria-expanded` / `aria-haspopup` wiring into `<Menu>` and prevents the caller from styling/positioning the trigger arbitrarily. `ListActionsMenu`'s trigger is a circular kebab (with a page-scoped override) and `UserAvatarPopover`'s trigger is a user-avatar image; neither fits a generic `trigger` slot well.

### Decision 4: `<Menu>` handles arrow-key navigation between items via `data-menu-item` attribute discovery

`<Menu>` queries `[role="menuitem"]` descendants on each open and wires up arrow-up / arrow-down / Home / End to move focus between them. This avoids requiring children to register themselves via a context, which would force `<MenuItem>` to live in a `<Menu>` tree (no flexibility for wrappers that conditionally render items via early returns or fragment patterns).

Alternative considered: React context with a `useMenuItem()` hook that registers each item. Rejected — DOM query is simpler, has no edge cases around fragments / conditional rendering, and the cost is negligible (re-querying on open is O(N items)).

### Decision 5: `<SegmentedControl>` is controlled via `value` / `onChange`, like radio inputs

```tsx
<SegmentedControl
  value={view}
  onChange={setView}
  aria-label="View toggle"
  tone="light"
>
  <SegmentedOption value="grid">
    <MdGridView /> Grid
  </SegmentedOption>
  <SegmentedOption value="list">
    <MdViewList /> List
  </SegmentedOption>
</SegmentedControl>
```

Each `<SegmentedOption>` has `role="radio"`, `aria-checked={value === option.value}`, and `tabIndex={isActive ? 0 : -1}` per the radiogroup roving-tabindex pattern. Arrow keys move focus AND change selection (this is the radiogroup convention; differs from `<Menu>` where arrows only move focus).

Alternative considered: uncontrolled `defaultValue` + `onChange`. Rejected — both current callers (`VisibilityPicker` and `ItemsToolbar` view-toggle) are controlled (their state lives in URL / server-action coordination); controlled is the right default.

Alternative considered: model as a `<ButtonGroup>` of `<Button pressed>` × 2. Rejected — segmented control is `role="radiogroup"`, not a group of independent toggles. Two pressed buttons can both be pressed simultaneously; a segmented control's options are mutually exclusive. The wrong primitive for the wrong reason.

### Decision 6: `<SegmentedControl>` has two `tone` values: `light` and `on-dark`

`VisibilityPicker` sits on the list hero (purple surface → `tone="on-dark"`). `ItemsToolbar` view-toggle sits on a light surface (white items page → `tone="light"`). Two surface contexts, two tones, no per-call-site CSS override. The light tone uses a neutral pill background with primary-color active fill; the on-dark tone uses transparent options with white active fill (matching the existing `VisibilityPicker` treatment after careful study).

Alternative considered: a single tone that reads from `prefers-color-scheme` or a parent class. Rejected — the app doesn't have a dark-mode toggle; the "dark" context is the purple hero surface, which is a styling choice not a color-scheme. Explicit `tone` prop is honest about that.

Alternative considered: borrow `<Button>`'s variant union. Rejected — `<SegmentedControl>` doesn't have `primary` / `secondary` / `danger` etc. as meaningful options. Cross-pollinating the prop name would suggest more variants exist than do.

### Decision 7: Extract a `usePopoverDismiss({ open, onClose, ref })` hook for shared dismiss infrastructure

Click-outside detection, Escape-to-close, and focus return are concerns shared by `<Menu>`, both filter popovers, and the list-selection dropdown. The current implementations all re-roll the same `useEffect` + `mousedown` / `keydown` listeners. Extract once at `app/ui/hooks/usePopoverDismiss.ts`.

```ts
function usePopoverDismiss({
  open,
  onClose,
  ref,
}: {
  open: boolean;
  onClose: () => void;
  ref: RefObject<HTMLElement | null>;
}): void;
```

Used by `<Menu>` internally and by the wrapper components (filter popovers, list-selection) that still own their own popover body.

Alternative considered: build dismiss into each primitive. Rejected — the filter-popover wrappers still own their popover bodies (those stay page-scoped), so a dismiss hook is the right shape for them too. A primitive-only abstraction wouldn't help them.

### Decision 8: `<PopoverTrigger>` is form-input-shaped, not button-pill-shaped

The trigger pattern (Stores / Price / Filters / list-selection trigger) visually emulates a `<select>` — bordered rectangle, optional icon left, label, optional badge, chevron right. It's a sibling primitive of `<Button>`, not a `<Button>` variant. Reasoning: `<Button>` is pill-shaped; folding the form-input rectangle into it as a variant would mean a variant with fundamentally different geometry, conflicting with Decision 3 of `standardize-buttons` (variant is purely visual treatment, not layout).

API:

```tsx
<PopoverTrigger
  icon={<MdFilterList />}
  label="Stores"
  count={selectedStores.length || undefined}
  active={selectedStores.length > 0}
  open={open}
  onClick={() => setOpen((o) => !o)}
  aria-haspopup="dialog" // or "menu"/"listbox" per the popover body
/>
```

`<PopoverTrigger>` consumes the `--btn-*` token surface for focus-ring color, hover guard, and min-touch contract, but composes them with form-input visual cues (border, chevron, badge). It does NOT take a `variant` prop — the trigger pattern has exactly one treatment, with an `active` state (filters applied) as the only modal styling change.

Alternative considered: `<Button variant="form-input">`. Rejected — see above; the layout is too different.

Alternative considered: fold into the segmented control as a "single-option" mode. Rejected — semantically and visually unrelated; segmented control is mutually-exclusive selection, trigger is "open something."

### Decision 9: Boundary between menu and listbox is `role="menu"` (actions) vs `role="listbox"` (option selection)

Per WAI-ARIA: a menu is for actions the user can perform; a listbox is for selecting one or more options from a set. `ListActionsMenu` and `UserAvatarPopover` are menus (Edit list, Sign out — actions). `ListSelection`'s `.if-lp-opt` rows are a listbox (selecting which lists an item belongs to — options).

We build `<Menu>` here. We do NOT build `<Listbox>`. `ListSelection`'s rows stay page-scoped with their existing `role="listbox"` / `role="option"` semantics. If a second listbox caller surfaces later (e.g. a country picker), revisit; one caller doesn't earn the abstraction.

Alternative considered: build `<Listbox>` now while we're in the popover-primitive headspace. Rejected — premature; YAGNI applies until a second caller exists.

### Decision 10: Popover body content stays page-scoped; only triggers and menus are unified

`StoreFilterPopover`'s panel has a search input + checkbox list + footer. `PriceFilterPopover`'s panel has two number inputs + footer. `ListSelection`'s dropdown body has a listbox of options. These bodies are too specialized to unify — each is essentially a small bespoke form. Unifying them would require either a config-object-driven popover (`<Popover content={...}>`) which couples wrappers tightly to the primitive, or a `<Popover>` container that takes children, which is just an empty wrapper that adds no value.

We unify what's reusable (the trigger) and leave the body to the wrapper. The dismiss/click-outside/Escape behavior is shared via `usePopoverDismiss` (Decision 7), not via container hierarchy.

Alternative considered: a `<Popover>` container + `<PopoverContent>` child. Rejected — would force wrappers to nest into a specific hierarchy for marginal benefit; `usePopoverDismiss` covers the actual shared concern.

## Risks / Trade-offs

- **[Keyboard model surface area is large]** → Three primitives with three distinct keyboard models, plus the dismiss hook. Each has edge cases (Home/End in menus, roving tabindex in segmented controls, Tab-vs-Escape focus return in both). **Mitigation:** slice-and-sweep cadence — build one primitive, migrate one wrapper, gut-check with keyboard-only navigation in preview before sweeping the rest. Document the keyboard model in each primitive's source file as the contract, not just in this design doc.
- **[Visual treatment may shift for some call sites]** → `VisibilityPicker`'s segmented control is the current canonical look — the on-dark tone is designed against it. `ItemsToolbar` view-toggle's current treatment (purple-fill active) differs slightly from `VisibilityPicker`'s (white-card active); migrating both to the same primitive will harmonize them, which is a deliberate visual change for the view-toggle. **Mitigation:** screenshot before/after in the PR description, flag as intentional.
- **[Wrappers shrink dramatically and may feel like they're "doing nothing"]** → Post-migration, `VisibilityPicker.tsx` is mostly state machine + the primitive. The temptation will be to "just inline this." **Mitigation:** resist. The wrapper owns app-specific logic (the optimistic update, the server-action call, the toast wiring, the visibility-state transitions). That stays. The primitive owns the radiogroup; the wrapper owns the data model.
- **[The `<Menu>` trigger split (Decision 3) means wrappers wire `aria-haspopup`/`aria-expanded` themselves]** → This is repetitive. **Mitigation:** accept the repetition — three callers (ListActionsMenu, UserAvatarPopover, future), each with a unique trigger. The wiring is two attributes; the alternative (forcing the trigger into the primitive) loses more flexibility than it gains.
- **[`<PopoverTrigger>` may want to grow more props (chevron direction, custom right slot, etc.)]** → All four current callers have the same shape (icon-left, label, optional badge, chevron-right). YAGNI on additional slots until a third pattern surfaces.
- **[Dependency on `standardize-buttons` is hard]** → This change cannot land before `standardize-buttons` is merged (imports break). **Mitigation:** sequence the PRs explicitly; reference the dependency in the PR description.

## Migration Plan

Sequence:

1. Land `standardize-buttons`.
2. Build primitives in this change, one at a time: `<Menu>` family → `<SegmentedControl>` family → `<PopoverTrigger>`. Build `usePopoverDismiss` alongside `<Menu>` (first user).
3. Slice-migrate one wrapper per primitive (e.g. `ListActionsMenu` for `<Menu>`, `VisibilityPicker` for `<SegmentedControl>`, `StoreFilterPopover` for `<PopoverTrigger>`); gut-check keyboard model + visual treatment in preview.
4. Sweep remaining wrappers: `UserAvatarPopover` (Menu); `ItemsToolbar` view-toggle (SegmentedControl); `PriceFilterPopover`, `ItemsToolbar` filters-trigger, `ListSelection` trigger (PopoverTrigger).
5. Delete absorbed CSS (`.menu-item`, `.visibility-option`, `.view-toggle-btn`, `.store-filter-trigger`, `.items-toolbar-filters-trigger`, `.if-lp-trigger` etc.).
6. Repo grep verifies no remaining references to deleted classes.

Rollback: `git revert`. No data migration, no feature flag.

## Open Questions

- Does `VisibilityPicker`'s current on-dark segmented look (white-card-with-shadow active) match what we want as the canonical `tone="on-dark"` treatment, or does the new primitive get a fresh visual? Recommend: keep it; it's a deliberate, polished treatment. Resolve during the segmented-control slice step.
- Should `<MenuItem>` accept a `keyboardShortcut` slot (right-aligned key hint, e.g. "⌘D" for delete)? No current caller uses one, but it's a common menu affordance. YAGNI for now; add when a caller needs it.
- Should `<PopoverTrigger>` support a "compact" mode (no label, icon-only — for very dense toolbars)? No current caller; defer.
- Does the dismiss hook (`usePopoverDismiss`) belong at `app/ui/hooks/` or co-located in each primitive's folder and shared via re-export? Recommend `app/ui/hooks/` since both filter-popover wrappers (which aren't primitives) use it directly.
- Should `<Menu>`'s arrow-key navigation skip disabled items? Yes — standard menu behavior. Document in the spec.
