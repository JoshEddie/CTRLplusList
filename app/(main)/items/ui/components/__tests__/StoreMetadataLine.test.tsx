/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The metadata line is intentionally inert text with no role; assertions
 * target its classes and tag names.
 */
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StoreMetadataLine from '../StoreMetadataLine';

// jsdom has no layout: scrollWidth/clientWidth are 0 by default (no
// overflow, all names fit). The fit-pass tests stub the prototype getters
// to simulate an overflowing line.
function stubWidths(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
}

type ResizeCallback = () => void;
const resizeCallbacks: ResizeCallback[] = [];
const disconnectSpy = vi.fn();

class FakeResizeObserver {
  constructor(cb: ResizeCallback) {
    resizeCallbacks.push(cb);
  }
  observe() {}
  disconnect = disconnectSpy;
}

afterEach(() => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  delete proto['scrollWidth'];
  delete proto['clientWidth'];
  vi.unstubAllGlobals();
  resizeCallbacks.length = 0;
  disconnectSpy.mockClear();
});

const store = (name: string, link: string, price: string) => ({
  name,
  link,
  price,
});

const makeItem = (stores: unknown) =>
  ({ id: 'i1', name: 'Gift', stores }) as never;

describe('StoreMetadataLine', () => {
  it('ThreeStores_NamesCheapestTwoWithOverflowCount', () => {
    const { container } = render(
      <StoreMetadataLine
        item={makeItem([
          store('Etsy', 'https://e', '41.00'),
          store('Amazon', 'https://a', '35.50'),
          store('Target', 'https://t', '38.00'),
        ])}
      />
    );
    expect(container.querySelector('.item-price')).toHaveTextContent('$35.50');
    expect(container.querySelector('.item-store-metadata')).toHaveTextContent(
      '· Amazon · Target +1'
    );
  });

  it('SingleStore_NamesItWithoutOverflowSuffix', () => {
    const { container } = render(
      <StoreMetadataLine item={makeItem([store('Amazon', 'https://a', '5')])} />
    );
    expect(container.querySelector('.item-store-metadata')).toHaveTextContent(
      '· Amazon'
    );
    expect(
      container.querySelector('.item-store-metadata')?.textContent
    ).not.toContain('+');
  });

  it('MultiStore_RendersNoInteractiveElements', () => {
    const { container } = render(
      <StoreMetadataLine
        item={makeItem([
          store('Amazon', 'https://a', '5'),
          store('Target', 'https://t', '6'),
        ])}
      />
    );
    expect(container.querySelector('a, button')).toBeNull();
  });

  describe('FitPass', () => {
    const THREE = [
      store('Crate & Barrel', 'https://c', '35.50'),
      store('Williams Sonoma', 'https://w', '38.00'),
      store('Etsy', 'https://e', '41.00'),
    ];

    it('OverflowingLine_DropsToOneNameAndGrowsOverflowCount', () => {
      stubWidths(300, 100);
      const { container } = render(<StoreMetadataLine item={makeItem(THREE)} />);
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Crate & Barrel +2');
    });

    it('StillOverflowingAtOneName_NeverDropsBelowOne', () => {
      stubWidths(300, 10);
      const { container } = render(
        <StoreMetadataLine
          item={makeItem([
            store('Crate & Barrel', 'https://c', '35.50'),
            store('Williams Sonoma', 'https://w', '38.00'),
          ])}
        />
      );
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Crate & Barrel +1');
    });

    it('ContainerResize_RestoresSecondNameWhenItFitsAgain', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      stubWidths(300, 100);
      const { container } = render(<StoreMetadataLine item={makeItem(THREE)} />);
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Crate & Barrel +2');
      stubWidths(100, 300);
      act(() => resizeCallbacks.forEach((cb) => cb()));
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Crate & Barrel · Williams Sonoma +1');
    });

    it('SingleNameStillOverflowing_CountRendersInItsOwnNonTruncatingSpan', () => {
      stubWidths(300, 10);
      const { container } = render(
        <StoreMetadataLine
          item={makeItem([
            store(
              'Really long store name that carries really cool items',
              'https://l',
              '1000.00'
            ),
            store('Williams Sonoma', 'https://w', '1249.95'),
            store('Crate & Barrel', 'https://c', '1399.00'),
          ])}
        />
      );
      // The name span ellipsis-truncates visually (no layout in jsdom), but
      // the +N count lives outside it so truncation can never swallow it.
      expect(
        container.querySelector('.item-store-metadata-names')
      ).toHaveTextContent('· Really long store name that carries really cool items');
      expect(
        container.querySelector('.item-store-metadata-count')
      ).toHaveTextContent('+2');
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$1,000.00'
      );
    });

    it('Unmount_DisconnectsResizeObserver', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const { unmount } = render(<StoreMetadataLine item={makeItem(THREE)} />);
      expect(disconnectSpy).not.toHaveBeenCalled();
      unmount();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('StoreListChanges_RestartsFitFromMax', () => {
      stubWidths(300, 100);
      const { container, rerender } = render(
        <StoreMetadataLine item={makeItem(THREE)} />
      );
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Crate & Barrel +2');
      stubWidths(100, 300);
      rerender(
        <StoreMetadataLine item={makeItem([store('Amazon', 'https://a', '5')])} />
      );
      expect(
        container.querySelector('.item-store-metadata')
      ).toHaveTextContent('· Amazon');
    });
  });

  it('NoValidStore_RendersNothing', () => {
    const { container } = render(
      <StoreMetadataLine item={makeItem([store('', '', 'NaNprice')])} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
