/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The avatar image carries `alt=""` (decorative, no `img` role) and the
 * avatar-initials / name / sub-line / badge elements carry only classes with no
 * role or accessible name. Classed `container.querySelector` is the only path
 * to assert avatar size, initials, and the sub-line variants.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserCard from '../UserCard';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));
vi.mock('next/image', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextImage,
}));

const baseUser = { id: 'u1', name: 'Alice', image: null as string | null };

describe('UserCard', () => {
  it('Default_LinksToUserIdRoute', () => {
    render(<UserCard user={baseUser} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/user/u1');
  });

  it('Compact_TogglesClassAndAvatarSize', () => {
    const { container } = render(
      <UserCard user={{ ...baseUser, image: 'a.png' }} compact />
    );
    expect(screen.getByRole('link')).toHaveClass(
      'user-card',
      'user-card--compact'
    );
    expect(container.querySelector('img')).toHaveAttribute('width', '44');
  });

  it('NonCompact_AvatarSize64', () => {
    const { container } = render(
      <UserCard user={{ ...baseUser, image: 'a.png' }} />
    );
    expect(container.querySelector('img')).toHaveAttribute('width', '64');
  });

  it('HasImage_RendersImg', () => {
    const { container } = render(
      <UserCard user={{ ...baseUser, image: 'a.png' }} />
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'a.png');
  });

  it('NoImage_RendersInitials', () => {
    const { container } = render(<UserCard user={baseUser} />);
    expect(
      container.querySelector('.user-card-avatar-initials')
    ).toHaveTextContent('A');
  });

  it('NewCountPositive_RendersBadgeWithAriaLabel', () => {
    render(<UserCard user={baseUser} newCount={3} />);
    const badge = screen.getByLabelText('3 new');
    expect(badge).toHaveClass('user-card-badge');
    expect(badge).toHaveTextContent('3');
  });

  it('NewCountZero_NoBadge', () => {
    const { container } = render(<UserCard user={baseUser} newCount={0} />);
    expect(container.querySelector('.user-card-badge')).toBeNull();
  });

  it('NonCompactSubLine_NewWhenSharedAndNewCountPositive', () => {
    const { container } = render(
      <UserCard user={baseUser} newCount={2} latestSharedAt={new Date()} />
    );
    expect(container.querySelector('.user-card-sub')).toHaveTextContent(
      '2 new'
    );
  });

  it('NonCompactSubLine_ActiveWhenSharedAndNewCountZero', () => {
    const { container } = render(
      <UserCard user={baseUser} newCount={0} latestSharedAt={new Date()} />
    );
    expect(container.querySelector('.user-card-sub')).toHaveTextContent(
      'Active'
    );
  });

  it('NonCompactSubLine_NoSharedListsWhenNoLatestShared', () => {
    const { container } = render(
      <UserCard user={baseUser} latestSharedAt={null} />
    );
    expect(
      container.querySelector('.user-card-sub-muted')
    ).toHaveTextContent('No shared lists');
  });

  it('NullName_RendersUnnamed', () => {
    const { container } = render(
      <UserCard user={{ ...baseUser, name: null }} />
    );
    expect(container.querySelector('.user-card-name')).toHaveTextContent(
      'Unnamed'
    );
  });
});
