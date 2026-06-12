/* eslint-disable testing-library/no-node-access --
 * ListCollectionsNav's contract is the exact DOM: the `.list-collections-nav`
 * wrapper, the `<nav class="list-collections-tabs">` tab strip, the active-
 * variant class + `aria-current` on the matching tab, and the conditional
 * `.list-collections-actions` slot. Role queries reach the tab links but cannot
 * read the wrapper/slot class names; classed `document` queries are required.
 */
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListCollectionsNav from '../ListCollectionsNav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

function setPathname(p: string) {
  vi.mocked(usePathname).mockReturnValue(p);
}

function getTab(label: string): HTMLAnchorElement {
  return screen.getByRole('link', { name: label }) as HTMLAnchorElement;
}

const TAB_LABELS = [
  'My Lists',
  'Bookmarks',
  'Recently visited',
  'Following',
] as const;

function expectOnlyActive(active: string | null) {
  for (const label of TAB_LABELS) {
    const tab = getTab(label);
    if (label === active) {
      expect(tab).toHaveClass('list-collections-tab--active');
      expect(tab).toHaveAttribute('aria-current', 'page');
    } else {
      expect(tab).not.toHaveClass('list-collections-tab--active');
      expect(tab).not.toHaveAttribute('aria-current');
    }
  }
}

describe('ListCollectionsNav', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReset();
    setPathname('/lists');
  });

  describe('TabStrip', () => {
    it('Default_RendersNavWrapperAndTablist', () => {
      render(<ListCollectionsNav />);
      const nav = document.querySelector(
        '.list-collections-nav > nav.list-collections-tabs'
      );
      expect(nav).not.toBeNull();
      expect(nav).toHaveAttribute('aria-label', 'List collections');
    });

    it('Default_RendersFourTabsWithHrefsAndLabelsInOrder', () => {
      render(<ListCollectionsNav />);
      const tabs = Array.from(
        document.querySelectorAll('nav.list-collections-tabs a')
      );
      expect(
        tabs.map((t) => [t.getAttribute('href'), t.textContent])
      ).toEqual([
        ['/lists', 'My Lists'],
        ['/lists/bookmarks', 'Bookmarks'],
        ['/lists/history', 'Recently visited'],
        ['/following', 'Following'],
      ]);
    });
  });

  describe('ActiveMarking', () => {
    it('PathnameLists_MyListsTabActive-OthersInactive', () => {
      setPathname('/lists');
      render(<ListCollectionsNav />);
      expectOnlyActive('My Lists');
    });

    it('PathnameBookmarks_BookmarksTabActive-MyListsInactive', () => {
      setPathname('/lists/bookmarks');
      render(<ListCollectionsNav />);
      expectOnlyActive('Bookmarks');
    });

    it('PathnameHistory_RecentlyVisitedTabActive', () => {
      setPathname('/lists/history');
      render(<ListCollectionsNav />);
      expectOnlyActive('Recently visited');
    });

    it('PathnameFollowing_FollowingTabActive', () => {
      setPathname('/following');
      render(<ListCollectionsNav />);
      expectOnlyActive('Following');
    });

    it('PathnameNonPeer_NoTabActive', () => {
      setPathname('/user/abc123');
      render(<ListCollectionsNav />);
      expectOnlyActive(null);
    });
  });

  describe('ActionsSlot', () => {
    it('ChildrenProvided_RendersActionsSlot', () => {
      render(
        <ListCollectionsNav>
          <button type="button">New list</button>
        </ListCollectionsNav>
      );
      const actions = document.querySelector('.list-collections-actions');
      expect(actions).not.toBeNull();
      expect(actions).toContainElement(
        screen.getByRole('button', { name: 'New list' })
      );
    });

    it('NoChildren_NoActionsSlot', () => {
      render(<ListCollectionsNav />);
      expect(document.querySelector('.list-collections-actions')).toBeNull();
    });
  });
});
