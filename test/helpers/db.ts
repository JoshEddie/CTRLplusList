import { PGlite } from '@electric-sql/pglite';
import { getTableName, is, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { PgTable } from 'drizzle-orm/pg-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as schema from '../../db/schema';

type Journal = {
  entries: { idx: number; tag: string }[];
};

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const REPO_ROOT = resolve(__dirname, '..', '..');
const DRIZZLE_DIR = resolve(REPO_ROOT, 'drizzle');

// Every schema table, derived once from `db/schema.ts` so a newly added table
// is reset automatically and no caller maintains a TRUNCATE table-name literal.
// `schema` also exports `relations()` objects, so filter to real tables; the
// `unknown[]` cast lets the `PgTable` predicate narrow the heterogeneous union.
export const SCHEMA_TABLES = (Object.values(schema) as unknown[]).filter(
  (value): value is PgTable => is(value, PgTable)
);

const TABLE_NAMES = SCHEMA_TABLES.map((table) => getTableName(table));

// Booting + replaying every migration is the dominant per-test cost (2.4–5.0s);
// under `pool: 'forks'` doing it per `it()` starves hooks and flakes the suite
// (issue #97). Boot ONCE PER FILE (in `beforeAll`) and reset rows between tests
// with `resetDb` — never call `bootPglite` inside an `it()` or `beforeEach`.
export async function bootPglite() {
  const raw = new PGlite();
  await raw.waitReady;

  const journal = JSON.parse(
    readFileSync(resolve(DRIZZLE_DIR, 'meta', '_journal.json'), 'utf-8')
  ) as Journal;

  const ordered = [...journal.entries].sort((a, b) => a.idx - b.idx);
  for (const entry of ordered) {
    const sqlPath = resolve(DRIZZLE_DIR, `${entry.tag}.sql`);
    const contents = readFileSync(sqlPath, 'utf-8');
    const statements = contents
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await raw.exec(statement);
    }
  }

  const db = drizzle(raw, { schema, casing: 'snake_case' });
  return { db, raw };
}

// Per-test isolation for the boot-once-per-file pattern: clears every schema
// table in one statement. CASCADE drops dependents, RESTART IDENTITY resets
// sequences so identity columns don't drift across tests.
export async function resetDb(db: TestDb) {
  const quoted = TABLE_NAMES.map((name) => `"${name}"`).join(', ');
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
  );
}
