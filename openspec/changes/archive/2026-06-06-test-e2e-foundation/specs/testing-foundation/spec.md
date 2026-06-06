## ADDED Requirements

### Requirement: E2E and bypassed local dev SHALL run against a local Postgres via the `USE_PG_DRIVER` driver-switch

The application's DB connection (`db/index.ts`) SHALL select its Drizzle driver from the `USE_PG_DRIVER` environment variable: when `USE_PG_DRIVER === '1'` it SHALL use `drizzle-orm/postgres-js` against `DATABASE_URL`; otherwise it SHALL use the production `drizzle-orm/neon-http` driver unchanged. So that repeated runs never consume the metered live Neon branch, the e2e harness and bypassed local development SHALL set `USE_PG_DRIVER=1` and point `DATABASE_URL` at a local Postgres (a Docker container). The exported `db` SHALL remain typed as the neon-http database type so that transaction APIs unavailable in production do not typecheck against it.

Local mode SHALL be entered through dedicated npm scripts (e.g. `dev:local`, and the e2e run) that set `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` **together**, so a developer never hand-sets those variables. The plain scripts (`dev`, and any non-local path) SHALL remain on the production driver + real auth. The localhost `DATABASE_URL` SHALL have a single source of truth shared by the scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts` rather than being repeated as drifting literals. The localhost boot guard below is therefore a defense-in-depth backstop against misconfiguration, not a step in the normal workflow.

This requirement is **Tier 1** (per `test-coverage` design D13): it is cross-cutting test-execution foundation, not carve-out bookkeeping, and rolls into the parent `testing-foundation` accumulator.

#### Scenario: Flag on selects postgres-js against the local DB

- **WHEN** the app boots with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at a localhost Postgres
- **THEN** queries execute against that local Postgres via the postgres-js driver
- **AND** no request is made to the Neon HTTP endpoint

#### Scenario: Flag unset preserves the production driver

- **WHEN** the app boots with `USE_PG_DRIVER` unset (the deployed configuration)
- **THEN** the DB connection uses `drizzle-orm/neon-http` exactly as before this change
- **AND** no postgres-js connection is opened

#### Scenario: Local mode is entered through a dedicated script, not hand-set env

- **WHEN** a developer runs the local-mode npm script (e.g. `dev:local`, or the e2e run)
- **THEN** the script sets both `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` together
- **AND** the app boots in local mode without the developer setting either variable manually

#### Scenario: Non-localhost DATABASE_URL under the flag refuses to boot (backstop)

- **WHEN** `USE_PG_DRIVER=1` is set but `DATABASE_URL` does not point at localhost / `127.0.0.1`
- **THEN** the app throws at startup and refuses to boot
- **AND** no query is issued against the non-local database

### Requirement: Auth bypass SHALL be governed by `USE_PG_DRIVER`, with session identity selected independently

Real Google OAuth and the existence of a session are separate concerns. Whether auth is **bypassed** (real OAuth off, sessions synthesized) SHALL be governed by `USE_PG_DRIVER === '1'` — the same flag that selects the local DB — and SHALL NOT depend on `NODE_ENV` (so a production build via `next start` can still run bypassed locally). The previous `AUTH_BYPASS` flag and the `NODE_ENV !== 'production'` condition SHALL be removed. **Which** session a zero-argument `auth()` returns SHALL be chosen by a separate identity selector (a seeded user id, or the literal value meaning "no session"); the selector SHALL accept any seeded user id rather than being fixed to one identity. When the selector is unset the default identity SHALL be the seeded test viewer (`dev-test-viewer`), preserving the prior preview behavior. The production safety guarantee SHALL be the `USE_PG_DRIVER` localhost boot guard (above), NOT a `NODE_ENV` check. Route-handler / middleware `auth(req, ctx)` overloads SHALL continue to pass through to real NextAuth. This complements — and does not restate — the existing "NextAuth is not invoked against real Google" requirement, which remains the owner of the no-real-OAuth constraint.

#### Scenario: Bypass active, identity unset, yields the default viewer session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector unset
- **THEN** the returned session is the synthesized `dev-test-viewer` session
- **AND** no Google OAuth handshake occurs

#### Scenario: Bypass active, identity set to guest, yields no session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector set to the guest value
- **THEN** `auth()` resolves to `null` (a logged-out request)

#### Scenario: Identity selector is not fixed to a single user

- **WHEN** the identity selector names a seeded user id other than the default
- **THEN** the synthesized session represents that user id
- **AND** the harness does not require code changes to support an additional seeded identity

#### Scenario: Deployed configuration keeps real auth

- **WHEN** the app runs with `USE_PG_DRIVER` unset
- **THEN** zero-argument `auth()` delegates to real NextAuth and the bypass is inert
- **AND** this holds regardless of any other environment variable

### Requirement: E2E SHALL execute against a production build, not the dev server

The e2e harness SHALL run the application as a production build served by `next start`, NOT by `next dev`, so that the `'use cache'` directive and `revalidateTag` / `updateTag` invalidation layer are genuinely exercised. The production bundle SHALL be built once per suite run and reused across the harness's server modes rather than rebuilt per mode.

#### Scenario: Harness serves a production build

- **WHEN** the e2e suite starts its application server(s)
- **THEN** each server runs a `next start` production build (not `next dev`)

#### Scenario: Tag revalidation is observable after a same-server write

- **WHEN** an e2e flow performs a mutation that calls `revalidateTag(...)` and then reloads a page reading the affected tag **on the same server**
- **THEN** the reload reflects the mutation
- **AND** the suite does not rely on `next dev`'s cache behavior to make this true

### Requirement: The harness SHALL provide bypassed and unauthenticated server modes as separate processes

Because the bypass is process-wide (no per-request seam), an authenticated viewer and a logged-out guest SHALL be served by **separate** server processes, exposed as separate Playwright projects sharing one local Docker DB: an authenticated mode (identity = a seeded user) and a guest mode (no session). The harness SHALL be structured so that an additional server mode for a different seeded identity can be added as configuration. Each server process holds its own in-memory cache/tag store, so cross-process freshness is NOT guaranteed; specs consuming this harness SHALL assert only state their own server produced or that the seed established, and SHALL NOT depend on a write made on one server being observed on the other.

#### Scenario: Guest mode reaches a public list with no session

- **WHEN** a spec assigned to the guest project opens a public ("Shared") list by URL
- **THEN** the page renders for the unauthenticated caller
- **AND** no session is present

#### Scenario: Authenticated mode renders a protected page with no sign-in step

- **WHEN** a spec assigned to the authenticated project opens a protected page
- **THEN** the page renders as the seeded identity without any sign-in interaction

#### Scenario: Cross-process observation is not assumed

- **WHEN** a spec writes state on the guest server
- **THEN** it SHALL NOT assert that write is visible on the authenticated server (or vice versa)
- **AND** any owner/observer assertion uses seeded state or same-server state instead

### Requirement: The local e2e database SHALL be schema-applied by `drizzle-kit push` and populated by the canonical seed-as-fixture

The Docker e2e database SHALL receive its schema via `drizzle-kit push` (schema derived directly from `db/schema.ts`, no migration replay), and SHALL be populated by invoking the canonical seed (`scripts/seed-dev-users.ts`) through the same `USE_PG_DRIVER` path (`USE_PG_DRIVER=1 DATABASE_URL=<local> ...`) so the seed reaches the local DB via the one driver-switch. Before the e2e suite runs, the database SHALL be reset to the canonical fixture — `db:reset:dev`, which cascade-wipes seeded-owned rows then reseeds — so every run starts from a byte-identical known state regardless of any prior run's writes on a persisted database. The shared bring-up (`setup-e2e-db.sh`) SHALL apply schema only and SHALL NOT itself reset: the data-state step belongs to each caller, so `dev:local` seeds without wiping (preserving UI-created rows; reset there stays the explicit `db:reset:dev` opt-in) while `test:e2e` resets. The container's credentials SHALL be committed, non-secret, localhost-bound test values.

#### Scenario: Schema applied from source via push

- **WHEN** the e2e database is prepared
- **THEN** its schema is applied with `drizzle-kit push` from `db/schema.ts`
- **AND** the run does not depend on replaying the committed migration files

#### Scenario: Seed reaches the local DB through the driver-switch

- **WHEN** the seed is invoked with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at the local container
- **THEN** the seeded fixture rows are written to the local Postgres
- **AND** no separate test-only DB client is required to seed it

#### Scenario: The e2e suite starts from a deterministic reset

- **WHEN** the e2e run is prepared (`test:e2e`)
- **THEN** the database is reset to the canonical fixture (cascade wipe + reseed) before any spec executes
- **AND** the starting state does not depend on rows written by a prior run on a persisted database

#### Scenario: Local dev bring-up preserves UI-created rows

- **WHEN** `dev:local` brings up the local database
- **THEN** it seeds the canonical fixture without wiping
- **AND** rows a developer created through the UI survive the restart (reset stays the explicit `db:reset:dev` opt-in)

### Requirement: CI SHALL run e2e in a fork-safe per-PR tier and a secret-bearing pre-promote migration tier

Continuous integration SHALL run the Playwright e2e suite in two tiers: (1) a **per-PR** job that stands up a local Postgres sidecar, applies schema via `drizzle-kit push`, resets to the canonical fixture (cascade wipe + reseed), and runs the suite using only committed non-secret test credentials — so it runs on fork pull requests; and (2) a **pre-promote** job on trusted branches that creates an **ephemeral branch of the production Neon project** (copy-on-write — production data and schema are never mutated, and the branch is deleted afterward), runs `drizzle-kit migrate` against that branch, then resets and re-seeds the canonical test fixture onto it and exercises a representative set of DAL reads through the **production `neon-http` driver** (`USE_PG_DRIVER` unset). Branching production rather than a from-scratch database is deliberate: it validates the pending migrations against production's *actual* applied-migration state and schema, catching a migration production is missing or hand-applied drift that a clean database cannot surface; seeding test data first ensures CI never reads real users' production data. This tier is the sole CI guard for migration-replay correctness against the real schema and for production-driver (`neon-http`) divergence. It validates migration *replay* via `drizzle-kit migrate`; it SHALL NOT be construed as validating the production migration-apply mechanism itself (e.g. a manual SQL run against production), which uses a different apply path and is outside this capability's scope. It requires a Neon API secret and SHALL be skipped where that secret is unavailable (e.g. fork PRs). Once the per-PR tier exists, the descriptive note in `openspec/config.yaml` and this capability stating "CI does not currently run Playwright" SHALL be corrected.

#### Scenario: Per-PR e2e runs without secrets

- **WHEN** a pull request (including one from a fork) triggers CI
- **THEN** the per-PR e2e job runs the suite against a sidecar Postgres using only committed non-secret credentials
- **AND** it does not require any repository secret

#### Scenario: Pre-promote gate validates migrations against the production schema

- **WHEN** a push targets a promotion branch (e.g. `dev` or a `release-*.*.x` release branch) with the Neon API secret available
- **THEN** CI creates an ephemeral branch of the production Neon project, runs `drizzle-kit migrate` against it, then re-seeds the test fixture and reads through the `neon-http` driver, and deletes the branch
- **AND** a migration that fails to replay against the production schema, or a read that fails through the production driver, fails the gate
- **AND** production data and schema are never mutated

#### Scenario: Pre-promote gate is skipped without the secret

- **WHEN** CI runs in a context lacking the Neon API secret (e.g. a fork PR)
- **THEN** the pre-promote migration gate is skipped rather than failing
- **AND** the per-PR e2e tier still runs
