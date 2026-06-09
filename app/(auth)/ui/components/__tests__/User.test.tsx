import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import User from '../User';
import { makeSession } from './test-helpers';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('../UserMenu', () => ({
  default: ({ session }: { session: { user?: { email?: string } } | null }) => (
    <div data-testid="user-menu">{session?.user?.email ?? 'no-session'}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('User', () => {
  it('AuthedSession_ForwardsResolvedSessionToUserMenu', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    render(await User());
    expect(screen.getByTestId('user-menu')).toHaveTextContent(
      'ada@example.com'
    );
  });

  it('NoSession_ForwardsNullToUserMenu', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    render(await User());
    expect(screen.getByTestId('user-menu')).toHaveTextContent('no-session');
  });
});
