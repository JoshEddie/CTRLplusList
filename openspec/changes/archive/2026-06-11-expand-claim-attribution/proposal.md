# Expand Claim Attribution

## Why

Closes the two layers of [issue #105](https://github.com/JoshEddie/CTRLplusList/issues/105). Today the "Someone else purchased it" flow stores a free-text `guest_name` only — a purchaser who is a real user of the app gets no linked account, no `'self'` marking on their own claim, and no durable unclaim rights. Worse, an authenticated user who records a guest-name claim is locked out of undoing it: `canRemovePurchase` short-circuits on `actorUserId` and the row's `user_id` is NULL, so the creator can only remove their own claim by signing out and re-typing the exact name. Separately, the list owner cannot mark their own items as purchased at all ("I bought it myself" / "I know someone bought it but didn't mark it"), and stale or mistaken claims have no janitor.

Inherited constraint: `server-endpoint-authorization` currently mandates that an on-behalf claim's `user_id` SHALL be NULL ("the named third party is a free-text label, never an account") and that purchase removal authorizes strictly by `row.user_id === actor`. This change deliberately supersedes both rules — that capability is modified, not worked around.

## What Changes

- **Schema** (migration): `purchases` gains one column, `claimed_by` (who asserted the claim). The existing `user_id` keeps its name and sharpens its meaning to "the purchaser" — for attributed claims it holds the marked user while `claimed_by` holds the asserter; today's self-claims backfill `claimed_by = user_id`. The dedup partial unique index on `(item_id, user_id)` is unchanged. Legacy authenticated-guest rows cannot be backfilled with `claimed_by` (identity was never stored) — accepted; owner master unclaim covers them.
- **Attributed claims**: the "Someone else" step gains a user picker. The eligible pool is the **list owner's mutual follows** (owner follows them AND they follow the owner), minus anyone with a block edge to/from the claimer; sorted with the claimer's own mutuals first; the free-text guest fallback remains for non-users. The server re-verifies pool membership at claim time — the picker is UI only.
- **Owner claiming, gated by spoiler view**: with spoilers on, the owner sees a claim button on items with remaining quantity and uses the same modal (self / someone-else). Spoilers off remains exactly today's view — no claim info, no claim actions. This makes spoiler-leak collisions impossible by construction (the owner only acts on claim state they can already see).
- **Unclaim matrix**: a claim is removable by `claimed_by`, by the purchaser (`user_id`), or by the **list owner** (master unclaim, surfaced in spoiler view). Signed-out guest rows keep today's exact-name-match rule as their self-serve path. Rights derive from the row, not the live follow graph — later unfollows don't strand claims.
- **Display**: `sanitizePurchases` already keys `'self'` off `user_id`, so an attributed user sees their own claim as theirs with no display-layer change; attributed claims count toward `quantity_limit` identically to self-claims. The owner's spoiler view may surface `claimed_by` when it differs from the purchaser.

## Capabilities

### New Capabilities

- `claim-attribution`: who may be marked as a purchaser (owner's-mutuals pool, block exclusions, server-side re-verification, guest fallback), the claimed_by + user_id-as-purchaser row model, the unclaim-rights matrix including owner master unclaim, and spoiler-gated owner claiming.

### Modified Capabilities

- `server-endpoint-authorization`: the guest-write-path clause changes — an authenticated on-behalf claim now stores `claimed_by = caller` and may store `user_id = <linked user>` when the target is in the eligible pool (free-text `guest_name` remains the fallback with `user_id` NULL). The "named third party is never an account" SHALL is removed; the no-client-`user_id` rule is preserved by accepting the attribution target as a distinct, server-re-verified `purchased_by` payload field. The update/delete ownership rule for `purchases` changes from strict `row.user_id === actor` to the claimed_by/purchaser/list-owner matrix.
- `e2e-critical-flows`: the claim flows gain pinned coverage for attributed claims (picker path) and owner claiming/master unclaim under spoilers; existing flow 7/8 wording references the old "someone else = guest name only" model.

## Impact

- `db/schema.ts` purchases table + Drizzle migration; backfill of existing self-claim rows.
- `lib/data/purchase.actions.ts` (`createPurchase`, `resolveClaimIdentity`, `removePurchase`/`canRemovePurchase` — removal now needs the item's owner, a join it doesn't currently make) and `lib/data/purchase.ts` (`sanitizePurchases`).
- New read in `lib/data/user.ts` (mutuals-of-owner, block-filtered) — consumes cache tags `user_follows` and `user_blocks`, both already revalidated by `followUser`/`unfollowUser`/`removeFollower`/`blockUser`/`unblockUser`; no new mutation paths needed. Purchase mutations continue to revalidate `items`.
- `app/(main)/items/ui/components/purchasemodal/*` (picker step, shared by viewer and owner entry points) and `Item.tsx` (owner claim button under spoilers, unclaim affordances). Picker UI composes existing primitives (`form-field-system` input for search/fallback, `menu-system`/`button-system` for selection); no new primitive family — if selection pressure demands a new surface, that becomes a primitive-spec modification at design time.
- Single-statement constraint (neon-http, no transactions) applies: pool re-verification and insert are sequential statements; the existing `(item_id, user_id)` partial unique index is the concurrency backstop for double-marking, mirroring the existing capacity-race comment pattern.
- Seed (`scripts/seed-dev-users.ts`) gains attributed-claim rows so picker/unclaim states are reachable from the seed.
