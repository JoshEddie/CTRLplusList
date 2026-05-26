import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Neon HTTP driver. NO INTERACTIVE TRANSACTIONS — every query is its own HTTP
// round-trip with its own connection, so `db.transaction(...)`,
// `SELECT … FOR UPDATE`, and any multi-statement atomicity primitive are
// unavailable here. Cross-statement atomicity must be backstopped at the DB
// layer (unique indexes, partial unique indexes, `ON CONFLICT`) or accepted
// as residual. Switching to `drizzle-orm/neon-serverless` (WebSocket Pool)
// to gain transactions has been considered and declined — do not reintroduce
// without explicit owner approval. See CLAUDE.md "Database driver: no
// transactions" for the long-form note.
export const db = drizzleNeon({
  client: neon(process.env.DATABASE_URL!),
  schema,
  casing: 'snake_case',
});
