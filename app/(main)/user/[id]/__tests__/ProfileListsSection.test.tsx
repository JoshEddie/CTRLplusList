import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicListsByUser } from '@/lib/dal';
import ProfileListsSection from '../ProfileListsSection';

vi.mock('@/lib/dal', () => ({ getPublicListsByUser: vi.fn() }));

vi.mock('@/app/(main)/users/ui/components/PublicListsGrid', () => ({
  default: (props: { lists: { id: string }[] }) => (
    <div
      data-testid="public-lists-grid"
      data-count={String(props.lists.length)}
      data-ids={props.lists.map((l) => l.id).join(',')}
    />
  ),
}));

function props(id = 'target') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfileListsSection', () => {
  it('PopulatedLists_ReadsPublicListsWithLimit50-ForwardsToGrid', async () => {
    vi.mocked(getPublicListsByUser).mockResolvedValue([
      { id: 'l1' },
      { id: 'l2' },
    ] as never);
    render(await ProfileListsSection(props('target')));

    expect(getPublicListsByUser).toHaveBeenCalledWith('target', { limit: 50 });
    const grid = screen.getByTestId('public-lists-grid');
    expect(grid).toHaveAttribute('data-count', '2');
    expect(grid).toHaveAttribute('data-ids', 'l1,l2');
  });

  it('EmptyLists_ForwardsEmptyArrayToGrid', async () => {
    vi.mocked(getPublicListsByUser).mockResolvedValue([] as never);
    render(await ProfileListsSection(props('target')));

    expect(screen.getByTestId('public-lists-grid')).toHaveAttribute(
      'data-count',
      '0'
    );
  });
});
