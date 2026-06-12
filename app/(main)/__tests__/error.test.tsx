import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import MainError from '../error';

// `LinkButton` renders through `next/link`, which reads AppRouterContext for
// prefetching; in jsdom with no provider, render() throws. The mock forwards
// href/children/props to a plain <a> — sufficient to assert href, class, and
// accessible name. Same pattern as `Empty.test.tsx`.
type MockLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children?: ReactNode;
};
vi.mock('next/link', () => ({
  default: forwardRef<HTMLAnchorElement, MockLinkProps>(function MockLink(
    { children, href, ...rest },
    ref
  ) {
    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  }),
}));

const makeError = (digest?: string) =>
  Object.assign(new Error('secret internal failure'), { digest });

describe('MainError', () => {
  describe('Content', () => {
    it('Render_ShowsSomethingWentWrongHeading-OmitsRawErrorMessage', () => {
      render(<MainError error={makeError()} reset={vi.fn()} />);
      expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
        'Something went wrong'
      );
      expect(screen.queryByText(/secret internal failure/)).toBeNull();
    });
  });

  describe('Actions', () => {
    it('ClickTryAgain_InvokesResetOnce', async () => {
      const user = userEvent.setup();
      const reset = vi.fn();
      render(<MainError error={makeError()} reset={reset} />);
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('Render_TryAgainUsesPrimaryButtonPrimitive', () => {
      render(<MainError error={makeError()} reset={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass(
        'btn',
        'primary'
      );
    });

    it('Render_GoHomeLinksToRoot', () => {
      render(<MainError error={makeError()} reset={vi.fn()} />);
      const home = screen.getByRole('link', { name: 'Go home' });
      expect(home).toHaveAttribute('href', '/');
      expect(home).toHaveClass('btn', 'secondary');
    });
  });

  describe('Digest', () => {
    it('DigestPresent_ShowsErrorReferenceLine', () => {
      render(<MainError error={makeError('2207077172')} reset={vi.fn()} />);
      expect(
        screen.getByText('Error reference: 2207077172')
      ).toBeInTheDocument();
    });

    it('DigestAbsent_OmitsErrorReferenceLine', () => {
      render(<MainError error={makeError()} reset={vi.fn()} />);
      expect(screen.queryByText(/Error reference:/)).toBeNull();
    });
  });
});
