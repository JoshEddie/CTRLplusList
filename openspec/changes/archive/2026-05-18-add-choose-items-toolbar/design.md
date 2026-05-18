## Context

The `/lists/[id]/choose-items` page lets a list owner toggle items into and out of a list with checkboxes. It currently exposes a single local-state search input and no other filtering. The sibling `/items` page already has a feature-rich `ItemsToolbar` (search, sort, store filter, price filter, purchases filter) that drives off URL params and supports two existing modes: `items` (library view) and `list` (a list's items view).

Choose-items has the same library-shaped data as the items page (same `ItemDisplay[]` shape, same store/price metadata), plus one extra axis the other modes don't have: each row is either currently on the list or not, and that status is the user's primary mental model when picking. The toolbar work is thus mostly a reuse exercise plus one new control.

Filtering and sorting can be entirely client-side because the page already loads the full library into `ChooseItemsForm` as a prop (`items: ItemRow[]`). No DAL or server-action changes are required.

## Goals / Non-Goals

**Goals:**
- Bring choose-items to filter/sort parity with `/items` (search, sort, store filter, price filter).
- Add a `Show` control unique to choose-items: `All` / `Only on the list` / `Only not on the list`.
- Drive all toolbar state from URL params so back/forward navigation preserves the user's view.
- Reuse `ItemsToolbar` rather than fork a new toolbar component, by extending it with a third `mode: 'choose'`.
- Keep the checkbox `selected: Set<string>` in local React state, unchanged.

**Non-Goals:**
- Two-axis (primary + secondary) sort — deferred to a separate change.
- Server-side pagination, filtering, or sorting on choose-items — out of scope; the page renders the user's full library client-side.
- A persistent "Selected: N" counter — useful but deferred; the immediate scope is the toolbar itself.
- Changing the `SortKey` type or the items page's behavior.
- Mobile-specific re-layouts of the toolbar beyond what existing CSS already does for `ItemsToolbar`.

## Decisions

### Decision 1: Extend `ItemsToolbar` with `mode: 'choose'` rather than fork a new toolbar

The existing `mode` union is `'items' | 'list'`. Adding `'choose'` gives us one source of truth for the four controls choose-items shares with the items page, and isolates the differences to two surgical branches:

- `choose` mode renders the new `Show` select (`all` / `on` / `off`).
- `choose` mode hides the `Purchases` select (purchases-revealed filtering is an items-page concern; on choose-items the gifter is choosing their own items so there are no hidden purchases to surface).
- `choose` mode defaults sort to `created_desc` (same as `items`).

**Alternative considered:** build a separate `ChooseItemsToolbar`. Rejected because ~90% of the logic (URL param plumbing, store popover, price popover, sort dropdown, search debounce) would be copy-pasted and drift over time.

### Decision 2: All toolbar state lives in URL params

New params on `/lists/[id]/choose-items`: `q`, `sort`, `show`, `store` (repeatable), `price_min`, `price_max`. These mirror the items-page names exactly, so the same `updateParams` / `toggleStore` helpers inside `ItemsToolbar` work unchanged.

The existing `new=1` query param (used by `ChooseItemsForm` to decide "Skip for now" vs "Back to list") is preserved and untouched.

**Alternative considered:** keep search local-state, URL-ify only sort/filter. Rejected — inconsistent with `ItemsToolbar`, which already manages `q` as a URL param, and we lose deep-linkability for no real benefit.

### Decision 3: Client-side filter and sort over the existing `items` prop

`ChooseItemsForm` already receives the full library as `items: ItemRow[]`. The toolbar's filter and sort apply on top of that array in a `useMemo`, before render. The server (`page.tsx`) does not read or react to any of the new URL params.

The `Show` filter uses `initialSelectedIds` (the **saved** list membership, not the user's pending checkbox state) so toggling a checkbox doesn't make a row vanish mid-edit. This matches the user's mental model — "what's on the list" means what's saved, not what's pending.

**Alternative considered:** push the new params to `page.tsx` and have the server pre-filter. Rejected — the page already loads the full library by design (the user needs to see and check everything), so server filtering saves no work and adds round-trips.

### Decision 4: Sort key set matches the items page exactly

The choose-items rows don't currently render store or price text, only name + description + image. Sorting by store or price would therefore be **silent** (the user sees the rows reorder but can't tell why). Two options:

- (a) Keep only the keys the row visually exposes: Newest/Oldest, Name A–Z/Z–A. Four options.
- (b) Match the items page exactly: add Store A–Z/Z–A, Price low/high. Eight options.

**Decision: (b).** Per the user's "price filter, and store missing" reply, the intent is symmetry with the items page. The filter popovers exist because users care about store and price even when the row doesn't show them; sorting by those same dimensions is the natural pair. If silent reorder turns out to be confusing in practice, we can revisit by surfacing store/price text on the row in a follow-up.

### Decision 5: Default state matches today's behavior exactly

With no URL params present, the page renders identically to today: full library (active + archived-on-list), search empty, sort by `created_desc`, no store/price filter, `show=all`. This makes the change purely additive — no existing bookmarks, links, or muscle memory break.

## Risks / Trade-offs

- **[Risk]** Sorting by store/price produces visually unexplained reordering on rows that don't show store/price. **Mitigation:** acceptable for now (matches items-page filter behavior); revisit by adding store/price hints to the row if user feedback indicates confusion.
- **[Risk]** Selecting items under `Show: All`, then switching to `Show: Only not on the list`, causes the just-checked rows (which are saved-on-list = true) to disappear from view. The user might think their checks were lost. **Mitigation:** the `Show` filter is keyed on `initialSelectedIds` (saved state), and `selected` is preserved across filter changes, so Save still applies the full diff. The persistent-counter UX fix is acknowledged as deferred (see Non-Goals); the immediate mitigation is that selection state survives unchanged.
- **[Risk]** Adding the `'choose'` mode to `ItemsToolbar` increases its branching and tightens coupling between two consumer pages. **Mitigation:** the new branches are small and isolated (the `Show` select is a single new block; the `Purchases` hide is a single conditional). If `ItemsToolbar` grows further, a future refactor can extract a `BaseItemsToolbar` with composition over `mode` flags.
- **[Trade-off]** Client-side filter/sort means every keystroke / dropdown change re-runs the filter+sort pipeline over the full library array. For libraries up to a few thousand items this is sub-millisecond; beyond that we'd want server-side filtering. The current page already loads the full library, so we are not making the situation worse.
- **[Trade-off]** Driving toolbar state via URL params triggers `router.replace` calls; we inherit the existing `ItemsToolbar` debounce on search but other controls update immediately. This matches existing items-page behavior.

## Migration Plan

Not a data or API migration — purely additive UI.

1. Ship the `ItemsToolbar` `mode: 'choose'` extension and the `ChooseItemsForm` rewire together in a single commit; the old local-state search input is removed in the same change.
2. No flag, no rollout phasing. URL params are absent by default → behavior is identical to today.
3. Rollback is a single revert; no database or server-action state to undo.
