## Context

Next 16 introduced two hard restrictions that interact in this codebase:

1. Request-scoped APIs (`headers()`, `cookies()`, and therefore NextAuth's zero-arg `auth()`) cannot be called inside an `after()` callback. The request lifecycle ends before the callback runs; calling them throws at runtime.
2. Cache mutation APIs (`updateTag`, `revalidateTag`) cannot be called during server-component render. They must run during a request lifecycle step that is not the render itself — typically a server action or an `after()` callback.

The codebase responded to (2) by deferring two render-time side-effects (visit recording and "following seen" timestamp) into `after()` callbacks. But the actions invoked inside those callbacks (`recordVisit`, `markFollowingSeen`) call `authedUserId()` → `auth()` → `headers()` to re-derive the viewer id — which trips (1). One site (`/lists/[id]`) is already crashing at runtime; the other (`/following`) is dormant until its next render.

The two affected actions share a profile worth naming:

- **Single internal call site.** Neither is invoked from a client component, a form, or another action. The `'use server'` directive is dead weight — it converts each into a network-callable RPC that no client ever calls.
- **Self-targeted writes.** Both write a row whose `user_id` equals the actor (the viewer's own `list_visits` row, the viewer's own `users.last_seen_following_at`). They are not ownership-mediating writes against another user's resource.
- **Caller already has the actor id.** In both server components, the viewer is resolved earlier in render (`await auth()` → `getUserIdByEmail`) before the `after()` registration. The id needed by the deferred work is available at closure-creation time.

This combination makes inlining the deferred work strictly preferable to keeping it as an action: the bug goes away, the unnecessary network surface goes away, and no normative behavior changes.

Two adjacent constraints frame the solution space:

- The `server-endpoint-authorization` spec already disallows passing actor id as a parameter to the enumerated ownership-bearing actions (e.g. `deleteList(id, userId)`), reserving id resolution to `auth()`. Inlining sidesteps this rule cleanly because there is no longer an action to take a parameter — the upsert/update is just inline DB code in a server component.
- The `drizzle-orm/neon-http` no-transactions constraint is unchanged: both inlined writes are single statements (`INSERT ... ON CONFLICT DO UPDATE` for visits, single-row `UPDATE` for `last_seen_following_at`), so atomicity isn't a concern.

## Goals / Non-Goals

**Goals:**

- Eliminate the runtime `headers()`-in-`after()` error at `/lists/[id]` and the latent identical bug at `/following`.
- Remove `recordVisit` and `markFollowingSeen` as exported `'use server'` actions, since no client ever calls them and their existence as actions invites the same bug to be reintroduced.
- Codify the after()/auth() interaction constraint in `server-endpoint-authorization` so future code doesn't rediscover this trap.
- Preserve all current observable behavior: the same `list_visits` upserts happen on the same renders, the same `users.last_seen_following_at` update happens when `/following` is rendered, the same cache tags (`list_visits`, `user_follows`) are revalidated.

**Non-Goals:**

- Refactoring the broader auth flow or NextAuth integration. The dev-bypass `auth()` wrapper in `lib/auth.ts` is unchanged.
- Generalizing this into a shared helper (e.g. `deferredSideEffect(viewerId, fn)`). With only two call sites, the inline shape is clearer; a helper can come later if a third instance appears.
- Removing the `after()` boundaries themselves. They exist for a real reason (`updateTag` cannot run during render); this change only relocates the *contents* of the callbacks.
- Adding any new spec capability. The constraint belongs in the existing `server-endpoint-authorization` spec.

## Decisions

### Decision 1: Inline the deferred work at the call sites; delete the actions

**Choice:** Move the body of `recordVisit` into `ListHeroSection`'s existing `after()` callback, and the body of `markFollowingSeen` into `FollowingPage`'s existing `after()` callback. Delete both exports from `app/actions/lists.ts` and `app/actions/follows.ts`. Inside each callback, do not call `auth()` — use the viewer id captured from the outer scope (closure over the locals resolved before the `after()` boundary).

**Why:**

- Removes the bug at its root: the `after()` callback no longer touches request-scoped context.
- Removes a network-callable surface that has no client caller, narrowing the action layer to what's actually invoked by clients.
- The `server-endpoint-authorization` spec already forbids the alternative (action-takes-userId-as-parameter) for the enumerated ownership-bearing list. Even though `recordVisit` / `markFollowingSeen` are not on that list, extending that family with "trusted-caller actions that bypass `auth()`" would create a confusing two-tier action contract.

**Alternatives considered:**

- **Action takes viewer id as a parameter** (e.g. `recordVisit(listId, viewerId)`). Rejected: introduces a category of "actor-id-as-parameter" actions that the spec deliberately avoided. Even if scoped to "only callable from server-side `after()`", the `'use server'` directive still exposes a network endpoint; an attacker could forge `viewerId` and the action would have no way to validate it without — circularly — calling `auth()`, which crashes inside `after()`.
- **Resolve viewer id outside `after()` and pass into the action** (i.e. the same as above, but with discipline that the parameter must be a session-validated id from the caller's scope). Rejected for the same reason: the network surface remains, and the discipline isn't enforceable.
- **Switch to a client-fired beacon (`fetch('/api/visits', { method: 'POST' })`)** that authorizes server-side. Rejected: re-introduces the "client beacon" pattern the `visit-history` spec explicitly designed away in scenario "Recording SHALL be performed server-side on page render; no client beacon is required." Also adds a network round-trip and a JS dependency for a server-side bookkeeping concern.
- **Catch and swallow the error inside the action.** Rejected: hides the bug rather than fixing it; visits stop being recorded in production silently.

### Decision 2: Capture viewer id explicitly before the `after()` boundary

**Choice:** Within each server component, assign the resolved viewer id to a local `const` (e.g. `const viewerId = user.id`) on the line immediately preceding the `after()` registration. Reference that local — not any function that re-reads request state — inside the callback.

**Why:** Makes the closure boundary explicit at the call site. A future reader who wonders "why is this id pulled into a local right before `after()`?" can see the comment / will find the spec requirement that codifies the rule. Closures over `user.id` would work too, but a named local advertises intent.

**Alternatives considered:**

- **Closure over `user` directly.** Works but reads as incidental; future refactors that "clean up" the unused local could re-create the bug by reintroducing an `auth()` call inside the callback. The named local is a deliberate marker.

### Decision 3: Keep both `updateTag` invalidations inside the `after()` callbacks

**Choice:** `updateTag('list_visits')` and `updateTag('user_follows')` move inline with the writes, still inside the `after()` callbacks.

**Why:** That's the reason these were deferred in the first place — Next 16 disallows `updateTag` during render. Behavior under the existing DAL `'use cache'` + `cacheTag` model is preserved exactly: home digest, history page, and following page reads invalidate on the same triggers as before.

### Decision 4: Codify the constraint in `server-endpoint-authorization`, not as a new capability

**Choice:** Add a new requirement to `openspec/specs/server-endpoint-authorization/spec.md` stating that side-effects invoked from `after()` MUST NOT call request-scoped APIs (`headers()`, `cookies()`, zero-arg `auth()`); any identity they need MUST be captured at the call site before the `after()` boundary. Also a SHOULD that server-only side-effects with a single internal call site be inlined rather than exposed as `'use server'` actions when the alternative would require re-deriving auth inside `after()`.

**Why:**

- The constraint is a sibling of the existing server-action auth rules; placing it elsewhere fragments the spec.
- A new capability for "after-callback side effects" would be near-empty (one requirement) and would invite tension with the existing action-authorization rules.

**Alternatives considered:**

- **New capability `after-callback-side-effects`.** Rejected as over-modeling. The thing being constrained is "how server-side code derives identity," which is exactly what `server-endpoint-authorization` already covers.

### Decision 5: Update the `following` spec to drop `markFollowingSeen` from the enumerated action list; leave `visit-history` spec untouched

**Choice:** The `following` spec's "no transactions" requirement names `markFollowingSeen` in a list of `app/actions/follows.ts` actions. That enumeration becomes inaccurate when the action is deleted, so the spec is updated to remove the name from the list. The behavioral requirement that `/following` updates `users.last_seen_following_at` to `NOW()` on render is unchanged.

The `visit-history` spec only requires that recording happens "server-side on page render; no client beacon is required." It does not currently prescribe *via what mechanism* the recording happens, so no normative change is needed — the inline implementation satisfies the existing requirement as written.

**Why:** Minimal spec movement. Edit only what becomes wrong; leave correct text alone.

## Risks / Trade-offs

- **[Risk] A future contributor reintroduces a server action call inside `after()`.** → Mitigation: the new `server-endpoint-authorization` requirement makes the prohibition explicit and discoverable; the apply tasks include a `grep` audit step to confirm no other `after(() => someAction())` call inside the repo introduces the same issue.
- **[Risk] Inlining duplicates DB logic if a third site needs visit-recording or seen-marking later.** → Mitigation: accepted for now (only one call site per behavior exists). If a third site appears, extract a non-`'use server'` server-only helper (e.g. `lib/visits.ts :: recordVisit(viewerId, listId)`) that takes the viewer id as a parameter and contains only the DB write — no `auth()` call. That helper is callable from any server component that has already validated the viewer.
- **[Risk] The visibility / owner guards inside `recordVisit` (`list.user_id === userId` → skip, `visibility === OWNER` → skip) are partially redundant with the gates already in `ListHeroSection` (owner check, visibility check before registering the `after()`).** → Mitigation: preserve the inline write's gates as defense-in-depth. The `ListHeroSection` gate prevents registering the `after()` for owner viewers or private lists; the inline gate inside the callback is unnecessary in the current code path, so the inlined version SHOULD drop the redundant re-check (its job was to defend against direct action invocation, which no longer exists).
- **[Trade-off] Losing the `ActionResponse` envelope (`{ success, message, ... }`) on the inlined writes.** Accepted: the response was being thrown away in both call sites (`after(() => recordVisit(id))` — return value unused; `after(() => markFollowingSeen())` — same). No surface relied on the envelope.
- **[Trade-off] Error handling becomes a plain try/catch logged to the server console rather than the action's `return { error: ... }` shape.** Accepted: both call sites already treated errors as fire-and-forget; the failure mode (visit not recorded once) is benign and observable in server logs. We preserve the `console.error` calls so the failure remains visible in logs.

## Migration Plan

This is a code-only change with no DB migration, no schema change, and no data backfill. The deployment shape:

1. Land the change as a single PR. The new code is strictly additive at the call sites (DB write inlined) and strictly subtractive at the action files (two exports removed).
2. No feature flag needed — the bug being fixed is a hard runtime error, and the inlined code is a drop-in replacement for the action call.
3. Post-deploy verification:
   - Open `/lists/[some-non-owned-public-list]` while signed in; confirm the page renders without the `headers()` error and a `list_visits` row appears/updates for `(viewer, list)`.
   - Open `/following`; confirm `users.last_seen_following_at` updates for the viewer and no error fires.
   - Confirm `npm run typecheck` passes (the action import sites are removed in the same PR as the action exports).
4. Rollback strategy: revert the PR. The previous state restores the broken-but-running behavior. Because no schema or data changed, rollback is purely a code revert.

## Open Questions

(none — all decisions resolved during exploration.)
