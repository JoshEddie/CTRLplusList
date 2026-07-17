## Context

`ItemActions` (landed in [#234](https://github.com/JoshEddie/CTRLplusList/issues/234)) is the single owner of every item card's action area. For a claimable non-owner it currently renders `Add Claim` as the interim primary slot — a placeholder the `item-actions` spec explicitly reserves for displacement by `Buy & Claim ↗`. The optimistic-claim plumbing already exists: `Item.tsx`'s `recordClaim` records a self-claim and commits local state on server success; `createPurchase`/`removePurchase` already `updateTag('items')`. What is missing is (1) the `Buy & Claim ↗` action itself and (2) a post-claim undo surface — today the only already-claimed surface is `PurchaseModalSlot`'s `Manage claim` modal ("You claimed this" + "Remove my claim"), whose copy and job differ from the undo popup #169 specifies.

Design source: [#169](https://github.com/JoshEddie/CTRLplusList/issues/169) (Behavior, Copy, Security/gesture sections). Constraint owner for slot/unit semantics: [MAP #230](https://github.com/JoshEddie/CTRLplusList/issues/230) — the undo copy stays quantity-agnostic.

## Goals / Non-Goals

**Goals:**

- Put buying and claiming on one gesture for authenticated non-owners: `Buy & Claim ↗` opens the primary store in a new tab and records a self-claim.
- Give an immediate, non-punitive escape via an undo popup that waits in the still-alive wishlist tab.
- Reuse existing primitives (`Modal`, `Button`, `LinkButton`) and the existing claim path (`recordClaim` → `createPurchase`; `removePurchase`) — no new server action, no schema change.

**Non-Goals:**

- Guest `Buy & Claim` one-click (needs a name / guest identity) — deferred to the map's guest-claim-identity chunk. Guests keep `Add Claim` primary here.
- Quantity / multi-unit slot semantics — owned by MAP #230; undo copy stays quantity-agnostic.
- Any change to `confirm-dialog-system` or `button-system`.

## Decisions

### D-Undo-Surface: the undo popup is a `Modal`-based dialog, not `ConfirmDialog`

The undo popup places the **action** button (undo) on the **left** as `ghost`, and the **dismissal** (keep the claim) on the **right** as `primary` — the owner's explicit layout, and a deliberate reversal of #169's Yes-left/No-right order.

`ConfirmDialog` cannot express this, for a **structural** reason, not merely a styling one: its left/Cancel slot is dismiss-only (`onClose`, no action callback), and its right/Confirm slot is the sole prominent action path. Our prominent button (Yes) is a pure dismissal and our quiet button (undo) carries the side effect — inverted from ConfirmDialog's entire model. Its spec also locks Cancel to `ghost` and Confirm to `danger` and forbids overriding them.

- **Rejected — reuse `ConfirmDialog` as-is:** would force undo into the danger/rightmost Confirm slot. The owner rejected undo-as-danger (undoing a claim is normal and low-stakes, not destructive).
- **Rejected — genericize `ConfirmDialog` (unlock both Cancel and Confirm variants):** even with variants unlocked, Cancel has no action callback, so the left button still cannot run undo. Delivering the layout would require re-architecting the primitive's action model and would dissolve its "destructive = danger, rightmost" invariant for every consumer (delete flows, etc.) — large blast radius for one popup.
- **Chosen — dedicated popup on the `Modal` primitive:** the same shell `PurchaseModalSlot` and `ConfirmDialog` are built on. Full control of button variants and side effects; `confirm-dialog-system`'s invariant stays intact. Still a reused "confirmation module" (Modal), just not the destructive-confirm primitive.

The popup's open state is **ephemeral** consumer state in `Item.tsx` (a boolean), not the `?purchaseItem=` URL param the purchase modal uses — a refresh must land on the persistent `Manage claim` affordance, never re-pop the transient nudge.

### D-Claim-Timing: await the claim, open the popup on success (no optimistic pre-commit)

`Buy & Claim ↗` is a real anchor; the browser opens the store in a **new tab** natively on click, so the wishlist tab stays alive. The click handler records a self-claim through the existing `recordClaim` (which `await`s `createPurchase` and inserts local state only on success) and, on success, opens the undo popup.

- **Rejected — optimistic pre-commit + rollback:** open the popup and insert the local claim synchronously on click, then roll back both if `createPurchase` rejects. The issue's title says "optimistic … recorded immediately," but the owner chose to relax it: because the store tab foregrounds on click regardless, the user isn't watching the wishlist tab during the round-trip, so awaiting the claim before showing the popup costs no perceptible latency and removes the rollback path (and its failure-mode surface area) entirely.
- **Chosen — awaited:** on `createPurchase` success, commit the local claim and open the popup; on failure, the existing `toast.promise` error fires, no popup opens, and the card stays claimable. Reuses `recordClaim` almost verbatim — the only addition is a success callback that opens the popup instead of closing a modal.

Navigation is on the click via the real anchor — **never** a timer-fired `window.open` (inherited from #169 / MAP #233: timers break the trusted gesture and are blocked by popup blockers and PWA in-app-browser overlays). No countdown, no interstitial.

### D-Gating: authed gating computed in `Item.tsx`, threaded through `ItemCard`

Whether to offer `Buy & Claim ↗` is derived once in `Item.tsx` (which alone knows the viewer's `user_id`, matching how `showOwnerClaimAction` etc. are computed there) and passed down through `ItemCard` to `ItemActions` as a single boolean. `ItemActions` stays a pure render of its inputs. The signal is true only when: viewer is authenticated (`user_id` present) AND not the owner AND the item is not fully claimed AND the viewer holds no removable claim AND a complete store exists. When true, `Buy & Claim ↗` takes the top slot and `Add Claim` moves to the 2-up secondary row; when false, the existing `Add Claim`-primary layout is unchanged.

### D-Store-Target: `Buy & Claim ↗` is gated on a navigable link, keyed identically to `View item ↗`

Both point at the primary store (`lowestPricedStore`, per `item-store-links`) and both are **store-navigating** actions. `Buy & Claim ↗`'s presence SHALL be gated on the primary store having a real link — `!!store?.link`, the same predicate `View item ↗` uses — not on the store/row merely existing. `Buy & Claim ↗`'s click both navigates (anchor default) and records the claim; the store-navigation half must not propagate to any enclosing row/card handler (same `stopPropagation` discipline `View item ↗` already follows).

### D-Linkless-256: linkless items keep the current non-navigating action set (coordination with #256)

Today `lowestPricedStore` → `storeComplete` ([lib/storeValidity.ts](lib/storeValidity.ts)) requires name + link + price, so a PRICED (price, empty name/link) or BARE (no row) item has no complete store and already falls to the existing `Add Claim` full-width row — no `View item ↗`, and (with this change) no `Buy & Claim ↗`. That is the intended end state: **only a FULL item (with a link) offers `Buy & Claim ↗`.**

[#256](https://github.com/JoshEddie/CTRLplusList/issues/256) is a **sibling chunk** of the same map (both blocked-by #234; neither blocks the other, so landing order is unspecified). #256 loosens store-validity so a linkless PRICED row ranks as a *valid* store (so `PriceLine` shows its bare price) and re-keys `View item ↗` on `!!store?.link` rather than row presence. Two consequences this design must honor so the chunks compose in either order:

- **Key `Buy & Claim ↗` on `!!store?.link`, never on `!!store`.** Today the two are equivalent (a complete store implies a link); after #256 they diverge (a valid store may be linkless). Keying on the link is correct under both, so a PRICED item never renders a Buy & Claim (or View) pointing at an absent link. This mirrors the fix #256 applies to View.
- **Both chunks MODIFY the same `item-actions` matrix requirement.** Whichever lands second rebases its delta onto the first (add the PRICED/linkless keying if #235 lands first; add the `Buy & Claim` row if #256 lands first). Flagged for `/set-sail` and review; no code conflict beyond the shared requirement block.

- **Rejected — gate on store/row presence (`!!store`):** correct only until #256 lands, then silently renders Buy & Claim on linkless PRICED items. Keying on the link is the same cost and forward-safe.

## Risks / Trade-offs

- **Claim lands after the store tab opens** → On `createPurchase` failure the store still opened but no claim exists; the card correctly stays claimable and the error toast explains. This is inherent to the real-anchor gesture and accepted by #169 (navigation on click, claim best-effort). Mitigation: none needed — the states are self-consistent.
- **Undo popup missed / dismissed by outside-click** → The claim persists and the persistent `Manage claim` affordance remains the durable path to release it. The popup is a convenience nudge, not the only exit. Mitigation: `Manage claim` unchanged.
- **New popup component vs. reusing `ConfirmDialog`** → Slightly more code than reusing the primitive, but avoids re-architecting a shared primitive and keeps its invariant intact. Mitigation: build it thin on `Modal`, co-locate its styles.
- **Race: item becomes fully claimed between render and click** → `createPurchase` rejects server-side; awaited timing surfaces the rejection as the error toast with no popup. Mitigation: awaited (D-Claim-Timing) already covers it — no optimistic state to unwind.

## Migration Plan

No schema or data migration. Pure client + render change reusing existing server actions. Deploy is a standard code deploy; rollback is a code revert (no persisted state introduced). Existing claims and `Manage claim` behavior are untouched.

## Open Questions

None — the surface (Modal popup), claim timing (awaited), button treatment (left ghost undo / right primary keep), authed-only scope, and copy were settled with the owner at propose time.
