/**
 * Pre-promote migration replay. Equivalent to `drizzle-kit migrate` (direct
 * TCP, not the production neon-http path) but surfaces the real Postgres error
 * on failure — drizzle-kit's spinner clears the line before exit, so a failing
 * replay shows up in CI as a bare "exit code 1" with no SQL context. Used by
 * the pre-promote-migrate gate; see .github/workflows/ci.yml.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1 });
  try {
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
