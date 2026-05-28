/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * AppFrame's contract is the exact composition order of unnamed wrapper
 * divs (`.app-frame > .app-nav > .app-nav-inner > [AppLogo, AppNav, .app-nav-avatar]`
 * → `.app-surface-bleed > .app-surface > children`). No role query reaches
 * those wrapper divs; classed descendant queries + firstElementChild indexing
 * are the only path.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppFrame from '../AppFrame';

vi.mock('../../../(auth)/ui/components/User', () => ({
  default: () => <div data-testid="user-stub" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

describe('AppFrame', () => {
  describe('DomShape', () => {
    it('Default_RendersAppFrameDivAsRoot', () => {
      const { container } = render(
        <AppFrame>
          <div data-testid="page-content">x</div>
        </AppFrame>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).not.toBeNull();
      expect(root).toHaveClass('app-frame');
    });

    it('Default_RendersHeaderAsFirstChild', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const root = container.firstElementChild!;
      const header = root.firstElementChild as HTMLElement;
      expect(header.tagName).toBe('HEADER');
      expect(header).toHaveClass('app-nav');
    });

    it('Header_ContainsAppNavInner', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const inner = container.querySelector('.app-nav > .app-nav-inner');
      expect(inner).not.toBeNull();
    });

    it('Header_RendersLogoFirst', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const inner = container.querySelector('.app-nav-inner') as HTMLElement;
      const first = inner.firstElementChild as HTMLElement;
      expect(first.tagName).toBe('A');
      expect(first).toHaveClass('app-logo');
    });

    it('Header_RendersAppNavSecond', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const inner = container.querySelector('.app-nav-inner') as HTMLElement;
      const second = inner.children[1] as HTMLElement;
      expect(second).toHaveClass('app-nav-wrap');
    });

    it('Header_RendersAvatarLast', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const inner = container.querySelector('.app-nav-inner') as HTMLElement;
      const last = inner.lastElementChild as HTMLElement;
      expect(last).toHaveClass('app-nav-avatar');
      expect(last.querySelector('[data-testid="user-stub"]')).not.toBeNull();
    });

    it('Surface_RendersAfterHeader', () => {
      const { container } = render(
        <AppFrame>
          <div />
        </AppFrame>
      );
      const root = container.firstElementChild!;
      const second = root.children[1] as HTMLElement;
      expect(second).toHaveClass('app-surface-bleed');
      expect(second.firstElementChild).toHaveClass('app-surface');
    });
  });

  describe('ChildrenPassthrough', () => {
    it('Children_RenderInsideAppSurface', () => {
      const { container } = render(
        <AppFrame>
          <div data-testid="page-content" />
        </AppFrame>
      );
      const surface = container.querySelector('.app-surface') as HTMLElement;
      expect(surface).not.toBeNull();
      expect(surface.contains(screen.getByTestId('page-content'))).toBe(true);
    });

    it('MultipleChildren_AllRenderInsideAppSurface', () => {
      const { container } = render(
        <AppFrame>
          <div data-testid="a" />
          <div data-testid="b" />
        </AppFrame>
      );
      const surface = container.querySelector('.app-surface') as HTMLElement;
      expect(surface.children).toHaveLength(2);
      expect(surface.children[0]).toBe(screen.getByTestId('a'));
      expect(surface.children[1]).toBe(screen.getByTestId('b'));
    });

    it('NoChildren_AppSurfaceStillRenders', () => {
      const { container } = render(<AppFrame>{null}</AppFrame>);
      const surface = container.querySelector('.app-surface') as HTMLElement;
      expect(surface).not.toBeNull();
      expect(surface.children).toHaveLength(0);
    });
  });
});
