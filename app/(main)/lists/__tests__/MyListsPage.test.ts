import { Suspense } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';
import MyListsGrid from '../ui/components/MyListsGrid';
import NewListButton from '../ui/components/NewListButton';

mockNextCache();
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let MyListsPage: typeof import('../MyListsPage').default;

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  MyListsPage = (await import('../MyListsPage')).default;
});

beforeEach(async () => {
  await resetDb(db);
  redirectMock.mockClear();
});

type El = { type: unknown; props: Record<string, unknown> };

function childrenOf(el: El): El[] {
  return el.props.children as El[];
}

async function renderWithViewer(): Promise<El> {
  await seedUsers(db, [{ id: 'viewer', email: 'viewer@test.local' }]);
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  return (await MyListsPage()) as unknown as El;
}

describe('MyListsPage', () => {
  it('NoSessionEmail_RedirectsToHome', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    await expect(MyListsPage()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('EmailResolvesToNoUser_RedirectsToHome', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'ghost@test.local' },
    } as never);
    await expect(MyListsPage()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('ViewerResolved_RendersNavWithNewListButton-WrapsGridInSuspenseWithViewerId', async () => {
    const tree = await renderWithViewer();
    const [nav, suspense] = childrenOf(tree);

    expect(nav.type).toBe(ListCollectionsNav);
    expect((nav.props.children as El).type).toBe(NewListButton);

    expect(suspense.type).toBe(Suspense);
    const inner = suspense.props.children as El;
    expect(inner.type).toBe(MyListsGrid);
    expect((inner.props as { userId: string }).userId).toBe('viewer');
  });
});
