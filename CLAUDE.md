# Claude notes

## Adding or modifying tests? Read [TESTING.md](TESTING.md) first

Substance rules, forbidden patterns (tautologies, execute-for-coverage, snapshot-only), and the assertion bar all live there. Applies to every test in the repo.

## Touching DB queries or schema? Read [DATABASE.md](DATABASE.md) first

Key tripwire: the DB layer uses `drizzle-orm/neon-http`. **Interactive transactions are not supported** — no `db.transaction(...)`, no `SELECT … FOR UPDATE`. Full rationale, migration workflow, and driver caveats live in DATABASE.md.

## Writing code: 

### Comments:

Default to writing no comments. Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.

Don't explain WHAT the code does — well-named identifiers already do that. Don't reference the current task, fix, or callers ("used by X", "added for the Y flow", "handles the case from issue #123") — those belong in the PR description and rot as the codebase evolves.

### File size (red / yellow / green):

Lint-enforced bands for production source, counted in lines of **code** (comments and blank lines are free): **red** >400 = error — split by table-cohesion/domain before merge; **yellow** 300–400 = warning — pull easy wins where a clean extraction exists, a cohesive file may stay yellow; **green** <300 = goal, never achieved by scattering one concern across files. Yellow size advisories are the only tolerated lint warnings; no `eslint-disable` for either rule. Canonical homes: the rules in [eslint.config.mjs](eslint.config.mjs), the normative text in `openspec/specs/testing-foundation`.

### Abstraction (DRY · KISS · coupling):

#### Duplication (DRY)

- Extract duplicated, identical-by-design logic into one home on sight — don't ask whether to, the answer is yes.
- Keep copies apart only when you can name them as different concepts that will change for different reasons; code that merely looks alike is not a duplication to merge.
- The exception is the genuinely trivial: a shared line or two with no structure can stay inline — three similar lines beats a premature abstraction. But *trivial* is the bar, not the copy count. Weigh three forces: **weight** (a line or two can stay; a typed factory, multi-field literal, or anything with branching extracts), **drift hazard** (extract when one copy can fall behind **silently** — still compiles, still passes, but now means something different; inline is fine when divergence fails loudly or doesn't matter), and **count** (three or more extracts even when trivial — but count only escalates, it never overrides weight or drift). Two copies is a judgment call on those forces, not an always-or-never: a heavy or drift-prone unit earns one home even at two.

#### Over-generality (KISS)

- Don't build generality for cases that don't exist yet — parameters, flags, or branches with no current caller are dead code except when planned for imminent future use.
- Don't tear down a clean, working, tested abstraction just because it's more general than strictly needed; once it exists and is covered, stripping it is risk for no live defect.

#### Redundant guards

- Don't re-test a condition your own earlier control flow already decided. A guard (`if (cond) redirect()/return/throw`) whose condition is already excluded by an upstream guard or branch in the same function is dead code — remove it and let any narrowing flow from the existing control flow (merge or move the upstream guard, early-return). Never paper over it with a `/* v8 ignore */`.
- This is NOT a defensive guard, whose condition turns on an invariant established outside the function (framework lifecycle, platform, a third-party/DB contract) the compiler can't prove — that one is legitimate. Tell: a rationale that cites the function's own earlier code ("the guard above already redirects…") is the redundant kind.

#### Fragile coupling

- When a shared abstraction's callers diverge, split it back into separate concepts — don't bolt on flags, params, or branches so one thing can serve all of them.
- Coupling between callers that are genuinely one concept meant to change together is the abstraction doing its job.

#### Extraction for leanness

- Extract single-caller helpers to keep files lean — extraction for readability is the norm, not over-abstraction, and doesn't need justifying.

#### Where extracted helpers live

- Small, generic, or pure helpers go in a **co-located `utils.ts`** for that directory (create it if absent) — not in their own single-purpose file. `capRail` lives in `app/(main)/lists/ui/components/rails/utils.ts`, following `app/(main)/users/ui/utils.ts` (`initialsOf`).
- Reserve a descriptively-named standalone module for a genuine domain/capability concept (`lib/data/user.ts`, `lib/visibility.ts`, `lib/listAccess.ts`). `utils.ts` is for the small stuff, not a dumping ground for domain logic.

#### Worked example: `Button` / `LinkButton`

One small trio in `app/ui/components/button/` shows the first three forces at once:

- **DRY** — the only thing the two genuinely share, the visual styling, lives in `buttonClasses()`; neither component re-implements it.
- **Fragile coupling** — they stay separate components instead of collapsing into one polymorphic thing behind an `as`/`href` flag, because the concepts diverge: `Button` is a `<button>` (`ButtonHTMLAttributes` + `type`), `LinkButton` is a Next `<Link>` (`AnchorHTMLAttributes` + `LinkProps`).
- **KISS** — each carries only the props its concept needs: `Button` has `isLoading`/`disabled`, `LinkButton` doesn't — a link can't load or be disabled, so adding them "for symmetry" would be generality for a caller that doesn't exist.

## Local dev + e2e auth bypass (via `USE_PG_DRIVER`)

The app gates every protected page on Google OAuth via NextAuth, which makes it impossible to validate UI changes through the preview tools without a real Google sign-in. "Local mode" — a localhost Docker Postgres **plus** synthesized sessions (no real OAuth) — is entered with a single flag, `USE_PG_DRIVER=1`. The same flag points the DB driver at local Postgres (see [db/index.ts](db/index.ts)) and turns off real auth (see [lib/auth.ts](lib/auth.ts)); it is the same flag the e2e servers set. **Docker is a prerequisite** (Docker Desktop on macOS — `dev:local` auto-starts it).

**To run locally bypassed:**

1. `npm run dev:local` — brings up the localhost Postgres sidecar (`docker-compose.e2e.yml`), applies schema via `drizzle-kit push`, seeds `dev-test-viewer` plus the friend graph (idempotent), then starts `next dev` with `USE_PG_DRIVER=1`. Every protected page renders as `dev-test-viewer` with no sign-in.
2. Nothing to hand-set: the localhost `DATABASE_URL` lives once in `e2e/.env` (committed, non-secret — only `*.local` env files hold secrets and are gitignored, per the `.env*.local` convention) and is shared by the scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts`.

**Choosing the session identity (`BYPASS_SESSION_USER`):** orthogonal to the bypass. Unset ⇒ the default `dev-test-viewer` session; the literal `guest` ⇒ `auth()` resolves to `null` (logged out); any other seeded id ⇒ a session for that id. The two e2e Playwright projects use exactly this: `authenticated` leaves it unset, `guest` sets it to `guest`.

**To return to real auth:** run plain `npm run dev` (no `USE_PG_DRIVER`) — Neon + real Google sign-in, exactly as production. This is also the deployed Vercel configuration.

**To reset after drift:** `npm run db:reset:dev` against the local DB — wipes everything owned by the seeded users (including UI-created rows under `dev-test-viewer`) via cascade, then re-seeds the baseline. Use this when local testing has accumulated stray lists/items/purchases and you want a clean slate.

**After seeding/resetting, restart the dev server** — many DAL functions (`getListsByUser`, etc.) are tagged with `'use cache'` and only invalidate when the app calls `revalidateTag`. The seed script runs outside the Next.js process and can't bump tags, so cached results stay stale until the server restarts.

**Hard guardrail:** the bypass is scoped to a localhost DB by the `USE_PG_DRIVER` boot guard in [db/index.ts](db/index.ts) — if `USE_PG_DRIVER=1` is ever set with a non-localhost `DATABASE_URL` (e.g. on Vercel), the app refuses to boot: a loud outage, never a silent bypass or data leak. On Vercel the flag is unset, so production stays neon-http + real auth. This positive localhost requirement replaces the former `NODE_ENV !== 'production'` check.

**Seeded `quantity_limit` coverage:** every seeded list has overrides at positions 0, 1, and last, rotating `(3, null, 1)` → `(null, 1, 3)` → `(1, 3, null)` across consecutive lists. Multi-claim and unlimited items receive multiple deterministic purchase rows (`${itemId}-purchase-${n}`) so partial-claimed, fully-claimed, and multi-buyer-unlimited UI states are reachable directly from the seed without manual clicking.

**Files:**

- [db/index.ts](db/index.ts) — `USE_PG_DRIVER` driver-switch (postgres-js vs neon-http) + the localhost boot guard.
- [lib/auth.ts](lib/auth.ts) — bypass keyed on `USE_PG_DRIVER`; the `BYPASS_SESSION_USER` selector; exports `BYPASS_USER_ID = 'dev-test-viewer'` and `GUEST_SESSION_USER = 'guest'`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses to run on prod; upserts most tables via Drizzle `.insert().onConflictDoUpdate()` (a few use `.onConflictDoNothing()`) so reseeds pick up edits.
- [scripts/setup-e2e-db.sh](scripts/setup-e2e-db.sh) / [scripts/dev-local.sh](scripts/dev-local.sh) / [scripts/test-e2e.sh](scripts/test-e2e.sh) — `setup-e2e-db.sh` is Docker bring-up + schema only; the data-state step is the caller's: `dev:local` seeds (preserves UI-created rows), `test:e2e` runs `db:reset:dev` (cascade wipe + reseed) so every e2e run starts from identical state. `dev:local` and `test:e2e` wrap them.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path is unchanged.

## /api/image-search auth + rate limit

`GET /api/image-search` requires an authenticated session (401 otherwise) and enforces a per-user in-memory token bucket of 30 requests/minute (429 with `{ error: 'rate_limited' }` when exceeded — distinguishable from upstream `quota_exceeded`). Under the dev bypass the session resolves to `dev-test-viewer`, so the route works during preview-driven testing; the 30/min cap is enough headroom for normal iteration. See [app/api/image-search/route.ts](app/api/image-search/route.ts).
