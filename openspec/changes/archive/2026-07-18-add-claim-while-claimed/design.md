# Design — add-claim-while-claimed

## Context

`Item.tsx` derives `removableClaim` as a first-match `.find()` over the item's purchases (own claim or one the viewer recorded) and passes it to `PurchaseModalSlot`, which branches the *entire* modal on it: any removable claim → manage state (banner + single "Remove my claim"), else claim flow. The modal opens via `?purchaseItem=<id>` with no state discriminator, so `Add Claim` and `Manage claim` are indistinguishable at open time. The undo popup (`ClaimUndoPopup`, from #235's `Buy & Claim`) undoes `removableClaim` — correct today only because a viewer can hold at most one visible claim before this change makes additional claims recordable.

Settled upstream: map #233 decisions (owner `Add Claim` = attributed claim; no schema changes anywhere in the map), `item-actions` matrix rows (labels/slots correct, incl. `Manage claim` top + `Add Claim` 2-up in the slots-remain state), `item-store-links` (store row renders in every modal variant including already-claimed). Grilling decisions recorded in this doc were settled with the owner on 2026-07-17.

## Goals / Non-Goals

**Goals:**

- `Add Claim` reaches the claim flow when the viewer already holds a claim and slots remain.
- Manage state handles N viewer-removable claims with per-claim removal.
- Single-claim consumers of `removableClaim` behave correctly at N ≥ 2 (undo popup, card banner, container class).
- E2E happy-path coverage for #234 + #235 + #260 (deferred from #235's spec-review).

**Non-Goals:**

- Second self-claim / multi-unit-for-self semantics — MAP #230 cargo. Requires reshaping the partial unique index on `purchases (item_id, user_id)` (the documented no-transaction concurrency backstop) and quantity display semantics; map #233 forbids schema changes.
- Guest claim identity (#236) — guest claims stay cookie-less here.
- Any `item-actions` matrix, label, or slot change.
- Cross-navigation between modal states.

## Decisions

### D1 — Opening state rides a second URL param

`Add Claim` sets `purchaseView=claim` alongside `purchaseItem`; `Manage claim` (and every other opener) sets only `purchaseItem`. Param absent or unrecognized → default rule preserving today's behavior: manage state when the viewer holds a removable claim, claim flow otherwise. Closing clears both params. Chosen over lifted client state because the modal's open/close lifecycle is already URL-driven — reload and back/forward keep the invoked state, and no parallel state channel is introduced. The param is only ever *set* by `Add Claim`, so stale-param cases collapse into the default rule.

### D2 — Manage state is always a list *(amended by D7)*

The manage state renders a claims list — `OwnerClaimsList` generalized into one shared claims-list component. The N=1 banner + full-width "Remove my claim" branch in `PurchaseModalSlot` is deleted: one code path at every N, uniform with the owner modal. Removing the last removable claim from the manage state closes the modal (nothing left to manage; the item returns to its claimable presentation) — mirrors today's post-remove close. Originally the list was scoped to viewer-removable claims only; D7 (owner design round, 2026-07-17) widens it to all claims with per-row removability.

### D7 — Claims list renders all claims, rich rows (design 1d)

Owner-settled design round (mockup "1d · boxed rows + avatars, mixed removability"): the shared claims list, in both the viewer manage state and the owner `Manage claims` modal, lists **every** claim on the item under a "CLAIMED BY" section label — boxed rows with the purchaser's `Avatar` (real profile image for linked accounts via a `PurchaseView.image` passthrough, initials for guest names; optimistic rows fall back to initials until the next server render), the claim's relative date as a muted suffix, and the removal action rendered only on rows the viewer may remove (viewer: own + attributed-by-them; owner: all rows, master unclaim). No privacy delta: non-owner viewers already receive every sanitized row (the "Claimed by …" banner renders from them). Rejected: pill chips with × (1b — chip-× means "dismiss a filter" in this app, wrong register for a server mutation, and chips can't carry attribution or dates); solid-red button column (1c as drawn — alarm-wall register; the existing outline `danger sm` stays, no button-system change). The list region is scroll-capped so the header and store row stay anchored on many-claim items.

Data: `purchased_at` joins `PurchaseView` as a `sanitizePurchases` passthrough (the queries already fetch whole purchase rows); optimistic rows stamp client time. `timeAgo` is promoted from `ListDetails.tsx` to a shared `lib/timeAgo.ts` (its inline comment already anticipated promotion at the second caller) and both surfaces consume the one format.

### D8 — "(you)" labeling is grid-scoped

In the claims list only, the viewer's own claim is labeled "{firstName} (you)"; attribution renders as a gender-neutral secondary line ("Added by you" / "Added by {claimer first name}" in the owner view) instead of the inline "— added by" suffix. Everywhere else — the card banner and the spoiler banner rows via `claimLabel` — keeps the short "You" form: those surfaces are length-constrained (owner call, 2026-07-17). The optimistic self-claim row's `'You'` fallback (no `user_name`) is guarded so "You (you)" cannot render.

### D3 — Self-CTA suppression is one predicate, no auto-expand

In the claim flow, "Claim this gift" is hidden iff the viewer is already the recorded purchaser of some row (`viewerIsPurchaser`: a purchase whose `by === 'self'`). The disclosure stays collapsed-by-default per the existing spec. Owner chose least-rework-for-#230: when multi-unit-for-self lands, the flip is deleting one predicate — no auto-expand plumbing to unwind. A viewer holding only attributed claims (purchaser is someone else) keeps the live self-CTA: that is their first self-claim, permitted by the unique index. Alternatives rejected: auto-expanded disclosure (extra plumbing to rip out), disabled-with-tooltip CTA (permanently dead control).

### D4 — Undo popup targets the just-recorded claim

`recordClaim` success already yields the inserted row id; `Buy & Claim` captures that id (ephemeral consumer state alongside `showUndoPopup`) and the popup's undo dispatches removal for exactly that claim — never first-match `removableClaim`, which at N ≥ 2 can point at a different claim than the one just recorded.

### D5 — Card banner enumerates all viewer-removable claims

The `purchased-banner--mine` banner lists every viewer-removable claim (self rendered as "You claimed this", attributed as "for {name}", joined) via the existing `claimLabel`/`claimSummary` pattern. First-match single-claim copy would silently misreport at N ≥ 2. `has-my-claim` container class and `viewerClaimed` (card affordance predicate) keep any-removable-claim semantics unchanged.

### D6 — E2E: happy path per behavior, on `e2e-critical-flows`

New/extended Playwright specs (authenticated project unless noted): `Buy & Claim` → undo popup keep and undo paths; `Add Claim` opens the claim flow while the viewer holds a claim and records an additional (attributed or guest) claim; `Manage claim` lists N claims with per-claim removal; ItemActions matrix spot-checks (authenticated claimable = Buy & Claim primary; guest claimable = Add Claim primary, guest project). Exhaustive #169 matrix × quantity states stays in unit tests. Seeded data already reaches partial-claimed and multi-buyer states without clicking (see CLAUDE.md seed notes).

### D9 — Progressive reveal, removable-first (owner round 2, 2026-07-17)

An unlimited-quantity item can accumulate arbitrarily many claims (the celebrity-list failure state), so the claims list never renders unbounded: rows the viewer can remove sort to the top, the list initially renders `INITIAL_VISIBLE = 10` rows, and a "See more (N)" control reveals `SEE_MORE_STEP = 10` more per activation. One uniform rule — no separate always-show-removables carve-out — so the pathological owner case (thousands of removable rows under master unclaim) is bounded by the same mechanism: their rows are all at the top, revealed in batches. Reveal is client-side over already-delivered sanitized rows; bounding the DAL payload itself for extreme claim counts is out of scope here (no current surface caps it, and it would be its own read-shape change). The scroll cap from D7 stays — batches scroll within the region; the See more control sits below the scroll region, always reachable.

## Risks / Trade-offs

- [Stale `purchaseView=claim` in a shared/bookmarked URL] → param is harmless: the claim flow is a valid state for any viewer; fully-claimed items keep the existing card-level guard, and the default rule governs when the param is absent.
- [Deleting the N=1 manage banner changes existing UI] → deliberate (owner decision); e2e + unit tests assert the list-of-1 presentation.
- [Undo popup id capture races a purchases-prop refresh] → the id is applied to local state in the same success handler that appends the optimistic row; the popup's undo uses the captured id only, so a prop-driven resync cannot retarget it.
- [Shared claims-list component couples owner and viewer manage surfaces] → they are one concept (removable-claims list with per-row removal) differing only in the claims subset passed in; divergence pressure would come from new per-row affordances, at which point the split rule in CLAUDE.md applies.

## Open Questions

None — all decisions settled in the 2026-07-17 grilling.
