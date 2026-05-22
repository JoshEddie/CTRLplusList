## Why

PR #16 review surfaced six 🔴 server-endpoint authorization holes in code that predates the redesign and was not touched by this PR's spec work:

- `createList`, `updateList`, `deleteList` ([app/actions/lists.ts:58, :110, :172](app/actions/lists.ts)) verify a session exists but trust the client-supplied `user_id` on insert and skip the ownership check on update/delete — any signed-in user can create lists attributed to anyone, and rename or delete any list by id (IDOR).
- `createItem` ([app/actions/items.ts:267](app/actions/items.ts)) trusts client `validatedData.user_id` — same forgery class.
- `createPurchase` ([app/actions/items.ts:125](app/actions/items.ts)) has no `auth()` call at all and accepts `user_id` from the request body — anyone (including unauthenticated callers) can forge claims attributed to any user.
- `GET /api/image-search` ([app/api/image-search/route.ts:278](app/api/image-search/route.ts)) is unauthenticated and unmetered — paid SerpAPI/Serper quota is drainable by any internet caller who finds the URL.

The fix pattern already lives in this codebase: `setListVisibility` ([app/actions/lists.ts:202](app/actions/lists.ts)) resolves `session.user.email → users.id`, looks up the resource, and rejects when `resource.user_id !== sessionUser.id`. `setListItems` ([app/actions/lists.ts:493](app/actions/lists.ts)) follows the same shape. Both are governed by binding **non-owner-rejection SHALLs** in existing specs:

- `list-visibility/spec.md:90-93` — "`setListVisibility` SHALL return unauthorized for non-owners".
- `list-item-management/spec.md:49-66` — "`setListItems` SHALL be authorized to owners only" + "Non-owner submission is rejected".

Those SHALLs are observed today. The bug surface is the older list/item/purchase CRUD entrypoints, which no active spec governs. This change closes the gap by establishing a single cross-cutting authorization contract every server-side mutation and any paid-quota API route must follow.

A 1.0 release is not viable with these holes in place.

## What Changes

- **NEW** authorization contract: every server-side mutation against a user-owned resource (`lists`, `items`, `purchases` with `user_id`) MUST resolve the acting user id from the session, MUST ignore any client-supplied actor id, AND MUST verify ownership against the resource row before writing. Anonymous / guest writes are permitted only on explicitly-spec'd paths (guest item claims) and MUST scope by an out-of-band identifier (purchase row id), never by a guessable identity field.
- **NEW** API-route contract: any handler that consumes paid third-party quota (currently `/api/image-search`) MUST require an authenticated session AND MUST apply a per-user rate limit.
- **FIX** `createList` — drop client `user_id` from the schema; use session user id.
- **FIX** `updateList`, `deleteList` — add `list.user_id === sessionUser.id` check before mutation; return unauthorized otherwise.
- **FIX** `createItem` — drop client `user_id`; use session user id.
- **FIX** `createPurchase` — call `auth()`; when a session exists, ignore the client `user_id` and use the session user id; only accept `guest_name` when there is no session. Verify the item's list is viewable to the caller before allowing the claim.
- **FIX** `removePurchase` — for guest callers, require a purchase row `id` rather than scoping by `guest_name` alone (prevents one guest from revoking another's claim).
- **FIX** `/api/image-search` — `await auth()` gate + per-user token bucket; cap `?q=` length.
- **HARDEN** `createPurchase` quantity-limit race: wrap the existence + capacity check + insert in a transaction with `SELECT … FOR UPDATE` on the item row, and add a partial unique index `purchases(item_id, user_id) WHERE user_id IS NOT NULL` so duplicate claims fail at the DB layer.
- Cache-tag impact: existing mutation paths already call `updateTag('lists')` / `updateTag('items')` — no tag changes. The new auth/ownership rejections short-circuit before the write, so no revalidation is needed on the rejection path.

## Capabilities

### New Capabilities

- `server-endpoint-authorization`: cross-cutting contract governing how server actions and API route handlers resolve the acting user, enforce ownership on user-owned resources, reject non-owner mutations, treat client-supplied actor ids, and gate paid-quota endpoints with auth + rate limit. Covers `app/actions/*.ts` server-action entry points and `app/api/**/route.ts` route handlers.

### Modified Capabilities

- `list-item-management`: add purchase-claim integrity requirements — `createPurchase` MUST be authorization-gated (session id wins over client id) and MUST enforce `quantity_limit` atomically against concurrent callers; `removePurchase` for guest callers MUST scope by purchase row id, not by guest_name alone. The existing "owner-only choose-items" requirements are unchanged.

## Impact

**Code touched:**

- `app/actions/lists.ts` — `createList`, `updateList`, `deleteList` (auth/ownership rewrites; remove `user_id` from `ListSchema`).
- `app/actions/items.ts` — `createItem`, `createPurchase`, `removePurchase` (auth/ownership rewrites; transaction for purchase; remove `user_id` from `ItemSchema` input contract).
- `app/api/image-search/route.ts` — add `auth()` + per-user rate-limit + query-length cap.
- `db/schema.ts` + new drizzle migration — partial unique index on `purchases(item_id, user_id) WHERE user_id IS NOT NULL`.
- Client callers of the affected actions — drop `user_id` from the payloads they construct (ListForm, ItemForm, purchase flow). The session is now the source of truth.

**APIs / contracts:**

- `ListData` and `ItemData` Zod schemas lose their `user_id` field (BREAKING for any out-of-tree caller; in-repo callers must be updated as part of this change).
- `createPurchase` request shape becomes `{ item_id, guest_name }` — the `user_id` field is removed from the public action signature.
- `/api/image-search` now returns 401 for unauthenticated callers and 429 for rate-limited callers (in addition to existing 429 on upstream quota exhaustion).

**Not covered by this change (deferred follow-ups):**

- 🟠 Missing reverse-direction indexes on `user_follows.followee_id` and `user_blocks.blocked_id` — separate change.
- 🟠 Menu primitive focus-stealing on outside click and missing Tab handler — separate change against `menu-system`.
- 🟠 `PopoverTrigger` missing default `aria-expanded` / `aria-haspopup` — separate change against `popover-trigger-system`.
- 🟠 `SegmentedOption` `onClick` clobber — separate change against `segmented-control-system`.
- 🟠 Nested `<label>` in `ChooseItemsForm` — separate change against `list-item-management`.
- 🟡 `getLists()` dead/dangerous DAL export, `getProfileForUser` sequential awaits, `Item.tsx` optimistic-id collisions — quality follow-ups.
