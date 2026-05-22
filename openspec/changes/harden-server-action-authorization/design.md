## Context

The app has two working patterns for server-side authorization side-by-side:

1. **The correct pattern** (`setListVisibility`, `setListItems`, `archiveItem`, `deleteItem`, follows actions): `auth()` → resolve `session.user.email → users.id` → load the target row → reject if `row.user_id !== sessionUser.id` → mutate. These actions are governed by binding "non-owner rejection" SHALLs in `list-visibility/spec.md` and `list-item-management/spec.md`.

2. **The broken pattern** (`createList`, `updateList`, `deleteList`, `createItem`, `createPurchase`): check that _a_ session exists, then trust whatever `user_id` arrives on the request payload (or skip the check entirely on update/delete). No active spec governs these entry points today — they were written before the spec system existed and were not migrated.

The `/api/image-search` route is a third class entirely: a GET endpoint with no `auth()` call that proxies to paid SerpAPI / Serper providers. Anyone who finds the URL can drain the quota.

The fix is mechanical and the code shape already exists in the codebase. The reason a design doc is warranted (rather than going straight to tasks):

- The change is **cross-cutting** — five server actions across two files, one API route, one Zod schema change, one DB migration, and ~4 client call sites that construct payloads.
- It **modifies request contracts** (`ListData` and `ItemData` drop `user_id`; `createPurchase` drops `user_id`) — clients constructing payloads must change in lockstep.
- It introduces a **DB-level race fix** (partial unique index + `SELECT … FOR UPDATE`) that needs migration sequencing.
- It introduces a **rate-limit shape** that doesn't yet exist anywhere else in the app.

## Goals / Non-Goals

**Goals:**

- Close the six 🔴 server-endpoint authorization findings from PR #16 review.
- Establish one explicit authorization contract every future server action / route handler can be checked against.
- Make the impossible states impossible: client payloads no longer have a place to put a forged `user_id`.
- Make purchase claims atomically race-safe at the DB layer, not just at the application layer.

**Non-Goals:**

- Refactor the existing correct-pattern actions (`setListVisibility`, `setListItems`, etc.) — they already comply.
- Replace the email→userId lookup pattern with a session-resident `user.id` field. NextAuth's session shape and the existing call sites use email; changing that is a larger change.
- Build a general-purpose rate limiter. The image-search bucket is in-memory, per-process, deliberately minimal — sufficient for the single paid endpoint.
- Add audit logging or anomaly detection. Out of scope.
- Address the 🟠 / 🟡 follow-ups from the PR review (see proposal "Not covered").

## Decisions

### Decision 1: Authoritative-user resolution = session email → users lookup, every time

The existing correct-pattern actions call `auth()` then `db.query.users.findFirst({ where: eq(users.email, session.user.email) })` to obtain the canonical `users.id`. We will copy this exact shape into the broken-pattern actions. We will **not** trust `session.user.id` even where it exists in the session payload, because the rest of the codebase relies on the email-lookup invariant and switching half the actions to a different identity source creates a new drift surface.

**Alternative considered:** introduce a `getActorUserId()` helper in `lib/auth.ts`. Rejected for this change — the change is wide enough already; a helper introduces a new abstraction whose contract has to be re-verified at every call site. We can DRY-extract after the actions are all on the same shape (follow-up).

### Decision 2: Drop `user_id` from `ListSchema` and `ItemSchema` Zod inputs

Today both schemas declare `user_id: z.string().min(1)`. We will remove that field from the **input schema** and inject `sessionUser.id` server-side immediately before the `db.insert`. The client form no longer constructs a `user_id` field. Removing it from the schema is what makes the forgery impossible to express in the type system — not merely "overridden" server-side.

**Alternative considered:** keep `user_id` in the schema but overwrite it server-side. Rejected — leaves the forgery shape constructible by curl callers and re-creates the same footgun for the next dev who reads the schema and assumes it's source of truth.

### Decision 3: `createPurchase` accepts no `user_id` from the client

The new signature is `createPurchase({ item_id, guest_name })`. If a session exists, the action uses the session user id and ignores `guest_name`. If no session exists, `guest_name` is required. This matches the implicit intent (session callers claim as themselves; guests must self-identify) but removes the impersonation path.

The action will additionally call `guardItemViewable` (mirroring `guardListViewable` in `lib/listAccess.ts`) — a small helper that loads the item's parent list and verifies it's viewable to the caller. This closes the "claim an item on a private list whose id you guessed" path.

**Alternative considered:** allow signed-in users to override their claim identity (e.g. claim "for Mom"). Rejected — the product already supports this through the existing `guest_name` field on the purchase form; the server just needs to not let *un*authenticated callers attribute claims to arbitrary user ids.

### Decision 4: Purchase race fix = transaction + DB-level partial unique index

The current `createPurchase` flow is: SELECT existing, count them, check capacity, INSERT. Two concurrent calls can both pass the capacity check and both insert. We fix this two ways simultaneously:

1. Wrap the SELECT + INSERT in `db.transaction(async (tx) => { ... })` with `SELECT … FOR UPDATE` on the item row, so the second caller blocks on the row lock until the first commits.
2. Add a partial unique index `CREATE UNIQUE INDEX purchases_item_user_unique ON purchases (item_id, user_id) WHERE user_id IS NOT NULL;` so the duplicate-claim case fails at the DB regardless of any race.

The combination means: the unique index catches duplicate-by-same-user; the transaction catches duplicate-by-different-users-against-capacity.

**Alternative considered:** trigger-based capacity check. Rejected — Drizzle migrations don't manage triggers ergonomically, and the transaction-with-row-lock is the standard Postgres idiom.

**Alternative considered:** application-level mutex. Rejected — doesn't survive multi-instance deploys.

### Decision 5: Guest purchase removal requires a purchase row id

`removePurchase` for guest callers currently scopes only on `(item_id, guest_name)`. Two guests using the same display name collide. The fix: clients that render a guest's own purchase row already know the purchase row id (it's in the DAL response) — pass it. The action requires `purchase_id` for guest callers and verifies `purchase.guest_name === payload.guest_name` before deleting.

This is mildly hostile to a "guest with cleared cookies tries to revoke" flow, but that flow is already broken (no session, no way to identify the guest definitively). Accepting the constraint.

### Decision 6: `/api/image-search` auth + rate limit shape

- `await auth()` at the top of `GET`; return 401 if no session.
- Per-user in-memory token bucket: `Map<userId, { count: number; resetAt: number }>`, refilling every minute, capped at e.g. 30 requests/min/user. Sits alongside the existing `resultCache` Map (same module-level singleton pattern, same multi-instance caveat).
- Cap `?q=` length at 200 chars (uncontroversial; longer is upstream-rejected anyway).

The rate limit is intentionally minimal: this is one route with one threat (quota drain). A real rate limiter (Redis-backed, deploy-survivable) is out of scope. The in-memory bucket reduces per-user blast radius from "drain quota in seconds" to "drain over many minutes from many sessions", which is enough headroom to detect from the SerpAPI dashboard.

**Alternative considered:** Edge middleware. Rejected — the auth check needs DB access for the session, which we'd duplicate.

### Decision 7: Migration safety

The new partial unique index is created with `CREATE UNIQUE INDEX IF NOT EXISTS` in a new drizzle migration. Pre-flight: assert no existing rows violate the constraint before creating it (`SELECT (item_id, user_id), COUNT(*) FROM purchases WHERE user_id IS NOT NULL GROUP BY (item_id, user_id) HAVING COUNT(*) > 1;` should return zero). On production, run the assertion query first; if it returns rows, an additional cleanup migration runs first.

The migration is non-destructive (no DROP, no NOT NULL backfill). Rollback = drop the index.

## Risks / Trade-offs

- **[Risk] Client payload BREAKING change.** `ListForm`, `ItemForm`, and purchase callers all currently send `user_id` in their payloads. → **Mitigation:** every in-repo caller is updated in the same change; the Zod schema rejecting unknown keys (which it does by default) ensures any missed caller fails loudly in dev and in CI typecheck.

- **[Risk] In-memory rate limit bypassable across deploy replicas.** A user with N concurrent connections to N replicas effectively gets N× the per-replica budget. → **Mitigation:** accepted — the current single-replica Vercel deploy makes this effectively bounded. If we scale out, replace with Redis or Vercel KV (out of scope for this change; flagged as a follow-up).

- **[Risk] `SELECT … FOR UPDATE` adds latency under high concurrency.** → **Mitigation:** the lock is scoped to a single `items` row, held for one INSERT. Worst-case lock time is single-digit ms.

- **[Risk] Partial unique index creation locks the `purchases` table briefly.** → **Mitigation:** `purchases` is small (low thousands of rows in any realistic deployment); the `CREATE INDEX` is sub-second. If the table grows, switch to `CREATE UNIQUE INDEX CONCURRENTLY` in a follow-up.

- **[Trade-off] Removing `user_id` from `ListSchema` / `ItemSchema` is a public-API change for the server actions.** Anything outside the repo calling these actions breaks. → **Mitigation:** these are Next.js server actions, not a published API. There are no external callers.

- **[Trade-off] `createPurchase` now refuses to claim items on lists the caller can't view.** Previously, a caller who knew an item id could claim it without seeing the list. → **Mitigation:** this was an information-disclosure adjacent bug, not a feature. No UI surface depended on it.

## Migration Plan

1. Write and review the spec deltas.
2. Implement the action changes + tests; verify with the dev-bypass + manual flows.
3. Generate and review the new drizzle migration (partial unique index).
4. Run the pre-flight assertion query against prod (Vercel Postgres console). If violations exist, ship a one-off cleanup migration first.
5. Deploy the action changes + migration together. Rollback = revert the actions; the index is non-destructive and can stay.

## Open Questions

None. All decisions are local to this codebase and follow patterns already proven by `setListVisibility` and `setListItems`.
