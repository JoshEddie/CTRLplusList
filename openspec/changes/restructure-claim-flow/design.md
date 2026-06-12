# Design — restructure-claim-flow

## Context

Today's viewer-facing item card carries two actions: a buy-link pill (cheapest store, "+N" popover) and a "Claim this gift" button that opens the `?purchaseItem=<id>` URL-driven purchase modal. The buy link is an exit ramp — viewers shop without ever seeing the claim UI. The hi-fi design (Claude Design handoff, "Claim Flow Hi-Fi.html", V1 variant chosen) moves all store links inside the modal and reduces the card to one "Get this gift" button plus a muted store-name metadata line.

Current implementation anchors:

- `Item.tsx` — modal open/close via `router.push`/`replace` on `?purchaseItem`; optimistic `localPurchases` with fabricated ids; duplicated removal blocks (`handleUndoConfirm` / `handleRemoveClaim`); `showStores={!showPurchased && !showSpoilerInfo}` gate.
- `StoreLinks.tsx` — primary `<LinkButton target="_blank">` + "+N" `<Menu>` popover; renders the claim button as `children`; also used by owner surfaces (choose-items picker rows, sortable rows).
- `PurchaseModalSlot.tsx` — routes to an unclaim confirm when the viewer has a `removableClaim`, else `PurchaseFlowContainer`.
- `PurchaseFlowContainer.tsx` — guest branch (sign-in pitch first) vs signed-in branch (always-visible picker per `claim-attribution`); picker fetch swallows errors (`.catch(() => {})`).

Spec constraints from the proposal audit: `item-store-links`, `claim-attribution`, and `list-item-management` get delta specs; `button-system` and `menu-system` are conformance targets; `e2e-critical-flows` must keep all eleven flows green.

## Goals / Non-Goals

**Goals:**

- Viewer cannot reach a store link without passing the claim UI; the modal is still open when they return from the store tab.
- List scannability preserved: store names visible on the card as inert metadata ("$35.50 · Amazon · Target +1").
- The claimer always has store access (fixes the claim-then-buy lockout).
- One-tap self-claim retained; attributed claim moves behind a collapsed disclosure.
- Fold in the three PR #132 deferred findings (optimistic ids, removal-path DRY, picker error state).

**Non-Goals:**

- No changes to claim eligibility, unclaim authorization, quantity-limit enforcement, or any server contract beyond `createPurchase`'s return value.
- Owner-facing surfaces (choose-items picker, sortable rows, items library) keep direct buy-link chips.
- No localStorage next-visit nudge; no store pre-highlighting from chip taps.
- No new primitive families; no bottom-sheet modal primitive (see D3).

## Decisions

### D1 — Card: V1 metadata line + single "Get this gift" button

The price row becomes `{price} · {store} · {store} +N` — at most two named stores, muted text, separators, no borders/hover/icon, never a tap target. The name count is width-adaptive: a two-pass measure (ResizeObserver-backed) drops to one named store and grows the `+N` when two names overflow the line — `Crate & Barrel · Williams Sonoma +1` becomes `Crate & Barrel +2`. Full "Get this gift" label at all viewports (the mockup's mobile row carries the full label; the old `<600px` "Claim" short form is retired). The button is the only modal-opening affordance — the card body (including the metadata line) is inert, so a tap there does nothing rather than surprising the viewer with a modal.

*Rejected:* V2 (store name as button subtitle) — a store name on a tap target rebuilds the expectation of direct navigation regardless of copy; the design session's own note concedes this. *Rejected:* bare single button with no store names — fails the scan test (viewers skim for "Amazon").

### D2 — Card claim states

- **Fully claimed by others:** greyed/desaturated card, disabled `✓ Fully claimed` button, modal not openable. Same gating as today's `showPurchased`, new presentation.
- **Viewer has a removable claim:** an outline (`primary`-variant) `Manage your claim` button opening the already-claimed modal state (D5); the price row shows the plain price (no metadata line, no extra pill — the green mine-banner already conveys the claimed state). This replaces the wide claimed-pill-with-Undo card treatment.
- **Row view:** all right-column claim affordances (`Get this gift`, `Manage your claim`, the disabled `Fully claimed` pill) share a `min-width: 165px` floor so rows align across states.
- Banners (`ClaimBanners`) remain for owner-spoiler and claimed-by-others info; the mine-banner's Undo affordance is removed outright — claim management is the `Manage your claim` button's job.
- **Owner claim entry (spoilers on):** the card affordance reads `Mark as claimed` — purchase-recording language, since "Get this gift" makes no sense for the owner's own items.

### D3 — Modal shell: existing `Modal` primitive, content restyled; bottom sheet deferred

The mockup draws a bottom sheet (rounded top, grabber). Implementing that means a new presentation variant of the app-wide `Modal` primitive — a cross-cutting design-system change that would govern every modal, not just this one. This change restyles the purchase modal's *content* to the mockup (header with thumbnail + title + price + close, store row, claim sections) inside the existing centered `Modal`. A sheet variant, if wanted, is its own primitive-spec change later.

*Rejected:* one-off sheet styling scoped to the purchase modal — page-scoped overrides of primitive surfaces are barred by the cross-cutting design-system rule.

### D4 — Modal store row: ghost primary link + "+N stores" `<Menu>`

`<LinkButton target="_blank" rel="noreferrer">` for the cheapest store + the existing "+N stores" `<Menu>`/`<MenuLinkItem>` popover, relocated from the card. Both carry the buy-link chip treatment (`storeLinks-link` / `storeLinks-more` — the lavender "leave the page to purchase" colors), which stays visually subordinate to the primary claim CTA. Store validity/sort/price rules carry over verbatim from `item-store-links` (price-ascending, `$X.XX`, no `$NaN`). Inside the modal, Escape must close the open menu, not the modal — `Menu`'s existing contract handles Escape; the modal's own Escape handler must not fire while a menu is open. Hover-open carries over from the card (the 220ms collapse grace lives in one shared hook, `useHoverOpenMenu`).

### D5 — Modal variants and routing

All variants open with the same header + store row, then diverge:

| Viewer | Below the store row |
|---|---|
| Signed-in friend | Primary `Claim this gift` → collapsed `Claiming for someone else?` disclosure |
| Guest (signed out) | `Your name` input + `Claim as Guest` (disabled until non-empty); footer: "Have an account? **Sign in** to claim with your profile." |
| Owner, spoilers OFF | Quiet `Your list` label — no claim UI, no claim data |
| Owner, spoilers ON | `I bought this myself` → collapsed `Claiming for someone?` disclosure |
| Viewer with removable claim | `✓ You claimed this` banner + danger `Remove my claim` |

The removable-claim state **replaces** `PurchaseModalSlot`'s current confirm-only unclaim modal. This kills the tripwire where a claimer re-opening the modal to reach the store would hit "Remove your claim?" — and is the structural fix for the claim-then-buy lockout, so the store row in this state is mainline, not decoration. No extra confirmation on "Remove my claim" (consistent with `claim-attribution`'s no-added-confirm stance; `confirm-dialog-system` stays untouched).

### D6 — Disclosure mechanics: fetch on modal open, expand reveals

The picker pool (`getClaimPickerForItem`) keeps today's fetch-on-modal-open timing (not deferred to expansion). Rationale: the collapsed trigger shows an avatar-stack hint (up to 3 pool members) that needs data, and modal-open is already a deliberate user action — the fetch is not on the browse path. States:

- **Loading, collapsed:** trigger renders with a generic state until data lands; avatars populate when loaded.
- **Expanded before load completes:** spinner row "Loading {owner first name}'s circle…".
- **Loaded + expanded:** search input ("Search {owner}'s circle…", live filter, clearable), scrollable pool rows (avatar + name, tap toggles selection, ✓ on selected — no chevrons/arrows), "Someone not listed?" free-text beneath a divider. Selecting a person clears the free-text and vice versa.
- **Confirm:** a button appears only when a target is chosen — `Confirm — {name}`. Self-claim never goes through the disclosure.
- **Error (new, fixes deferred finding #3):** fetch failure renders an honest "Couldn't load {owner}'s circle" message with a retry affordance — never the empty-pool message. Empty pool (genuinely no mutuals) shows the free-text fallback only.

Collapse resets search/selection/free-text.

*Rejected:* defer fetch to expansion — saves a server-action call but starves the avatar hint and adds a perceptible wait at the exact moment the user signaled intent. *Rejected (earlier, reversed):* always-visible picker per current `claim-attribution` — with the store row joining the modal, three always-visible jobs is clutter; the rarest job collapses.

### D7 — `createPurchase` returns the inserted row id

`createPurchase` returns the inserted purchase row's id (additive — existing callers unaffected); `Item.tsx`'s optimistic `recordClaim` uses it instead of `optimistic-${Date.now()}`. Fixes both deferred symptoms: immediate unclaim sends a real id, and the props-key reset can no longer duplicate-append a row the server snapshot already contains (reconcile by id). No schema change; `insert(...).returning({ id })` works on neon-http (single statement, no transaction).

### D8 — One shared claim-removal path

The duplicated `removePurchase` + `toast.promise` + `localPurchases` filter blocks collapse into a single helper in `Item.tsx` (or its co-located `utils.ts` if it extracts cleanly); the undo path closes the modal after it. The modal restructure may collapse the two call sites outright — either way, one home for the removal semantics and toast copy.

### D9 — Copy (canonical strings)

| Surface | Copy |
|---|---|
| Card CTA (non-owner) | `Get this gift` |
| Card CTA (owner, spoilers on) | `Mark as claimed` |
| Card fully-claimed | `✓ Fully claimed` (disabled) |
| Card viewer-claimed | `Manage your claim` |
| Modal self-claim (friend) | `Claim this gift` |
| Modal self-claim (owner) | `I bought this myself` |
| Disclosure (friend) | `Claiming for someone else?` |
| Disclosure (owner) | `Claiming for someone?` |
| Disclosure loading | `Loading {owner first name}'s circle…` |
| Picker search placeholder | `Search {owner first name}'s circle…` (owner sees `Search your circle…`) |
| Picker free-text label | `Someone not listed?` / placeholder `Enter their name…` |
| Attributed confirm | `Confirm — {name}` |
| Guest field | `Your name` / CTA `Claim as Guest` |
| Guest footer | `Have an account? Sign in to claim with your profile.` |
| Owner spoilers-off | `Your list` |
| Claimed state | `✓ You claimed this` + `Remove my claim` |

This reconciles the existing spec-copy drift (`claim-attribution` D9 said "I'm buying this"; `e2e-critical-flows` flow 7 quoted "I purchased it"; pre-change code said "I'm getting this") on "Claim this gift" — chosen over "I'm getting this" because, sitting directly under the store links, the CTA must say what it does (records a claim) rather than read like another way to go get the item.

### D10 — Component homes

- `StoreLinks.tsx` stays as the owner-surface chip row (choose-items, sortable, items library) — unchanged contract minus the viewer-card call site. The claim button stops being its `children`.
- New viewer-card metadata line and the modal store row are separate presentations; shared store validity/sort/price helpers extract to one home (co-located `utils.ts`) so the three presentations cannot drift.
- Styling maps mockup values onto existing `global.css` tokens; no new tokens unless a mockup value has no existing equivalent.

## Risks / Trade-offs

- **[Extra click to reach a store]** → Accepted deliberately — it is the feature. Price and store names stay on the card so peeking costs nothing.
- **[Collapsed disclosure hides attributed claiming]** → The labeled trigger with avatar hints carries discoverability; e2e flow 10 keeps the path pinned. If usage shows it's missed, expansion-by-default is a one-line revert.
- **[Modal grows tall on small screens with the disclosure open]** → Pool list is internally scrollable (max-height per mockup); modal body scrolls as a fallback.
- **[Spoiler safety in the owner modal]** → Spoilers OFF renders no claim UI and consumes no claim data (DAL already returns empty purchases without spoilers); the claim section keys off the same `showSpoilers` gate as today — no new data paths to leak.
- **[e2e churn across four flows]** → Copy changes and the expand step are mechanical; the flows' assertions (claim recorded, attribution round-trip, guest claim, owner unclaim) are unchanged. No flow is removed.
- **[Optimistic-id reconcile changes timing-sensitive code]** → The new id-based reconcile is strictly simpler than the fabricated-id juggling; covered by existing unit tests for claim/unclaim plus a new test for unclaim-immediately-after-claim.
- **[Scan-test regression risk]** → Acceptance bar pinned in the spec delta: store names readable in the price row at a skim, same truncation convention (+N) as before.

## Migration Plan

No DB migration. `createPurchase`'s return-value change is additive. Pure UI swap otherwise — ship as one PR; revert is a clean git revert (no data shape changes). The `item-store-links` / `claim-attribution` / `list-item-management` delta specs land with the implementation and roll into active specs at archive time.

## Open Questions

None blocking. Bottom-sheet modal presentation (D3) is explicitly deferred to a future primitive-spec change if wanted.
