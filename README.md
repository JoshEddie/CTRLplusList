# CTRLplusList

A family gift-list app. Owners curate lists of items they want; family members claim
purchases, bookmark each other's lists, and follow each other so updates surface on
their home digest. Built on Next.js App Router with NextAuth (Google OAuth), Neon
Postgres (HTTP driver) + Drizzle, and a Serwist-backed PWA shell.

## Prerequisites

- Node.js — current Active LTS (Node 20+). The CI runtime matches the version
  declared in `package.json` `engines` (if absent, use the active LTS).
- A Neon Postgres database (or any Postgres reachable from the Neon HTTP driver).
- Google OAuth credentials for NextAuth — see
  https://console.cloud.google.com/apis/credentials.

## Setup

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd list_eddiefamily_com
   npm install
   ```
2. Copy the environment template and fill in real values:
   ```bash
   cp .env.example .env.local
   ```
   Every key in `.env.example` corresponds to a `process.env.*` reference in the
   codebase. The file documents required vs optional and accepted values.
3. Apply schema migrations:
   ```bash
   npm run db:migrate
   ```
   Review generated SQL before running in any environment other than your own
   dev database — see `docs/database.md` ("Migrations") for the workflow.
4. Seed dev data (optional, recommended):
   ```bash
   npm run db:seed:dev
   ```
   Creates `dev-test-viewer` plus four mutual-follow friends with public lists,
   items, purchases, and visit history. Idempotent. Refuses to run when
   `NODE_ENV=production`.
5. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

### Local dev auth bypass

To validate UI changes through preview tooling without a real Google sign-in,
run `npm run dev:local` instead of `npm run dev`. It sets `USE_PG_DRIVER=1`,
which points the app at a localhost Docker Postgres **and** synthesizes
sessions (no real OAuth) — zero-arg `await auth()` then returns a mock session
for `dev-test-viewer`. The `BYPASS_SESSION_USER` env var selects the identity
(`guest` ⇒ no session; any other seeded id ⇒ that user). Docker is a
prerequisite. The bypass is scoped to a localhost `DATABASE_URL` by a boot
guard in `db/index.ts`, so it can never activate against a hosted database.
See `docs/local-dev.md`.

To reset after local drift:

```bash
npm run db:reset:dev
```

Restart the dev server after seeding or resetting — many DAL functions are
tagged with `'use cache'` and the seed script runs outside the Next.js
process.

## Build & deploy

```bash
npm run build
```

The `build` script invokes `next build --webpack` — a deliberate Turbopack
opt-out, see [ADR-0011](docs/adr/0011-webpack-opt-out-for-serwist.md).

Deployment target is Vercel. The PWA manifest, service worker, and offline
assets are emitted by Serwist at build time and disabled in dev mode (see
`next.config.ts`).

## Workflow & conventions

- `CLAUDE.md` — hard rules and a pointer table into `docs/`.
- `CONTEXT.md` — the domain glossary: what each term means right now.
- `docs/adr/` — why things are built the way they are.
- `docs/` — database, testing, local dev, code style, abstraction, UI
  conventions, and the landing workflow.

## License

See `LICENSE` if present, otherwise contact the maintainer.
