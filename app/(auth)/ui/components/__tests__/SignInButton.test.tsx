import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInUser } from '@/lib/data/user.actions';
import SignInButton from '../SignInButton';

vi.mock('@/lib/data/user.actions', () => ({
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignInButton', () => {
  it('Default_RendersGoogleSignInButtonWithLabel', () => {
    render(<SignInButton />);
    const button = screen.getByRole('button', {
      name: /sign in with google/i,
    });
    expect(button).toHaveClass('gsi-material-button');
    expect(
      screen.getByText('Sign in with Google', {
        selector: '.gsi-material-button-contents',
      })
    ).toBeInTheDocument();
  });

  it('Submit_DispatchesSignInUser', async () => {
    render(<SignInButton />);
    await userEvent.click(
      screen.getByRole('button', { name: /sign in with google/i })
    );
    expect(signInUser).toHaveBeenCalledTimes(1);
  });
});
