import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getMembershipsForUser } from '@/lib/data/profile.active';
import type { ProfileSwitcherView } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import type { ProfileMembershipView } from '@/lib/types';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import User from '../User';
import { makeSession } from './test-helpers';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));
// `@/db` is stubbed rather than the whole module mocked, so `switcherView` —
// the derivation this page component's forwarding is judged on — stays real.
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/data/profile.active', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/profile.active')>()),
  getMembershipsForUser: vi.fn(),
}));

vi.mock('../UserMenu', () => ({
  default: ({
    session,
    switcher,
  }: {
    session: { user?: { email?: string } } | null;
    switcher?: ProfileSwitcherView;
  }) => (
    <div
      data-testid="user-menu"
      data-rows={(switcher?.rows ?? []).map((r) => r.name).join(',')}
      data-count={switcher?.profileCount ?? ''}
    >
      {session?.user?.email ?? 'no-session'}
    </div>
  ),
}));

function membership(
  id: string,
  name: string,
  role: ProfileMembershipView['role']
): ProfileMembershipView {
  return {
    id,
    name,
    role,
    tagline: null,
    accent: null,
    art: null,
    avatarStyle: null,
    last_active_at: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('u1', makeProfile('p-self', 'Ada Lovelace'))
  );
  vi.mocked(getMembershipsForUser).mockResolvedValue([
    membership('p-self', 'Ada Lovelace', 'self'),
  ]);
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
    expect(authedIdentity).not.toHaveBeenCalled();
  });

  it('ThreeMemberships_ForwardsTheTwoNotBeingActedAsAndTheFullCount', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(getMembershipsForUser).mockResolvedValue([
      membership('p-kiddo', 'Kiddo', 'owner'),
      membership('p-self', 'Ada Lovelace', 'self'),
      membership('p-nana', 'Nana', 'manager'),
    ]);

    render(await User());

    const menu = screen.getByTestId('user-menu');
    expect(menu).toHaveAttribute('data-rows', 'Kiddo,Nana');
    expect(menu).toHaveAttribute('data-count', '3');
  });

  it('UnresolvableIdentity_ForwardsTheSessionWithNoSwitcher', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(authedIdentity).mockResolvedValue(null);

    render(await User());

    const menu = screen.getByTestId('user-menu');
    expect(menu).toHaveTextContent('ada@example.com');
    expect(menu).toHaveAttribute('data-rows', '');
    expect(menu).toHaveAttribute('data-count', '');
  });
});
