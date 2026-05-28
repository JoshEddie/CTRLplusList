/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The icon-before-children DOM-order contract requires comparing child
 * positions on the rendered anchor; the class-string equivalence assertion
 * with MenuItem requires reading `className` off the rendered <a> and
 * <button> respectively. No role-based query expresses either contract.
 */
import { render, screen } from '@testing-library/react';
import { createRef, forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MenuItem } from '../MenuItem';
import { MenuLinkItem } from '../MenuLinkItem';

// Mock `next/link` per Decision 2: Next 15's <Link> reads AppRouterContext
// for prefetching; in jsdom with no provider, render() throws. The mock
// forwards refs + props to a plain <a>, which is the underlying DOM element
// the production Link also renders — sufficient to assert href, class, role,
// ref-target, etc. Mirrors the inline mock used in LinkButton.test.tsx (no
// shared foundation-level mock for `next/link` exists today).
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

describe('MenuLinkItem', () => {
  describe('DomShape', () => {
    it('Default_RendersAnchorWithRoleMenuitem', () => {
      render(<MenuLinkItem href="/x">X</MenuLinkItem>);
      const link = screen.getByRole('menuitem');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/x');
      expect(link).toHaveAttribute('class', 'menu-item');
      expect(link).toHaveTextContent('X');
    });

    it('Icon_RendersBeforeChildren', () => {
      render(
        <MenuLinkItem href="/x" icon={<svg data-testid="i" />}>
          Text
        </MenuLinkItem>
      );
      const link = screen.getByRole('menuitem');
      const icon = screen.getByTestId('i');
      expect(link.firstChild).toBe(icon);
      expect(link.textContent).toBe('Text');
    });
  });

  describe('ClassComposition', () => {
    it('ToneDanger_AddsToneDangerClass', () => {
      render(
        <MenuLinkItem href="/x" tone="danger">
          X
        </MenuLinkItem>
      );
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item tone-danger'
      );
    });

    it('ToneDefault_NoToneClass', () => {
      render(
        <MenuLinkItem href="/x" tone="default">
          X
        </MenuLinkItem>
      );
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item'
      );
    });

    it('ToneOmitted_NoToneClass', () => {
      render(<MenuLinkItem href="/x">X</MenuLinkItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item'
      );
    });

    it('ClassNameForwarded_AppendedAsExtra', () => {
      render(
        <MenuLinkItem href="/x" tone="danger" className="foo">
          X
        </MenuLinkItem>
      );
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item tone-danger foo'
      );
    });

    it('Rendered_MatchesMenuItemClassString', () => {
      const { container: linkContainer } = render(
        <MenuLinkItem href="/x" tone="danger" className="foo">
          X
        </MenuLinkItem>
      );
      const { container: btnContainer } = render(
        <MenuItem tone="danger" className="foo">
          X
        </MenuItem>
      );
      const link = linkContainer.querySelector('a') as HTMLAnchorElement;
      const button = btnContainer.querySelector('button') as HTMLButtonElement;
      expect(link.className).toBe('menu-item tone-danger foo');
      expect(button.className).toBe(link.className);
    });
  });

  describe('PropsPassthrough', () => {
    it('Href_ReachesAnchor', () => {
      render(<MenuLinkItem href="/lists/123">X</MenuLinkItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute('href', '/lists/123');
    });

    it('RefForwarding_PointsAtAnchor', () => {
      const ref = createRef<HTMLAnchorElement>();
      render(
        <MenuLinkItem ref={ref} href="/x">
          X
        </MenuLinkItem>
      );
      expect(ref.current?.tagName).toBe('A');
    });
  });
});
