/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * AuthContainer's contract is the nested wrapper divs
 * (`.sign-in-page{ className} > .auth-container > children`). Neither wrapper
 * has a role or accessible name, so classed descendant queries are the only path.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthContainer from '../AuthContainer';

describe('AuthContainer', () => {
  it('NoClassName_RendersSignInPageWrapAroundAuthContainer', () => {
    const { container } = render(
      <AuthContainer>
        <span data-testid="child">hi</span>
      </AuthContainer>
    );
    const wrap = container.querySelector('.sign-in-page') as HTMLElement;
    expect(wrap).toHaveClass('sign-in-page', { exact: true });
    const inner = wrap.firstElementChild as HTMLElement;
    expect(inner).toHaveClass('auth-container');
    expect(inner.contains(screen.getByTestId('child'))).toBe(true);
  });

  it('WithClassName_AppendsClassToSignInPageWrap', () => {
    const { container } = render(
      <AuthContainer className="user-menu show">
        <span>hi</span>
      </AuthContainer>
    );
    const wrap = container.querySelector('.sign-in-page') as HTMLElement;
    expect(wrap).toHaveClass('sign-in-page', 'user-menu', 'show');
  });
});
