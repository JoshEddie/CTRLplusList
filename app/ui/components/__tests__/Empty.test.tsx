/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * `empty-state-system` SHALLs lock the exact DOM shape (.empty-container div
 * wrapping <h3>/<p>) and the FaPlus svg presence inside the CTA. The
 * container and decorative icon carry no role or accessible name, so
 * role-based queries cannot reach them; `container.querySelector` is the
 * only way to assert the spec'd structure.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Empty from '../Empty';

// `LinkButton` renders through `next/link`, which reads AppRouterContext for
// prefetching; in jsdom with no provider, render() throws. The mock forwards
// href/children/props to a plain <a> — sufficient to assert href, class, and
// accessible name. Same pattern as `LinkButton.test.tsx`.
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

describe('Empty', () => {
  describe('Title', () => {
    it('TypeItem_TitleCapitalized', () => {
      render(<Empty type="item" setShowNewItem={vi.fn()} />);
      expect(
        screen.getByRole('heading', { level: 3 }).textContent
      ).toBe('No Items Found');
    });

    it('TypeList_TitleCapitalized', () => {
      render(<Empty type="list" />);
      expect(
        screen.getByRole('heading', { level: 3 }).textContent
      ).toBe('No Lists Found');
    });

    it('TypePurchase_TitleExactString', () => {
      render(<Empty type="purchase" />);
      expect(
        screen.getByRole('heading', { level: 3 }).textContent
      ).toBe('No Purchases Found');
    });
  });

  describe('Description', () => {
    it('TypeItem_DescriptionCapitalized', () => {
      const { container } = render(
        <Empty type="item" setShowNewItem={vi.fn()} />
      );
      const description = container.querySelector('.empty-container > p');
      expect(description).not.toBeNull();
      expect(description!.textContent).toBe('Create your first Item below.');
    });

    it('TypePurchase_DescriptionExactString', () => {
      const { container } = render(<Empty type="purchase" />);
      const description = container.querySelector('.empty-container > p');
      expect(description).not.toBeNull();
      expect(description!.textContent).toBe(
        'You have not marked any items as purchased yet.'
      );
    });
  });

  describe('CTABranching', () => {
    it('TypePurchase_NoCTARendered', () => {
      const { container } = render(<Empty type="purchase" />);
      const emptyContainer = container.querySelector('.empty-container')!;
      expect(emptyContainer.querySelector('button')).toBeNull();
      expect(emptyContainer.querySelector('a')).toBeNull();
    });

    it('NonPurchase_WithSetter_RendersButtonWithPrimaryVariant', () => {
      render(<Empty type="item" setShowNewItem={vi.fn()} />);
      const cta = screen.getByRole('button', { name: 'Create Item' });
      expect(cta).toHaveClass('btn', 'primary');
    });

    it('NonPurchase_WithSetter_ButtonText_CreateCapitalized', () => {
      render(<Empty type="item" setShowNewItem={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Create Item' })
      ).toBeInTheDocument();
    });

    it('NonPurchase_WithSetter_ButtonClick_InvokesSetterWithTrue', async () => {
      const user = userEvent.setup();
      const setShowNewItem = vi.fn();
      render(<Empty type="item" setShowNewItem={setShowNewItem} />);
      await user.click(screen.getByRole('button', { name: 'Create Item' }));
      expect(setShowNewItem).toHaveBeenCalledTimes(1);
      expect(setShowNewItem).toHaveBeenCalledWith(true);
    });

    it('NonPurchase_WithSetter_IconRendered', () => {
      render(<Empty type="item" setShowNewItem={vi.fn()} />);
      const button = screen.getByRole('button', { name: 'Create Item' });
      expect(button.querySelector('svg')).not.toBeNull();
    });

    it('NonPurchase_NoSetter_RendersLinkButton', () => {
      render(<Empty type="item" />);
      const cta = screen.getByRole('link', { name: 'Create Item' });
      expect(cta.tagName).toBe('A');
      expect(cta).toHaveClass('btn', 'primary');
    });

    it('NonPurchase_NoSetter_TypeItem_LinkHref_ItemsNew', () => {
      render(<Empty type="item" />);
      expect(
        screen.getByRole('link', { name: 'Create Item' })
      ).toHaveAttribute('href', '/items/new');
    });

    it('NonPurchase_NoSetter_TypeList_LinkHref_ListsNew', () => {
      render(<Empty type="list" />);
      expect(
        screen.getByRole('link', { name: 'Create List' })
      ).toHaveAttribute('href', '/lists/new');
    });

    it('NonPurchase_NoSetter_LinkText_CreateCapitalized', () => {
      render(<Empty type="item" />);
      expect(
        screen.getByRole('link', { name: 'Create Item' })
      ).toBeInTheDocument();
    });
  });

  describe('ContainerShape', () => {
    it('EmptyContainer_RendersTitleAndDescriptionAsHeadingAndParagraph', () => {
      const { container } = render(
        <Empty type="item" setShowNewItem={vi.fn()} />
      );
      const wrapper = container.querySelector('div.empty-container');
      expect(wrapper).not.toBeNull();
      expect(wrapper!.querySelector('h3')).not.toBeNull();
      expect(wrapper!.querySelector('p')).not.toBeNull();
    });
  });
});
