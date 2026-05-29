/* eslint-disable testing-library/no-node-access --
 * ListCardRow's contract is the exact DOM: the `.list-card-row-empty` branch,
 * the `role="list"` container with one `.list-card-row-item[role=listitem]` per
 * card in source order, and the trailing `MoreCard` item. Classed `document`
 * queries are required to assert item ordering, the wrapped `.list-card`, and
 * the `MoreCard`'s position as the last item.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ListCardRow from '../ListCardRow';
import { makeList } from './test-helpers';

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

describe('ListCardRow', () => {
  describe('EmptyState', () => {
    it('EmptyLists_RendersEmptyMessage-NoListRole', () => {
      render(<ListCardRow lists={[]} emptyMessage="No lists yet" />);
      expect(document.querySelector('.list-card-row-empty')).toHaveTextContent(
        'No lists yet'
      );
      expect(document.querySelector('[role="list"]')).toBeNull();
    });
  });

  describe('ListSemantics', () => {
    it('NonEmpty_RendersListRoleWithItemsInOrder', () => {
      const lists = [
        makeList({ id: 'a', name: 'Alpha' }),
        makeList({ id: 'b', name: 'Bravo' }),
        makeList({ id: 'c', name: 'Charlie' }),
      ];
      render(<ListCardRow lists={lists} emptyMessage="empty" />);
      expect(
        document.querySelector('.list-card-row[role="list"]')
      ).not.toBeNull();
      const items = document.querySelectorAll(
        '.list-card-row-item[role="listitem"]'
      );
      expect(items).toHaveLength(3);
      const hrefs = Array.from(items).map((item) =>
        item.querySelector('a.list-card')?.getAttribute('href')
      );
      expect(hrefs).toEqual(['/lists/a', '/lists/b', '/lists/c']);
    });

    it('ShowOwner_ThreadsToEachCard', () => {
      const lists = [
        makeList({ id: 'a', user: { name: 'Alice' } }),
        makeList({ id: 'b', user: { name: 'Bob' } }),
      ];
      render(<ListCardRow lists={lists} emptyMessage="empty" showOwner />);
      const bylines = Array.from(
        document.querySelectorAll('.list-card-byline')
      ).map((b) => b.textContent?.trim());
      expect(bylines).toEqual(['Alice', 'Bob']);
    });

    it('BookmarkedIds_ThreadsToEachCard', () => {
      const lists = [makeList({ id: 'a' }), makeList({ id: 'b' })];
      render(
        <ListCardRow
          lists={lists}
          emptyMessage="empty"
          bookmarkedIds={new Set(['a'])}
        />
      );
      const items = document.querySelectorAll('.list-card-row-item');
      expect(items[0].querySelector('[aria-label="Bookmarked"]')).not.toBeNull();
      expect(items[1].querySelector('[aria-label="Bookmarked"]')).toBeNull();
    });

    it('NoBookmarkedIds_AllCardsUnbookmarked', () => {
      const lists = [makeList({ id: 'a' }), makeList({ id: 'b' })];
      render(<ListCardRow lists={lists} emptyMessage="empty" />);
      expect(
        document.querySelectorAll('[aria-label="Bookmarked"]')
      ).toHaveLength(0);
    });
  });

  describe('MoreAffordance', () => {
    it('CountPositiveAndHrefPresent_RendersTrailingMoreCard', () => {
      const lists = [makeList({ id: 'a' }), makeList({ id: 'b' })];
      render(
        <ListCardRow
          lists={lists}
          emptyMessage="empty"
          moreCount={4}
          seeAllHref="/lists"
        />
      );
      const items = document.querySelectorAll('.list-card-row-item');
      expect(items).toHaveLength(3);
      const last = items[items.length - 1];
      expect(last.querySelector('a.more-card')).toHaveAttribute('href', '/lists');
    });

    it('CountZero_NoMoreCard', () => {
      const lists = [makeList({ id: 'a' })];
      render(
        <ListCardRow
          lists={lists}
          emptyMessage="empty"
          moreCount={0}
          seeAllHref="/lists"
        />
      );
      expect(document.querySelector('a.more-card')).toBeNull();
    });

    it('HrefAbsent_NoMoreCard', () => {
      const lists = [makeList({ id: 'a' })];
      render(<ListCardRow lists={lists} emptyMessage="empty" moreCount={4} />);
      expect(document.querySelector('a.more-card')).toBeNull();
    });

    it('CountZeroAndHrefAbsent_NoMoreCard', () => {
      const lists = [makeList({ id: 'a' })];
      render(<ListCardRow lists={lists} emptyMessage="empty" />);
      expect(document.querySelector('a.more-card')).toBeNull();
    });
  });
});
