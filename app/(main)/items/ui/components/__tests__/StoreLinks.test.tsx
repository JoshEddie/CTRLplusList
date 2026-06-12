/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * StoreLinks' contracts are page-scoped CSS classes (`.storeLinks-link`,
 * `.storeLinks-more-anchor`, `.storeLinks-menu-item`, `placement-above/below`,
 * `has-extras`) and structural relationships (the anchor wrapper containing
 * both trigger and the inline `<Menu>` popover) that role/text queries cannot
 * express — direct container traversal is required.
 */
import type { ItemDisplay, ItemStoreTable } from '@/lib/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StoreLinks from '../StoreLinks';

// Mock `next/link` so the primary `<LinkButton>` and the popover's
// `<MenuLinkItem>` rows render under jsdom without an AppRouterContext.
// Mirrors the inline mock in the menu / button system tests.
vi.mock('next/link', () => ({
  default: forwardRef<
    HTMLAnchorElement,
    AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >(function MockLink({ children, href, ...rest }, ref) {
    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  }),
}));

const store = (name: string, link: string, price: string): ItemStoreTable => ({
  name,
  link,
  price,
});

function makeItem(
  stores?: ItemStoreTable[],
  overrides?: Partial<ItemDisplay>
): ItemDisplay {
  return {
    id: 'item-1',
    name: 'Test Item',
    description: '',
    image_url: null,
    created_at: new Date(0),
    updated_at: new Date(0),
    user_id: 'user-1',
    quantity_limit: null,
    stores,
    ...overrides,
  };
}

const twoStores = () => [
  store('Cheap', 'https://cheap', '5'),
  store('Pricey', 'https://pricey', '9'),
];

const threeStores = () => [
  store('Cheap', 'https://cheap', '5'),
  store('Mid', 'https://mid', '9'),
  store('Top', 'https://top', '15'),
];

const getTrigger = () => screen.getByRole('button', { name: /more store/i });

// Drive `computePlacement` deterministically: jsdom implements neither layout
// (getBoundingClientRect → all-zero) nor scroll geometry (getComputedStyle
// .overflowY → ''), so both are stubbed. The returned `rects`/`clipping`
// collections are read lazily at call time, so tests populate them with the
// real elements after render, then open the popover.
function installGeometryStubs() {
  const rects = new Map<Element, { top: number; bottom: number }>();
  const clipping = new Set<Element>();
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (el) =>
      ({
        overflowY: clipping.has(el as Element) ? 'auto' : 'visible',
        // dom-accessibility-api (used by getByRole name matching) reads
        // visibility/display via getPropertyValue while the stub is installed.
        getPropertyValue: () => '',
      }) as unknown as CSSStyleDeclaration
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const r = rects.get(this) ?? { top: 0, bottom: 0 };
      return {
        top: r.top,
        bottom: r.bottom,
        left: 0,
        right: 0,
        width: 0,
        height: r.bottom - r.top,
        x: 0,
        y: r.top,
        toJSON: () => ({}),
      } as DOMRect;
    }
  );
  return { rects, clipping };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StoreLinks', () => {
  describe('Validity', () => {
    it('AllValidStores_PrimaryIsCheapest-PriceRowShowsLowest', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            store('Twenty', 'https://twenty', '20'),
            store('Five', 'https://five', '5'),
            store('Mid', 'https://mid', '12.5'),
          ])}
        />
      );
      expect(container.querySelector('.item-price')?.textContent).toBe('$5.00');
      expect(container.querySelector('.storeLinks-link')).toHaveAttribute(
        'href',
        'https://five'
      );
    });

    it('StoreMissingName_ExcludedFromPrimaryAndCount', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            { name: '', link: 'https://noname', price: '1' },
            store('Cheap', 'https://cheap', '5'),
            store('Pricey', 'https://pricey', '9'),
          ])}
        />
      );
      expect(container.querySelector('.storeLinks-link')).toHaveAttribute(
        'href',
        'https://cheap'
      );
      expect(getTrigger()).toHaveTextContent('+1');
      fireEvent.click(getTrigger());
      const rows = container.querySelectorAll('.storeLinks-menu-item');
      expect(rows).toHaveLength(2);
      rows.forEach((r) =>
        expect(r.getAttribute('href')).not.toBe('https://noname')
      );
    });

    it('StoreMissingLink_Excluded', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            { name: 'NoLink', link: '', price: '1' },
            store('Cheap', 'https://cheap', '5'),
            store('Pricey', 'https://pricey', '9'),
          ])}
        />
      );
      expect(getTrigger()).toHaveTextContent('+1');
      fireEvent.click(getTrigger());
      expect(container.querySelectorAll('.storeLinks-menu-item')).toHaveLength(
        2
      );
      expect(screen.queryByText('NoLink')).toBeNull();
    });

    it('StoreNonNumericPrice_Excluded', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            { name: 'Bad', link: 'https://bad', price: 'abc' },
            store('Cheap', 'https://cheap', '5'),
            store('Pricey', 'https://pricey', '9'),
          ])}
        />
      );
      expect(container.querySelector('.item-price')?.textContent).toBe('$5.00');
      fireEvent.click(getTrigger());
      expect(container.querySelectorAll('.storeLinks-menu-item')).toHaveLength(
        2
      );
      expect(screen.queryByText('$NaN')).toBeNull();
      expect(screen.queryByText('Bad')).toBeNull();
    });

    it('MixedValidInvalid_OnlyValidSortedAndCounted', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            { name: '', link: 'https://noname', price: '1' },
            { name: 'Bad', link: 'https://bad', price: 'abc' },
            store('Top', 'https://top', '15'),
            store('Cheap', 'https://cheap', '5'),
            store('Mid', 'https://mid', '9'),
          ])}
        />
      );
      expect(container.querySelector('.storeLinks-link')).toHaveAttribute(
        'href',
        'https://cheap'
      );
      expect(getTrigger()).toHaveTextContent('+2');
      fireEvent.click(getTrigger());
      const hrefs = [
        ...container.querySelectorAll('.storeLinks-menu-item'),
      ].map((r) => r.getAttribute('href'));
      expect(hrefs).toEqual(['https://cheap', 'https://mid', 'https://top']);
    });
  });

  describe('PriceRow', () => {
    it('SingleStore_PriceFormattedTwoDecimals', () => {
      const { container, rerender } = render(
        <StoreLinks item={makeItem([store('A', 'https://a', '5')])} />
      );
      expect(container.querySelector('.item-price')?.textContent).toBe('$5.00');
      rerender(
        <StoreLinks item={makeItem([store('A', 'https://a', '5.5')])} />
      );
      expect(container.querySelector('.item-price')?.textContent).toBe('$5.50');
    });

    it('ShowStoresFalse_PriceRowRenders-NoStoreLinks', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([store('A', 'https://a', '5')])}
          showStores={false}
        />
      );
      expect(container.querySelector('.item-price-row')).not.toBeNull();
      expect(container.querySelector('.storeLinks')).toBeNull();
    });

    it('ShowStoresDefault_StoreLinksRender', () => {
      const { container } = render(
        <StoreLinks item={makeItem([store('A', 'https://a', '5')])} />
      );
      expect(container.querySelector('.storeLinks')).not.toBeNull();
    });
  });

  describe('EmptyState', () => {
    it('NoValidStoreNoChildren_RendersNull', () => {
      const { container } = render(<StoreLinks item={makeItem([])} />);
      expect(container).toBeEmptyDOMElement();
      expect(container.querySelector('.item-action-row')).toBeNull();
      expect(container.querySelector('.item-price-row')).toBeNull();
      expect(container.querySelector('.storeLinks')).toBeNull();
    });

    it('EmptyStoresArray_TreatedAsNoValidStore', () => {
      const { container: empty } = render(<StoreLinks item={makeItem([])} />);
      expect(empty).toBeEmptyDOMElement();
      const { container: undef } = render(
        <StoreLinks item={makeItem(undefined)} />
      );
      expect(undef).toBeEmptyDOMElement();
    });
  });

  describe('StoreCount', () => {
    it('SingleStore_PrimaryChipOnly-NoMoreTrigger-NoHasExtras', () => {
      const { container } = render(
        <StoreLinks item={makeItem([store('A', 'https://a', '5')])} />
      );
      expect(container.querySelector('.storeLinks-link')).not.toBeNull();
      expect(container.querySelector('.storeLinks-more')).toBeNull();
      expect(
        container.querySelector('.storeLinks')?.classList.contains('has-extras')
      ).toBe(false);
    });

    it('MultiStore_PrimaryPlusMoreTrigger-HasExtras', () => {
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      expect(
        container.querySelector('.storeLinks')?.classList.contains('has-extras')
      ).toBe(true);
      expect(container.querySelector('.storeLinks-more-anchor')).not.toBeNull();
      expect(container.querySelector('.storeLinks-more')).not.toBeNull();
    });

    it('TwoStores_TriggerLabelSingular', () => {
      render(<StoreLinks item={makeItem(twoStores())} />);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-label', 'Show 1 more store');
      expect(trigger).toHaveTextContent('+1');
    });

    it('FourStores_TriggerLabelPlural', () => {
      render(
        <StoreLinks
          item={makeItem([
            store('A', 'https://a', '5'),
            store('B', 'https://b', '9'),
            store('C', 'https://c', '12'),
            store('D', 'https://d', '15'),
          ])}
        />
      );
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-label', 'Show 3 more stores');
      expect(trigger).toHaveTextContent('+3');
    });
  });

  describe('PrimaryChip', () => {
    it('PrimaryChip_IsAnchorWithStoreHref', () => {
      const { container } = render(
        <StoreLinks item={makeItem([store('Acme', 'https://acme', '5')])} />
      );
      const chip = container.querySelector('.storeLinks-link');
      expect(chip?.tagName).toBe('A');
      expect(chip).toHaveAttribute('href', 'https://acme');
    });

    it('PrimaryChip_TargetBlankRelNoreferrer', () => {
      const { container } = render(
        <StoreLinks item={makeItem([store('Acme', 'https://acme', '5')])} />
      );
      const chip = container.querySelector('.storeLinks-link');
      expect(chip).toHaveAttribute('target', '_blank');
      expect(chip).toHaveAttribute('rel', 'noreferrer');
    });

    it('PrimaryChip_RendersStoreNameAndOpenIcon', () => {
      const { container } = render(
        <StoreLinks item={makeItem([store('Acme', 'https://acme', '5')])} />
      );
      const chip = container.querySelector('.storeLinks-link');
      expect(chip).toHaveTextContent('Acme');
      const icon = chip?.querySelector('svg');
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Popover', () => {
    it('Default_PopoverClosed-AriaExpandedFalse', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('TriggerClick_OpensPopover-AriaExpandedTrue', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      fireEvent.click(getTrigger());
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('OpenPopover_ContainsRowPerValidStoreIncludingPrimary', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      fireEvent.click(getTrigger());
      expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    });

    it('PopoverRows_ShowNameAndPriceFormatted', () => {
      const { container } = render(
        <StoreLinks item={makeItem(threeStores())} />
      );
      fireEvent.click(getTrigger());
      const rows = [...container.querySelectorAll('.storeLinks-menu-item')];
      const expected = [
        ['Cheap', '$5.00'],
        ['Mid', '$9.00'],
        ['Top', '$15.00'],
      ];
      rows.forEach((row, i) => {
        expect(row.querySelector('.storeLinks-menu-name')?.textContent).toBe(
          expected[i][0]
        );
        expect(row.querySelector('.storeLinks-menu-price')?.textContent).toBe(
          expected[i][1]
        );
      });
    });

    it('PopoverRows_OrderedAscending-PrimaryFirst', () => {
      const { container } = render(
        <StoreLinks
          item={makeItem([
            store('Top', 'https://top', '15'),
            store('Cheap', 'https://cheap', '5'),
            store('Mid', 'https://mid', '9'),
          ])}
        />
      );
      fireEvent.click(getTrigger());
      const hrefs = [
        ...container.querySelectorAll('.storeLinks-menu-item'),
      ].map((r) => r.getAttribute('href'));
      expect(hrefs).toEqual(['https://cheap', 'https://mid', 'https://top']);
    });

    it('PopoverRowAnchors_TargetBlankRelNoreferrer-WithStoreHref', () => {
      const { container } = render(
        <StoreLinks item={makeItem(threeStores())} />
      );
      fireEvent.click(getTrigger());
      const rows = container.querySelectorAll('.storeLinks-menu-item');
      rows.forEach((r) => {
        expect(r).toHaveAttribute('target', '_blank');
        expect(r).toHaveAttribute('rel', 'noreferrer');
        expect(r.getAttribute('href')).toMatch(/^https:\/\//);
      });
    });

    it('TriggerClickAgain_ClosesPopover', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      const trigger = getTrigger();
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.click(trigger);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('ClickMenuRow_ClosesPopover', () => {
      const { container } = render(
        <StoreLinks item={makeItem(threeStores())} />
      );
      fireEvent.click(getTrigger());
      fireEvent.click(container.querySelectorAll('.storeLinks-menu-item')[0]);
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('OutsideMousedown_ClosesPopover', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      fireEvent.click(getTrigger());
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('EscapeKeydown_ClosesPopover', () => {
      render(<StoreLinks item={makeItem(threeStores())} />);
      fireEvent.click(getTrigger());
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });

  describe('HoverOpen', () => {
    it('MouseEnterAnchor_OpensImmediately', () => {
      vi.useFakeTimers();
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      fireEvent.mouseEnter(
        container.querySelector('.storeLinks-more-anchor') as Element
      );
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('MouseLeaveAnchor_SchedulesCloseAfter220ms', () => {
      vi.useFakeTimers();
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      const anchor = container.querySelector(
        '.storeLinks-more-anchor'
      ) as Element;
      fireEvent.mouseEnter(anchor);
      fireEvent.mouseLeave(anchor);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(220);
      });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('UnmountDuringCollapseGrace_ClearsPendingTimer', () => {
      vi.useFakeTimers();
      const { container, unmount } = render(
        <StoreLinks item={makeItem(twoStores())} />
      );
      const anchor = container.querySelector(
        '.storeLinks-more-anchor'
      ) as Element;
      fireEvent.mouseEnter(anchor);
      fireEvent.mouseLeave(anchor);
      // Delta, not absolute zero: React's scheduler can hold its own
      // setTimeout under fake timers, independent of the collapse timer.
      const pendingBeforeUnmount = vi.getTimerCount();
      expect(pendingBeforeUnmount).toBeGreaterThan(0);
      unmount();
      expect(vi.getTimerCount()).toBe(pendingBeforeUnmount - 1);
    });

    it('SecondMouseLeaveBeforeGrace_RestartsGraceFromScratch', () => {
      vi.useFakeTimers();
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      const anchor = container.querySelector(
        '.storeLinks-more-anchor'
      ) as Element;
      fireEvent.mouseEnter(anchor);
      fireEvent.mouseLeave(anchor);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      // A second leave restarts the 220ms grace; the first leave's pending
      // timer must be cleared so it can't close the menu at its original 220.
      fireEvent.mouseLeave(anchor);
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('MouseLeaveThenReEnterBeforeGrace_StaysOpen', () => {
      vi.useFakeTimers();
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      const anchor = container.querySelector(
        '.storeLinks-more-anchor'
      ) as Element;
      fireEvent.mouseEnter(anchor);
      fireEvent.mouseLeave(anchor);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.mouseEnter(anchor);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('OpenPopover_AnchorWrapsTriggerAndMenu', () => {
      const { container } = render(<StoreLinks item={makeItem(twoStores())} />);
      fireEvent.click(getTrigger());
      const anchor = container.querySelector(
        '.storeLinks-more-anchor'
      ) as Element;
      expect(anchor.contains(getTrigger())).toBe(true);
      expect(anchor.contains(screen.getByRole('menu'))).toBe(true);
    });
  });

  describe('Placement', () => {
    it('RoomAbove_PlacementAbove', () => {
      const { rects, clipping } = installGeometryStubs();
      const { container } = render(
        <div data-testid="clip">
          <StoreLinks item={makeItem(twoStores())} />
        </div>
      );
      const trigger = getTrigger();
      clipping.add(screen.getByTestId('clip'));
      rects.set(screen.getByTestId('clip'), { top: 0, bottom: 100 });
      rects.set(trigger, { top: 90, bottom: 100 });
      fireEvent.click(trigger);
      expect(
        container
          .querySelector('.storeLinks-more-anchor')
          ?.classList.contains('placement-above')
      ).toBe(true);
    });

    it('InsufficientRoomAbove_PlacementBelow', () => {
      const { rects, clipping } = installGeometryStubs();
      const { container } = render(
        <div data-testid="clip">
          <StoreLinks item={makeItem(twoStores())} />
        </div>
      );
      const trigger = getTrigger();
      clipping.add(screen.getByTestId('clip'));
      rects.set(screen.getByTestId('clip'), { top: 0, bottom: 200 });
      rects.set(trigger, { top: 5, bottom: 15 });
      fireEvent.click(trigger);
      expect(
        container
          .querySelector('.storeLinks-more-anchor')
          ?.classList.contains('placement-below')
      ).toBe(true);
    });

    it('ClippingAncestor_PlacementUsesAncestorRect', () => {
      const { rects, clipping } = installGeometryStubs();
      const { container } = render(
        <div data-testid="clip">
          <div data-testid="mid">
            <StoreLinks item={makeItem(twoStores())} />
          </div>
        </div>
      );
      const trigger = getTrigger();
      // Only the outer wrapper clips; the intermediate stays `visible`, so the
      // walk must skip it and resolve against the clipping ancestor's rect
      // (bottom: 100). If it fell through to the viewport (innerHeight 768)
      // the ample room-below would flip placement to `below`.
      clipping.add(screen.getByTestId('clip'));
      rects.set(screen.getByTestId('clip'), { top: 0, bottom: 100 });
      rects.set(trigger, { top: 50, bottom: 60 });
      fireEvent.click(trigger);
      expect(
        container
          .querySelector('.storeLinks-more-anchor')
          ?.classList.contains('placement-above')
      ).toBe(true);
    });

    it('OpenToggle_PlacementRecomputes', () => {
      const { rects, clipping } = installGeometryStubs();
      const { container } = render(
        <div data-testid="clip">
          <StoreLinks item={makeItem(twoStores())} />
        </div>
      );
      // Before opening, `computePlacement` has not run: the anchor carries the
      // initial `placement-above` state.
      expect(
        container
          .querySelector('.storeLinks-more-anchor')
          ?.classList.contains('placement-above')
      ).toBe(true);
      const trigger = getTrigger();
      clipping.add(screen.getByTestId('clip'));
      rects.set(screen.getByTestId('clip'), { top: 0, bottom: 200 });
      rects.set(trigger, { top: 5, bottom: 15 });
      fireEvent.click(trigger);
      expect(
        container
          .querySelector('.storeLinks-more-anchor')
          ?.classList.contains('placement-below')
      ).toBe(true);
    });
  });

  describe('ClickIsolation', () => {
    it('ClickPrimaryChip_DoesNotBubbleToParent', () => {
      const spy = vi.fn();
      const { container } = render(
        <div onClick={spy}>
          <StoreLinks item={makeItem([store('A', 'https://a', '5')])} />
        </div>
      );
      fireEvent.click(container.querySelector('.storeLinks-link') as Element);
      expect(spy).not.toHaveBeenCalled();
    });

    it('ClickMoreTrigger_DoesNotBubbleToParent-AndToggles', () => {
      const spy = vi.fn();
      render(
        <div onClick={spy}>
          <StoreLinks item={makeItem(twoStores())} />
        </div>
      );
      fireEvent.click(getTrigger());
      expect(spy).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });
});
