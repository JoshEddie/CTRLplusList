/**
 * Pins `profiles-data-model`'s spoiler-tier reshaping against a real database
 * with every migration replayed: the tier moved off `profile_members` (no
 * columns there) into `profile_preferences`, which gained a nullable account
 * key so one row can be profile-wide (user_id NULL) or per-member (user_id
 * set), and the `spoiler_tier` catalog row the migration registers.
 */
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { bootPglite } from '@/test/helpers/db';

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

let db: TestDb;

// No `resetDb`: every assertion here is structural or reads the catalog row the
// migration inserts, and a TRUNCATE would wipe that row. Each test writes under
// its own ids so nothing leaks between them.
beforeAll(async () => {
  ({ db } = await bootPglite());
});

describe('spoilerVisibilityMigration', () => {
  it('ProfilePreferencesUserId_LandsNullable', async () => {
    const result = await db.execute(
      sql.raw(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_name = 'profile_preferences' AND column_name = 'user_id'`
      )
    );
    expect(result.rows).toEqual([{ is_nullable: 'YES' }]);
  });

  it('ProfileMembersTable_CarriesNoSpoilerColumn', async () => {
    const result = await db.execute(
      sql.raw(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'profile_members' AND column_name LIKE '%spoiler%'`
      )
    );
    expect(result.rows).toEqual([]);
  });

  it('SpoilerTierCatalogRow_IsRegisteredAsText', async () => {
    const result = await db.execute(
      sql.raw(
        `SELECT id, type FROM preferences WHERE id = 'spoiler_tier'`
      )
    );
    expect(result.rows).toEqual([{ id: 'spoiler_tier', type: 'text' }]);
  });

  // A pre-existing preference row is a null-account, profile-wide value. It must
  // still satisfy the reshaped table (nullable account, the profile-wide partial
  // unique index) rather than being rejected by the new constraints.
  it('ProfileWideRowWithNullAccount_StaysValid', async () => {
    await db.execute(
      sql.raw(
        `INSERT INTO "profiles" ("id", "name") VALUES ('mig-prof', 'Mig')`
      )
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "profile_preferences" ("profile_id", "user_id", "preference_id", "value")
         VALUES ('mig-prof', NULL, 'spoiler_tier', 'claims')`
      )
    );

    const result = await db.execute(
      sql.raw(
        `SELECT value, user_id FROM "profile_preferences" WHERE profile_id = 'mig-prof'`
      )
    );
    expect(result.rows).toEqual([{ value: 'claims', user_id: null }]);
  });
});
