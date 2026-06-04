# End-to-end tests

Playwright e2e suite. It runs the app as a **production build** (`next start`)
against a **local Docker Postgres**, with Google OAuth **bypassed** — so specs
exercise the real `'use cache'` / `revalidateTag` layer without a sign-in or the
metered Neon branch.

This folder is the execution **foundation** (the harness). Flow specs are added
by the downstream `test-e2e-critical-flows` / `test-e2e-pwa-offline` changes.

## Quick start

```bash
npm run test:e2e          # bring up the Docker DB, build once, run both projects
npm run test:e2e:ui       # ...in Playwright's interactive UI
npm run test:e2e:clean    # ...and tear the DB container down when done
npx playwright test       # run directly once the DB is already up (fast iteration)
```

Need to combine options or target a file? Everything after `--` passes through
to `playwright test`, e.g. `npm run test:e2e -- harness.guest.spec.ts --headed`.

For manual, browser-driven preview against the same local DB + bypass:

```bash
npm run dev:local         # brings up + seeds the DB, then `next dev` as dev-test-viewer
```

**Docker is a prerequisite** (Docker Desktop on macOS — the scripts auto-start it).

## How it works

### Local database

A throwaway `postgres:15` container (`docker-compose.e2e.yml`) bound to
localhost:5434. `scripts/setup-e2e-db.sh` starts it (`docker compose up --wait`),
applies the schema with `drizzle-kit push` (straight from `db/schema.ts`, no
migration replay), and seeds it.

### Seed-as-fixture

`scripts/seed-dev-users.ts` is the canonical fixture — specs assert against the
entities it creates (`dev-test-viewer`, the friend graph, their lists/items).
**Editing the seed is a breaking change to this suite**: any change to a seeded
entity's identity or visibility must come with a review of the specs that touch
it. Examples worth knowing: `dev-test-viewer` is the authenticated identity;
`dev-list-viewer-anniversary` is a `LINK`-visibility (URL-open) list.

### Auth bypass

The bypass is governed by **`USE_PG_DRIVER=1`** (the same flag that points the
DB driver at local Postgres — see `db/index.ts` and `lib/auth.ts`). **Which**
session a zero-arg `auth()` returns is chosen by **`BYPASS_SESSION_USER`**:
unset ⇒ `dev-test-viewer`; the literal `guest` ⇒ `null` (logged out); any other
seeded id ⇒ that user. The bypass is scoped to a localhost DB by the boot guard
in `db/index.ts`, so it can never activate against a hosted database.

### Two projects, two servers, one DB

The bypass is process-wide (no per-request seam), so an authenticated viewer and
a guest need **separate server processes**:

| Project         | Port | `BYPASS_SESSION_USER` | Session         | Spec suffix       |
| --------------- | ---- | --------------------- | --------------- | ----------------- |
| `authenticated` | 3100 | _(unset)_             | `dev-test-viewer` | `*.auth.spec.ts`  |
| `guest`         | 3101 | `guest`               | none            | `*.guest.spec.ts` |

`e2e/helpers/global-setup.ts` runs `next build` **once**; each project's
`webServer` then only runs `next start`. `workers: 1` / `fullyParallel: false`
because the two servers share one DB and each holds its own in-memory tag store.

> **Cross-process freshness is NOT guaranteed.** A write on one server is not
> observed on the other. Specs SHALL assert only state their own server produced
> or that the seed established — never a write made on the other server.

## Configuration

- **`e2e/.env`** — committed, **non-secret** single source of the localhost DB
  connection (creds + port + `DATABASE_URL`). Loaded by the scripts (`source`),
  docker-compose (`--env-file`), and `constants.ts` (`dotenv.parse`). It is the
  canonical `.env` basename but scoped here; secrets only ever live in `*.local`
  files (gitignored per `.env*.local`).
- **`e2e/helpers/constants.ts`** — per-mode ports + base URLs, the stubbed
  (never-negotiated) Google OAuth creds, and the parsed `E2E_DATABASE_URL`.

## Writing a spec

1. Name the file for its project: `<flow>.auth.spec.ts` (authenticated) or
   `<flow>.guest.spec.ts` (guest).
2. Name each test `<PageOrFlow>_<Action>_<ExpectedOutcome>` — three PascalCase
   parts (e.g. `PublicList_GuestOpensLinkListByUrl_RendersWithoutSession`).
3. Assert against seeded state or same-server state only.

The two specs already here (`harness.auth.spec.ts`, `harness.guest.spec.ts`) are
the harness self-tests — minimal proofs that each mode renders.

## CI

- **Per-PR (fork-safe, no secrets):** runs this suite against a Postgres sidecar
  using only the committed `e2e/.env` creds.
- **Pre-promote (trusted branches):** branches the production Neon project
  (copy-on-write), replays `drizzle-kit migrate`, re-seeds, and smoke-reads
  through the production `neon-http` driver.

See `.github/workflows/ci.yml` and the `testing-foundation` capability spec.
