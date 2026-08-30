/**
 * Pins `profiles-surface`'s Lists panel: a member administering a profile sees
 * everything it owns, not the shared subset a visitor gets.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getListsByProfile } from '@/lib/data/list';
import ProfileSpaceListsPanel from '../ProfileSpaceListsPanel';

vi.mock('@/lib/data/list', () => ({ getListsByProfile: vi.fn() }));
vi.mock('../../../users/ui/components/PublicListsGrid', () => ({
  default: ({ lists }: { lists: { id: string }[] }) => (
    <div data-testid="grid" data-ids={lists.map((l) => l.id).join(',')} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfileSpaceListsPanel', () => {
  it('ProfileWithLists_HandsEveryOneItOwnsToTheGrid', async () => {
    vi.mocked(getListsByProfile).mockResolvedValue([
      { id: 'l1' },
      { id: 'l2' },
    ] as never);

    render(await ProfileSpaceListsPanel({ profileId: 'kiddo' }));

    expect(getListsByProfile).toHaveBeenCalledWith('kiddo');
    expect(screen.getByTestId('grid')).toHaveAttribute('data-ids', 'l1,l2');
  });

  it('ProfileWithNoLists_HandsTheGridAnEmptySet', async () => {
    vi.mocked(getListsByProfile).mockResolvedValue([]);

    render(await ProfileSpaceListsPanel({ profileId: 'kiddo' }));

    expect(screen.getByTestId('grid')).toHaveAttribute('data-ids', '');
  });
});
