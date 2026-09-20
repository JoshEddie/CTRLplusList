/**
 * Pins `onboarding-gate` — "The application frame SHALL render onboarding
 * instead of the application". The load-bearing claim is the negative one: for
 * an un-onboarded account the page element is never included in the layout's
 * output, so React never invokes it and the page issues no read. That is a
 * framework property rather than something the code states, which is why it is
 * pinned here rather than assumed.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveOnboarding } from '@/lib/data/onboarding';
import MainLayout from '../layout';

vi.mock('@/lib/data/onboarding', () => ({ resolveOnboarding: vi.fn() }));
vi.mock('@/lib/altvatar/shuffle', () => ({
  rollAltvatar: () => ({ style: 'toon-head', options: { seed: 's' } }),
}));
vi.mock('@/lib/accent', () => ({ randomAccentName: () => 'rose' }));
vi.mock('@/app/ui/components/onboarding/OnboardingGate', () => ({
  default: ({ arm }: { arm: string }) => (
    <div data-testid="gate" data-arm={arm} />
  ),
}));
vi.mock('@/app/ui/components/AppFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="frame">{children}</div>
  ),
}));
vi.mock('@/app/ui/components/ProfileSwitchProvider', () => ({
  ProfileSwitchProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="profile-switch-provider">{children}</div>
  ),
}));
vi.mock('@/lib/data/profile.active', () => ({
  getMembershipsForUser: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));

const redirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ redirect }));

const mockedResolve = vi.mocked(resolveOnboarding);

// Stands in for the requested page. Its body runs only if React renders the
// element, so the spy IS the "no page work is performed" assertion.
const pageRead = vi.fn();
function RequestedPage() {
  pageRead();
  return <div>the requested page</div>;
}

const renderLayout = async () =>
  render(
    await MainLayout({
      children: <RequestedPage />,
      modal: <div data-testid="modal-slot" />,
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MainLayout', () => {
  it('UnOnboardedAccount_RendersTheGateInsideTheFrameInsteadOfTheRequestedPage', async () => {
    mockedResolve.mockResolvedValue({
      onboarded: false,
      userId: 'u1',
      arm: 'signup',
      name: 'Grace',
    });

    await renderLayout();

    expect(screen.getByTestId('gate')).toHaveAttribute('data-arm', 'signup');
    expect(screen.queryByText('the requested page')).toBeNull();
    expect(screen.getByTestId('frame')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-slot')).toBeNull();
  });

  it('UnOnboardedAccount_RendersInsideProfileSwitchProvider', async () => {
    mockedResolve.mockResolvedValue({
      onboarded: false,
      userId: 'u1',
      arm: 'existing',
      name: 'Grace',
    });

    await renderLayout();

    expect(screen.getByTestId('profile-switch-provider')).toBeInTheDocument();
    expect(
      screen.getByTestId('profile-switch-provider').contains(
        screen.getByTestId('gate')
      )
    ).toBe(true);
  });

  it('UnOnboardedAccount_IssuesNoPageLevelQuery', async () => {
    mockedResolve.mockResolvedValue({
      onboarded: false,
      userId: 'u1',
      arm: 'existing',
      name: 'Grace',
    });

    await renderLayout();

    expect(pageRead).not.toHaveBeenCalled();
  });

  it('UnOnboardedAccount_IssuesNoRedirect', async () => {
    mockedResolve.mockResolvedValue({
      onboarded: false,
      userId: 'u1',
      arm: 'signup',
      name: null,
    });

    await renderLayout();

    // The gate is not a route: the requested URL is untouched, which is what
    // makes completing it reveal the page originally asked for.
    expect(redirect).not.toHaveBeenCalled();
  });

  it('OnboardedAccount_RendersTheFrameAndTheRequestedPage', async () => {
    mockedResolve.mockResolvedValue({ onboarded: true });

    await renderLayout();

    expect(screen.getByTestId('frame')).toBeInTheDocument();
    expect(screen.getByText('the requested page')).toBeInTheDocument();
    expect(screen.getByTestId('modal-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('gate')).toBeNull();
    expect(pageRead).toHaveBeenCalled();
  });
});
