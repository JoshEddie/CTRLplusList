import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '../../../../../db/schema';

const MIGRATIONS_DIR = resolve(__dirname, '../../../../../drizzle');

export type PgliteDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Boot an in-memory pglite instance and apply the production migration SQL
 * verbatim. Returns a Drizzle handle bound to the same schema the production
 * neon-http driver uses, so DAL queries / inserts can be exercised against it.
 */
export async function bootPglite(): Promise<{
  db: PgliteDb;
  client: PGlite;
}> {
  const client = await PGlite.create();

  const sqlFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of sqlFiles) {
    const raw = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.exec(stmt);
      } catch (err) {
        throw new Error(
          `[setup-pglite] migration ${file} failed on statement:\n${stmt}\n${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  const db = drizzle(client, { schema, casing: 'snake_case' });
  return { db, client };
}
