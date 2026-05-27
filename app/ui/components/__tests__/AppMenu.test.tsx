/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * AppMenu's contract is the `<div class="menu">` containing logo + nav + user
 * in source order. The wrapper div has no role / accessible name, and the
 * stubbed `<User>` is identified by data-testid; classed descendant queries
 * are the only way to assert composition.
 */
import { render, waitFor } from '@testing-library/react';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import AppMenu from '../AppMenu';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('../../../(auth)/ui/components/User', () => ({
  default: () => <div data-testid="user-stub" />,
}));

// React 19 client-side rendering does not unwrap async server components
// inside <Suspense> (the production RSC path resolves Nav on the server before
// hydration; in jsdom we have no RSC runtime). Stub Nav with a sync component
// matching its rendered DOM shape so AppMenu's composition contract can be
// asserted. Nav's auth-branch + LinkButton structure is covered by Nav.test.tsx.
vi.mock('../Nav', () => ({
  default: () => <nav className="nav-container" data-testid="nav-stub" />,
}));

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

const fixtureSession = {
  user: { name: 'Test User', image: null, email: 't@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe('AppMenu', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(
      fixtureSession as unknown as Awaited<ReturnType<typeof auth>>
    );
  });

  describe('DomShape', () => {
    it('Default_RendersMenuDiv', async () => {
      const tree = await AppMenu();
      const { container } = render(<>{tree}</>);
      expect(container.querySelector('.menu')).not.toBeNull();
    });

    it('Menu_RendersLogoFirst', async () => {
      const tree = await AppMenu();
      const { container } = render(<>{tree}</>);
      const menu = container.querySelector('.menu') as HTMLElement;
      const first = menu.firstElementChild as HTMLElement;
      expect(first.tagName).toBe('IMG');
      expect(first).toHaveClass('menu-logo');
    });

    it('Menu_RendersNavSecond', async () => {
      const tree = await AppMenu();
      const { container } = render(<>{tree}</>);
      await waitFor(() => {
        expect(
          container.querySelector('.menu nav.nav-container')
        ).not.toBeNull();
      });
    });

    it('Menu_RendersUserStubLast', async () => {
      const tree = await AppMenu();
      const { container } = render(<>{tree}</>);
      const menu = container.querySelector('.menu') as HTMLElement;
      await waitFor(() => {
        const last = menu.lastElementChild as HTMLElement;
        expect(last).toHaveAttribute('data-testid', 'user-stub');
      });
    });

    it('Menu_AsyncResolution_RenderedTreeIsStable', async () => {
      const tree = await AppMenu();
      const { container } = render(<>{tree}</>);
      const menu = container.querySelector('.menu') as HTMLElement;
      expect(menu).not.toBeNull();
      await waitFor(() => {
        const childTags = Array.from(menu.children).map((c) => c.tagName);
        expect(childTags).toEqual(['IMG', 'NAV', 'DIV']);
      });
    });
  });
});
