/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * SignedOutMenu's open/close contract lives on unnamed wrapper divs: the
 * `.avatar-container.placeholder` toggle (no role), the `.close-button` div
 * (no role/text — only an icon), and the `.sign-in-page` AuthContainer wrap.
 * Classed queries are the only path to assert the show/hide class transitions.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UserMenu from '../UserMenu';
import { makeSession } from './test-helpers';

vi.mock('../UserAvatarPopover', () => ({
  default: ({ user }: { user: { email?: string } }) => (
    <div data-testid="avatar-popover">{user.email}</div>
  ),
}));

vi.mock('@/app/(auth)/ui/components/SignInButton', () => ({
  default: () => <div data-testid="sign-in-button" />,
}));

vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

describe('UserMenu', () => {
  describe('SignedIn', () => {
    it('SessionWithUser_RendersUserAvatarPopoverWithUser', () => {
      render(<UserMenu session={makeSession()} />);
      expect(screen.getByTestId('avatar-popover')).toHaveTextContent(
        'ada@example.com'
      );
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });
  });

  describe('SignedOut', () => {
    it('NullSession_RendersSignInPlaceholderHidden', () => {
      const { container } = render(<UserMenu session={null} />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.queryByTestId('avatar-popover')).not.toBeInTheDocument();
      expect(container.querySelector('.sign-in-page')).not.toHaveClass('show');
      expect(container.querySelector('.placeholder')).not.toHaveClass('hide');
    });

    it('ClickPlaceholder_ShowsMenu-HidesPlaceholder', async () => {
      const { container } = render(<UserMenu session={null} />);
      await userEvent.click(screen.getByText('Sign In'));
      expect(container.querySelector('.sign-in-page')).toHaveClass('show');
      expect(container.querySelector('.placeholder')).toHaveClass('hide');
    });

    it('ClickClose_HidesMenuAgain', async () => {
      const { container } = render(<UserMenu session={null} />);
      await userEvent.click(screen.getByText('Sign In'));
      expect(container.querySelector('.sign-in-page')).toHaveClass('show');
      await userEvent.click(container.querySelector('.close-button')!);
      expect(container.querySelector('.sign-in-page')).not.toHaveClass('show');
    });
  });
});
