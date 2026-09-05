import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FollowingPage from '../FollowingPage';

vi.mock('@/app/ui/components/ListCollectionsNav', () => ({
  default: () => <nav data-testid="list-collections-nav" />,
}));
vi.mock('@/app/ui/components/LoadingIndicator', () => ({
  default: ({ size }: { size: string }) => (
    <div data-testid="loading" data-size={size} />
  ),
}));
// Async server components do not resolve under `render`, so the feed is stubbed
// synchronously: what this file pins is the shell around it, not its contents.
vi.mock('../FollowingFeed', () => ({
  default: () => <div data-testid="following-feed" />,
}));

describe('FollowingPage', () => {
  it('Default_RendersNavAndTheFeedBehindABoundary', () => {
    render(<FollowingPage />);
    expect(screen.getByTestId('list-collections-nav')).toBeInTheDocument();
    expect(screen.getByTestId('following-feed')).toBeInTheDocument();
  });

  it('Default_TouchesNoDataAboveTheBoundary', () => {
    // The shell is synchronous — an await above the boundary would hold the
    // whole navigation rather than streaming the feed in behind the tab strip,
    // which is the regression Next's uncached-data insight reports.
    expect(FollowingPage()).not.toBeInstanceOf(Promise);
  });
});
