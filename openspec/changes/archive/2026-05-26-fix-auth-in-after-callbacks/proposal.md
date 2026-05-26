## Why

Two server components register `after()` callbacks that invoke server actions which re-derive auth from request context via `auth()` → NextAuth → `headers()`. Next 16 forbids `headers()` inside `after()` (the request lifecycle has ended by the time the callback fires), so visiting `/lists/[id]` throws `Route /lists/[id] used 'headers()' inside 'after()'. This is not supported.` and `/following` will throw the same way the next time the page renders.

The offending pattern is consistent across both sites:

```
ServerComponent render
  └─ await auth()              ✅ headers() OK — request is live
  └─ after(() => serverAction())
                  │
                  └─ serverAction()
                       └─ authedUserId() → auth() → headers()   ❌ no request
```

Affected actions and call sites (single call site each):

- `app/actions/lists.ts` :: `recordVisit(list_id)` — called by `after(() => recordVisit(id))` in `app/(main)/lists/[id]/ListHeroSection.tsx:38`.
- `app/actions/follows.ts` :: `markFollowingSeen()` — called by `after(() => markFollowingSeen())` in `app/(main)/following/FollowingPage.tsx:26`.

Both actions write a row whose `user_id` is the actor (the viewer recording their own visit / updating their own `last_seen_following_at`). Their `'use server'` boundary exposes them as network-callable RPCs, but no client calls either — both have exactly one server-side call site, and that call site already has a session-validated viewer id in scope when it registers the `after()` callback. The combination of "self-authorize via `auth()` inside `after()`" and "callable from the network but never called that way" is the root cause: removing the `'use server'` boundary and inlining the work eliminates both the bug and an unnecessary attack surface.

The active `server-endpoint-authorization` spec already encodes the broader invariant that side-effect helpers consumed only on the server must not exist as exposed actions. Inheriting that posture, the cleanest fix is to inline both call sites and delete the action exports, rather than to introduce an "action accepts pre-validated userId parameter" carve-out (which the existing spec deliberately disallows for the ownership-bearing action list).

## What Changes

- **BREAKING (internal API only)**: remove the exported `recordVisit` server action from `app/actions/lists.ts`. The visit-recording upsert is inlined into `ListHeroSection`'s existing `after()` callback, using values already resolved during the synchronous render (viewer id, list id) so the callback never touches request-scoped context.
- **BREAKING (internal API only)**: remove the exported `markFollowingSeen` server action from `app/actions/follows.ts`. The `users.last_seen_following_at` update is inlined into `FollowingPage`'s existing `after()` callback against the viewer id already resolved earlier in render.
- Keep both `after()` boundaries. The `updateTag('list_visits')` / `updateTag('user_follows')` calls remain in the deferred work — that's the original reason the writes were deferred (Next 16 disallows `updateTag` during render). What changes is only that the deferred work no longer re-derives auth.
- Codify the constraint as a new requirement under `server-endpoint-authorization`: side-effects invoked from `after()` MUST NOT depend on request-scoped APIs (`headers()`, `cookies()`, zero-arg `auth()`); any identity they need MUST be captured at the call site before the `after()` boundary.

## Capabilities

### New Capabilities

(none — this change codifies an interaction constraint between two existing capabilities rather than introducing a new one.)

### Modified Capabilities

- `server-endpoint-authorization`: add a new requirement constraining how server actions / inline side-effects interact with `after()`. Names the `headers()`-inside-`after()` failure mode explicitly, and the consequent guidance that server-only side-effects with a single internal call site SHOULD be inlined rather than exposed as `'use server'` actions when they would otherwise need to re-derive auth inside `after()`.
- `following`: remove `markFollowingSeen` from the enumerated `app/actions/follows.ts` action list in the "no transactions" requirement (the action ceases to exist). The behavioral requirement that `/following` updates `users.last_seen_following_at` to `NOW()` on render is unchanged.
- `visit-history`: no normative change to the recording requirement (still "server-side on page render; no client beacon"). The spec does not currently prescribe *that* recording happens via a server action — only that it happens server-side — so the implementation switch from action-via-after to inline-in-after is below the spec contract.

## Impact

- **Code touched**:
  - `app/actions/lists.ts` — remove `recordVisit` export and its body.
  - `app/actions/follows.ts` — remove `markFollowingSeen` export and its body.
  - `app/(main)/lists/[id]/ListHeroSection.tsx` — replace `after(() => recordVisit(id))` with an inline upsert + `updateTag('list_visits')` inside the `after()` callback. Capture `viewer.id` and `list.id` before the boundary; do not call `auth()` inside.
  - `app/(main)/following/FollowingPage.tsx` — replace `after(() => markFollowingSeen())` with an inline `update users set last_seen_following_at = NOW() where id = viewer.id` + `updateTag('user_follows')` inside the `after()` callback. Capture `viewer.id` before the boundary.
- **Cache tags**: `list_visits` and `user_follows` continue to be revalidated from the deferred path; no DAL read tags change.
- **DB**: no schema change. Inserts/updates are unchanged in shape — the same `list_visits` upsert with `ON CONFLICT DO UPDATE` and the same single-row `users.last_seen_following_at` update.
- **Surface**: two `'use server'` exports disappear from the action layer. Any client code referencing them by import would fail at compile; grep confirms no such call site exists.
- **No transactions**: both writes remain single-statement (one `INSERT ... ON CONFLICT DO UPDATE` and one `UPDATE`), so the `drizzle-orm/neon-http` constraint is satisfied trivially.
- **Spec authority**: the `following` spec's enumeration of actions covered by the "no transactions" SHALL is updated; the underlying invariant is preserved (the inline write is still single-statement).
