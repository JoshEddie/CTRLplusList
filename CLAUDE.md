# Claude notes

## Dev auth bypass (for preview verification)

The app gates every protected page on Google OAuth via NextAuth, which makes it impossible to validate UI changes through the preview tools without a real Google sign-in. A dev-only bypass exists for this:

**To enable:**
1. `npm run db:seed:dev` — idempotent; creates `dev-test-viewer` plus 4 friends (Alice/Bob/Carol/Dave) with mutual + one-way follows, public lists with items, visit history, and bookmarks.
2. Set `AUTH_BYPASS=true` in `.env.local` (already gitignored).
3. Start the dev server. Zero-arg `await auth()` calls now return a mock session for `dev-test-viewer` — every protected page renders without sign-in.

**To disable:** remove the env var (or set `AUTH_BYPASS=false`). No code change needed.

**To reset after drift:** `npm run db:reset:dev` — wipes everything owned by the seeded users (including UI-created rows under `dev-test-viewer`) via cascade, then re-seeds the baseline. Use this when local testing has accumulated stray lists/items/purchases and you want a clean slate.

**Hard guardrail:** the bypass refuses to activate when `NODE_ENV === 'production'`, even with `AUTH_BYPASS=true`. See `bypassEnabled()` in [lib/auth.ts](lib/auth.ts).

**Files:**
- [lib/auth.ts](lib/auth.ts) — wrapped `auth()` export; exports `BYPASS_USER_ID = 'dev-test-viewer'`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses to run on prod; uses raw SQL for `lists` inserts because Drizzle 0.45 generates INSERTs with every schema-declared column.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path is unchanged.
