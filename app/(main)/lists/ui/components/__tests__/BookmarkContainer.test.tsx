import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBookmarkStatus } from '@/lib/data/visit';
import BookmarkContainer from '../BookmarkContainer';

vi.mock('@/lib/data/visit', () => ({ getBookmarkStatus: vi.fn() }));
vi.mock('../BookmarkButton', () => ({
  default: (props: { listId: string; initialBookmarked: boolean }) => (
    <div
      data-testid="bookmark-button"
      data-list-id={props.listId}
      data-initial-bookmarked={String(props.initialBookmarked)}
    />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookmarkContainer', () => {
  it('StatusBookmarked_PassesInitialBookmarkedTrueToButton', async () => {
    vi.mocked(getBookmarkStatus).mockResolvedValue(true);
    render(await BookmarkContainer({ list_id: 'l1', user_id: 'u1' }));
    expect(getBookmarkStatus).toHaveBeenCalledWith('l1', 'u1');
    const button = screen.getByTestId('bookmark-button');
    expect(button).toHaveAttribute('data-list-id', 'l1');
    expect(button).toHaveAttribute('data-initial-bookmarked', 'true');
  });

  it('StatusNotBookmarked_PassesInitialBookmarkedFalseToButton', async () => {
    vi.mocked(getBookmarkStatus).mockResolvedValue(false);
    render(await BookmarkContainer({ list_id: 'l2', user_id: 'u1' }));
    expect(screen.getByTestId('bookmark-button')).toHaveAttribute(
      'data-initial-bookmarked',
      'false'
    );
  });
});
