# Tasks — add-claim-while-claimed

## 1. Affordance-routed modal state

- [x] 1.1 Thread the opening-state signal: `Add Claim` sets `purchaseView=claim` alongside `purchaseItem` in `Item.tsx`'s open handler; `Manage claim` sets only `purchaseItem`; close handler clears both params
- [x] 1.2 Route `PurchaseModalSlot` by an explicit opening-state prop (claim flow vs manage) computed in `Item.tsx` from `purchaseView` + the default rule (manage when a removable claim exists, else claim flow), replacing the `removableClaim`-only branch; owner and guest variants unaffected

## 2. Viewer manage list

- [x] 2.1 Generalize `OwnerClaimsList` into one shared claims-list component (rows + per-claim Remove via `claimLabel`); owner modal passes all claims; viewer manage state scoping superseded by 7.3
- [x] 2.2 Replace the manage state's single-claim banner + "Remove my claim" presentation with the claims list at every N; delete the retired branch from `PurchaseModalSlot`
- [x] 2.3 Close the modal when the last removable claim is removed from the manage state

## 3. Claim flow while holding a claim

- [x] 3.1 Hide the "Claim this gift" CTA behind a `viewerIsPurchaser` predicate (a claim marked `'self'` exists); disclosure stays collapsed-by-default; claimer-only viewers keep the CTA

## 4. N-claims audit of single-claim consumers

- [x] 4.1 Capture the just-recorded claim id on `Buy & Claim` success and point the undo popup's undo at exactly that claim (never first-match `removableClaim`)
- [x] 4.2 Enumerate all viewer-removable claims in the card's "You claimed this" banner (`ClaimBanners`), reusing the claim-label derivation; `has-my-claim` and `viewerClaimed` predicates unchanged

## 5. Unit tests

- [x] 5.1 Modal routing tests: `Add Claim` → claim flow with `purchaseView=claim`; `Manage claim` → manage state; param-less default rule; close clears both params
- [x] 5.2 Manage-list tests: N rows for viewer-removable claims only, per-claim removal dispatch, list-of-1 presentation, last-removal closes modal
- [x] 5.3 Claim-flow suppression tests: recorded purchaser sees no self CTA; claimer-only viewer keeps it; attributed claim records from the flow
- [x] 5.4 Undo-target and banner tests: undo popup removes the just-recorded claim at N ≥ 2; banner enumerates own + attributed claims

## 6. E2E coverage (#234 + #235 + #260 deferral)

- [x] 6.1 Buy & Claim kept path: undo popup opens, "Yes, I purchased it" keeps the claim, persisted on reload (authenticated project)
- [x] 6.2 Buy & Claim undo path: "No — undo claim" releases the item to its claimable action set
- [x] 6.3 Add Claim while claimed: claim flow opens on a seeded partial-claimed item, additional claim records and displays
- [x] 6.4 Manage claim list: two removable claims render as rows, one removal persists, the other remains
- [x] 6.5 Matrix spot-checks: authenticated claimable → `Buy & Claim ↗` primary + `View item ↗` · `Add Claim`; guest claimable → `Add Claim` primary, no `Buy & Claim ↗` (guest project)

## 7. Claims-list richness (design 1d, owner round 2026-07-17)

- [x] 7.1 `PurchaseView.purchased_at` passthrough in `sanitizePurchases` (+ `RawPurchase`); optimistic rows stamp client time
- [x] 7.2 Promote `timeAgo` from `ListDetails.tsx` to shared `lib/timeAgo.ts`; both callers consume it (move its tests alongside)
- [x] 7.3 Claims list renders ALL claims (viewer + owner surfaces) under a "Claimed by" label; removal action only on rows the viewer may remove (viewer predicate: own + attributed-by-them; owner: all)
- [x] 7.4 Row form: purchaser `Avatar` (profile image via `PurchaseView.image` passthrough, initials fallback), "{firstName} (you)" own-claim label (grid-only; guard the `'You'` fallback), muted relative date, gender-neutral attribution line ("Added by you" / "Added by {claimer}")
- [x] 7.5 Boxed-row styling + scroll-capped list region in modal.css
- [x] 7.6 Unit tests: all-claims listing with mixed removability, label forms, date rendering, attribution lines, timeAgo promotion
- [x] 7.7 E2E: claim-lifecycle assertions updated for the richer rows (other claimants visible without removal actions)

## 8. Pre-merge — round 2 (superseded by §10 after the progressive-reveal round)

- [x] 8.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 8.2 `npx tsc --noEmit` — zero errors
- [x] 8.3 `npm run build` — completes successfully
- [x] 8.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 8.5 `npm run test:e2e` — zero failing tests

## 9. Progressive reveal (design D9, owner round 2026-07-17)

- [x] 9.1 Claims list sorts viewer-removable rows first (stable partition), renders `INITIAL_VISIBLE = 10` rows, "See more (N)" reveals `SEE_MORE_STEP = 10` per activation, control disappears when exhausted; sits below the scroll region
- [x] 9.2 Unit tests: removable-first ordering, initial bound, see-more batching + remaining count, control absent at ≤ bound

## 10. Pre-merge

- [x] 10.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 10.2 `npx tsc --noEmit` — zero errors
- [x] 10.3 `npm run build` — completes successfully
- [x] 10.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 10.5 `npm run test:e2e` — zero failing tests
