## Context

Sub-proposal 6.0 of `test-coverage`. It owns the e2e **execution model** that 6.1/6.2 assert against. Current state:

- [playwright.config.ts](playwright.config.ts) is a placeholder: `npm run dev`, one chromium project, hardcoded `AUTH_BYPASS: 'true'`, pointed at port 3000 and whatever `DATABASE_URL` `.env.local` holds (the live Neon dev branch).
- [db/index.ts](db/index.ts) instantiates **only** `drizzle-orm/neon-http`, which speaks Neon's HTTP `/sql` protocol and **cannot** connect to a vanilla Postgres.
- The unit/integration tier already runs against an **in-process pglite** (`test/helpers/db.ts` `bootPglite()`) under vitest — that is a different tier and is untouched here; e2e needs an out-of-process server hitting a real Postgres.
- Auth bypass ([lib/auth.ts:59](lib/auth.ts) `bypassEnabled()`) keys on `AUTH_BYPASS === 'true'` **and** `NODE_ENV !== 'production'`. `next start` forces `NODE_ENV=production`, so the existing bypass cannot survive a faithful (production-build) e2e server.
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `lint`, `typecheck`, `build`, and `test` (vitest + pglite, no DB service). No Playwright in CI.

The sibling repo **`budget_eddiefamily`** solved the same problem and is the precedent the parent §6.0 points at: a `USE_PG_DRIVER` driver-switch in `db/index.ts` (postgres-js, localhost-guarded), `docker-compose.e2e.yml` with committed non-secret creds, `next build && next start`, `drizzle-kit push` for schema, and a postgres-js test client closed in `globalTeardown`. The one structural difference: budget authenticates by **injecting a session cookie** (so one server suffices), whereas Ctrl+List's bypass is **process-wide** — a guest and an authenticated viewer require **separate server processes**.

Owner steer (captured during propose): collapse `AUTH_BYPASS` into `USE_PG_DRIVER` so local mode is one flag, and **separate "auth is bypassed" from "a session exists"** — bypassing auth does not imply a particular logged-in identity. That reframe shapes Decision 2.

## Goals / Non-Goals

**Goals:**

- Make local `npm run dev` and the e2e servers hit a **local Docker Postgres** instead of the metered Neon branch.
- Run e2e against a **production build** (`next start`) so the `'use cache'` / `revalidateTag` layer is genuinely exercised.
- Provide a **reusable two-mode harness** (a session as any seeded user / no session) that 6.1 and 6.2 consume without re-deriving execution mechanics.
- Wire **docker + schema + seed** and **two CI tiers** (fork-safe per-PR + pre-promote migration-replay gate).
- Elevate the execution model into `testing-foundation` as a **Tier 1** delta.

**Non-Goals:**

- Authoring any flow spec (`e2e-critical-flows` is 6.1) or PWA/offline spec (6.2).
- Changing production runtime behavior on Vercel (the neon-http path and real Google auth stay exactly as today).
- Cross-process cache coherence between the two e2e servers (each has its own in-memory tag store) — specs assert same-server or seeded state (aligns with 6.1 Decision 2).
- Touching `vitest.config.ts`, the pglite harness, `db/schema.ts`, or any DAL read / cache tag.
- Switching the production driver to neon-serverless / WebSocket Pool (declined; out of scope).
- Proving the **production migration apply is safe**. The pre-promote gate validates migration *replay* onto a prod-schema branch; the manual SQL run against prod is a different mechanism and is not validated here (Decision 7 scope boundary).

## Decisions

### Decision 1 — Driver-switch (postgres-js behind `USE_PG_DRIVER`) over a neon-http→PG proxy

`db/index.ts` exports `db` typed as `NeonHttpDatabase<typeof schema>`. When `USE_PG_DRIVER === '1'` it instantiates `drizzle-orm/postgres-js` against `DATABASE_URL` and casts to that type; otherwise it instantiates `neon-http` unchanged. Drizzle's query API is identical across drivers for the subset this repo uses (no transactions, no driver-specific helpers), so the cast is type-only narrowing, not a runtime risk. This mirrors budget_eddiefamily verbatim.

**Alternative considered — a neon-http→PG proxy** (keep neon-http everywhere, translate `/sql` HTTP to a local Postgres). **Rejected:** an extra long-running process to build/run/maintain, no precedent in these repos, and it buys fidelity the pre-promote Neon gate (Decision 7) already provides where it matters.

**Trade-off:** postgres-js against local Postgres *supports* transactions and `FOR UPDATE` that neon-http forbids — so a test could pass locally on code that breaks in production. Mitigations: (a) the no-transactions rule means no call site uses them; (b) the exported type stays `NeonHttpDatabase`, so transaction APIs don't typecheck against `db`; (c) the **pre-promote ephemeral-Neon `migrate` gate** re-runs against the real driver before anything reaches prod.

### Decision 2 — Unify on `USE_PG_DRIVER`; separate "bypass" from "session identity"; localhost-guard is the new production guardrail

Two orthogonal concerns that `AUTH_BYPASS` previously conflated:

- **Bypass mode** — "is real Google OAuth off and are sessions synthesized?" → keyed on **`USE_PG_DRIVER === '1'`**. The same flag that points the app at local Postgres also turns off real auth. `AUTH_BYPASS` and the `NODE_ENV !== 'production'` condition are **removed**.
- **Session identity** — "who is logged in, or nobody?" → a separate selector (proposed **`BYPASS_SESSION_USER`**; final name at apply): a seeded user id ⇒ a synthesized session for that user; the literal `guest` (or unset-with-explicit-guest) ⇒ `auth()` resolves to `null` (logged-out). **Default when unset = `dev-test-viewer`**, preserving today's "preview as Test Viewer" with one flag.

Sketch:

```ts
const bypassActive = process.env.USE_PG_DRIVER === '1';            // local mode
const sessionUser  = process.env.BYPASS_SESSION_USER ?? BYPASS_USER_ID;
// auth(): if (bypassActive && args.length === 0)
//   return sessionUser === 'guest' ? null : synthSession(sessionUser);
```

The **localhost-only boot guard in `db/index.ts`** (refuse to start if `USE_PG_DRIVER=1` and `DATABASE_URL` is not localhost) becomes the single production guardrail replacing the `NODE_ENV` check. On Vercel the flag is unset → neon-http + real auth; a misconfigured `USE_PG_DRIVER=1` there fails loudly at boot (outage, never a silent bypass or data leak). This guard is **stronger** than the old one: it positively scopes the bypass to a localhost DB rather than negatively excluding one `NODE_ENV` value.

This directly answers the owner's "do we even want only one logged-in session?" — the seam takes **any** seeded id, so a future cross-user flow (owner observes a friend's claim) is a new project line, not a redesign. 6.0 ships only the two identities 6.1 needs (`dev-test-viewer`, `guest`); resolving display fields for additional seeded users is deferred to the flow that introduces them.

**Alternatives considered:**
- *Two independent flags* (`USE_PG_DRIVER` for DB, a separate bypass flag for auth). **Rejected** per the owner steer — keeps local preview juggling two flags and re-conflates identity with bypass.
- *Cookie/session injection* (budget's approach; leave `lib/auth.ts` untouched). **Rejected:** more moving parts (AUTH_SECRET, JWT encryption, cookie name/salt coupling), diverges from the issue's AUTH_BYPASS framing, and does **not** give the clean orthogonal-identity property the reuse goal wants.
- *Loosen the guard to a `VERCEL`/`NODE_ENV` deploy check.* **Rejected:** a negative exclusion is weaker and easier to get wrong than the positive localhost requirement.

### Decision 3 — `next build && next start` (production) over `next dev`

`next dev` disables much of the fetch/route cache, which would mask the exact `updateTag`/`revalidateTag` invalidation bugs e2e exists to catch. The harness builds a production bundle and serves it with `next start`. Matches budget and the parent §6.0.

**Trade-off:** a production build per run is slow. Mitigations: build **once** per suite run, not per project (Decision 4); `reuseExistingServer` for local iteration; CI eats the cost because it is the only faithful option. **Alternative (`next dev`) rejected** as unfaithful to the cache layer.

### Decision 4 — Two Playwright projects, two webServers, one Docker DB; build once

Because bypass is process-wide there is no per-request seam, so guest vs. authenticated needs two server processes:

- **`authenticated`** — `next start` on (e.g.) port 3100, env `USE_PG_DRIVER=1` ⇒ session = `dev-test-viewer`.
- **`guest`** — `next start` on (e.g.) port 3101, env `USE_PG_DRIVER=1 BYPASS_SESSION_USER=guest` ⇒ no session.

Both point at the **same** Docker Postgres. To avoid building twice, the runner builds the production bundle **once** (`next build`), then each project's `webServer` only runs `next start -p <port>` with its env; per-project `use.baseURL` targets the right port. The harness is built so adding a third project for another seeded identity is a config line.

Cross-process freshness is **not** guaranteed — the two servers hold independent in-memory tag stores, so a write on one is not observed on the other. The spec records this; consuming specs (6.1) assert only same-server or seeded state. **`workers: 1` / `fullyParallel: false`** to start (one server process per project; parallel workers sharing a server could interleave writes against the shared DB) — revisitable once flows exist.

### Decision 5 — `drizzle-kit push` for the sidecar; `drizzle-kit migrate` only at the pre-promote Neon gate

The ephemeral Docker/CI sidecar is schema-from-source: `drizzle-kit push` derives the schema directly from `db/schema.ts` — fast, no migration ordering, ideal for a throwaway DB. Migration **replay** correctness, neon-http HTTP/connection semantics, and driver-divergence are a different question, and the only place they bite is a real Neon Postgres — so they are caught by `drizzle-kit migrate` at the **pre-promote** gate (Decision 7), not on every PR. Two goals, two jobs.

**Alternative — `migrate` everywhere. Rejected:** slower per-PR, and the sidecar (vanilla PG via postgres-js) is not where neon-http migration divergence would surface anyway.

### Decision 6 — Seed-as-fixture runs through the same `USE_PG_DRIVER` path; no separate test-db client

[scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) imports `db` from `@/db`, so invoking it as `USE_PG_DRIVER=1 DATABASE_URL=<docker> npm run db:seed:dev` routes the seed through the postgres-js switch to Docker automatically — reusing the one driver path and the one localhost guard. Unlike budget, Ctrl+List needs **no** separate postgres-js client for factories (the seed *is* the fixture; 6.1 prefers build-own-state / defensive selection), so **no postgres-js pool is opened inside the Playwright process and no `globalTeardown` is required** — the only pools live inside the `next start` servers, which die when Playwright stops them.

### Decision 7 — Two CI tiers

- **Per-PR e2e (fork-safe, no secrets):** ubuntu runner, a `postgres:15` service (or `docker compose -f docker-compose.e2e.yml up`), `npx playwright install --with-deps chromium`, `drizzle-kit push` + seed against the sidecar, then `playwright test` for both projects. Uses only the committed non-secret test creds, so it runs on fork PRs. This is what makes the `openspec/config.yaml` "CI does not currently run Playwright" note obsolete.
- **Pre-promote ephemeral-Neon `migrate` gate (trusted branches only):** on push to `dev` / `release-*.*.x` (or PRs targeting them), where secrets are available: create an ephemeral **branch of the production Neon project** via a `NEON_API_KEY`-class secret, run `drizzle-kit migrate` against the branch, then **reset + re-seed the canonical test fixture** onto it and run a small set of representative DAL reads through the **production `neon-http` driver** (`USE_PG_DRIVER` unset), then delete the branch. Fork PRs **skip** this by design (no secret access). Two clarifications on *why this shape*:
  - **Branch production, not a clean DB.** A Neon branch is a copy-on-write snapshot of production's *actual* schema + applied-migration state, fully isolated (writes/resets never touch prod, branch deleted after). Replaying migrations onto it catches a migration production is *missing* or hand-applied drift — exactly what a from-scratch CI database would hide.
  - **`migrate` ≠ neon-http; the seed-and-read step is.** `drizzle-kit migrate` connects to Postgres **directly**, so by itself it never exercises the production `@neondatabase/serverless` HTTP driver. The reset-seed-read step is what runs queries through that driver — and re-seeding test data first means CI never touches real users' production rows. Together: migration-replay-against-real-schema **and** production-driver divergence, with safe test data.
  - **Scope boundary — this is NOT a prod-apply proof.** The gate validates that the committed migrations *replay* via `drizzle-kit migrate` onto a prod-schema branch. The actual production migration is a **manual SQL run** (a different apply mechanism, with different transaction/statement handling — and per DATABASE.md the no-`BEGIN…COMMIT`-atomicity caveat is exactly where the two can diverge). Proving the manual prod apply is safe is **out of scope for 6.0** and stays a manual responsibility; if it ever warrants automation/validation it is its own change, not this one. The gate's claims are narrowed accordingly so it is not mistaken for that guarantee.

The existing vitest `test` job (pglite, no DB) stays as-is.

**Alternative — one combined job. Rejected:** the per-PR tier must be secret-free to run on forks; the Neon tier must hold a secret. Different trust levels ⇒ different jobs.

### Decision 9 — Local mode is entered through dedicated npm scripts, not hand-set env; the localhost URL has one home

`USE_PG_DRIVER` and the localhost `DATABASE_URL` are always set **together** by purpose-built scripts so a developer never juggles env vars and never trips the boot guard in normal use:

- `dev` → production driver + real Google auth (unchanged).
- `dev:local` → `USE_PG_DRIVER=1` + localhost `DATABASE_URL` + `next dev` ⇒ local Docker DB + bypass (session defaults to `dev-test-viewer`). This replaces the old `AUTH_BYPASS=true` preview ergonomics with one command.
- `test:e2e` (the gated command `openspec/config.yaml` references) is **inherently local**: the Playwright `webServer.env` already sets `USE_PG_DRIVER=1` + the localhost `DATABASE_URL`, so there is no "remote e2e" — `test:e2e` brings up the Docker DB and runs the suite. (A `:local` alias may be added for symmetry with `dev:local`, but the gated name stays `test:e2e`.)

The localhost `DATABASE_URL` SHALL have **one source of truth** shared by the npm scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts` — not repeated as drifting literals (budget_eddiefamily carries it in ~3 places; we do better). Recommended mechanism: a committed, non-secret `.env.e2e` consumed via `dotenv`/`env-cmd` by the scripts and `env_file:` by compose, with `constants.ts` reading the same values — final mechanism chosen at apply. On macOS/Linux the inline `VAR=val next dev` form works directly; if cross-platform is wanted, `cross-env` wraps it.

**Apply-time resolution (Decision 9a).** The single source is the committed file **`e2e/.env`** — a dotenv file scoped to the harness folder, deliberately the canonical `.env` basename (not a bespoke name, not `.env.<x>` cosplaying as a framework-auto-loaded file): it is loaded ONLY by explicit path (Next/compose/dotenv only auto-load the *root* `.env`). Each consumer uses its own **native** loader rather than a hand-rolled parser:
- `docker-compose.e2e.yml` ← `docker compose --env-file e2e/.env up -d --wait` (the `--wait` flag blocks on the service healthcheck, replacing a hand-rolled `pg_isready` loop).
- `e2e/helpers/constants.ts` ← `dotenv.parse(readFileSync('e2e/.env'))` — `parse` (read the value), NOT `dotenv.config` (merge into `process.env`, which defers to an ambient `DATABASE_URL`); the harness needs THIS file's URL deterministically.
- the shell scripts ← `set -a; source e2e/.env; set +a`. `source` is kept over `node/docker --env-file` *on purpose*: those flags do NOT override a variable already in the environment, so an ambient `DATABASE_URL` could silently win and point `drizzle-kit push`/seed at the wrong DB; a shell assignment overrides, forcing the localhost values before any DB mutation.

Secret/committed hygiene follows the documented **`.env*.local` convention** (Next.js/CRA): `.gitignore` is `.env*.local`, so `e2e/.env` (committed config) and `e2e/.env.local` (an ignored local override slot, should one ever be needed) fall on the right sides automatically; real secrets live only in `*.local` files.

Under this model the **localhost boot guard (Decision 1/2) is defense-in-depth** — it catches a hand-set or drifted `USE_PG_DRIVER=1` against a hosted DB, but the scripted path never reaches it.

**Alternative — infer local mode from `DATABASE_URL` being localhost (drop `USE_PG_DRIVER`). Rejected:** `USE_PG_DRIVER` also gates the auth bypass, and silently bypassing auth whenever `DATABASE_URL` happens to be localhost is surprising; an explicit flag, set in lockstep by the scripts, is clearer.

### Decision 8 — Sync the `openspec/config.yaml` `tasks`-rule prose (governance, single-source)

The `tasks` rule prose currently asserts "the `test:e2e` gate is author-run locally — CI does not currently run Playwright" and that CI re-runs only "lint/tsc/build/test:coverage". Because that text is copied into every future change's pre-merge section, it is the single source to correct: after this change, CI runs e2e per-PR. The edit updates the prose (and the matching `testing-foundation` description) without changing the five required gates themselves.

## Risks / Trade-offs

- **[Driver fidelity gap — local PG allows transactions/`FOR UPDATE` the prod driver forbids]** → no-transactions rule (no call site uses them) + `db` stays typed `NeonHttpDatabase` so transaction APIs don't compile + pre-promote `migrate` gate runs against real neon-http.
- **[`USE_PG_DRIVER=1` mis-set in a real environment]** → localhost boot guard refuses to start; loud outage, never a silent bypass or leak.
- **[Removing `AUTH_BYPASS` changes the documented preview workflow and now requires Docker for bypassed preview]** → rewrite `CLAUDE.md`/`README` + the seed header; developers migrate `.env.local` from `AUTH_BYPASS=true` to `USE_PG_DRIVER=1` and run the Docker DB. Surfaced explicitly as a workflow change, not a silent one.
- **[Production build per e2e run is slow]** → build once per run, reuse the server locally; CI accepts the cost as the price of cache fidelity.
- **[Two servers ⇒ no cross-process cache coherence]** → spec documents it; consuming specs assert same-server/seeded state; `workers: 1`.
- **[Pre-promote gate needs a Neon API secret + project access that may not exist yet]** → recorded as an apply-time prerequisite; if absent the gate is added but inactive (or manual) and the owner provisions the secret — it does not block the per-PR tier.
- **[Docker required locally]** → setup script checks for Docker and auto-starts Docker Desktop on macOS (budget precedent), failing with a clear message otherwise.
- **[`postgres` (postgres-js) becomes a statically-imported prod dependency]** → only invoked when the flag is set; lands in `dependencies` (matches budget) since the import is top-level.

## Migration Plan

Additive and test/infra-focused; **no production deploy behavior change**. Apply order:

1. `db/index.ts` — add the `postgres-js` switch + localhost boot guard; add `postgres` to `dependencies`.
2. `lib/auth.ts` — key bypass on `USE_PG_DRIVER`, add the `BYPASS_SESSION_USER` selector (default `dev-test-viewer`, `guest` ⇒ null), remove `AUTH_BYPASS` + the `NODE_ENV` condition.
3. `docker-compose.e2e.yml` + the single-source localhost `DATABASE_URL` (committed `e2e/.env`, Decision 9a) + `e2e/helpers/constants.ts` (committed non-secret config) + the start/teardown/run helper script(s); add the `dev:local` script and wire `test:e2e` (Decision 9).
4. `playwright.config.ts` — build-once, two `next start` projects (authenticated / guest), per-project `baseURL`, `workers: 1`.
5. `.github/workflows/ci.yml` — add the per-PR sidecar e2e job and the pre-promote ephemeral-Neon `migrate` gate.
6. Docs + governance — rewrite `CLAUDE.md`/`README` bypass sections, fix the seed header comment, sync the `openspec/config.yaml` note.
7. Author the **Tier 1** `testing-foundation` delta under `specs/`; at apply/archive roll it into the parent accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`).
8. Run the five-gate pre-merge.

**Rollback:** revert `db/index.ts` + `lib/auth.ts` to the neon-http / `AUTH_BYPASS` state, delete the compose file / helpers / CI e2e jobs, restore the docs. No production code path depends on the new branch unless `USE_PG_DRIVER` is set.

## Open Questions

- **Final name of the session selector** (`BYPASS_SESSION_USER` vs. `E2E_SESSION_USER` vs. `SESSION_USER`) — resolved at apply; it is read by `lib/auth.ts` and set by `playwright.config.ts` only.
- **Per-PR sidecar mechanism** — GitHub Actions `services:` block vs. `docker compose -f docker-compose.e2e.yml` — pick whichever reproduces the local path most exactly at apply time.
- **Activating the pre-promote gate:** decided to branch the **production** Neon project (not a separate one). The gate lands **guarded/inactive** and starts running once the owner adds the `NEON_API_KEY` + `NEON_PROJECT_ID` (production project) secrets — no code change needed to flip it on.
- **Keep or repurpose the `BYPASS_USER_ID` / `BYPASS_USER_EMAIL` exports** in `lib/auth.ts` (still the default identity's source of truth) — decided at apply.
