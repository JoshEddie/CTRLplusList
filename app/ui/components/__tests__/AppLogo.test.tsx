/* eslint-disable testing-library/no-node-access --
 * AppLogo's contract is the exact DOM shape (anchor wrapping image with
 * specific classes / attrs / dimensions). Role queries reach the anchor but
 * not the `app-logo-image` class or the `width`/`height`/`fetchpriority`
 * attribute set we lock; classed descendant queries are the only path.
 */
import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AppLogo from '../AppLogo';

// Mock `next/link` per the menu-system precedent: Next 15's <Link> reads
// AppRouterContext for prefetching; in jsdom with no provider, render() throws.
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

// Mock `next/image` to map the production prop surface (`priority`,
// `width`, `height`) to native `<img>` attributes (`fetchpriority="high"`,
// `width`, `height`). This is the documented translation; the real
// next/image performs the same mapping but adds a Next-internal optimization
// pipeline that is not observable in jsdom.
type MockImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
};
vi.mock('next/image', () => ({
  default: function MockImage({
    priority,
    width,
    height,
    src,
    alt,
    ...rest
  }: MockImageProps) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        fetchPriority={priority ? 'high' : 'auto'}
        {...rest}
      />
    );
  },
}));

describe('AppLogo', () => {
  describe('DomShape', () => {
    it('Default_RendersAnchorWithHrefRoot', () => {
      render(<AppLogo />);
      const anchor = screen.getByRole('link', { name: 'Ctrl+List home' });
      expect(anchor.tagName).toBe('A');
      expect(anchor).toHaveAttribute('href', '/');
      expect(anchor).toHaveClass('app-logo');
      expect(anchor).toHaveAttribute('aria-label', 'Ctrl+List home');
    });

    it('Anchor_ContainsImage', () => {
      render(<AppLogo />);
      const anchor = screen.getByRole('link', { name: 'Ctrl+List home' });
      const img = anchor.querySelector('img');
      expect(img).not.toBeNull();
    });
  });

  describe('ImageAttributes', () => {
    it('Image_HasAltCtrlPlusList', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List').tagName).toBe('IMG');
    });

    it('Image_HasClassAppLogoImage', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveClass('app-logo-image');
    });

    it('Image_HasWidth199Height52', () => {
      render(<AppLogo />);
      const img = screen.getByAltText('Ctrl+List');
      expect(img).toHaveAttribute('width', '199');
      expect(img).toHaveAttribute('height', '52');
    });

    it('Image_HasFetchpriorityHigh', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveAttribute(
        'fetchpriority',
        'high'
      );
    });
  });
});
