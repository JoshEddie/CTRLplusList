import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotFound from '../not-found';

vi.mock('../(auth)/ui/components/User', () => ({
  default: () => <div data-testid="user-stub" />,
}));

// The provider's switch machinery pulls in the profile server actions (and the
// DB behind them); the page only needs it present, so stub it to a passthrough.
vi.mock('@/app/ui/components/ProfileSwitchProvider', () => ({
  ProfileSwitchProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="profile-switch-provider">{children}</div>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/nope',
}));

vi.mock('next/link', async () => ({
  default: (await import('../ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

vi.mock('next/image', async () => ({
  default: (await import('../ui/components/__tests__/test-helpers'))
    .MockNextImage,
}));

describe('NotFound', () => {
  it('Render_ShowsPageNotFoundHeading', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Page Not Found'
    );
  });

  it('Render_GoHomeLinksToRoot', () => {
    render(<NotFound />);
    const home = screen.getByRole('link', { name: 'Go Home' });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveClass('btn', 'primary');
  });

  it('Render_ShowsInsideAppFrameWithinProfileSwitchProvider', () => {
    render(<NotFound />);
    const provider = screen.getByTestId('profile-switch-provider');
    expect(within(provider).getByRole('banner')).toBeInTheDocument();
    expect(
      within(provider).getByRole('heading', { level: 3 })
    ).toBeInTheDocument();
  });
});
