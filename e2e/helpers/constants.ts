import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// E2E test configuration. Everything here is a deliberately-committed
// NON-SECRET: the database is a throwaway Docker container bound to localhost,
// and the stubbed auth values exist only within an e2e run. They are committed
// (not hidden in a gitignored env file) so reviewers can see them in the diff.

// Single source of truth for the localhost DB connection is `e2e/.env` — also
// read by the npm helper scripts (sourced) and docker-compose.e2e.yml
// (--env-file). Parsed here so the URL is never duplicated as a drifting
// literal. We use `dotenv.parse` (read the file's value directly), NOT
// `dotenv.config` (which merges into process.env and defers to an ambient
// DATABASE_URL): the harness must use THIS file's URL deterministically,
// regardless of what the surrounding shell has set. Read from the repo root
// (Playwright and the npm scripts both run there) rather than __dirname, which
// differs across Playwright's loader.
const e2eEnv = parse(readFileSync(resolve(process.cwd(), 'e2e/.env')));
if (!e2eEnv.DATABASE_URL) {
  throw new Error('e2e/.env is missing DATABASE_URL');
}
export const E2E_DATABASE_URL = e2eEnv.DATABASE_URL;

// Per-mode app server ports + base URLs. Only Playwright consumes these, so
// TypeScript is their home (the DB port lives in e2e/.env because the scripts
// and compose need it too). Two ports because the process-wide auth bypass
// needs one `next start` per mode. Non-secrets.
export const AUTH_PORT = 3100;
export const GUEST_PORT = 3101;
export const AUTH_BASE_URL = `http://localhost:${AUTH_PORT}`;
export const GUEST_BASE_URL = `http://localhost:${GUEST_PORT}`;

// The session-identity selector value meaning "no session" (guest mode).
// Mirrors GUEST_SESSION_USER in lib/auth.ts (kept as a separate literal to
// avoid importing the NextAuth/DB module graph into the Playwright config).
export const GUEST_SESSION_USER = 'guest';

// Stubbed Google OAuth creds + auth secret so the production `next start`
// server boots — real OAuth is never negotiated under the USE_PG_DRIVER
// bypass, but NextAuth reads these at runtime.
export const E2E_AUTH_SECRET = 'e2e-test-secret-not-for-prod';
export const E2E_AUTH_GOOGLE_ID = 'e2e-unused';
export const E2E_AUTH_GOOGLE_SECRET = 'e2e-unused';
