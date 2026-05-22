## Context

Today the app has three parallel button systems plus a vendor-styled fourth:

- **System A**: `.btn` + variant classes (`primary | secondary | danger | nav | outline`). Square 12px padding, 16px font, 6px radius, font-roboto-condensed 500. Mobile (≤1000px) grows to 15/20 padding. Used in ~20+ components.
- **System B**: `.form-shell-btn-*` (`primary | ghost | delete`). 10/20 padding, 14px font, 8px radius, 600 weight on primary. Mobile _shrinks_ to 9/14 padding, 13px font — current WCAG 2.5.8 failure.
- **System C**: page-scoped one-offs — `.list-hero-btn`, `.menu-trigger`, `.bookmark-button`, `.follow-button`, `.choose-items-new-btn`, `.items-page-btn`, `.if-lp-chip button`.
- **System D**: `.gsi-material-button` (Google sign-in). Vendor brand requirement, out of scope.

There is a `<Button>` React component at [app/ui/components/Button.tsx](app/ui/components/Button.tsx) but it's a 19-line passthrough — every call site hand-writes `className="btn primary"`, so nothing enforces consistency.

The `.bookmark-button` and `.follow-button` classes deserve special note: they only define layout (`display: inline-flex; gap: 6px`), not color, and are stacked with `.secondary` (`className="btn secondary bookmark-button"`). `.secondary` is a light-fill treatment intended for buttons on light surfaces, but these buttons sit on the list hero — a saturated purple gradient. The current treatment is visually inconsistent with the hero context, regardless of whether the hero is a gradient or a solid.

The list hero uses `--hero-gradient` while every other "primary purple surface" in the app (the nav header) uses solid `--primary-color`. This is itself a drift inconsistency of the same shape as the button drift — a one-off treatment that doesn't appear elsewhere. The surface fix belongs to `redesign-home-and-tokens` or a follow-up, but it informs our framing: we design the `on-dark` variant against the solid nav purple as the canonical surface, not against the gradient as a fixed constraint.

This change runs alongside the in-flight `redesign-home-and-tokens` change. We extend its token surface to buttons rather than starting parallel.

## Goals / Non-Goals

**Goals:**

- Visual consistency: any "primary" button anywhere in the app produces identical pixels at every viewport.
- WCAG 2.5.8 compliance for the standard button size at all viewports (44×44 floor).
- Enforced `:focus-visible` ring on every button using the shared base.
- No sticky `:hover` on iOS for any standard button.
- Two real components (`<Button>` for `<button>`, `<LinkButton>` for `<Link>`) sharing a canonical class builder, with every call site migrated through them.
- `aria-pressed` semantics correctly applied to two-state buttons (bookmark, follow).
- Token-first: all sizing/typography knobs are CSS custom properties.
- One change that fully solves the problem rather than two changes that solve halves.

**Non-Goals:**

- Restyling `.gsi-material-button` — Google brand asset.
- Fixing the list-hero `--hero-gradient` vs nav solid-color surface inconsistency. Out of scope; belongs to `redesign-home-and-tokens`.
- Designing new variants beyond the reconciled set + `link` (see Decision 12).
- Building a polymorphic single component that handles both `<button>` and `<Link>` via `asChild` — see Decision 4.
- Fixing every adjacent CSS smell encountered during the audit (scope discipline — flag and defer).
- Building `<Menu>`, `<MenuItem>`, `<SegmentedControl>`, or `<PopoverTrigger>` primitives — deferred to follow-up change `standardize-menus-and-controls`. These are popover-or-radiogroup patterns with their own ARIA models (role=menu, role=radiogroup, role=dialog) and warrant a focused design exercise after this change lands. Their wrapper call sites (`ListActionsMenu`, `VisibilityPicker`, `StoreFilterPopover`, `PriceFilterPopover`, `UserAvatarPopover`, `ListSelection`'s dropdown trigger) stay as-is here.
- Building `<NavItem>` or `<RailToggle>` primitives — `AppNav.tsx` and `CollapsibleRail.tsx`'s `.rail-toggle` are documented exemptions. Nav items are a separate DS primitive (icon-above-label, active-pill, `aria-current="page"`); rail-toggles are heading-buttons (whole heading + chevron expands a section). Both have only one call site and don't earn abstraction.

## Decisions

### Decision 1: Token-first, single visual contract

We introduce shared button tokens in `global.css` and rewrite `.btn` to consume them. `.form-shell-btn-*` is migrated through call-site replacement and then deleted entirely — no dual class syntax persists. Alternative considered: keep both class syntaxes alive by rewriting both to consume tokens. Rejected once we committed to full call-site migration (Decision 6) — at that point keeping the parallel syntax is just dead weight.

### Decision 2: 44px floor as the default, opt-out via `sm` size

Standard buttons get `min-height: 44px; min-width: 44px`. Genuinely-small contexts (pagination, chips, dense toolbar) opt into a `sm` size that drops to ~32–36px but pairs with WCAG 2.5.8's spacing exception (24px circle around each target must not overlap a neighboring target). Alternative considered: 48px (Material) or 24px (WCAG 2.2 legal floor). Rejected — 48 is too big for a desktop-first product, 24 is hostile to touch even though technically compliant. 44 matches Apple HIG and is the conventional answer.

### Decision 3: Variant is purely visual; toggle state is a separate orthogonal prop

Variant describes the _skin_ (what colors, what surface it's designed against). Toggle state describes the _behavior_ (is this a two-state button currently in the pressed state?). They are independent: a bookmark button is "`on-dark` skin + pressed behavior"; a future filter chip could be "`secondary` skin + pressed behavior." Conflating them into a single `variant="toggle"` would have broken the moment a second toggle appeared in a different visual context.

API:

```
<Button variant="on-dark" pressed={isBookmarked} aria-label="…" />
```

When `pressed` is defined (true or false), the component sets `aria-pressed={pressed}` and the CSS picks up pressed-state styling via the `[aria-pressed="true"]` attribute selector. When `pressed` is undefined, no `aria-pressed` attribute is emitted (the button is not a toggle).

Alternative considered: a separate `<ToggleButton>` component. Rejected — its only enforcement value is "did you remember `pressed`?" which a JSDoc and convention cover; not worth the third component. Alternative considered: `variant="toggle"`. Rejected per the conflation argument above.

### Decision 4: Two components (`<Button>` + `<LinkButton>`) with a shared class builder

`<button>` and `<a>` have different native attributes (`type` vs `href`, `disabled` vs none, etc.). Trying to unify them via `asChild` or a polymorphic `as` prop leaks attribute typing and produces worse type errors than two honest components. Instead:

```
app/ui/components/button/
├── buttonClasses.ts   // canonical class composition
├── types.ts            // shared ButtonVariant, ButtonSize types
├── Button.tsx          // renders <button>; supports isLoading, pressed, type
└── LinkButton.tsx      // renders Next <Link>; supports variant, size, pressed
```

`buttonClasses({ variant, size, pressed, extra }): string` is the single source of truth for class composition. Both components delegate to it. Future variants/sizes/states change one function and both components inherit.

`<LinkButton>` wraps Next `<Link>` (not a raw `<a>`) to preserve client-side navigation. It does **not** accept `isLoading` — anchors don't have native disabled semantics and emulating it (aria-disabled + onClick prevention + tabindex=-1) is more surface than current use cases need. If a real caller needs a "navigating" state later, add it then.

Alternative considered: single polymorphic `<Button as="a">` or `asChild`. Rejected — worse types, more complex implementation, no real benefit for two components that the codebase will actually use.

### Decision 5: Merge `nav` and any list-hero treatment into a single `on-dark` variant

The current `.nav` variant (transparent fill, white border, white text → white fill, primary text on hover) is the correct treatment for any saturated-purple surface in the app. The list-hero bookmark/follow buttons are currently using `.secondary` (light fill) which is visually wrong on a purple background regardless of whether that background is solid or gradient. Merging them under one variant named for the _surface_ (`on-dark`) rather than the _location_ (`nav`) generalizes naturally: any saturated/dark surface uses it.

Naming: `on-dark` over `inverse` (more self-explanatory for a small team) and over `nav`/`hero` (those are page-region names, not design-system names).

The `on-dark` variant is designed against the solid nav purple (`#7324ce`) as the canonical surface. If the list-hero gradient persists _and_ contrast at `#7855f0` flags an issue against a 1px white border, the resolution is to fix the surface (within `redesign-home-and-tokens`), not to fork the variant.

Alternative considered: keep `nav` and add a separate `on-hero` variant. Rejected — treating the gradient as a fixed constraint validates the very drift this change is fighting. The gradient surface is the same shape of problem as the button drift; we don't compound it.

Alternative considered: keep `nav` only and don't migrate bookmark/follow. Rejected — that leaves the bookmark/follow visual bug (`.secondary` light fill on purple) unresolved, and the bug is the cleanest justification for the merge.

### Decision 6: Full call-site migration is in scope

All ~47 `className=".*btn.*"` usages across ~22 files migrate to `<Button variant=…>` or `<LinkButton variant=…>` within this change. After migration, `.form-shell-btn-*` and the absorbed page-scoped classes (`.bookmark-button`, `.follow-button`, and any one-offs that aren't legitimately exempt) are deleted.

Alternative considered: ship the new components without forced migration, follow up later. Rejected — the proposal's stated goal is that future call sites can't drift, which is only true once existing call sites flow through the component. Two changes here is just procrastination on the same diff.

Migration is sequenced as: build the components and shared helper → migrate a representative slice (3-5 files spanning each variant) and gut-check → sweep the remainder. The "gut-check after a slice" is a soft checkpoint within the change, not a separate change.

### Decision 7: `:focus-visible` only, not `:focus`

We style `:focus-visible` (keyboard focus) but not `:focus` (which fires on mouse click and looks like a bug). Browser support is universal as of 2022. The focus ring color comes from a `--btn-focus-ring-color` token — likely the primary color for light-surface variants and white for `on-dark`, decided per-variant via attribute selector if needed.

### Decision 8: `:hover` guarded by `@media (hover: hover)`

All button `:hover` rules wrap in `@media (hover: hover)`. On touch devices, hover no longer applies, and `:active` carries the press feedback. Accepted limitation: hybrid devices (Surface, touch laptops) evaluate `hover: hover` as true even when touched — the fix is correct for the dominant pure-touch case and that's good enough.

### Decision 9: Loading state changes semantics, not just label

`isLoading={true}` (on `<Button>` only) sets `disabled` on the native button, sets `aria-busy="true"`, and renders a CSS-only spinner alongside the existing children rather than replacing the label. Alternative considered: keep the current label-swap. Rejected — current behavior leaves the button clickable during async work (4.1.2 functional bug) and the label-swap is invisible to anyone whose AT cursor was already on the button before the swap.

### Decision 10: Icon-only buttons get `aria-label` directly

For the icon-only audit, we add `aria-label` on the button element rather than introducing a visually-hidden `<span>` pattern. Simpler primitive; the more-flexible pattern can come later if a real need surfaces.

### Decision 11: Pressed-state CSS exists for every variant, not just `on-dark`

The original CSS rewrite added pressed-state only to `.btn.on-dark[aria-pressed="true"]` because the original known toggle callers (bookmark, follow) lived on the dark hero surface. The follow-up audit found `SpoilerToggle` is a toggle on a light surface that currently fakes pressed-state by switching variants (`primary` ↔ `secondary`) — violating Decision 3's principle that variant is purely visual.

We add `.btn.<variant>[aria-pressed="true"]` styling for every variant. Concretely the rule of thumb: pressed = the inverted treatment (filled when normally outlined, or outlined when normally filled), with the hover counter-state mirrored. The same `@media (hover: hover)` guard applies.

Alternative considered: keep pressed-state on `on-dark` only and tell `SpoilerToggle` to live with `on-dark`. Rejected — it's on a light surface; that variant is visually wrong there for the same reason `.secondary` was wrong on bookmark.

Alternative considered: add a parallel `aria-pressed`-aware "tone-shifted" treatment as a CSS modifier independent of variant (`.btn.is-pressed`). Rejected — `[aria-pressed="true"]` already encodes the state in the ARIA attribute; a duplicate class is just drift surface.

### Decision 12: Add `variant="link"` for text-button affordances

The audit surfaced two call sites that are buttons by behavior but text by appearance: `ImageUrlInput`'s "Can't find a URL? Search for an image" disclosure ([ImageUrlInput.tsx:59-66](<app/(main)/items/ui/components/itemform/ImageUrlInput.tsx#L59>)) and `CollapsibleRail`'s "See all" link ([CollapsibleRail.tsx:65-69](<app/(main)/lists/ui/components/CollapsibleRail.tsx#L65>) — currently a raw `<a>`).

Neither fits any existing variant. `ghost` has a pill shape and a hover fill; these are text affordances that should look like inline links — underline on hover, primary color, no border, no padding-x. Material's design system calls this tier "Text Button"; iOS calls it "Plain Button."

Adding `variant="link"`:

- Background: transparent. Border: none. Padding-x: 0. Color: `var(--primary-color)`.
- Hover (guarded): underline.
- Min-touch: WCAG 2.5.8 exemption — text buttons in body copy don't enforce 44×44; they enforce the 24px spacing rule against neighboring targets.

Alternative considered: keep both call sites page-scoped. Rejected — they're the same pattern surfacing twice; absorbing them into the system prevents the same fix being reinvented when a third surfaces.

Alternative considered: model as `<LinkButton variant="link">` only (since both are conceptually navigations). Rejected — `ImageUrlInput`'s case opens a modal, not navigation. The variant is the _visual treatment_, not the element type; both `<Button variant="link">` and `<LinkButton variant="link">` are valid.

### Decision 13: Introduce `<Chip>` as a sibling primitive, not a Button variant

A chip is a **label + remove-×** affordance: two interactive elements wrapped together (the label is sometimes clickable, sometimes not; the × always removes). Two call sites today: `.items-toolbar-chip` (active-filter chips in `ItemsToolbar`) and `.if-lp-chip` (selected-list chips in `ListSelection`).

Modeling this as a Button variant would mean:

- A new variant with a different layout (label + child remove-button inside) — but variants are supposed to be purely visual treatments of a single button (Decision 3).
- A new prop `onRemove` that only applies to one variant — variant-conditional props are a smell.
- Conflating a layout primitive (two elements) with a styling primitive (one element).

`<Chip>` is its own component, but it consumes `buttonClasses()` internally so the focus-ring / hover-guard / min-touch contract stays unified. Place it at `app/ui/components/chip/Chip.tsx`, parallel to `app/ui/components/button/`.

API:

```
<Chip onRemove={c.onClear}>{c.label}</Chip>
// renders: <span class="chip btn-xs"> {label} <button class="chip-remove" aria-label="Remove {label}">×</button> </span>
```

The chip label is non-interactive by default; if a caller ever needs a clickable label tier (e.g. clicking the chip body to filter, × to dismiss), that's a future addition.

Alternative considered: keep `.items-toolbar-chip` and `.if-lp-chip` page-scoped. Rejected — two near-identical call sites is the threshold for abstraction, and the shared focus-ring / min-touch contract is the same one buttons enforce. Letting them diverge re-introduces the kind of drift this change exists to eliminate.

Alternative considered: defer `<Chip>` to the follow-up `standardize-menus-and-controls` change. Rejected — chips are neither menus nor segmented controls nor popover triggers, and `.items-toolbar-chip` migration is naturally adjacent to the items-toolbar work already in scope (the toolbar's view-toggle and popover triggers are the deferred items, but the chips below the toolbar are in scope here).

## Risks / Trade-offs

- **[Visual regression in dense layouts from the 44px floor]** → Item rows, the items toolbar, the list actions menu, and pagination are the candidates. **Mitigation**: audit during the slice-and-sweep step; if a layout breaks, that button moves to `size="sm"` with the WCAG 2.5.8 spacing exception documented inline.
- **[Bookmark/follow visual change is intentional, but easy to mistake for a regression]** → The migration from `.secondary` (light fill) to `on-dark` (transparent + white border) is a deliberate fix, not a refactor. **Mitigation**: cross-check `redesign-home-and-tokens/design.md` for prior intent; if absent, add a screenshot to the implementation PR description showing before/after and call out the intent explicitly.
- **[Token names collide with redesign-home-and-tokens]** → That change is also adding tokens. **Mitigation**: prefix all new tokens with `--btn-`; coordinate with the redesign change's design.md before committing names.
- **[`<LinkButton>` lacks loading state]** → If a real caller surfaces later that needs "navigating, please wait" feedback, the API has to grow. **Mitigation**: accepted. Add when needed; YAGNI for now.
- **[`@media (hover: hover)` and hybrid devices]** → Surface/touch-laptop users in touch mode won't get the iOS hover fix. **Mitigation**: accepted — minority case, fix is correct for the majority.
- **[Big call-site migration diff]** → ~47 call sites across ~22 files in one PR is reviewable but large. **Mitigation**: structure the PR with logical commits per migration sweep (form-shell call sites; nav call sites; bookmark/follow; rest). The slice-and-sweep ordering also gives a natural review checkpoint after the first 3-5 files.
- **[List-hero gradient surface stays unfixed]** → The `on-dark` variant works on the gradient but the surface inconsistency lingers. **Mitigation**: accepted, deliberately. Flagged in proposal as adjacent inconsistency for a separate change. We do not let the gradient dictate button design.

## Migration Plan

No data migration. CSS + component + ~22 call-site files. Rollback is `git revert`. No feature flag needed — changes are isolated to the button surface and previewable via the dev-auth-bypass workflow.

Suggested commit sequence:

1. Add button tokens to `global.css`.
2. Create `app/ui/components/button/` directory: `types.ts`, `buttonClasses.ts`, `Button.tsx`, `LinkButton.tsx`.
3. Rewrite `.btn` base + variants in `button.css` to consume tokens; add `on-dark` variant; remove `.nav`; add `:focus-visible`, `@media (hover: hover)` guards, pressed-state CSS, and `.btn-spinner`.
4. Migrate a slice (3-5 representative call sites: one primary, one secondary, one nav→on-dark, one form-shell, one icon-only). Visual + a11y gut-check.
5. Sweep remaining call sites by area: form-shell users; nav/header users; bookmark/follow; everything else.
6. Delete `.form-shell-btn-*` styles, `.bookmark-button`/`.follow-button` color/layout, and any one-off page-scoped classes whose call sites migrated.
7. Audit icon-only buttons for `aria-label`. Add `pressed` to bookmark/follow.
8. Visual review across the listed dense layouts; promote outliers to `size="sm"` with documented exemption.
9. Run lint/type-check.

## Open Questions

- Does `redesign-home-and-tokens/design.md` already define a focus-ring token to consume, or plan to change the list-hero surface? Read before committing token names and before flipping bookmark/follow visually.
- The `.if-lp-chip button` in the item form — is it a single-press button or a multi-select toggle? **Resolved (recon 1.3):** single-press × inside a chip, not a toggle. Migrates to `<Chip>` per Decision 13 (the chip body + remove `×` together), not a standalone `<Button size="sm">`.
- Does the codebase have a `<Link>`-styled-as-button case we haven't found yet (e.g. a "View list" CTA card)? Grep for `<Link.*className=.*btn` during the call-site audit; those become `<LinkButton>`.
- Should `FormButton.tsx` callers be grepped before deletion to confirm the migration set? Yes — task added to the FormButton deletion step.
- Will the SpoilerToggle visually feel right as `variant="secondary" pressed={…}` (i.e. unpressed = secondary's light fill, pressed = inverted/filled)? Decide during the slice-and-sweep visual review; if not, try `variant="ghost"` pressed-state or commit to a deliberate per-variant pressed treatment that lands the visual intent. The "ON/OFF" state-badge inside the button is a separate signal and should help regardless.
