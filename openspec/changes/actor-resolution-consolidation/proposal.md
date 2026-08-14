## Why

Source issue: [Actor-resolution consolidation #188](https://github.com/JoshEddie/CTRLplusList/issues/188) (part of [MAP: Dependents and shared list management #181](https://github.com/JoshEddie/CTRLplusList/issues/181)). Blocks [Profiles schema phase 2 #190](https://github.com/JoshEddie/CTRLplusList/issues/190).

The session→`users.id` lookup is written by hand in **ten places**, alongside the two helpers that already exist for it: `authedUserId()` (`lib/data/user.session.ts`) and `getUserIdByEmail()` (`lib/data/user.ts`). This chunk deletes the ten hand-rolled copies and makes the single seam normative, so the lookup can be taught about active profiles in one edit instead of eleven.

**What this chunk does *not* buy.** [#190](https://github.com/JoshEddie/CTRLplusList/issues/190) must swap every ownership comparison to profile FKs in the same change it repoints them, and per [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) those comparisons become membership containment over the profiles the actor owns or manages — per-site logic no resolver can hand out. So the seam saves #190 the *lookup* duplication, not the call-site work. The scope claim is deliberately narrowed to that.

**Inherited constraints (binding active specs):**

- `server-endpoint-authorization` — server actions writing user-owned rows SHALL resolve the actor by `auth()` → `users.id` from `users.email`, SHALL NOT accept an actor id on the payload, and SHALL reject with `{ success: false, error: 'Unauthorized' }` with no write when unauthenticated. The follow-graph requirement already names `authedUserId` as the mechanism; the general requirement still spells the lookup out inline, and its scope stops at `lib/data/*.actions.ts`. Guest write paths are **enumerated by name** (`createPurchase` with a `guest_name`, `removePurchase` by an unauthenticated caller, `mintItemPlaceholder`) and SHALL keep resolving to a null actor rather than rejecting.
- `data-layer-organization` — `user.session.ts` is the named internal module for `authedUserId`, kept out of `user.ts` so read modules do not drag in NextAuth's module-scope initialization; `lib/data/**` SHALL NOT import from `app/**`. Its cross-domain-import scenario already prefers importing the helper "rather than duplicating the logic" — the ten inline sites are the duplication that rule anticipated.
- `list-item-management` — restates the `session.user.email` → `users.id` recipe for `createPurchase`'s self-claim path. Still accurate after this change; **no delta**.

**Map context.** The decision "consolidate first, then add active-profile resolution once" originates in [#184](https://github.com/JoshEddie/CTRLplusList/issues/184), ***unreviewed scouting***. Re-validated at design: the consolidation is worth doing for the lookup alone, and the "lands once" framing has been narrowed accordingly (above). Two related map decisions are settled and apply as context: [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) keeps `last_seen_following_at` on `users`; [#229](https://github.com/JoshEddie/CTRLplusList/issues/229) adds a separate `updated_by_user_id` actor-audit column on `items`/`lists`. Neither lands here.

**Terrain re-verified at departure** (drift from the #184 scout, which listed "~9 inline bypasses"):

- The real count is **ten**: `item.actions.ts` ×4, `item.associations.ts` ×2, `purchase.actions.ts` ×2, `listItems.actions.ts` ×1, `app/api/product-fetch/route.ts` ×1.
- `app/api/image-search/route.ts` (a bypass in the scout's first audit) no longer exists.
- `FollowingPage.tsx` is **not** a bypass — it resolves the viewer through `getUserIdByEmail`, and its direct `db.update(users)` writes `last_seen_following_at`, which #202 keeps on `users`. Out of scope.
- `lib/data/item.placeholder.actions.ts` is newer than the scout and already routes through `authedUserId`.
- **Every one of the ten sites uses `.id` only** — no caller needs a richer resolved value.

No settled map decision is contradicted by landed code — no mirage.

## What Changes

- The ten inline `auth()` → `db.query.users.findFirst({ where: eq(users.email, …) })` sites route through `authedUserId()` instead. Affected functions: `createItem`, `updateItem`, `archiveItem`, `deleteItem` (`item.actions.ts`); `updateItemStores`, `updateItemLists` (`item.associations.ts`); `resolveClaimIdentity`, `removePurchase` (`purchase.actions.ts`); `setListItems` (`listItems.actions.ts`); `POST` (`app/api/product-fetch/route.ts`).
- **Chokepoint shape is unchanged.** `authedUserId()` keeps returning `string | null` and stays in `user.session.ts`; `getUserIdByEmail()` is untouched. No merge, no wrapper object, no widened return type — every consumer needs an id and nothing else.
- The seam becomes **normative**: hand-rolling the session→`users` lookup becomes a spec violation, and the rule extends to route handlers, which no requirement governs today.
- Enforcement is **review plus the spec SHALL** — no custom ESLint rule. One function is being protected against a mistake with an obvious diff signature; a permanently maintained lint rule is not yet earned.
- Scope held to the ten bypasses. **Not included:** the ~19 page/section server components that repeat `auth()` → email guard → `getUserIdByEmail` → null-redirect. They already route through a chokepoint, so the issue's constraint is met; collapsing their glue is a readability refactor that would triple the diff and rework ~19 test files' mocking, and it does not unblock #190.
- No schema change, no new concepts, no profile awareness.

### Where this is not behavior-preserving

Two of the three outcomes the inline sites distinguish collapse into `authedUserId()`'s single `null`: *no session*, and *session present but no matching `users` row*. They carry the same `error: 'Unauthorized'` but different `message` strings (`'Unauthorized access'` vs `'User not found'`), and `message` reaches users via `toast.error(result.message)` in 11 client components. No test and no spec asserts either string.

- **`error` codes and success/failure are preserved exactly.** `message` normalizes to one string per action. This is a real, if small, user-visible change and is stated in the spec delta rather than filed under "pure refactor."
- **`setListItems` is unaffected** — its check is `!sessionUser || sessionUser.id !== list.user_id`, and a `null` id still fails the comparison, so `error: 'Forbidden'` survives byte-identical (asserted by three existing tests).
- **`removePurchase` is a straight drop-in** — it already collapses both outcomes to `actorUserId = null` itself.
- **`resolveClaimIdentity` keeps its branch.** It is the one site where the distinction is load-bearing: today a missing `users` row inside the authenticated branch is a hard error, and routing it through `authedUserId()` alone would let a stale session fall through to the **guest** path and write `claimed_by = NULL`. Since `server-endpoint-authorization` enumerates guest write paths by name, silently widening that set is not acceptable. It therefore retains its own `auth()` session-presence check to choose guest-vs-authenticated, taking only the id from the helper — and its `'User not found'` message survives. The duplication this chunk removes is the `db.query.users` lookup, not `auth()` itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-endpoint-authorization`: the actor-resolution requirement changes from *describing* the session→`users.id` lookup to *requiring* it be reached through the shared helper, with hand-rolled resolution forbidden; and its scope widens from `lib/data/*.actions.ts` server actions to every server-side endpoint that gates on identity, so route handlers are governed too. The enumerated guest write paths, the no-actor-in-payload rule, and the `{ success: false, error: 'Unauthorized' }` rejection shape are unchanged.
- `data-layer-organization`: `user.session.ts`'s stated audience widens from "the action modules" to server-side callers generally, licensing the `app/api/product-fetch/route.ts` import. The dependency-direction rule (`lib/data/**` SHALL NOT import from `app/**`) is unchanged — this import runs the permitted direction.

`list-item-management` is **not** modified: its `createPurchase` self-claim sentence stays accurate, because that path retains its own session read.

## Impact

**Code**

- `lib/data/item.actions.ts`, `lib/data/item.associations.ts`, `lib/data/purchase.actions.ts`, `lib/data/listItems.actions.ts` — inline resolution removed.
- `app/api/product-fetch/route.ts` — the one non-`lib/data` caller; uses the resolved id for `checkRateLimit` and returns the same 401 on both former branches, so it is a drop-in.
- `lib/data/user.session.ts`, `lib/data/user.ts` — unchanged in shape.
- Call sites already on a chokepoint (`list.actions.ts`, `visit.actions.ts`, `user.actions.ts`, `item.placeholder.actions.ts`, and the ~19 components on `getUserIdByEmail`) are untouched.

**Tests** — the affected unit suites currently mock `auth()` plus `db.query.users.findFirst` per call site; they move to mocking `authedUserId`. Assertions on `error` codes stand; assertions on the two normalized `message` strings (if any exist in the touched suites) are updated in lockstep. E2E flows (`e2e-critical-flows`, `e2e-management-flows`) exercise these actions end to end and are the guard that observable behavior held — particularly the guest-claim flow, which pins `resolveClaimIdentity`'s preserved branch.

**Cache** — no read is added or modified; no `cacheTag` or `updateTag` call changes. `authedUserId` is deliberately uncached (it calls `auth()`); `getUserIdByEmail` is React-`cache`d per request, not `'use cache'`-tagged.

**Not touched** — `db/schema.ts`, migrations, seed fixtures, the mutual-follow eligibility gate, `last_seen_following_at`, and every profile-aware concern. Those belong to [#189](https://github.com/JoshEddie/CTRLplusList/issues/189)–[#191](https://github.com/JoshEddie/CTRLplusList/issues/191) and [#193](https://github.com/JoshEddie/CTRLplusList/issues/193).
