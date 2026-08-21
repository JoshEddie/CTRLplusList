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
- E2e Playwright projects: `authenticated` unset, `guest` sets `guest`.

## Active profile (`BYPASS_ACTIVE_PROFILE`)

Dormant seam. Read in local mode and exposed as `bypassActiveProfile()`; consumed by nothing yet. Setting it changes no behavior, including session synthesis. Outside local mode it always reads undefined.

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

One self-profile per seeded user, id `self-<userId>` (`dev-test-viewer` ⇒ `self-dev-test-viewer`), name = the user's, carrying a `self` membership. One managed fixture: `dev-profile-kiddo` (name "Kiddo", no `self` membership) with `dev-test-viewer` as `owner` and `dev-friend-alice` as `manager` — the account-less profile shape, and the id `BYPASS_ACTIVE_PROFILE` takes. No per-profile preference values: `profile_preferences` seeds empty, so every seeded profile renders the accent fallback. `preferences` seeds the shipped catalog — today the single `accent` row — because `drizzle-kit push` builds these databases from the schema and replays no migration data, so a catalog row migration 0013 inserts on Neon reaches local and e2e only through the seed. The feature introducing a preference owns its catalog row. Profile + membership inserts use `.onConflictDoNothing()`, so a reseed does not pick up edits to a seeded profile's name or role — `db:reset:dev` does.

### Claim-attribution coverage

Authenticated fan-out purchase rows = self-claims (`claimed_by_profile_id` = the buyer's own `profile_id`); guest rows all-NULL identities. Four hand-authored rows (`dev-purchase-*`, on `dev-list-viewer-birthday-item-1..3` + `dev-list-alice-wedding-item-1`, items excluded from fan-out) cover attributed-claim shape (Alice marked Bob), viewer-as-attributed-purchaser, owner self-claim, legacy signed-out-guest row — every unclaim-matrix branch + owner spoiler "added by" label reachable from seed. Alice seeded mutual with every other friend → her lists' attributed-purchaser picker pool large enough to scroll, targets besides viewer.

## Implementation files

- [db/index.ts](db/index.ts) — `USE_PG_DRIVER` driver-switch (postgres-js vs neon-http) + localhost boot guard.
- [lib/auth.ts](lib/auth.ts) — bypass keyed on `USE_PG_DRIVER`; `BYPASS_SESSION_USER` selector; exports `BYPASS_USER_ID = 'dev-test-viewer'`, `GUEST_SESSION_USER = 'guest'`, `bypassActiveProfile()`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses prod; upserts most tables via Drizzle `.insert().onConflictDoUpdate()` (few `.onConflictDoNothing()`) so reseeds pick up edits.
- [scripts/setup-e2e-db.sh](scripts/setup-e2e-db.sh) / [scripts/dev-local.sh](scripts/dev-local.sh) / [scripts/test-e2e.sh](scripts/test-e2e.sh) — `setup-e2e-db.sh` = Docker bring-up + schema only; data-state step is caller's: `dev:local` seeds (preserves UI-created rows), `test:e2e` runs `db:reset:dev` (cascade wipe + reseed) so every e2e run starts identical.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path unchanged.

## Product-fetch mock

- Local mode only (same `USE_PG_DRIVER=1` flag, no own flag): pasting `https://mock.test/<scenario>` into add-item flow returns deterministic fixture instead of calling Zyte — every downstream deck state reachable in seconds, zero quota.
- Scenario = URL's first path segment, toggled per request, no restart. Any other hostname takes real path even locally (paste real URL with key configured to test real Zyte). Unknown scenario → `fetch_failed`.
- Scenario table (fixture → UI state): `openspec/specs/product-fetch-mock/spec.md`; fixtures: [lib/product-fetch/mock.ts](lib/product-fetch/mock.ts).
- Mock requests bypass product-fetch rate-limit bucket; `https://mock.test/rate-limited` returns route-level 429.
- Outside local mode mock doesn't exist — `mock.test` fails like dead link.
