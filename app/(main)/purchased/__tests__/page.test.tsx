import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { getItemsByPurchased } from '@/lib/data/purchase';
import { getUserIdByEmail } from '@/lib/data/user';
import Purchased from '../page';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));
vi.mock('@/lib/data/purchase', () => ({
  getItemsByPurchased: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/items/ui/components/Items', () => ({
  default: (props: { items: unknown[] }) => (
    <div data-testid="items" data-count={props.items.length} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
  vi.mocked(getItemsByPurchased).mockResolvedValue([] as never);
});

describe('Purchased', () => {
  describe('AuthGuard', () => {
    it('NoSessionEmail_RedirectsToRootWithoutReadingItems', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(Purchased()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getItemsByPurchased).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(Purchased()).rejects.toThrow('REDIRECT:/');
      expect(getItemsByPurchased).not.toHaveBeenCalled();
    });
  });

  describe('Render', () => {
    it('ViewerResolved_ReadsPurchasedItemsForUserId', async () => {
      await Purchased();
      expect(getItemsByPurchased).toHaveBeenCalledWith('viewer');
    });

    it('ViewerResolved_RendersPurchasedHeaderAndItemsInLibraryMain', async () => {
      vi.mocked(getItemsByPurchased).mockResolvedValue([
        { id: 'i1' },
        { id: 'i2' },
      ] as never);
      render(await Purchased());
      const main = screen.getByRole('main');
      expect(main).toHaveClass('container', 'container--items-library');
      expect(screen.getByText('Purchased')).toBeInTheDocument();
      expect(screen.getByTestId('items')).toHaveAttribute('data-count', '2');
    });
  });
});
