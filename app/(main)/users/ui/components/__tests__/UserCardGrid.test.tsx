/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The empty-state paragraph carries only the `.following-empty` class with no
 * role or accessible name; classed `container.querySelector` is the only path.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserCardGrid, { type FollowingFeedUser } from '../UserCardGrid';

vi.mock('../UserCard', () => ({
  default: ({
    user,
    newCount,
    latestSharedAt,
  }: {
    user: { id: string };
    newCount?: number;
    latestSharedAt?: Date | null;
  }) => (
    <div
      data-testid="user-card"
      data-id={user.id}
      data-new-count={newCount}
      data-latest={latestSharedAt ? 'set' : 'null'}
    />
  ),
}));

vi.mock('@/app/ui/components/MoreCard', () => ({
  default: ({ moreCount, href }: { moreCount: number; href: string }) => (
    <div data-testid="more-card" data-more={moreCount} data-href={href} />
  ),
}));

const users: FollowingFeedUser[] = [
  {
    id: 'a',
    name: 'Alice',
    image: null,
    new_count: 2,
    latest_shared_at: new Date(),
  },
  { id: 'b', name: 'Bob', image: null, new_count: 0, latest_shared_at: null },
];

describe('UserCardGrid', () => {
  it('EmptyUsers_RendersFollowingEmptyWithMessage', () => {
    const { container } = render(
      <UserCardGrid users={[]} emptyMessage="Nobody here" />
    );
    const empty = container.querySelector('.following-empty');
    expect(empty).toHaveTextContent('Nobody here');
    expect(screen.queryByTestId('user-card')).not.toBeInTheDocument();
  });

  it('NonEmpty_RendersUserCardPerUser_MapsNewCountAndLatestShared', () => {
    render(<UserCardGrid users={users} emptyMessage="x" />);
    const cards = screen.getAllByTestId('user-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('data-id', 'a');
    expect(cards[0]).toHaveAttribute('data-new-count', '2');
    expect(cards[0]).toHaveAttribute('data-latest', 'set');
    expect(cards[1]).toHaveAttribute('data-id', 'b');
    expect(cards[1]).toHaveAttribute('data-latest', 'null');
  });

  it('MoreCountPositiveAndHref_RendersMoreCard', () => {
    render(
      <UserCardGrid
        users={users}
        emptyMessage="x"
        moreCount={5}
        seeAllHref="/following"
      />
    );
    const more = screen.getByTestId('more-card');
    expect(more).toHaveAttribute('data-more', '5');
    expect(more).toHaveAttribute('data-href', '/following');
  });

  it('NoMoreCount_NoMoreCard', () => {
    render(
      <UserCardGrid users={users} emptyMessage="x" seeAllHref="/following" />
    );
    expect(screen.queryByTestId('more-card')).not.toBeInTheDocument();
  });

  it('MoreCountWithoutHref_NoMoreCard', () => {
    render(<UserCardGrid users={users} emptyMessage="x" moreCount={5} />);
    expect(screen.queryByTestId('more-card')).not.toBeInTheDocument();
  });
});
