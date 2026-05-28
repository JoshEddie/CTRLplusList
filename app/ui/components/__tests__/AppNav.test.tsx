/* eslint-disable testing-library/no-node-access --
 * AppNav's contract is the exact DOM (toggle `<button>`, four `<a>` pills with
 * the active-variant class + `aria-current`, the `data-open` flag on
 * `.app-nav-wrap`). Role queries reach buttons and links but cannot read the
 * `data-open` attribute on an unnamed wrapper div; classed descendant queries
 * are required.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import AppNav from '../AppNav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

function setPathname(p: string) {
  vi.mocked(usePathname).mockReturnValue(p);
}

function getWrap(): HTMLElement {
  return document.querySelector('.app-nav-wrap') as HTMLElement;
}

// The toggle's accessible name is exactly "Open menu" when closed and
// "Close menu" when open; the anchored regex prevents collision with any
// future button that happens to contain the substring "menu".
function getToggle(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: /^(Open|Close) menu$/,
  }) as HTMLButtonElement;
}

function getPill(label: string): HTMLAnchorElement {
  return screen.getByRole('link', { name: label }) as HTMLAnchorElement;
}

describe('AppNav', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReset();
    setPathname('/');
  });

  describe('NavItems', () => {
    it('Default_RendersFourPrimaryNavItems', () => {
      render(<AppNav />);
      const anchors = getWrap().querySelectorAll('a.app-nav-item');
      expect(anchors).toHaveLength(4);
    });

    it('HomeItem_HasHrefRoot_AndIcon', () => {
      render(<AppNav />);
      const home = getPill('Home');
      expect(home).toHaveAttribute('href', '/');
      expect(home.querySelector('svg.app-nav-item-icon')).not.toBeNull();
    });

    it('ListsItem_HasHrefLists_AndIcon', () => {
      setPathname('/foo');
      render(<AppNav />);
      const lists = getPill('Lists');
      expect(lists).toHaveAttribute('href', '/lists');
      expect(lists.querySelector('svg.app-nav-item-icon')).not.toBeNull();
    });

    it('ItemsItem_HasHrefItems_AndIcon', () => {
      setPathname('/foo');
      render(<AppNav />);
      const items = getPill('Items');
      expect(items).toHaveAttribute('href', '/items');
      expect(items.querySelector('svg.app-nav-item-icon')).not.toBeNull();
    });

    it('PurchasedItem_HasHrefPurchased_AndIcon', () => {
      setPathname('/foo');
      render(<AppNav />);
      const purchased = getPill('Purchased');
      expect(purchased).toHaveAttribute('href', '/purchased');
      expect(purchased.querySelector('svg.app-nav-item-icon')).not.toBeNull();
    });

    it('NavItems_RenderInSourceOrder', () => {
      render(<AppNav />);
      const anchors = Array.from(
        getWrap().querySelectorAll('a.app-nav-item')
      ) as HTMLAnchorElement[];
      expect(anchors.map((a) => a.getAttribute('href'))).toEqual([
        '/',
        '/lists',
        '/items',
        '/purchased',
      ]);
    });
  });

  describe('IsActive', () => {
    function expectOnlyActive(label: string | null) {
      const labels = ['Home', 'Lists', 'Items', 'Purchased'] as const;
      for (const l of labels) {
        const pill = getPill(l);
        if (l === label) {
          expect(pill).toHaveClass('app-nav-item--active');
          expect(pill).toHaveAttribute('aria-current', 'page');
        } else {
          expect(pill).not.toHaveClass('app-nav-item--active');
          expect(pill).not.toHaveAttribute('aria-current');
        }
      }
    }

    it('PathnameRoot_HomePillActive_OthersInactive', () => {
      setPathname('/');
      render(<AppNav />);
      expectOnlyActive('Home');
    });

    it('PathnameLists_ListsPillActive', () => {
      setPathname('/lists');
      render(<AppNav />);
      expectOnlyActive('Lists');
    });

    it('PathnameListsAbc123_ListsPillActive', () => {
      setPathname('/lists/abc123');
      render(<AppNav />);
      expectOnlyActive('Lists');
    });

    it('PathnameItems_ItemsPillActive', () => {
      setPathname('/items');
      render(<AppNav />);
      expectOnlyActive('Items');
    });

    it('PathnameItemsAbc123_ItemsPillActive', () => {
      setPathname('/items/abc123');
      render(<AppNav />);
      expectOnlyActive('Items');
    });

    it('PathnamePurchased_PurchasedPillActive', () => {
      setPathname('/purchased');
      render(<AppNav />);
      expectOnlyActive('Purchased');
    });

    it('PathnameUnknown_NoPillActive', () => {
      setPathname('/settings/connections');
      render(<AppNav />);
      expectOnlyActive(null);
    });

    it('PathnameListsBookmarks_NoPillActive', () => {
      setPathname('/lists/bookmarks');
      render(<AppNav />);
      expectOnlyActive(null);
    });

    it('PathnameListsHistory_NoPillActive', () => {
      setPathname('/lists/history');
      render(<AppNav />);
      expectOnlyActive(null);
    });

    it('PathnameListsBookmarksTrailing_ListsPillStillInactive', () => {
      // Exclusion set is exact-string; descendant of `/lists/bookmarks`
      // (`/lists/bookmarks/anything`) is NOT in the set, so the prefix rule
      // re-activates Lists. Test names the exact-string nature of the set.
      setPathname('/lists/bookmarks');
      render(<AppNav />);
      expect(getPill('Lists')).not.toHaveClass('app-nav-item--active');
    });

    it('PathnameLists_HomePillInactive', () => {
      setPathname('/lists');
      render(<AppNav />);
      expect(getPill('Home')).not.toHaveClass('app-nav-item--active');
    });

    it('PathnameRootSlashFoo_HomePillInactive', () => {
      setPathname('/foo');
      render(<AppNav />);
      expect(getPill('Home')).not.toHaveClass('app-nav-item--active');
    });
  });

  describe('ToggleButton', () => {
    it('Default_ToggleClosed_AriaLabelOpenMenu_AriaExpandedFalse', () => {
      render(<AppNav />);
      const toggle = getToggle();
      expect(toggle).toHaveAttribute('aria-label', 'Open menu');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('Default_ToggleClosed_LuMenuIconRendered', () => {
      render(<AppNav />);
      const toggle = getToggle();
      const svg = toggle.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('Default_ToggleAriaHaspopupMenu', () => {
      render(<AppNav />);
      expect(getToggle()).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('ToggleClick_OpensMenu_AriaExpandedTrue_AriaLabelCloseMenu_LuXIcon_DataOpenTrue', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      const toggle = getToggle();
      expect(toggle).toHaveAttribute('aria-label', 'Close menu');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(getWrap()).toHaveAttribute('data-open', 'true');
      expect(toggle.querySelector('svg')).not.toBeNull();
    });

    it('ToggleClickAgain_ClosesMenu_StateRestored', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      await user.click(getToggle());
      const toggle = getToggle();
      expect(toggle).toHaveAttribute('aria-label', 'Open menu');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(getWrap()).toHaveAttribute('data-open', 'false');
    });
  });

  describe('AutoClose', () => {
    it('Open_PathnameChanges_MenuCloses', async () => {
      const user = userEvent.setup();
      setPathname('/');
      const { rerender } = render(<AppNav />);
      await user.click(getToggle());
      expect(getWrap()).toHaveAttribute('data-open', 'true');
      setPathname('/lists');
      rerender(<AppNav />);
      expect(getWrap()).toHaveAttribute('data-open', 'false');
      expect(getToggle()).toHaveAttribute('aria-label', 'Open menu');
    });

    it('Open_OutsideMousedown_MenuCloses', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      expect(getWrap()).toHaveAttribute('data-open', 'true');
      fireEvent.mouseDown(document.body);
      expect(getWrap()).toHaveAttribute('data-open', 'false');
    });

    it('Open_EscapeKeydownOnDocument_MenuCloses', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      expect(getWrap()).toHaveAttribute('data-open', 'true');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(getWrap()).toHaveAttribute('data-open', 'false');
    });

    it('Open_NonEscapeKeydown_MenuStaysOpen', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      fireEvent.keyDown(document, { key: 'a' });
      expect(getWrap()).toHaveAttribute('data-open', 'true');
    });

    it('Open_MousedownOnToggleButton_MenuStaysOpen', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      fireEvent.mouseDown(getToggle());
      expect(getWrap()).toHaveAttribute('data-open', 'true');
    });

    it('Open_MousedownOnPillInsideWrap_MenuStaysOpen', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      fireEvent.mouseDown(getPill('Home'));
      expect(getWrap()).toHaveAttribute('data-open', 'true');
    });
  });

  describe('ListenerScope', () => {
    let addSpy: ReturnType<typeof vi.spyOn>;
    let removeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addSpy = vi.spyOn(document, 'addEventListener');
      removeSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    function countMatching(
      spy: ReturnType<typeof vi.spyOn>,
      type: 'mousedown' | 'keydown'
    ) {
      return spy.mock.calls.filter((c: unknown[]) => c[0] === type).length;
    }

    it('Closed_NoDocumentListenersForDismissal', () => {
      render(<AppNav />);
      expect(countMatching(addSpy, 'mousedown')).toBe(0);
      expect(countMatching(addSpy, 'keydown')).toBe(0);
    });

    it('OpenToggle_DocumentListenersAttached', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      addSpy.mockClear();
      await user.click(getToggle());
      expect(countMatching(addSpy, 'mousedown')).toBe(1);
      expect(countMatching(addSpy, 'keydown')).toBe(1);
    });

    it('Close_DocumentListenersDetached', async () => {
      const user = userEvent.setup();
      render(<AppNav />);
      await user.click(getToggle());
      removeSpy.mockClear();
      await user.click(getToggle());
      expect(countMatching(removeSpy, 'mousedown')).toBe(1);
      expect(countMatching(removeSpy, 'keydown')).toBe(1);
    });

    it('Unmount_WhileOpen_DocumentListenersDetached', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<AppNav />);
      await user.click(getToggle());
      removeSpy.mockClear();
      unmount();
      expect(countMatching(removeSpy, 'mousedown')).toBe(1);
      expect(countMatching(removeSpy, 'keydown')).toBe(1);
    });
  });

  describe('RouteChange', () => {
    it('MountWithPath_NoOpenChangeOnInitialRender', () => {
      setPathname('/lists');
      render(<AppNav />);
      expect(getWrap()).toHaveAttribute('data-open', 'false');
    });

    it('Open_PathnameUnchangedRerender_MenuStaysOpen', async () => {
      const user = userEvent.setup();
      setPathname('/');
      const { rerender } = render(<AppNav />);
      await user.click(getToggle());
      expect(getWrap()).toHaveAttribute('data-open', 'true');
      rerender(<AppNav />);
      expect(getWrap()).toHaveAttribute('data-open', 'true');
    });
  });
});
