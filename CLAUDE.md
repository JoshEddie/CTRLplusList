# Claude notes

## Database driver: no transactions

The DB layer uses `drizzle-orm/neon-http` over Neon's HTTP API. **Interactive transactions are not supported on this driver.** Do not introduce `db.transaction(async (tx) => { … })`, `SELECT … FOR UPDATE`, or any code that assumes a multi-statement session — every query is its own HTTP round-trip with its own connection.

Concrete implications:

- Race conditions that need cross-statement atomicity must be backstopped at the DB layer (unique indexes, partial unique indexes, `ON CONFLICT` clauses), or accepted as residual.
- Do not propose switching to `drizzle-orm/neon-serverless` / WebSocket Pool without explicit owner approval — it's been considered and declined.
- If you find code claiming to use a transaction here, it's broken; convert it to single-statement + DB-constraint enforcement instead.

See [db/index.ts](db/index.ts) for the driver instantiation.

## Dev auth bypass (for preview verification)

The app gates every protected page on Google OAuth via NextAuth, which makes it impossible to validate UI changes through the preview tools without a real Google sign-in. A dev-only bypass exists for this:

**To enable:**

1. `npm run db:seed:dev` — idempotent; creates `dev-test-viewer` plus 4 friends (Alice/Bob/Carol/Dave) with mutual + one-way follows, public lists with items, visit history, and bookmarks.
2. Set `AUTH_BYPASS=true` in `.env.local` (already gitignored).
3. Start the dev server. Zero-arg `await auth()` calls now return a mock session for `dev-test-viewer` — every protected page renders without sign-in.

**To disable:** remove the env var (or set `AUTH_BYPASS=false`). No code change needed.

**To reset after drift:** `npm run db:reset:dev` — wipes everything owned by the seeded users (including UI-created rows under `dev-test-viewer`) via cascade, then re-seeds the baseline. Use this when local testing has accumulated stray lists/items/purchases and you want a clean slate.

**After seeding/resetting, restart the dev server** — many DAL functions (`getListsByUser`, etc.) are tagged with `'use cache'` and only invalidate when the app calls `revalidateTag`. The seed script runs outside the Next.js process and can't bump tags, so cached results stay stale until the server restarts.

**Hard guardrail:** the bypass refuses to activate when `NODE_ENV === 'production'`, even with `AUTH_BYPASS=true`. See `bypassEnabled()` in [lib/auth.ts](lib/auth.ts).

**Seeded `quantity_limit` coverage:** every seeded list has overrides at positions 0, 1, and last, rotating `(3, null, 1)` → `(null, 1, 3)` → `(1, 3, null)` across consecutive lists. Multi-claim and unlimited items receive multiple deterministic purchase rows (`${itemId}-purchase-${n}`) so partial-claimed, fully-claimed, and multi-buyer-unlimited UI states are reachable directly from `npm run db:seed:dev` without manual clicking.

**Files:**

- [lib/auth.ts](lib/auth.ts) — wrapped `auth()` export; exports `BYPASS_USER_ID = 'dev-test-viewer'`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses to run on prod; uses raw SQL for `lists` inserts because Drizzle 0.45 generates INSERTs with every schema-declared column.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path is unchanged.

## /api/image-search auth + rate limit

`GET /api/image-search` requires an authenticated session (401 otherwise) and enforces a per-user in-memory token bucket of 30 requests/minute (429 with `{ error: 'rate_limited' }` when exceeded — distinguishable from upstream `quota_exceeded`). Under the dev bypass the session resolves to `dev-test-viewer`, so the route works during preview-driven testing; the 30/min cap is enough headroom for normal iteration. See [app/api/image-search/route.ts](app/api/image-search/route.ts).
