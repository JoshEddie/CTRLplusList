/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The "since" subline is a classed <div> with no role or accessible name; a
 * classed container.querySelector is the only way to assert its absence when
 * `since` is omitted.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectionRow from '../ConnectionRow';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

describe('ConnectionRow', () => {
  it('NamePresent_RendersNameLinkedToUserProfile', () => {
    render(
      <ConnectionRow userId="u1" name="Alice" actions={<span />} />
    );
    expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
      'href',
      '/user/u1'
    );
  });

  it('NameNull_RendersUnnamedFallbackLinkedToUserProfile', () => {
    render(<ConnectionRow userId="u2" name={null} actions={<span />} />);
    expect(screen.getByRole('link', { name: 'Unnamed' })).toHaveAttribute(
      'href',
      '/user/u2'
    );
  });

  it('SincePresent_RendersFormattedShortDateSubline', () => {
    render(
      <ConnectionRow
        userId="u1"
        name="Alice"
        since={new Date(2026, 4, 19)}
        actions={<span />}
      />
    );
    expect(screen.getByText('May 19, 2026')).toBeInTheDocument();
  });

  it('SinceAbsent_RendersNoSinceSubline', () => {
    const { container } = render(
      <ConnectionRow userId="u1" name="Alice" actions={<span />} />
    );
    expect(container.querySelector('.connections-row-since')).toBeNull();
  });

  it('Actions_RendersProvidedChildren', () => {
    render(
      <ConnectionRow
        userId="u1"
        name="Alice"
        actions={<button>Unfollow</button>}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Unfollow' })
    ).toBeInTheDocument();
  });
});
