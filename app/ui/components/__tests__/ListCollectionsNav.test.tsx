/* eslint-disable testing-library/no-node-access --
 * The wrapper and the actions slot are class-only contracts: `.list-collections-nav`
 * pins the strip below the app nav, and `.list-collections-actions` is the
 * conditional trailing slot. Role queries reach neither class name, so classed
 * `document` queries are required. Active-marking is the tabs family's own test.
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

describe('ListCollectionsNav', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReset();
    vi.mocked(usePathname).mockReturnValue('/lists');
  });

  describe('TabStrip', () => {
    it('Default_RendersLabelledNavInsidePinnedWrapper', () => {
      render(<ListCollectionsNav />);

      const nav = screen.getByRole('navigation', { name: 'List collections' });
      expect(document.querySelector('.list-collections-nav')).toContainElement(
        nav
      );
    });

    it('Default_RendersFourTabsWithHrefsAndLabelsInOrder', () => {
      render(<ListCollectionsNav />);

      expect(
        screen
          .getAllByRole('link')
          .map((tab) => [tab.getAttribute('href'), tab.textContent])
      ).toEqual([
        ['/lists', 'My Lists'],
        ['/lists/bookmarks', 'Bookmarks'],
        ['/lists/history', 'Recently visited'],
        ['/following', 'Following'],
      ]);
    });

    it('PathnameBookmarks_PassesThatPathnameAsTheCurrentTab', () => {
      vi.mocked(usePathname).mockReturnValue('/lists/bookmarks');
      render(<ListCollectionsNav />);

      expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute(
        'aria-current',
        'page'
      );
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
