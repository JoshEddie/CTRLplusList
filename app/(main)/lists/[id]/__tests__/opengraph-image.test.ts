import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { profiles } from '@/db/schema';
import { renderAltvatar } from '@/lib/altvatar/render';
import { seedList } from '@/lib/data/__tests__/test-helpers';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedAvatar } from '@/test/helpers/seedFollowGraph';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let Image: typeof import('@/app/(main)/lists/[id]/opengraph-image').default;
let BrandImage: typeof import('@/app/opengraph-image').default;

const OWNERS = ['no-art', 'dicebear', 'openmoji'];

async function renderPng(id: string) {
  const res = await Image({ params: Promise.resolve({ id }) });
  return { res, buf: Buffer.from(await res.arrayBuffer()) };
}

async function expectSmallPng(id: string) {
  const { res, buf } = await renderPng(id);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/png');
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.byteLength).toBeLessThan(600 * 1024);
  return buf;
}

beforeAll(async () => {
  const { db } = await bootPglite();
  holder.db = db;
  await db.insert(profiles).values(OWNERS.map((id) => ({ id, name: 'Grace' })));
  await seedAvatar(db, 'dicebear', {
    style: 'avataaars',
    art: await renderAltvatar('avataaars', { seed: 'grace', selections: {} }),
  });
  await seedAvatar(db, 'openmoji', {
    style: 'openmoji',
    art: '/openmoji/1F415.svg',
  });
  for (const id of OWNERS) {
    await seedList(db, { id, profile_id: id, name: 'Grace Turns 30' });
  }
  ({ default: Image } = await import('@/app/(main)/lists/[id]/opengraph-image'));
  ({ default: BrandImage } = await import('@/app/opengraph-image'));
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ListCardRoute', () => {
  it('OwnerWithNoArt_RendersPngUnder600KB', async () => {
    await expectSmallPng('no-art');
  });

  it('OwnerWithDiceBearLook_RendersTheArtInPngUnder600KB', async () => {
    const buf = await expectSmallPng('dicebear');
    const { buf: noArt } = await renderPng('no-art');

    expect(buf.equals(noArt)).toBe(false);
  });

  it('OwnerWithOpenMojiLook_RendersTheArtInPngUnder600KB', async () => {
    const buf = await expectSmallPng('openmoji');
    const { buf: noArt } = await renderPng('no-art');

    expect(buf.equals(noArt)).toBe(false);
  });

  it('ExistingList_DiffersFromBrandCard', async () => {
    const { buf } = await renderPng('no-art');
    const brand = Buffer.from(await BrandImage().arrayBuffer());

    expect(buf.equals(brand)).toBe(false);
  });

  it('MissingList_RendersBrandCard', async () => {
    const buf = await expectSmallPng('missing');
    const brand = Buffer.from(await BrandImage().arrayBuffer());

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
    await seedList(holder.db as Parameters<typeof seedList>[0], { id, name });

    const { res, buf } = await renderPng(id);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.byteLength).toBeLessThan(600 * 1024);
  });
});
