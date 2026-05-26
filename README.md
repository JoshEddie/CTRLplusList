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
   dev database — see `CLAUDE.md` ("Database migrations") for the workflow.
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

### Dev auth bypass

To validate UI changes through preview tooling without a real Google sign-in,
set `AUTH_BYPASS=true` in `.env.local` after seeding. Zero-arg `await auth()`
calls then return a mock session for `dev-test-viewer`. The bypass is refused
when `NODE_ENV=production`. See `CLAUDE.md` ("Dev auth bypass for preview
verification").

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
opt-out required by `@serwist/next` 9.5 (the PWA service-worker integration).
When Serwist supports Turbopack, drop the `--webpack` flag and remove this
note.

Deployment target is Vercel. The PWA manifest, service worker, and offline
assets are emitted by Serwist at build time and disabled in dev mode (see
`next.config.ts`).

## Workflow & conventions

- `CLAUDE.md` — project conventions, database driver caveats, dev auth bypass,
  and the database-migration workflow.
- `openspec/specs/` — active capability specs (the contract surface).
- `openspec/changes/` — proposals, design notes, and archived changes. The
  `/opsx:propose`, `/opsx:apply`, and `/opsx:archive` slash commands manage
  the lifecycle. Architectural decisions for this project live here — there
  is no separate `docs/adr/` directory.

## License

See `LICENSE` if present, otherwise contact the maintainer.
