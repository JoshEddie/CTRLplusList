/**
 * Pins `altvatar`'s save-path SHALL: the stored rendering is derived on the
 * server from the selections that survived the whitelist, never taken from the
 * payload. The submitted-art test is the security leg — it must fail if the
 * guard is removed.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { profile_avatars } from '@/db/schema';
import { renderAltvatar } from '@/lib/altvatar/render';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers, selfProfileOf } from '@/test/helpers/seedFollowGraph';
import { eq } from 'drizzle-orm';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const OWNER = { id: 'owner', email: 'owner@test.local' };
const PROFILE = selfProfileOf(OWNER.id);

const input = {
  style: 'avataaars',
  options: { seed: 'fixed-seed', selections: { hair: 'bob' } },
};

let db: TestDb;
let writeAltvatar: typeof import('@/lib/data/profileAvatar.write').writeAltvatar;
let updateTag: ReturnType<typeof vi.fn>;

async function avatarRow() {
  const [row] = await db
    .select()
    .from(profile_avatars)
    .where(eq(profile_avatars.profile_id, PROFILE));
  return row;
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  ({ writeAltvatar } = await import('@/lib/data/profileAvatar.write'));
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER]);
  updateTag.mockClear();
});

describe('writeAltvatar', () => {
  describe('ServerSideDerivation', () => {
    it('PayloadCarriesItsOwnRendering_PersistsTheServersArtInstead', async () => {
      const forged = '<svg onload="steal()" />';
      expect(
        await writeAltvatar(PROFILE, { ...input, art: forged } as never)
      ).toBe(true);

      const row = await avatarRow();
      expect(row.art).not.toContain('steal');
      expect(row.art).toBe(await renderAltvatar(input.style, input.options));
    });

    it('SelectionTheVocabularyDoesNotName_IsNeitherStoredNorDrawn', async () => {
      // `shortFlat` is the drawing library's own name for the hair the app
      // calls `short-flat`; it must not survive into storage.
      await writeAltvatar(PROFILE, {
        style: 'avataaars',
        options: { seed: 'fixed-seed', selections: { hair: 'shortFlat' } },
      });

      const row = await avatarRow();
      expect(row.options).toEqual({ seed: 'fixed-seed', selections: {} });
      expect(row.art).toBe(
        await renderAltvatar('avataaars', {
          seed: 'fixed-seed',
          selections: {},
        })
      );
    });
  });

  describe('AcceptedPayload', () => {
    it('FirstWrite_InsertsTheRow-BumpsTheProfilesAvatarTag', async () => {
      expect(await writeAltvatar(PROFILE, input)).toBe(true);

      const row = await avatarRow();
      expect(row).toEqual(
        expect.objectContaining({
          profile_id: PROFILE,
          style: 'avataaars',
          options: { seed: 'fixed-seed', selections: { hair: 'bob' } },
        })
      );
      expect(updateTag.mock.calls).toEqual([
        [`profile_avatars:profile:${PROFILE}`],
      ]);
    });

    it('SecondWrite_ReplacesTheRowRatherThanDuplicatingIt', async () => {
      await writeAltvatar(PROFILE, input);
      await writeAltvatar(PROFILE, {
        style: 'openmoji',
        options: { seed: 'fixed-seed', selections: { glyph: '1F415' } },
      });

      const rows = await db.select().from(profile_avatars);
      expect(rows).toHaveLength(1);
      expect(rows[0].style).toBe('openmoji');
    });

    it('ThingStyle_StoresTheBundledArtAsADataUriWithTheCodepoint', async () => {
      // The stored corpus stays one shape whatever drew it: a data URI, never
      // the route URL the display path uses for unconfirmed drafts.
      await writeAltvatar(PROFILE, {
        style: 'openmoji',
        options: { seed: 'fixed-seed', selections: { glyph: '1F415' } },
      });

      const [row] = await db.select().from(profile_avatars);
      expect(row.options).toEqual({
        seed: 'fixed-seed',
        selections: { glyph: '1F415' },
      });
      expect(row.art).toMatch(/^data:image\/svg\+xml;utf8,/);
      expect(decodeURIComponent(row.art)).toContain('<svg');
    });

    it('ThingStyleWithACodeOutsideTheCatalog_StoresTheDefaultGlyph', async () => {
      // Pinned before the write, so the stored selection and the stored art
      // can never disagree.
      await writeAltvatar(PROFILE, {
        style: 'openmoji',
        options: { seed: 'fixed-seed', selections: { glyph: 'ABCDEF' } },
      });

      const [row] = await db.select().from(profile_avatars);
      expect(row.options).toEqual({
        seed: 'fixed-seed',
        selections: { glyph: '2B50' },
      });
    });
  });

  describe('RejectedPayload', () => {
    it('UnregisteredStyle_ReturnsFalse-WritesNoRow-BumpsNoTag', async () => {
      expect(await writeAltvatar(PROFILE, { ...input, style: 'shapes' })).toBe(
        false
      );
      expect(await db.select().from(profile_avatars)).toHaveLength(0);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('SeedOver64Characters_ReturnsFalse-WritesNoRow', async () => {
      expect(
        await writeAltvatar(PROFILE, {
          ...input,
          options: { ...input.options, seed: 'x'.repeat(65) },
        })
      ).toBe(false);
      expect(await db.select().from(profile_avatars)).toHaveLength(0);
    });

    it('ProfileThatDoesNotExist_ReturnsFalse-BumpsNoTag', async () => {
      // The foreign key is what fails, so the report is the only signal an
      // edit has that the face it showed was not saved.
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await writeAltvatar('no-such-profile', input)).toBe(false);
      expect(updateTag).not.toHaveBeenCalled();
    });
  });
});
