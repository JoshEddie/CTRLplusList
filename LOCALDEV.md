# Local-mode reference

Deep reference for local mode (`USE_PG_DRIVER=1`). Day-to-day commands + guardrails live in CLAUDE.md § Local dev.

## Auth bypass mechanics

App gates every protected page on Google OAuth via NextAuth → preview tools can't validate UI without real sign-in. "Local mode" = localhost Docker Postgres **plus** synthesized sessions (no real OAuth), entered with single flag `USE_PG_DRIVER=1` — same flag points DB driver at local Postgres ([db/index.ts](db/index.ts)), turns off real auth ([lib/auth.ts](lib/auth.ts)), and is what e2e servers set. **Docker prerequisite** (Docker Desktop on macOS — `dev:local` auto-starts it).

- `npm run dev:local` — localhost Postgres sidecar (`docker-compose.e2e.yml`), schema via `drizzle-kit push`, seeds `dev-test-viewer` + friend graph (idempotent), starts `next dev` with `USE_PG_DRIVER=1`.
- Nothing to hand-set: localhost `DATABASE_URL` lives once in `e2e/.env` (committed, non-secret — only `*.local` env files hold secrets, gitignored per `.env*.local` convention), shared by scripts, `docker-compose.e2e.yml`, `e2e/helpers/constants.ts`.
- `USE_PG_DRIVER=1` with non-localhost `DATABASE_URL` (e.g. Vercel) → app refuses to boot: loud outage, never silent bypass or data leak. Positive localhost requirement replaced former `NODE_ENV !== 'production'` check.

## Session identity (`BYPASS_SESSION_USER`)

Orthogonal to bypass.

- Unset ⇒ default `dev-test-viewer`.
- Literal `guest` ⇒ `auth()` resolves `null` (logged out).
- Any other seeded id ⇒ session for that id.
- `dev-unonboarded-signup` ⇒ an account holding no profile and no membership: the onboarding gate's signup arm, which offers to delete the account on cancel.
- `dev-unonboarded-existing` ⇒ an account whose self-profile carries no Altvatar art: the gate's existing-account arm, which only signs out on cancel.
- E2e Playwright projects: `authenticated` unset, `guest` sets `guest`, `onboarding-signup` and `onboarding-existing` set the two above.

Both onboarding values are one-shot against a given database: submitting the gate writes art that no affordance unsets, so previewing an arm a second time needs `npm run db:reset:dev`.

## Seeded data coverage

Deterministic states baked into `npm run db:reset:dev` / `dev:local` seed ([scripts/seed-dev-users.ts](scripts/seed-dev-users.ts)). Read when hunting a specific UI state from seed.

### `quantity_limit` coverage

Every seeded list has overrides at positions 0, 1, last, rotating `(3, null, 1)` → `(null, 1, 3)` → `(1, 3, null)` across consecutive lists. Multi-claim + unlimited items get multiple deterministic purchase rows (`${itemId}-purchase-${n}`) so partial-claimed, fully-claimed, multi-buyer-unlimited UI states reachable from seed without clicking.

### Imageless-item coverage

Every third item (positions 0, 3, 6…) on every fourth list (list index 3, 7, 11…) seeds with no image, no `item_images` rows → lazy placeholder-mint path (empty container → generated art persisted on first view) reachable from seed. Reseeding restores imageless; art minted by viewing survives until next `db:reset:dev`.

### Store-metadata edge case

`dev-list-alice-baby-item-2` carries three hand-authored stores led by $1,000.00 store whose name ("Really long store name that carries really cool items") overflows even one-name slot of card's store-metadata line — name-truncation + non-truncating `+N` count state reachable from seed.

### Linkless-item coverage

Hand-authored non-link states: `dev-list-viewer-birthday-item-5` PRICED (single linkless `$24.99` row), `dev-list-viewer-birthday-item-7` BARE (zero store rows). Linkless extras (`*-linkless-N`, appended after each list's pool slice, imageless → minted art, excluded from purchase fan-out): "Cash toward the house fund" (BARE) + "Coffee shop gift card" (PRICED $25.00) on `dev-list-viewer-birthday`; "A homemade dinner for two" (BARE) + "Spa day gift card" (PRICED $50.00) on `dev-list-alice-wedding` — owner-edit + viewer-claim surfaces for both door-shaped states reachable from seed.

### Profile coverage

One self-profile per seeded user except `dev-unonboarded-signup` (below, which holds none by design), id `self-<userId>` (`dev-test-viewer` ⇒ `self-dev-test-viewer`), name = the user's, carrying a `self` membership. Three managed fixtures, all account-less (no `self` membership): `dev-profile-owned` (name "Owned Profile") with `dev-test-viewer` as `owner` and `dev-friend-alice` as `manager`; `dev-profile-managed` (name "Managed Profile") with `dev-friend-bob` as `owner` and `dev-test-viewer` as `manager`; `dev-profile-workshop` (name "Workshop Profile") with `dev-friend-bob` as `owner` and `dev-test-viewer` as `manager`; and `dev-profile-visibility` (name "Visibility Profile") with `dev-friend-bob` as `owner` and `dev-test-viewer` as `manager`. The test viewer therefore runs five profiles across all three roles, so a switchable set exists and `manager` is covered twice over. **Workshop Profile is the writable manager seat**: it exists so an e2e flow acting as a manager has somewhere to create lists and items; a manager may create both and delete neither, so nothing such a flow writes can be cleaned up. Managed Profile carries the two fixtures that a single write would destroy (never-acted-as, and empty-lists), so **no flow may write on, or switch to, Managed Profile**. Owned Profile owns one list (`dev-list-owned-wishlist`, "Owned Profile Wishlist") — what `/lists` renders once the viewer switches to it. Workshop Profile likewise owns one (`dev-list-workshop-wishlist`, "Workshop Profile Wishlist", `user_id` = `dev-friend-bob`, the profile's owner): pre-existing content the manager did not create, so an owner-floor refusal is testable without the flow first writing its own fixture. **Visibility Profile is the claim-visibility seat**: its only fixture is a baseline an owner writes on the viewer's behalf, so it owns one list (`dev-list-visibility-wishlist`, "Visibility Profile Wishlist") carrying one deterministic claim. Workshop cannot serve that flow — the reorder layout turns on the tier, and a spec raising the viewer's Workshop baseline would race `roles-manager.auth.spec` for the window it is raised.

**Altvatar + accent coverage.** Ten of the eleven self-profiles in the friend roster carry an accent, and eight of those carry Altvatar art across all four styles (`avataaars`, `personas`, `toon-head`, `openmoji`), so every fill of the avatar disc is on screen at once. `self-dev-friend-iris` and `self-dev-friend-jack` carry an accent and no art — the initials-on-an-accent-disc branch — and `self-dev-friend-kim`, `dev-profile-managed` and `dev-profile-workshop` carry neither, the unset fallback. `dev-profile-owned` is deliberately accentless: `e2e/profiles.auth.spec.ts` opens its space to prove the no-accent-row branch rolls a suggestion. The test viewer's own self-profile carries both (`midnight` + `avataaars`), because art is what `onboarding-gate` latches on and a viewer without it would meet the gate on every local page. `users.image` is seeded on nobody: a profile's face comes from its own Altvatar row and never from the account.

**Un-onboarded fixtures.** Two accounts sit deliberately on the far side of the gate, one per arm of its latch, and neither is the test viewer: `dev-unonboarded-signup` ("Newly Signed Up") holds a `users` row and nothing else — no profile, no membership — and `dev-unonboarded-existing` ("Faceless Veteran") holds a self-profile carrying no Altvatar art. Reach either through `BYPASS_SESSION_USER` (above).

**Claim-visibility (spoiler) tier fixtures.** The baseline is now a single tier — `surprise` (fully protected), `progress`, `claims`, `identity` — stored as an account-keyed `profile_preferences` row `(profile_id, user_id, spoiler_tier)`, not as columns on the membership. An absent row resolves to `surprise` (`PROTECTED_TIER`), so most seats carry no row at all: every self membership, and both members of the Visibility Profile, resolve to `surprise` by absence — which is what every account existing before this capability resolves to and what the viewer's own lists render at, and where the owner-sets-a-baseline flow begins. **Owned Profile is the identity seat** and carries the only two seeded tier rows: the viewer at `identity` (switching to it is how local mode reaches the identity projection without writing a setting first) and `dev-friend-alice` pinned explicitly at `surprise` (so a set-to-protected row, distinct from an absent one, is itself a fixture). Its list (`dev-list-owned-wishlist`) carries one claim of each shape the tiers render differently — `dev-purchase-owned-other` (another party's), `dev-purchase-owned-mine` (the viewer's own, disclosed at every tier), and `dev-purchase-owned-proxy` (recorded by Alice for Bob, so the recorder is namable at `identity` and at no tier below it). The tier rows are upserted (`ON CONFLICT DO UPDATE`), so a reseed repaints an edited value; the membership rows themselves stay `ON CONFLICT DO NOTHING`. A database seeded before the tier moved off the membership keeps its state until `npm run db:reset:dev`.

**Last-acted-as fixtures.** The viewer's memberships carry deterministic, absolute `last_active_at` values, far enough apart to order unambiguously: self-profile `2026-08-20T12:00:00Z`, Owned Profile `2026-02-14T09:00:00Z`, Workshop Profile `2026-03-01T09:00:00Z`, Managed Profile **NULL**. NULL is the never-acted-as ordering branch's fixture and orders after every membership carrying a value — no e2e flow may switch to Managed Profile, because a switch stamps the row and no affordance unsets it. Local development switches through the real UI (the avatar dropdown or a profile card); there is no environment override for the acting profile.

`profile_preferences` seeds an accent row for each profile named above and for no other, so the accent fallback stays reachable from the profiles left out, plus the two member `spoiler_tier` rows on Owned Profile described above. `preferences` seeds the shipped catalog — the `accent` row and the `spoiler_tier` row — because `drizzle-kit push` builds these databases from the schema and replays no migration data, so a catalog row a migration inserts on Neon reaches local and e2e only through the seed. The feature introducing a preference owns its catalog row. Profile + membership inserts use `.onConflictDoNothing()`, so a reseed does not pick up edits to a seeded profile's name or role — `db:reset:dev` does.

### Claim-attribution coverage

Authenticated fan-out purchase rows = self-claims (`claimed_by_profile_id` = the buyer's own `profile_id`); guest rows all-NULL identities. Four hand-authored rows (`dev-purchase-*`, on `dev-list-viewer-birthday-item-1..3` + `dev-list-alice-wedding-item-1`, items excluded from fan-out) cover attributed-claim shape (Alice marked Bob), viewer-as-attributed-purchaser, owner self-claim, legacy signed-out-guest row — every unclaim-matrix branch + owner spoiler "added by" label reachable from seed. Alice seeded mutual with every other friend → her lists' attributed-purchaser picker pool large enough to scroll, targets besides viewer.

## Implementation files

- [db/index.ts](db/index.ts) — `USE_PG_DRIVER` driver-switch (postgres-js vs neon-http) + localhost boot guard.
- [lib/auth.ts](lib/auth.ts) — bypass keyed on `USE_PG_DRIVER`; `BYPASS_SESSION_USER` selector; exports `BYPASS_USER_ID = 'dev-test-viewer'` and `GUEST_SESSION_USER = 'guest'`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses prod; upserts most tables via Drizzle `.insert().onConflictDoUpdate()` (few `.onConflictDoNothing()`) so reseeds pick up edits.
- [scripts/setup-e2e-db.sh](scripts/setup-e2e-db.sh) / [scripts/dev-local.sh](scripts/dev-local.sh) / [scripts/test-e2e.sh](scripts/test-e2e.sh) — `setup-e2e-db.sh` = Docker bring-up + schema only; data-state step is caller's: `dev:local` seeds (preserves UI-created rows), `test:e2e` runs `db:reset:dev` (cascade wipe + reseed) so every e2e run starts identical.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path unchanged.

## Product-fetch mock

- Local mode only (same `USE_PG_DRIVER=1` flag, no own flag): pasting `https://mock.test/<scenario>` into add-item flow returns deterministic fixture instead of calling Zyte — every downstream deck state reachable in seconds, zero quota.
- Scenario = URL's first path segment, toggled per request, no restart. Any other hostname takes real path even locally (paste real URL with key configured to test real Zyte). Unknown scenario → `fetch_failed`.
- fixtures: [lib/product-fetch/mock.ts](lib/product-fetch/mock.ts).
- Mock requests bypass product-fetch rate-limit bucket; `https://mock.test/rate-limited` returns route-level 429.
- Outside local mode mock doesn't exist — `mock.test` fails like dead link.
