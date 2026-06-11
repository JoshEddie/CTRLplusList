# Design — Expand Claim Attribution

## Context

A `purchases` row currently stores its buyer one of two ways: `user_id` set (authenticated self-claim) or `user_id` NULL + `guest_name` set (guest or on-behalf claim). The "someone else" flow always produces the second shape, even when the buyer is a real user. `canRemovePurchase` authorizes authenticated removal strictly by `row.user_id === actor`, which locks an authenticated creator out of their own guest-name claim. The owner never sees a claim button (`Item.tsx` suppresses it on `isOwner`), and the spoiler toggle (`?spoilers=1`) is the owner's only window into claim state.

Constraints inherited from active specs:

- `server-endpoint-authorization` mandates `user_id` NULL on on-behalf claims and strict-ownership removal — both modified by this change (delta spec in this change's `specs/`).
- `following` defines the follow graph (`user_follows`, composite PK), block semantics ("either party blocked" prevents follows), and the no-transactions discipline with its three sanctioned invariant mechanisms.
- neon-http driver: no interactive transactions; cross-statement races are backstopped by unique indexes or documented as residual.

Actors used throughout: **O** = list owner, **C** = claimer (asserts the purchase), **B** = purchasee (marked as buyer).

## Goals / Non-Goals

**Goals:**

- Let C mark a real user B as the purchaser, with B getting `'self'` display and unclaim rights.
- Let O claim items on his own list (self or on-behalf), entirely inside the spoiler view.
- Row-based unclaim rights: `claimed_by`, the purchaser (`user_id`), or O (master unclaim).
- Fix the authenticated-guest-claim lockout via `claimed_by`.

**Non-Goals:**

- No notification/consent flow for B (silent attribution is an accepted v1 trade-off; B can unclaim).
- No notification to a gifter whose claim O removes via master unclaim.
- No retroactive backfill of `claimed_by` for legacy guest rows (identity was never stored).
- C cannot mark O as the purchaser (O isn't in O's mutuals; owner-self-purchase is O's own spoiler-view action).
- No change to signed-out guest claiming or its name-match removal rule.

## Decisions

### D1 — One new column (`claimed_by`); `user_id` keeps its name and sharpens to "the purchaser"

`user_id` today conflates two roles: the buyer and the asserter (they were always the same person). Attribution splits them: `user_id` remains the purchaser column, and a new `claimed_by` records who asserted the claim. Every row stays self-describing:

| Scenario | `claimed_by` | `user_id` (purchaser) | `guest_name` |
| --- | --- | --- | --- |
| Self-claim | me | me | NULL |
| Attributed claim | me | them | NULL |
| Authenticated guest-name claim | me | NULL | "Mom" |
| Signed-out guest claim | NULL | NULL | "Mom" |

Existing self-claims backfill `claimed_by = user_id`; no column rename or drop, the dedup index and all `user_id` readers (`sanitizePurchases`'s `'self'` marking already keys off it) stay put. The cost is that `user_id = B` no longer implies B acted — every authorization site that meant "the asserter" must move to `claimed_by` (notably `canRemovePurchase`'s authenticated branch). **Rejected:** a separate `purchased_by` column replacing `user_id`'s buyer meaning — churns the index, every reader, and the `server-endpoint-authorization` user-owned-table enumeration for no semantic gain; **rejected:** `is_attributed` boolean — loses "who asserted it," which the unclaim matrix and owner-entry display both need.

### D2 — Eligible pool = O's mutual follows, not C's graph

C↔B-mutual fails the canonical scenario (wife marks mom; they don't follow each other). O's mutuals encode both needed properties at once: O follows B → O vouches for B as gift-circle; B follows O → B can see follower-gated lists, so B's unclaim right is exercisable, never an orphaned row. C needs no new relationship — the existing `isItemViewable` gate already governs who can claim. Block edges between C and B (either direction) exclude B from C's pool, mirroring `followUser`'s block predicate. The pool check is enforced server-side in `createPurchase`; the picker is presentation only. Sort order: B's who are also C's mutuals first, then O's remaining mutuals — pure UX, no policy weight. **Rejected:** all-three-mutual (breaks grandma case — owners don't follow back all gift-givers); C↔B mutual (the wife/mom counterexample); no gate (lets C pin purchases on arbitrary users).

### D3 — Rights are row-based and gate at claim time only

The mutual check runs once, at `createPurchase`. Later unfollows or blocks do not strand or revoke claims — unclaim rights come from the row (`claimed_by` / purchaser `user_id`) plus O's item ownership. This avoids re-checking a mutable graph for authorization and matches the `following` spec's idempotent-ordering philosophy.

### D4 — Owner claiming lives entirely inside spoiler view

Spoilers off = today's exact view (no claim info, no claim actions). Spoilers on = claim badges (existing) **plus** claim buttons on items with remaining quantity and unclaim affordances. This kills the spoiler-leak collision by construction: O can only act on claim state he can already see, so "item already fully claimed" is a normal visible state, never a leaking error message. Master unclaim is authorized server-side by `viewer == item.user_id` alone — spoilers is a UI surface, not a permission; the server cannot verify a query param and must not pretend to. **Rejected:** always-on owner claiming with hidden-claim conflict errors (every rejection leaks a spoiler); a separate "owner claims always visible" carve-out in `sanitizePurchases` (unnecessary once entry is spoiler-gated — symmetry holds).

### D5 — Unclaim matrix replaces strict ownership in `canRemovePurchase`

```
canRemove(viewer, row, item) =
     viewer == row.claimed_by
  || viewer == row.user_id             // the purchaser
  || viewer == item.user_id            // owner master unclaim
  || (viewer unauthenticated && row.claimed_by IS NULL
      && supplied name === row.guest_name)   // unchanged guest path
```

`removePurchase` therefore joins the item (one extra read; acceptable — removal is rare). The authenticated-creator lockout disappears because authenticated guest-name claims now carry `claimed_by`. Legacy guest rows (all-NULL identities) remain creator-locked but gain the owner escape hatch. **Rejected:** "anyone can remove all-NULL guest rows" — owner-as-janitor is strictly safer than open-to-all.

### D6 — Existing `(item_id, user_id)` dedup index is reused unchanged as the purchaser-uniqueness backstop

With `user_id` keeping the purchaser role, the existing partial unique index already enforces purchaser uniqueness and remains the only concurrency backstop available without transactions (per the `following` spec's discipline). It prevents B being double-marked — by races or by C and B acting independently. When B hits it after C already marked them, the UI reads it as "you're already marked as the purchaser" (B sees the row as `'self'`), not an opaque error. The capacity-vs-insert race for `quantity_limit` remains the documented residual it already is in `createPurchase`.

### D7 — Picker composes existing primitives; new read in `lib/data/user.ts`

The picker step is a search-filterable list of avatar+name rows inside the existing purchase modal, built from `form-field-system` (search/guest-name input), `button-system`/`menu-system` (option rows), no new primitive family. A new read `getEligiblePurchasers(ownerId, claimerId)` lives in `lib/data/user.ts` (follow-graph domain, not purchase), implemented as the intersection of follower/followee sets minus block edges, minus the claimer themselves (the self-claim CTA owns that path; a "me" row under the someone-else divider reads as a different person and records a claim that displays as "You"), `'use cache'` tagged `user_follows` + `user_blocks` — both tags already invalidated by every follow/block mutation. Purchase mutations continue to revalidate `items` only.

### D8 — `sanitizePurchases` display logic is unchanged; the owner's spoiler view may surface the claimer

Viewer-relative `'self'`/`'other'` marking and name resolution (`user_id` user's name → `guest_name` → "Someone", via `firstNameOf()` per `following`'s first-name-display requirement) already key off `user_id`, which keeps the purchaser meaning — attributed users get `'self'` marking with no display-layer change. The owner's spoiler view may additionally show "added by {claimed_by first name}" when `claimed_by ≠ user_id` — this is what lets O distinguish his own entries from gifter claims.

### D9 — Single-screen "me-first" modal; every row is the commit action

Wireframed and settled (Claude Design handoff, 2026-06-10). The purchase modal collapses today's three-screen flow (initial → self/other → confirm) into one screen:

1. Header: **"Claim this gift"** title with the item's name as subtitle, + close.
2. Primary CTA at the top — one tap self-claims immediately, no confirm screen. Copy: **"I'm getting this"** for viewers (intent-true: a claim precedes the purchase); **"I bought this myself"** for the owner's spoiler-view entry (recording a done fact — the tense asymmetry is deliberate).
3. Divider: **"Claim for someone in {Owner}'s circle:"** — a complete imperative thought (not a fragment leaning on the CTA's grammar), carrying the pool-scoping so a claimer who follows someone absent from the list reads it as "not in {Owner}'s circle," not a bug.
4. Search input modeled on the existing store-filter search (icon, clear button), placeholder **"Search {Owner}'s circle…"** reaffirming the scope at the point of confusion; live-filters the list. Empty state: **"No one by that name — add them below"** (points at the guest fallback instead of dead-ending).
5. Eligible-pool list (avatar + name rows, D2 sort), **scrollable within a max height from the jump — no visible-row cap, no overflow row**. **Tapping a row claims immediately** — no second screen, no confirm, no arrows on rows (an arrow is a navigation affordance and would promise a screen that doesn't exist).
6. Bottom row: **"Someone not listed? Enter their name"** — expands inline to the free-text input with its own submit, **"Claim for {name}"** (the guest path keeps a natural type-and-commit step). User-facing copy avoids the internal term "guest."

The modal scrim covers the full viewport (`inset: 0`), dimming the nav, list hero, and pagination — replacing the prior partial overlay whose fixed top/bottom offsets left the hero bright and interactive above the modal. A claim decision is genuinely modal; nothing behind it stays tappable while it's open (same convention as the mobile filters-sheet scrim).

User-facing verb is **claim/get**, matching the existing surfaces ("Claim this gift", "You claimed this", "Claimed by …", "Fully claimed") — not "purchase" (internal) or "buy" (transactional; nothing else in the UI talks money). Mis-tap recovery is the existing on-item unclaim affordance, not a new pattern: the item visibly flips to claimed with the chosen name, and under D5 the actor is always `claimed_by`, so the unclaim they see is guaranteed to work. An optional ⓘ popover explaining the pool ("This list is {Owner}'s circle on the app. Don't see someone? Type their name below.") is apply-time polish — it scopes to the owner only (per D2 the claimer's relationships sort the list but never gate membership) and never mentions follows or blocks. **Rejected:** confirm screen on someone-else rows (friction this redesign exists to remove; the mistake is visible and self-reversible); undo toast (a one-off pattern duplicating the on-item undo that already exists); select-then-confirm unified picker (primary action's position degrades with pool size — the CTA pins the dominant path to a fixed spot regardless of how many mutuals the owner has); "+N more" overflow row (copy explaining a limitation is worse than not having the limitation — the list just scrolls).

## Risks / Trade-offs

- [Silent attribution: C marks B without B's knowledge] → pool limited to O's mutuals, block edges respected, B sees it as `'self'` and can unclaim, O can master-unclaim. Notification deferred, recorded as a known follow-up.
- [Owner master unclaim erases a surprise gifter's claim with no signal; item reopens, double-purchase possible] → accepted: owner consciously entered spoiler view; legit uses (stale claims, returns, cleanup) dominate. "Notify claimer" is a possible future layer.
- [Legacy authenticated-guest rows stay creator-locked] → irreducible (identity never stored); owner master unclaim is the retroactive escape hatch for every such row.
- [Pool re-verify and insert are separate statements (no transactions); a block/unfollow can land between them] → residual and harmless: rights are row-based (D3), the at-claim gate is best-effort by design; comment inline mirroring the existing capacity-race comment.
- [`user_id = B` no longer implies B acted — an authorization site still treating `user_id` as "the asserter" silently grants/denies the wrong person] → grep every `purchases.user_id` authorization read and reclassify it as purchaser-meaning or asserter-meaning; the delta spec for `server-endpoint-authorization` re-words the purchases ownership rule so the spec and code stay in lockstep.
- [Picker exposes O's mutual list to any C who can see the list] → bounded leak: only mutuals (both consented edges), first names + avatars, same audience that can already see those users' claims on the list. Accepted.

## Migration Plan

1. Add `claimed_by` (nullable FK to `users`, `ON DELETE SET NULL` matching current behavior).
2. Backfill `claimed_by = user_id` where `user_id IS NOT NULL`.
3. Move asserter-meaning code paths to `claimed_by` (notably `canRemovePurchase`); `user_id` readers that mean "the purchaser" stay as-is.
4. Seed update: attributed rows, an owner self-claim, and a legacy-shape guest row so all unclaim-matrix branches are reachable.

Rollback: the column is purely additive — dropping `claimed_by` restores the prior schema; pre-change rows are untouched throughout.

## Open Questions

- Should the owner's spoiler view label attributed entries ("Mom — added by Sarah") everywhere or only in a detail affordance? (Display-polish, decide at apply time.)
- ~~Exact picker interaction when O has many mutuals (search threshold, max visible rows)~~ — resolved by D9: search bar is always present and the list scrolls within a max height; no row cap, no overflow row.
- ~~Primary-CTA copy for the owner's spoiler-view entry~~ — resolved by D9: "I bought this myself."
