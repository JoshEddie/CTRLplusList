/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The band, avatar disc, name and sub-line carry only classes with no role or
 * accessible name (the disc is `aria-hidden`), so classed
 * `container.querySelector` is the only path to assert the card's structure.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserCard from '../UserCard';
import { makeProfile } from '@/test/helpers/profile';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

const alice = makeProfile('u1', 'Alice');

describe('UserCard', () => {
  it('Default_LinksToProfileRoute', () => {
    render(<UserCard profile={alice} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/altvatar/u1');
  });

  it('Default_RendersNameAndAvatarDiscInBand', () => {
    const { container } = render(<UserCard profile={alice} />);
    expect(container.querySelector('.user-card-name')).toHaveTextContent(
      'Alice'
    );
    expect(
      container.querySelector('.user-card-band .user-card-avatar .altvatar-disc')
    ).not.toBeNull();
  });

  it('AccentSet_PaintsCardFromAccentVars', () => {
    render(<UserCard profile={{ ...alice, accent: 'rose' }} />);
    // --accent-bg is what the band and the disc both read; asserting it on the
    // root proves the accent reached the card rather than only the disc.
    expect(screen.getByRole('link').style.getPropertyValue('--accent-bg')).toBe(
      'linear-gradient(120deg, #fbcfe8, #be123c)'
    );
  });

  it('NewCountPositive_RendersBadgeWithAriaLabel', () => {
    render(<UserCard profile={alice} newCount={3} />);
    const badge = screen.getByLabelText('3 new');
    expect(badge).toHaveClass('user-card-badge');
    expect(badge).toHaveTextContent('3');
  });

  it('NewCountZero_NoBadge', () => {
    const { container } = render(<UserCard profile={alice} newCount={0} />);
    expect(container.querySelector('.user-card-badge')).toBeNull();
  });

  it('SharedAndNewCountPositive_SubLineCountsNew', () => {
    const { container } = render(
      <UserCard profile={alice} newCount={2} latestSharedAt={new Date()} />
    );
    expect(container.querySelector('.user-card-sub')).toHaveTextContent(
      '2 new'
    );
  });

  it('SharedAndNewCountZero_SubLineReadsActive', () => {
    const { container } = render(
      <UserCard profile={alice} newCount={0} latestSharedAt={new Date()} />
    );
    expect(container.querySelector('.user-card-sub')).toHaveTextContent(
      'Active'
    );
  });

  it('NeverShared_SubLineIsMutedNoSharedLists', () => {
    const { container } = render(
      <UserCard profile={alice} latestSharedAt={null} />
    );
    expect(
      container.querySelector('.user-card-sub-muted')
    ).toHaveTextContent('No shared lists');
  });
});
