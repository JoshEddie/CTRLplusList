import { neon } from '@neondatabase/serverless';
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// Neon HTTP driver (production). NO INTERACTIVE TRANSACTIONS — every query is
// its own HTTP round-trip with its own connection, so `db.transaction(...)`,
// `SELECT … FOR UPDATE`, and any multi-statement atomicity primitive are
// unavailable here. Cross-statement atomicity must be backstopped at the DB
// layer (unique indexes, partial unique indexes, `ON CONFLICT`) or accepted
// as residual. Switching to `drizzle-orm/neon-serverless` (WebSocket Pool)
// to gain transactions has been considered and declined — do not reintroduce
// without explicit owner approval. See CLAUDE.md "Database driver: no
// transactions" for the long-form note.
//
// E2E / local-dev carve-out: when `USE_PG_DRIVER === '1'` the app talks to a
// vanilla localhost Postgres (the Docker container in docker-compose.e2e.yml)
// through `postgres-js` instead — the Neon HTTP driver speaks Neon's HTTP
// `/sql` protocol and cannot connect to plain Postgres. This flag is set ONLY
// by the local-dev / e2e npm scripts (which also point DATABASE_URL at
// localhost); it is NEVER set in a real environment.
const useLocalPostgres = process.env.USE_PG_DRIVER === '1';

// Production safety invariant (replaces the former `NODE_ENV` auth-bypass
// guard): the local driver is permitted ONLY against localhost. A drifted or
// hand-set `USE_PG_DRIVER=1` pointed at a hosted DB refuses to boot here
// rather than connecting production traffic to the wrong database — a loud
// outage, never a silent bypass or data leak.
if (useLocalPostgres) {
  // Match the host exactly, not a substring: a hosted URL like
  // `localhost.attacker.com` (or `localhost` buried in a password) must NOT
  // satisfy the guard. A malformed URL parses to '' and is rejected — the safe
  // direction (refuse to boot rather than risk a non-local connection).
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return '';
    }
  })();
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      'USE_PG_DRIVER=1 requires DATABASE_URL to point at localhost. Refusing to boot.'
    );
  }
}

// Type-only narrowing across drivers: the postgres-js Drizzle instance is
// structurally compatible with NeonHttpDatabase for the query subset this repo
// uses (no transactions, no driver-specific helpers), so the exported `db`
// keeps one stable type and every call site compiles against the production
// Neon shape. Not a runtime cast.
const localDb = useLocalPostgres
  ? (drizzlePg(postgres(process.env.DATABASE_URL!), {
      schema,
      casing: 'snake_case',
    }) as unknown as NeonHttpDatabase<typeof schema>)
  : null;

export const db: NeonHttpDatabase<typeof schema> =
  localDb ??
  drizzleNeon({
    client: neon(process.env.DATABASE_URL!),
    schema,
    casing: 'snake_case',
  });
