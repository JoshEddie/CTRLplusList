import { describe, expect, it } from 'vitest';

import { items, lists, users } from '../../../../../db/schema';

import { bootPglite } from './setup-pglite';

/**
 * Cache-tag PoC.
 *
 * The production DAL functions in `lib/dal.ts` use the Next 16 `'use cache'`
 * directive plus `cacheTag(...)` from `next/cache`. Mutation paths call
 * `updateTag(...)` (e.g. `app/actions/items.ts:249`) to invalidate.
 *
 * **Limitation discovered during the spike**: the `'use cache'` directive is
 * a Next.js compiler-level construct. Outside the Next runtime (i.e. under
 * raw vitest), `'use cache'`-annotated functions execute as ordinary async
 * functions — there is no cache. `cacheTag` and `revalidateTag` are no-ops
 * unless invoked inside the Next render pipeline.
 *
 * What this means for `test-foundation`:
 *   - **DB-side correctness** of cached DAL functions (the query returns the
 *     right rows) is testable directly here, against pglite, as below.
 *   - **Cache-invalidation correctness** (a `revalidateTag` call actually
 *     flushes a stale cached read) requires either (a) running tests under
 *     `next experimental-test` or against `next dev`, or (b) mocking
 *     `next/cache` in vitest and asserting the mutation path invokes
 *     `updateTag('items')` / `updateTag('lists')` etc. with the right tag.
 *
 * The spike's recommendation (in `db-under-test-comparison.md`): adopt
 * **option (b)** — vitest with a mocked `next/cache` module — for DAL
 * integration tests. E2E (Playwright against `next dev`) gives us the
 * real-runtime confidence for tag invalidation end-to-end.
 */
describe('DalQueryCorrectnessAgainstPglite', () => {
  it('OwnedAndOthersLists_ReturnsOnlyRequestingUsersLists', async () => {
    const { db } = await bootPglite();

    await db.insert(users).values([
      { id: 'u-1', email: 'u1@t.local', name: 'U1' },
      { id: 'u-2', email: 'u2@t.local', name: 'U2' },
    ]);
    await db.insert(lists).values([
      {
        id: 'l-1',
        user_id: 'u-1',
        name: 'mine A',
        occasion: 'birthday',
        visibility: 'public',
      },
      {
        id: 'l-2',
        user_id: 'u-1',
        name: 'mine B',
        occasion: 'birthday',
        visibility: 'private',
      },
      {
        id: 'l-3',
        user_id: 'u-2',
        name: 'theirs',
        occasion: 'birthday',
        visibility: 'public',
      },
    ]);

    const mine = await db.query.lists.findMany({
      where: (l, { eq }) => eq(l.user_id, 'u-1'),
    });
    expect(mine.map((l) => l.id).sort()).toEqual(['l-1', 'l-2']);
  });

  it('AfterInsert_FreshReadSeesNewRow', async () => {
    const { db } = await bootPglite();
    await db.insert(users).values({ id: 'u-1', email: 'u1@t.local', name: 'U1' });

    const before = await db.query.items.findMany({
      where: (i, { eq }) => eq(i.user_id, 'u-1'),
    });
    expect(before).toHaveLength(0);

    await db.insert(items).values({
      id: 'i-1',
      user_id: 'u-1',
      name: 'New item',
    });

    const after = await db.query.items.findMany({
      where: (i, { eq }) => eq(i.user_id, 'u-1'),
    });
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe('i-1');
  });
});
