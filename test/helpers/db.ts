import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as schema from '../../db/schema';

type Journal = {
  entries: { idx: number; tag: string }[];
};

const REPO_ROOT = resolve(__dirname, '..', '..');
const DRIZZLE_DIR = resolve(REPO_ROOT, 'drizzle');

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
