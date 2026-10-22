import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { profiles } from '@/db/schema';
import { renderAltvatar } from '@/lib/altvatar/render';
import { seedList } from '@/lib/data/__tests__/test-helpers';
import { blockNetwork, expectSmallPng } from '@/lib/og/__tests__/test-helpers';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedAvatar } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type Db = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: Db;
let diceBearArt: string;
let Image: typeof import('@/app/(main)/lists/[id]/opengraph-image').default;
let BrandImage: typeof import('@/app/opengraph-image').default;

const OWNERS = ['no-art', 'dicebear', 'openmoji'];

const renderCard = (id: string) => Image({ params: Promise.resolve({ id }) });

const pngOf = async (res: Response) => Buffer.from(await res.arrayBuffer());

beforeAll(async () => {
  ({ db } = await bootPglite());
  holder.db = db;
  diceBearArt = await renderAltvatar('avataaars', {
    seed: 'grace',
    selections: {},
  });
  ({ default: Image } =
    await import('@/app/(main)/lists/[id]/opengraph-image'));
  ({ default: BrandImage } = await import('@/app/opengraph-image'));
});

beforeEach(async () => {
  await resetDb(db);
  await db.insert(profiles).values(OWNERS.map((id) => ({ id, name: 'Grace' })));
  await seedAvatar(db, 'dicebear', { style: 'avataaars', art: diceBearArt });
  await seedAvatar(db, 'openmoji', {
    style: 'openmoji',
    art: '/openmoji/1F415.svg',
  });
  for (const id of OWNERS) {
    await seedList(db, { id, profile_id: id, name: 'Grace Turns 30' });
  }
});

blockNetwork();

describe('ListCardRoute', () => {
  it('OwnerWithNoArt_RendersPngUnder600KB', async () => {
    await expectSmallPng(await renderCard('no-art'));
  });

  it('OwnerWithDiceBearLook_RendersTheArtInPngUnder600KB', async () => {
    const buf = await expectSmallPng(await renderCard('dicebear'));
    const noArt = await pngOf(await renderCard('no-art'));

    expect(buf.equals(noArt)).toBe(false);
  });

  it('OwnerWithOpenMojiLook_RendersTheArtInPngUnder600KB', async () => {
    const buf = await expectSmallPng(await renderCard('openmoji'));
    const noArt = await pngOf(await renderCard('no-art'));

    expect(buf.equals(noArt)).toBe(false);
  });

  it('ExistingList_DiffersFromBrandCard', async () => {
    const buf = await pngOf(await renderCard('no-art'));
    const brand = await pngOf(BrandImage());

    expect(buf.equals(brand)).toBe(false);
  });

  it('MissingList_RendersBrandCard', async () => {
    const buf = await expectSmallPng(await renderCard('missing'));
    const brand = await pngOf(BrandImage());

    expect(buf.equals(brand)).toBe(true);
  });
});

describe('ListCardRouteUndrawableNames', () => {
  it.each([
    ['Emoji', 'emoji', 'Grace 👩‍👩‍👧 Turns 30 🎂'],
    ['EmojiOnly', 'emoji-only', '🎂🎉'],
    ['NonLatinScript', 'non-latin', '誕生日 День рождения'],
    ['PictographsInLatinRange', 'latin-pictographs', 'Gifts © ® ™'],
  ])('Name%s_RendersPngUnder600KB', async (_case, id, name) => {
    await seedList(db, { id, name });

    await expectSmallPng(await renderCard(id));
  });
});
