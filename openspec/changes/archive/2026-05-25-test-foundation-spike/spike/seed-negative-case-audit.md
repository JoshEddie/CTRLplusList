# Seed-fixture negative-case audit

**Status:** spike deliverable for `test-foundation-spike`. Findings inform `test-foundation` (which decides whether to extend the seed); the spike itself does NOT extend the seed.

**Source audited:** [scripts/seed-dev-users.ts](../../../../scripts/seed-dev-users.ts) at HEAD (commit `016b2dd`).

## What the seed produces today

Enumerated from a full read of the seed script:

- **Users (11):** `dev-test-viewer` + 10 friends with slugs alice, bob, carol, dave, eve, frank, grace, hank, iris, jack.
- **Lists (30):** 15 viewer-owned + 15 friend-owned. Visibility distribution on the viewer's:
  - **OWNER (private):** housewarming, kitchen-upgrade, fathers-day, mothers-day (4)
  - **LINK (unlisted):** anniversary, home-office, graduation (3)
  - **FOLLOWERS (semi-public):** the remaining 8
  - **Friend-owned lists:** all 15 are `VISIBILITY.FOLLOWERS` (no friend currently owns an OWNER or LINK list).
- **Items:** ~15–20 per list (deterministic per list-id hash). Total ≈ 480 items.
- **`item_stores`:** 1–3 per item, ≈ 720–1440 rows.
- **Purchases:** rotating `quantity_limit ∈ {1, null, 3}` at positions [0, 1, last] per list, ~30–70% claim rate. Mixed authenticated + guest buyers.
- **Follows (12 rows):** viewer follows alice/bob/eve/frank/grace/hank (6 outbound). Inbound: alice/bob/eve/grace (mutual) + carol/iris (one-way inbound). Dave/jack/frank/hank are NOT followers of the viewer.
- **`list_visits` (15 rows):** viewer visited every friend-owned list, recency descending by template index. Even-indexed visits are bookmarked (`favorited_at` set).
- **`user_blocks`:** zero rows. Schema exists at `db/schema.ts:140`; no blocking model in the app surface.

**Note on visibility constants:** there are only three values today (OWNER / LINK / FOLLOWERS — currently aliased to `'private' / 'unlisted' / 'public'` per the staged-rollout in `lib/visibility.ts`). FOLLOWERS is the most-permissive — there is no fully-public-to-anyone state. The audit treats FOLLOWERS as "visible to followers; not visible to non-followers".

## Per-capability classification

### list-visibility

| Negative case E2E needs | Present / Partial / Missing | Notes |
|---|---|---|
| Viewer attempts to view another user's **OWNER** (private) list | **Missing** | No friend owns an OWNER list. The 4 OWNER lists belong to the viewer, who is the legitimate owner. |
| Viewer attempts to view another user's **LINK** (unlisted) list directly (without the share link) | **Missing** | No friend owns a LINK list. The 3 LINK lists belong to the viewer. |
| Viewer views another user's **FOLLOWERS** list while NOT following them | **Partial** | Dave/jack/frank/hank own FOLLOWERS lists; viewer doesn't follow dave/jack. But the seed also creates `list_visits` rows for all friend lists, which may interfere with "non-follower trying to access for the first time" semantics. |
| Viewer views another user's **FOLLOWERS** list while following them | **Present** | alice/bob/eve/grace lists — viewer follows all four. |
| Viewer views **their own** OWNER / LINK / FOLLOWERS list | **Present** | All three present in viewer-owned lists. |

**Disposition (Missing/Partial):**

- **Add a friend-owned OWNER list** (e.g. `dave`'s private list). One row in `FRIEND_LIST_TEMPLATES` with `visibility: VISIBILITY.OWNER`. Rationale: covers the highest-stakes negative case (cross-user private access) with a single seed-row addition; no UX pollution because the row appears only in the viewer's "following" rail if dave is followed, which dave isn't.
- **Add a friend-owned LINK list** (e.g. `jack`'s unlisted list). Same shape, one row. Rationale: lets E2E assert that direct-link access works but discovery does not. Same UX rationale — jack is not followed by the viewer.
- **For the FOLLOWERS-no-follow case:** remove the seeded `list_visits` row for dave/jack lists, OR add a fresh friend (e.g. `kim`) with a FOLLOWERS list AND no `list_visits` row to act as a clean "never visited, not followed" fixture. Recommendation: the latter — preserves the existing rich Recently-Visited rail.

**`extend seed-dev-users.ts`** is preferred for all three (single source of truth, idempotent, no parallel fixture file to maintain).

### following

| Negative case E2E needs | Present / Partial / Missing | Notes |
|---|---|---|
| Viewer + friend in **mutual follow** | **Present** | alice/bob/eve/grace. |
| Viewer follows friend, friend doesn't follow back (**outbound one-way**) | **Present** | frank/hank — viewer follows them; they don't follow viewer. |
| Friend follows viewer, viewer doesn't follow back (**inbound one-way**) | **Present** | carol/iris. |
| **No relationship** at all | **Present** | dave/jack — no follow either direction. |
| **Self-follow** attempt | **Missing-by-design** | Negative-case for an action; not a fixture concern. Action-level test asserts the server action refuses `follower_id === followee_id`. |

**Disposition:** no seed changes needed. Self-follow is an action-level negative; the fixture coverage is complete.

### server-endpoint-authorization

Representative server actions (per `app/actions/` enumeration during the spike): `markAsPurchased` (claim), `editList`, `deleteList`, follow toggles.

| Caller × Resource matrix | Present / Partial / Missing |
|---|---|
| Unauthenticated caller → any action | **Present (substrate)** — the auth bypass can be disabled at the harness level via `AUTH_BYPASS=false`; no fixture changes required. E2E asserts 401/redirect. |
| Authenticated non-owner → owner-only action (delete a friend's list, edit a friend's item) | **Present** — every friend-owned list / item is a valid "not yours" target for the viewer to attempt. |
| Authenticated non-owner → claim (markAsPurchased) on a friend's item | **Present** — friend lists have unclaimed items in the seed. |
| Authenticated owner → owner-only action (delete own list) | **Present** — viewer owns 15 lists. |
| Authenticated owner → claim on their own item | **Present (negative is an app-rule, not a DB-rule)** — viewer can attempt to claim own items; action layer is what enforces. |

**Disposition:** no seed changes needed. The 11-user / 30-list / ~480-item seed already supplies every fixture role needed for cross-user authorisation E2E.

### visit-history

| Negative case E2E needs | Present / Partial / Missing | Notes |
|---|---|---|
| First visit recorded (no prior row) | **Missing** | Every seeded list-visit pair already has a row (`visit_count: 1`). To test "first visit creates the row", E2E needs a friend-owned list the viewer has NOT visited yet. |
| Re-visit within dedupe window (existing row, `last_visited_at` updated, `visit_count` not incremented OR incremented per app rules) | **Partial** | All 15 visits have `visit_count: 1` and `last_visited_at` set to a per-template recency offset. E2E can trigger a second visit to assert dedupe behaviour, but only by going through the UI — the seed itself doesn't pre-populate a "visited twice within window" row. |
| Bookmark toggle (`favorited_at` flip) | **Present** | Even-index visits are bookmarked; odd-index are not. Both states exist for toggle assertions. |

**Disposition:**

- **For "first visit creates row":** add at least one friend-owned list that does NOT appear in `seedVisits` — e.g. the new `kim` friend proposed above for the no-follow case doubles as the no-visit fixture. Single seed-edit accomplishes both audits.
- **For "re-visit dedupe":** accept-with-rationale. The dedupe window is an action-level computation against `last_visited_at`; pre-seeding "visited twice" doesn't add coverage over "visited once + E2E triggers a second visit". E2E asserts the behaviour by interacting; the seed doesn't need to.

### Blocking model

**Finding: the app has no user-facing blocking model today.** The `user_blocks` table exists at [db/schema.ts:140](../../../../db/schema.ts) (composite PK on `blocker_id, blocked_id`) and is referenced in the schema, but:

- No seeded `user_blocks` rows.
- No grep hits for `user_blocks` in `app/` server actions.
- No UI affordance to block a user (verified by grep on `'block'` / `'unblock'` in `app/`).

The table is present but unused. **No spike action required.** If a future change adds the blocking action surface, the seed audit for it lives with that change — not this spike, not `test-foundation`.

## Summary of recommended seed extensions (for `test-foundation` to land)

Per the recurring-pattern preference for `extend seed-dev-users.ts` over parallel fixtures:

1. Add **one OWNER-visibility list** owned by an existing not-followed-by-viewer friend (e.g. `dave-private`).
2. Add **one LINK-visibility list** owned by an existing not-followed-by-viewer friend (e.g. `jack-unlisted`).
3. Add **one new friend** (`kim`) with a FOLLOWERS-visibility list and NO `list_visits` row — fixture for "non-follower, never-visited" + "first visit creates row".

Each is a single addition to the existing `FRIEND_LIST_TEMPLATES` / `FRIENDS` arrays in the seed; the rest of the seed code generalises over them. Total estimated edit: ~15 lines.

**Not recommended:** a parallel `seed-e2e-fixtures.ts`. The dev UX implications of the three additions above are negligible (one extra avatar in the Following rail, one extra private/unlisted list visible only to its owner-friend, one extra friend in the "people you might follow" surface). Splitting into a parallel file would mean dual maintenance with no upside.

## Audit completeness notes (per design D6 / risk acceptance in test-coverage D7)

This audit covers the cases reachable from the four named capabilities. Capability sub-proposals that surface new negative cases during test authoring may extend the seed at that time (per `test-coverage` D7's design). The spike's audit is best-effort for known cases, not a guarantee that no further extensions will ever be needed.
