# End-to-end tests

Playwright e2e suite. It runs the app as a **production build** (`next start`)
against a **local Docker Postgres**, with Google OAuth **bypassed** — so specs
exercise the real `'use cache'` / `revalidateTag` layer without a sign-in or the
metered Neon branch.

This folder is the execution **foundation** (the harness). Flow specs are added
by the downstream `test-e2e-critical-flows` / `test-e2e-pwa-offline` changes.

## Quick start

```bash
npm run test:e2e          # bring up the Docker DB, build once, run every project
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
it. Examples worth knowing: `dev-test-viewer` is the authenticated identity and is
seeded **onboarded** (its self-profile carries Altvatar art), so every `*.auth`
spec renders the application rather than the gate;
`dev-list-viewer-anniversary` is a `LINK`-visibility (URL-open) list;
`dev-unonboarded-signup` and `dev-unonboarded-existing` are the two accounts
deliberately left un-onboarded, one per arm of the gate's latch.

**The two manager seats are not interchangeable.** `dev-profile-workshop`
("Workshop Profile") is the seat a manager flow writes on — it exists for that,
because a manager may create lists and items and delete neither, so nothing the
flow writes can be cleaned up. `dev-profile-managed` ("Managed Profile") carries
two fixtures a single write destroys — the NULL `last_active_at` that is the
never-acted-as ordering branch, and its empty list set — so **no spec may write
on it or switch to it**. The full seeded profile set is in
[docs/local-dev.md](../docs/local-dev.md).

**A fourth managed seat carries the claim-visibility fixture.**
`dev-profile-visibility` ("Visibility Profile") exists only so an owner
(`dev-friend-bob`) can write the viewer's baseline without racing another spec.
Workshop cannot serve: the reorder layout turns on the tier, so raising the
viewer's Workshop baseline would race `roles-manager.auth.spec` for the window
it is raised.

**One seat carries a raised claim-visibility tier.** The baseline is a single
tier (`surprise` → `progress` → `claims`) stored as an
account-keyed `profile_preferences` row `(profile_id, user_id, spoiler_tier)`.
An absent row resolves to `surprise` (`PROTECTED_TIER`), so every seat resolves
to the fully protected state by default — the only seeded tier rows are on
`dev-profile-owned`: the viewer at `claims`, and `dev-friend-alice` pinned
explicitly at `surprise`. A spec that needs a claim disclosed without first
operating the Claims control switches to Owned Profile; a spec that needs the
protected view uses any other seat. `dev-list-owned-wishlist` carries one claim
of each shape the tiers render differently (another party's, the viewer's own,
and one recorded on someone's behalf).

### Auth bypass

The bypass is governed by **`USE_PG_DRIVER=1`** (the same flag that points the
DB driver at local Postgres — see `db/index.ts` and `lib/auth.ts`). **Which**
session a zero-arg `auth()` returns is chosen by **`BYPASS_SESSION_USER`**:
unset ⇒ `dev-test-viewer`; the literal `guest` ⇒ `null` (logged out); any other
seeded id ⇒ that user. The bypass is scoped to a localhost DB by the boot guard
in `db/index.ts`, so it can never activate against a hosted database.

### Four projects, five servers, one DB

The bypass is process-wide (no per-request seam), so each identity a spec needs
to be needs its **own server process**:

| Project                | Port | `BYPASS_SESSION_USER`       | Session                     | Spec suffix           |
| ---------------------- | ---- | --------------------------- | --------------------------- | --------------------- |
| `authenticated`        | 3100 | _(unset)_                   | `dev-test-viewer`           | `*.auth.spec.ts`      |
| `guest`                | 3101 | `guest`                     | none                        | `*.guest.spec.ts`     |
| `onboarding-signup`    | 3102 | `dev-unonboarded-signup`    | account holding no profile  | `*.signup.spec.ts`    |
| `onboarding-existing`  | 3103 | `dev-unonboarded-existing`  | self-profile with no art    | `*.existing.spec.ts`  |
| _(no project)_         | 3104 | `dev-friend-bob`            | the invite recipient        | reached by absolute URL |

The fifth server carries no project of its own. Admission spans two accounts by
definition — one mints, another redeems — and a Playwright test belongs to a
single project, so `invite-roundtrip.auth.spec.ts` runs as the viewer and
reaches the recipient's server by absolute URL.

The two onboarding modes meet `onboarding-gate` instead of the application. The
latch is one-shot per seeded database — art, once written, cannot be unwritten
by any affordance — so their specs **submit nothing and confirm nothing**. What
onboarding writes is covered over the actions in unit tests instead.

`scripts/test-e2e.sh` runs `next build` **once** before Playwright starts; each
project's `webServer` then only runs `next start`. The build lives in the script
(not `globalSetup`) because Playwright starts the `webServer` during plugin setup
— before `globalSetup` runs — so a build there would race the servers that need
it and fail on a clean tree / in CI. `workers: 1` / `fullyParallel: false`
because the servers share one DB and each holds its own in-memory tag store.

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

1. Name the file for its project: `<flow>.auth.spec.ts` (authenticated),
   `<flow>.guest.spec.ts` (guest), or `<flow>.signup.spec.ts` /
   `<flow>.existing.spec.ts` (the un-onboarded modes).
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

See `.github/workflows/ci.yml`.
