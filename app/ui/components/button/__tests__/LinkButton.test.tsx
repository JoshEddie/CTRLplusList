/* eslint-disable testing-library/no-node-access --
 * §3.15's spinner-absence guard uses `querySelector('.btn-spinner')` to lock
 * the spec's explicit non-feature ("LinkButton SHALL NOT support loading").
 * The spinner span has no role/label by design, so role-based queries cannot
 * reach it; querySelector by class is the canonical way to assert its
 * absence as a regression guard.
 */
// `isLoading` is intentionally excluded from `LinkButtonProps` per the
// `button-system` spec (LinkButton SHALL NOT support a loading state).
// Enforced compile-time by `tsc --noEmit` and runtime by §3.15's spinner
// absence assertion.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LinkButton } from '../LinkButton';
import { VARIANTS, cap } from './test-helpers';

// Mock `next/link` per design Decision 2: Next 15's <Link> reads
// AppRouterContext for prefetching; in jsdom with no provider, render() throws.
// The mock forwards refs + props to a plain <a>, which is the underlying DOM
// element the production Link also renders — sufficient to assert href, class,
// aria-pressed, ref-target, etc. `href` is typed as `string` because all tests
// in this file pass string hrefs; the production `LinkProps['href']` accepts
// `UrlObject | string` but the mock only needs to handle what the tests pass.
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

describe('LinkButton', () => {
  describe('VariantSizeMatrix', () => {
    for (const variant of VARIANTS) {
      it(`Variant${cap(variant)}DefaultSize_RendersBtnAnd${cap(variant)}Class`, () => {
        render(
          <LinkButton variant={variant} href="/x">
            label
          </LinkButton>
        );
        expect(screen.getByRole('link')).toHaveClass('btn', variant);
      });

      it(`Variant${cap(variant)}SizeSm_RendersBtnSmToken`, () => {
        render(
          <LinkButton variant={variant} size="sm" href="/x">
            label
          </LinkButton>
        );
        expect(screen.getByRole('link')).toHaveClass('btn', variant, 'btn-sm');
      });

      it(`Variant${cap(variant)}SizeMd_OmitsBtnSmToken`, () => {
        render(
          <LinkButton variant={variant} size="md" href="/x">
            label
          </LinkButton>
        );
        const link = screen.getByRole('link');
        expect(link).toHaveClass('btn', variant);
        expect(link).not.toHaveClass('btn-sm');
      });
    }
  });

  describe('HrefPassthrough', () => {
    it('HrefString_RenderedAsHrefAttribute', () => {
      render(
        <LinkButton variant="primary" href="/lists">
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveAttribute('href', '/lists');
    });
  });

  describe('ToggleStateContract', () => {
    it('PressedTrue_AriaPressedTrueAttribute', () => {
      render(
        <LinkButton variant="on-dark" href="/x" pressed>
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveAttribute('aria-pressed', 'true');
    });

    it('PressedFalse_AriaPressedFalseAttribute', () => {
      render(
        <LinkButton variant="on-dark" href="/x" pressed={false}>
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveAttribute('aria-pressed', 'false');
    });

    it('PressedUndefined_NoAriaPressedAttribute', () => {
      render(
        <LinkButton variant="primary" href="/x">
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).not.toHaveAttribute('aria-pressed');
    });
  });

  describe('ClassNamePassthrough', () => {
    it('ClassNameProvided_AppearsAsExtraAfterVariantTokens', () => {
      render(
        <LinkButton variant="primary" href="/x" className="page-action">
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveClass(
        'btn',
        'primary',
        'page-action'
      );
    });
  });

  describe('ForwardRefResolvesToAnchorElement', () => {
    it('RefAttached_ResolvesToAnchorElement', () => {
      const ref = createRef<HTMLAnchorElement>();
      render(
        <LinkButton ref={ref} variant="primary" href="/x">
          X
        </LinkButton>
      );
      expect(ref.current?.tagName).toBe('A');
    });
  });

  describe('ArbitraryAnchorAttributePassthrough', () => {
    it('OnClickProvided_FiresOnClick', async () => {
      const spy = vi.fn();
      render(
        <LinkButton variant="primary" href="/x" onClick={spy}>
          X
        </LinkButton>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('link'));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('AriaLabelProvided_AccessibleNameMatchesAriaLabel', () => {
      render(
        <LinkButton variant="primary" href="/x" aria-label="View lists">
          <span aria-hidden="true">→</span>
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveAccessibleName('View lists');
    });

    it('TargetAndRelProvided_RenderedVerbatim', () => {
      render(
        <LinkButton
          variant="primary"
          href="/x"
          target="_blank"
          rel="noopener"
        >
          X
        </LinkButton>
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener');
    });

    it('DataAttributeProvided_RenderedVerbatim', () => {
      render(
        <LinkButton variant="primary" href="/x" data-testid="x">
          X
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveAttribute('data-testid', 'x');
    });
  });

  describe('LinkButtonDoesNotSupportLoading', () => {
    // Compile-time guard: `isLoading` is excluded from `LinkButtonProps`.
    // Type-only assertion enforced by `tsc --noEmit` in §9.2; a runtime test
    // for a TypeScript contract would be a tautology. Visible regression
    // guard: assert no `.btn-spinner` is ever rendered for a normal LinkButton.
    it('NormalRender_NoSpinnerElementInDom', () => {
      render(
        <LinkButton variant="primary" href="/x">
          X
        </LinkButton>
      );
      const link = screen.getByRole('link');
      expect(link.querySelector('.btn-spinner')).toBeNull();
    });
  });

  describe('ChildrenRender', () => {
    it('ChildrenProvided_RenderedAsLinkContent', () => {
      render(
        <LinkButton variant="primary" href="/x">
          View lists
        </LinkButton>
      );
      expect(screen.getByRole('link')).toHaveTextContent('View lists');
    });
  });
});
