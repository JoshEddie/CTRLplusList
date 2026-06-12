import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConnectionsSection from '../ConnectionsSection';

describe('ConnectionsSection', () => {
  it('CountPositive_RendersHeadingWithCount-ListChildren', () => {
    render(
      <ConnectionsSection title="Following" emptyMessage="empty" count={2}>
        <li>Alice</li>
        <li>Bob</li>
      </ConnectionsSection>
    );
    expect(
      screen.getByRole('heading', { name: 'Following (2)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('connections-list');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
  });

  it('CountZero_RendersEmptyMessage-NoList', () => {
    render(
      <ConnectionsSection
        title="Followers"
        emptyMessage="No followers yet."
        count={0}
      >
        <li>should not render</li>
      </ConnectionsSection>
    );
    expect(
      screen.getByRole('heading', { name: 'Followers (0)' })
    ).toBeInTheDocument();
    expect(screen.getByText('No followers yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
