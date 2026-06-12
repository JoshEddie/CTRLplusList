/**
 * Pre-promote neon-http driver smoke. Runs a handful of representative reads
 * through the PRODUCTION driver (USE_PG_DRIVER unset ⇒ @neondatabase/serverless
 * HTTP) against an ephemeral, re-seeded branch of the production Neon project —
 * so a read the postgres-js e2e sidecar tolerates but neon-http rejects fails
 * CI before promotion.
 *
 * This NEVER touches real production rows: the GitHub job resets + re-seeds the
 * canonical fixture onto a copy-on-write branch first (see
 * .github/workflows/ci.yml and design Decision 7). It validates migration
 * *replay* + driver divergence, NOT the manual prod SQL apply.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';

import { db } from '../../db';
import { lists, users } from '../../db/schema';

const VIEWER_ID = 'dev-test-viewer';

async function main(): Promise<void> {
  if (process.env.USE_PG_DRIVER === '1') {
    throw new Error(
      'Smoke must run through the neon-http driver (USE_PG_DRIVER must be unset).'
    );
  }

  const viewer = await db.query.users.findFirst({
    where: eq(users.id, VIEWER_ID),
  });
  if (!viewer) {
    throw new Error('Seed missing: dev-test-viewer not found through neon-http.');
  }

  const viewerLists = await db
    .select({ id: lists.id })
    .from(lists)
    .where(eq(lists.user_id, VIEWER_ID));
  if (viewerLists.length === 0) {
    throw new Error('Seed missing: no viewer lists read through neon-http.');
  }

  console.log(
    `✅ neon-http smoke OK: viewer=${viewer.id}, viewer lists=${viewerLists.length}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
