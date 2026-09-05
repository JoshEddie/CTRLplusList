import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getVisitHistoryByUser } from '@/lib/data/visit';
import { authedUserId } from '@/lib/data/user.session';
import HistoryPage from '../HistoryPage';
import { makeRow } from './test-helpers';

vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('@/lib/data/visit', () => ({ getVisitHistoryByUser: vi.fn() }));

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedUserId).mockResolvedValue('viewer');
  vi.mocked(getVisitHistoryByUser).mockResolvedValue([] as never);
});

describe('HistoryPage', () => {
  describe('AuthGuard', () => {
    it('UnresolvedViewer_RedirectsToRootWithoutReadingHistory', async () => {
      vi.mocked(authedUserId).mockResolvedValue(null);
      await expect(HistoryPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
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
