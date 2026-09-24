/**
 * Pre-promote migration replay. Equivalent to `drizzle-kit migrate` (direct
 * TCP, not the production neon-http path) but surfaces the real Postgres error
 * on failure — drizzle-kit's spinner clears the line before exit, so a failing
 * replay shows up in CI as a bare "exit code 1" with no SQL context. Used by
 * the pre-promote-migrate gate; see .github/workflows/ci.yml.
 *
 * Production is migrated by hand, so its branch carries no Drizzle ledger. With
 * BASE_REF set, the ledger is seeded at the base commit's newest journal entry:
 * everything the base already shipped is on production, and only migrations
 * added since then replay.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function seedLedgerFromBase(sql: postgres.Sql, baseRef: string): Promise<void> {
  const journal = JSON.parse(
    execFileSync('git', ['show', `${baseRef}:drizzle/meta/_journal.json`], { encoding: 'utf8' }),
  ) as { entries: { when: number }[] };
  const latest = Math.max(...journal.entries.map((e) => e.when));
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${`base:${baseRef}`}, ${latest})`;
}

async function main(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1 });
  try {
    if (process.env.BASE_REF) await seedLedgerFromBase(sql, process.env.BASE_REF);
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
    console.log('Migrations replayed cleanly.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Migration replay failed:');
  console.error(err);
  process.exit(1);
});
