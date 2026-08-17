# Profiles schema phase 2: point references at profiles

Source issue: [#190](https://github.com/JoshEddie/CTRLplusList/issues/190) (part of [MAP: Dependents and shared list management #181](https://github.com/JoshEddie/CTRLplusList/issues/181)).

## Why

Phase 1 ([#189](https://github.com/JoshEddie/CTRLplusList/issues/189)) gave profiles a home — `profiles`, `profile_members`, the preferences pair, and the `updated_by_user_id` audit columns — but nothing references a profile yet. Every list, item, follow edge, block edge, and purchase attribution still points at `users`, so a managed profile cannot own or be the subject of anything. This phase adds profile-valued columns beside the account-valued ones, backfills them through each account's self-profile, and swaps every read, write, and ownership comparison over in the same change. The column work and the comparison rewrite cannot ship apart: a profile-valued column compared against a `users.id` is silently always-false.

**Acceptance bar: no user-visible change in behavior.** Shipped to production, the application behaves exactly as it does today. This is a change of which table the references point at, not of what the application does. One address does move: `/user/[id]` carries a profile id rather than an account id, so profile URLs are re-keyed even though the page behaves identically. The existing `e2e-critical-flows` and `e2e-management-flows` suites are therefore the primary evidence — they SHALL pass with no edit other than those `/user/[id]` literals and comment-only updates naming a DAL function this change renames, and any edit touching a spec's executable lines is a defect signal rather than maintenance.

**One profile per account is the entire world this change lives in.** No surface creates a second profile ([#192](https://github.com/JoshEddie/CTRLplusList/issues/192)) and none switches to one ([#193](https://github.com/JoshEddie/CTRLplusList/issues/193)). Within this change an account's self-profile is a complete stand-in for the account: ownership is a strict comparison of profile ids rather than a membership search, there is no active profile to resolve, and `profile_members` gains no readers. Machinery for the multi-profile case would be branches with no reachable caller — it belongs to the chunks that make that case real.

**Boundary settled elsewhere.** [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) fixed which state moves and which stays; this change executes that ruling rather than re-deciding it. **Seven** columns gain profile counterparts, not the eight the *(unreviewed)* [#184](https://github.com/JoshEddie/CTRLplusList/issues/184) scout enumerated — `user_follows.follower_id` stays on `users`, because profiles are followed and never follow, and that reason is structural rather than transitional. `list_visits`, `users.last_seen_following_at`, and `users.name`/`users.image` stay on `users` too, though they are not FK columns of this change.

**`purchases.claimed_by` gains a profile counterpart, on one rule.** [#202](https://github.com/JoshEddie/CTRLplusList/issues/202)'s 2026-08-14 revision reversed its own call: the claim asserter becomes a profile reference that **always stores the actor's self-profile, never any other profile**. A claim is a human act, so it does not follow the switcher [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) will build — which is also why a self-claim's purchaser is the actor's self-profile. The rule keeps profile → human injective (one self-profile per account, index-enforced), so no separate actor column is owed and a moderation target resolves through `profiles.user_id`. It buys the asserter surviving account deletion, matching a purchaser column that now survives, and keeps the attributed-claim test a plain inequality instead of a per-purchaser lookup.

**Blocks are profile-to-profile, and nothing more.** [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) also specified an owners-only cascade materializing a block row per profile the blocker owns. That branch requires an account owning a second profile, which cannot exist until [#192](https://github.com/JoshEddie/CTRLplusList/issues/192); it does not ship here, and inheritance at profile birth is already [#192](https://github.com/JoshEddie/CTRLplusList/issues/192)'s. Design work also surfaced that a profile-scoped block is evadable by creating a fresh profile — unreachable in this change for the same reason, and the redesign it calls for — whether a block names a profile, a human, or the content's last mutator — is [#303](https://github.com/JoshEddie/CTRLplusList/issues/303), which now gates [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) and [#193](https://github.com/JoshEddie/CTRLplusList/issues/193). Blocking behaves here exactly as it does today.

**Inherited constraints (binding active specs and repo docs):**

- `profiles-data-model` — "Phase 1 is additive only" is scoped to phase 1 and is not violated by this phase; the self-profile invariant (one per account, `self` membership, created at account creation) is the guarantee every backfill here leans on, and `updated_by_user_id` is specified as written by "later changes" — this is that change.
- `server-endpoint-authorization` — server actions SHALL resolve the actor through the shared `authedUserId()` seam ([#188](https://github.com/JoshEddie/CTRLplusList/issues/188) made it normative), SHALL NOT accept an actor id on the payload, and SHALL reject unauthenticated writes with `{ success: false, error: 'Unauthorized' }`. The enumerated guest write paths (`createPurchase` with a `guest_name`, `removePurchase` by an unauthenticated caller, `mintItemPlaceholder`) keep resolving to a null actor.
- `claim-attribution` — the partial unique index over `(item_id, purchaser)` is the named no-transaction backstop against a double-recorded purchaser; the purchaser column SHALL NOT be read as "who acted"; `sanitizePurchases` marks `'self'` off the purchaser, not the asserter; removal is authorized for claimer, purchaser, or item owner.
- `following` — `user_follows(follower_id, followee_id)`, no self-follow, no follow across a block; blocks gate URL access both ways via `guardListViewable` and the profile route; `last_seen_following_at` lives on `users`; `user.actions.ts` writes are single-statement, never transactional.
- `list-item-management` — `createPurchase` looks the claimer up from the session and forbids a client-supplied purchaser; `setListItems` / `removeListItem` authorize list ownership server-side.
- `visit-history` — `list_visits` is keyed `(user_id, list_id)` by composite primary key, and `bookmarkList` rejects a non-owner on an owner-only list.
- `DATABASE.md` — no interactive transactions; each `--> statement-breakpoint` chunk is its own HTTP round-trip; atomicity via unique / partial-unique indexes and `ON CONFLICT`; cross-statement guards inside a single `DO $$` block; forward-only, `IF [NOT] EXISTS`-guarded, idempotent backfills per `drizzle/0001_black_legion.sql`.

**Terrain re-verified at departure:**

- The seven columns, the two composite primary keys on `user_follows` and `user_blocks`, and the `purchases_item_user_unique_idx` partial unique are all present as described in `db/schema.ts`. `list_visits` stays account-keyed, so the scout's "3 composite PKs" is two.
- Phase 1 landed **no** profile-valued columns on the content or social tables. This phase therefore carries the column add and backfill as well as the constraint work — the scout's "PR-1 additive / PR-2 tightening" split does not match what shipped.
- **Eight** live comparisons break, not the three [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) named. Three are in `lib/data/purchase.ts` — `isSelf` (`:36`), `claimedByViewer` (`:41`), and `canRemovePurchase`'s purchaser and item-owner arms (`:151-153`). Five more compare a session user id against an owner column in page and item components: `ListItemsSection.tsx:28`, `ListHeroSection.tsx:30`, `lists/[id]/page.tsx:44`, `Item.tsx:68`, and `Item.tsx:226`. The attributed-claim test `p.claimed_by !== p.user_id` (`:45`) heals — both sides become profiles, so the line stands unchanged.
- `saved_lists` is dead as [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) found — only its own definition and relations in `db/schema.ts`; the sole other references are historical migration SQL. `getLists()` in `lib/data/list.ts` is dead the same way: exported, no callers.
- The `BYPASS_ACTIVE_PROFILE` seam (`lib/auth.ts:152`) stays dormant. Its only purpose is pointing local mode at a profile other than your own, which requires a second profile and a switcher; its first reader arrives with [#193](https://github.com/JoshEddie/CTRLplusList/issues/193).
- The issue body's "8 FK columns, 3 composite PKs" is stale against [#202](https://github.com/JoshEddie/CTRLplusList/issues/202); no settled map decision is contradicted by landed code — no mirage.

## What Changes

### Seven profile columns are added beside the account columns

| table | existing column (kept) | new column |
| --- | --- | --- |
| `lists` | `user_id` | `profile_id` |
| `items` | `user_id` | `profile_id` |
| `user_follows` | `followee_id` | `followee_profile_id` |
| `user_blocks` | `blocker_id` | `blocker_profile_id` |
| `user_blocks` | `blocked_id` | `blocked_profile_id` |
| `purchases` | `user_id` | `profile_id` |
| `purchases` | `claimed_by` | `claimed_by_profile_id` |

Each is added nullable, backfilled idempotently through the owning account's self-profile, then set `NOT NULL` where its predecessor is. Delete behavior and nullability mirror the existing columns exactly — cascade on the six content and edge columns, `SET NULL` on the asserter, purchaser and asserter nullable for the guest path. The existing columns keep their names and their data; [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) drops them. Forward-only, one generated migration hand-completed with the backfill and `DO $$` gating per the `0001_black_legion.sql` precedent.

### The old columns lose only their `NOT NULL` — except two primary keys

`lists.user_id` and `items.user_id` get `DROP NOT NULL`, because nothing writes them after this change and a managed profile has no account id to put there. `purchases.user_id` and `claimed_by` are already nullable.

`user_follows` and `user_blocks` are the exception: their old columns sit inside composite primary keys, and a primary key implies `NOT NULL`, so the constraint cannot be relaxed while the key exists. Both primary keys are therefore **dropped and recreated over the new columns**, and the vacated columns get an explicit `DROP NOT NULL` — Postgres does not remove the implicit one when a primary key goes. **BREAKING** at the schema level, invisible at the app level.

### The purchases partial unique is created, not swapped

A new partial unique over `(item_id, profile_id)` is created alongside the existing one over `(item_id, user_id)`. Both live for one release; [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) drops the old one with its column. [#184](https://github.com/JoshEddie/CTRLplusList/issues/184) called the swap this change's highest-risk item because create-new-then-drop-old leaves a window with no partial unique protecting the concurrent-claim path under the no-transaction driver. Adding rather than swapping removes the window entirely; two coexisting indexes for one release is the whole cost.

### Ownership becomes a profile-id comparison

The viewer stays a human. `lists.profile_id`, `items.profile_id`, and `purchases.profile_id` are profile ids, so every "is this mine" check compares the row's profile id against the profile id of the acting account. Because an account has exactly one profile here, this is a strict comparison and not a membership search: `profile_members` gains **no readers** in this change, and no containment helper, cache tag, or revalidation path is introduced for it.

### Eight live comparisons are rewritten

They ship broken otherwise, each going silently always-false:

- `isSelf` — every purchaser would see their own purchase as someone else's.
- `claimedByViewer` — the claimer would lose the affordances keyed to their own claim.
- `canRemovePurchase`'s purchaser and item-owner arms — both always-false, leaving only the claimer able to unclaim.
- `ListItemsSection`, `ListHeroSection`, and the list page's own `isOwner` — the owner would render as a visitor on their own list.
- `Item.tsx`'s `isOwner` and its self-marking of an attributed claim.

`Item.tsx` is a client component and cannot resolve a profile itself, so its `user_id` prop carries the profile id and is renamed `profile_id` through the components it threads. Its two uses want different profiles once a switcher exists — line 68 wants the profile being viewed, line 226 the actor's self-profile — which are the same value here; [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) owns that split and inherits it named rather than hidden.

### Follows and blocks move over

Follow edges become human → profile: `followee_profile_id` is added, `follower_id` stays on `users`. Block edges become profile ↔ profile on both ends, one row per block, no cascade. The self-follow and self-block guards compare the actor's profile id against the target profile id, a direct translation of today's rule rather than a widening of it.

### Actor resolution gains the profile id

`getUserIdentity(userId)` returns `{ userId, profile }` — the acting profile's whole row — from a new `lib/data/profile.ts`, request-cached with React `cache()` alongside the existing `getUserIdByEmail` pattern. Actions reach it through the existing `authedIdentity()` seam in `user.session.ts`, and pages call that same seam rather than re-deriving the account id and passing it in — no surface hand-rolls the lookup. No active-profile concept ships — there is nothing to choose between — and `profile` means *the profile this request acts as*, a reading that stays true when [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) makes it switchable and adds the available set beside it.

### The profile route carries a profile id

`/user/[id]` keeps its path; the id becomes a profile id, and the three inbound links (`ConnectionRow`, `UserCard`, `ListDetails`) all pass one. Follows now target profiles, so the route must address what the graph points at. The word "user" in the URL is unaffected — the user/profile distinction is internal.

### `updated_by_user_id` is stamped

On `createItem`, `updateItem`, `createList`, `updateList` — the same lines that set the owning profile. Never on archive, delete, reorder, `list.touch`, or `setListVisibility`. Write-only; [#224](https://github.com/JoshEddie/CTRLplusList/issues/224) is the sole reader.

### Dead code goes

`saved_lists` is dropped rather than given a profile column — dead since `list_visits` replaced it, with zero reads or writes repo-wide. `getLists()` is deleted rather than migrated: it has no callers. The `email` selection in the remaining list reads is dropped: the only email the application renders is the session user's own, read from the session.

### No attribution-eligibility change ships

Per [#201](https://github.com/JoshEddie/CTRLplusList/issues/201), a managed profile's list yields an empty attributed-purchaser pool and falls back to free-text — the spec's existing empty-pool behavior. The mutual-follow gate is restated over the profile graph, not relaxed, and the empty pool falls out of the restated predicate rather than being special-cased.

## Capabilities

### New Capabilities

None — profiles already have their capability from phase 1.

### Modified Capabilities

- `profiles-data-model`: adds the phase-2 contract — which seven columns reference profiles and with what nullability and delete behavior, the two primary keys recreated over profile columns, the coexisting partial uniques, the profile-id comparison that replaces account-id ownership, the self-profile rule for the claim asserter and a self-claim's purchaser, and `updated_by_user_id` stamping on the four content-bearing writes. The phase-1 "additive only" requirement stays scoped to phase 1. `profile_members` is specified as having no readers this phase.
- `claim-attribution`: both the purchaser and the asserter become profile references, the asserter constrained to the actor's self-profile; `'self'` marking and the removal-rights matrix are restated over profile ids, while the attributed-claim distinction keeps its current form. The eligible-pool requirement is restated over the profile follow graph — each side's follow leg resolves through `profiles.user_id`, because a profile is never a follower — with a managed profile's null account yielding the empty pool as a consequence of the predicate. The capability's existing "the purchaser SHALL NOT be read as who acted" rule is unaffected: the two columns keep their distinct meanings, both now profile-valued.
- `following`: follow edges become human → profile (the followee moves, the follower does not); block edges become profile ↔ profile, one row per block, with no cascade and no change to who may block; the profile route and the block URL-gate are restated against profile ids. `last_seen_following_at` and the "N new" badge are explicitly unchanged.
- `list-visibility`: "visible only to its owner" resolves by comparing the list's owning profile against the acting account's profile rather than by user-id equality, and only that profile's account may change its visibility.
- `list-item-management`: `createPurchase`'s self-claim records the actor's profile as purchaser (still never taking an id from the payload); `setListItems` and `removeListItem` authorize against the list's owning profile.
- `server-endpoint-authorization`: the actor-resolution seam gains profile resolution, and the ownership-comparison rule is specified — an actor id compares to actor columns, a profile id to ownership columns, and hand-rolling either is a violation.
- `visit-history`: `list_visits` stays keyed by account (stated explicitly, so the boundary is spec-recorded rather than assumed), while `bookmarkList`'s owner check moves to the list's owning profile.
- `home-digest`: the My Lists rail resolves lists through the viewer's profile, and the Following rail's cards are profiles linking to the profile route by profile id. Bookmarks and Recently visited are specified as staying account-keyed.
- `items-library-shell`: the library renders the viewer's profile's items rather than the session user's, with the unauthenticated-viewer redirect guard unchanged.
- `list-collections`: `ListCard`'s owner byline resolves the owning profile's name.
- `data-layer-organization`: gives `profile` a full module pair (`lib/data/profile.ts`, `lib/data/profile.actions.ts`) and replaces size-driven assignment between `user` and `profile` with the id-kind rule — within that pair a function belongs to whichever domain matches the id kind of its leading identity parameter. Table cohesion still assigns everything else, so a satellite keeps its own reads whatever id kind they lead with.
- `list-update-recency`, `loading-indicator-system`, `testing-foundation`: rename-only. Each names DAL functions this change renames (`getListsByUser` → `getListsByProfile`, `getProfileForUser` → `getProfileForViewer`, `getPublicListsByUser` / `getFollowersOfUser` / `getBlockedByUser` → their profile-first forms), so each would otherwise name a symbol that does not exist after this lands. No requirement changes meaning.

## Impact

**Schema and migrations**

- `db/schema.ts` — seven new columns, two primary keys recreated, one new partial unique, `DROP NOT NULL` on the vacated columns, `saved_lists` and its relations deleted.
- `drizzle/` — one forward-only migration: additive columns, idempotent backfills, constraint work, index creation, `saved_lists` drop. No interactive transaction anywhere; every cross-statement assertion lives inside one `DO $$`. How the migration is applied to production is an operational concern outside this change.

**Data layer**

- `lib/data/list.ts`, `item.ts`, `purchase.ts`, `user.ts`, `visit.ts`, `listAccess.ts` — owner joins move to profiles; every ownership predicate compares profile ids; `getLists()` and the `email` selections are removed.
- `lib/data/*.actions.ts` — `list.actions.ts`, `item.actions.ts`, `item.associations.ts`, `listItems.actions.ts`, `purchase.actions.ts`, `user.actions.ts`, `profile.actions.ts`: writes set the owning profile, content writes additionally stamp `updated_by_user_id`, follow and block writes move to profile columns.
- `lib/data/profile.ts` — new: `getUserIdentity`, plus the profile-keyed reads moved off `user.ts`. `lib/data/profile.actions.ts` — new: the four profile-keyed follow and block actions moved off `user.actions.ts` (D13).

**Cache**

- No cache tag is added or re-keyed. All five (`items`, `lists`, `list_visits`, `user_follows`, `user_blocks`) are static string literals and `'use cache'` reads key on their arguments, so correctness follows the callers — `hasBlocked` already keys on both ids and needs no change to accept profile ids. `getUserIdentity` uses request-scoped React `cache()`, not `'use cache'`, so it introduces no tag and no `updateTag` obligation.

**UI**

- The ~19 page and section components resolving a viewer keep resolving a human. The surfaces that render an owner (`ListDetails`, `ListHeroSection`, `ProfileHeaderSection`, `UserCard`, `ConnectionRow`, `ListCard`) resolve a profile, as do the five broken `isOwner` comparisons. `Item.tsx`'s prop is renamed through the components it threads, and so is the following-feed thread end to end — `getFollowingFeedUsers`, its `FollowingFeedUser` row type, `FollowingPage`'s `feedUsers`, `UserCard`'s prop, and both call sites (`UserCardGrid` and `FollowingRail`) — because every one of them now carries a profile under an account-flavoured name. No primitive-family spec is implicated — no new interactive surface, variant, or one-off class.

**Tests and fixtures**

- Seed fixtures repoint onto profile ids. The seeded managed profile gains **no** content: with no switcher, nothing can render as it, so content there would be unexercised fixture — [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) and [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) own that.
- Unit suites across the data layer and the affected pages; `db/__tests__` gains constraint coverage for the new columns, the recreated primary keys, and the new partial unique.
- E2E is the acceptance evidence: `e2e-critical-flows` and `e2e-management-flows` pass untouched, particularly the claim and unclaim matrix that the `purchase.ts` rewrites sit under.

**Not touched**

- `user_follows.follower_id`, `list_visits`, `users.last_seen_following_at`, `users.name`/`image` (and no name-edit surface is added — `users.name` is immutable per [#202](https://github.com/JoshEddie/CTRLplusList/issues/202)).
- No companion actor column on purchases: the self-profile rule keeps the human recoverable through `profiles.user_id`, and a null there means a deleted account, which [#229](https://github.com/JoshEddie/CTRLplusList/issues/229) already accepts as unbannable.
- `profile_members` — no reader, no cache tag, no containment helper.
- `BYPASS_ACTIVE_PROFILE` — still dormant.
- The old account columns survive this phase; [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) drops them. The switcher UI, the profile birth form, and role administration belong to [#193](https://github.com/JoshEddie/CTRLplusList/issues/193)/[#192](https://github.com/JoshEddie/CTRLplusList/issues/192)/[#194](https://github.com/JoshEddie/CTRLplusList/issues/194); the block-model redesign is [#303](https://github.com/JoshEddie/CTRLplusList/issues/303).
