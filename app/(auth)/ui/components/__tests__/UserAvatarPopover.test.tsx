import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import UserAvatarPopover from '../UserAvatarPopover';

vi.mock('@/app/actions/user', () => ({
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));
vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

type User = NonNullable<Session['user']>;
const fullUser: User = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: 'https://img.example/ada.png',
};

const trigger = () => screen.getByRole('button', { name: 'User menu' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserAvatarPopover', () => {
  it('Default_RendersClosedTrigger', () => {
    render(<UserAvatarPopover user={fullUser} />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ClickTrigger_OpensMenuWithHeader-Connections-SignOut', async () => {
    render(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();

    const connections = screen.getByRole('menuitem', { name: /connections/i });
    expect(connections).toHaveAttribute('href', '/settings/connections');
    expect(
      screen.getByRole('menuitem', { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it('SparseUser_ShowsSignedInFallbackWithoutEmail', async () => {
    render(<UserAvatarPopover user={{} as User} />);
    await userEvent.click(trigger());
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it('Escape_ClosesMenu', async () => {
    render(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('ReClickTrigger_TogglesMenuClosed', async () => {
    render(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(trigger());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
