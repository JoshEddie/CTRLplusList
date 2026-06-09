import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListCardData } from '@/app/ui/components/ListCard';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getVisitHistoryByUser } from '@/lib/dal';
import type { HistoryRowData } from '../HistoryCard';
import HistoryPage from '../HistoryPage';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getUserIdByEmail: vi.fn(),
  getVisitHistoryByUser: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/ui/components/ListCollectionsNav', () => ({
  default: ({ children }: { children?: ReactNode }) => (
    <div data-testid="list-collections-nav">{children}</div>
  ),
}));
vi.mock('../HistoryActions', () => ({
  ClearHistoryButton: () => <div data-testid="clear-history-button" />,
}));
vi.mock('../HistoryCard', () => ({
  default: () => <div data-testid="history-card" />,
}));

function makeRow(overrides: Partial<HistoryRowData> = {}): HistoryRowData {
  return {
    user_id: 'viewer',
    list_id: 'l1',
    last_visited_at: new Date('2021-01-01'),
    favorited_at: null,
    list: { id: 'l1' } as ListCardData,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
  vi.mocked(getVisitHistoryByUser).mockResolvedValue([] as never);
});

describe('HistoryPage', () => {
  describe('AuthGuard', () => {
    it('NoSessionEmail_RedirectsToRootWithoutReadingHistory', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(HistoryPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getVisitHistoryByUser).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(HistoryPage()).rejects.toThrow('REDIRECT:/');
      expect(getVisitHistoryByUser).not.toHaveBeenCalled();
    });
  });

  describe('Render', () => {
    it('ViewerResolved_ReadsHistoryWithLimit100', async () => {
      await HistoryPage();
      expect(getVisitHistoryByUser).toHaveBeenCalledWith('viewer', {
        limit: 100,
      });
    });

    it('Populated_RendersHistoryListAndClearButton', async () => {
      vi.mocked(getVisitHistoryByUser).mockResolvedValue([
        makeRow({ list_id: 'l1' }),
        makeRow({ list_id: 'l2' }),
      ] as never);
      render(await HistoryPage());
      expect(screen.getAllByTestId('history-card')).toHaveLength(2);
      expect(screen.getByTestId('clear-history-button')).toBeInTheDocument();
    });

    it('Empty_RendersEmptyMessageAndHidesClearButton', async () => {
      render(await HistoryPage());
      expect(screen.getByText('No visits yet.')).toBeInTheDocument();
      expect(
        screen.queryByTestId('clear-history-button')
      ).not.toBeInTheDocument();
    });
  });
});
