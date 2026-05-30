/* eslint-disable testing-library/no-node-access --
 * ListCard's contract is the exact DOM: the `<a class="list-card">` root, the
 * classed name/occasion/date spans, the `title` attribute, the conditional
 * `.list-card-byline`, and the subtitle-vs-placeholder swap. Role queries reach
 * the link and the labeled bookmark icon but cannot read class-named spans or
 * assert element absence by class; classed `document` queries are required.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ListCard from '../ListCard';
import { makeList } from './test-helpers';

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

describe('ListCard', () => {
  describe('LinkAndFields', () => {
    it('Default_RendersAnchorWithListDetailHref', () => {
      render(<ListCard list={makeList({ id: 'abc123' })} />);
      expect(document.querySelector('a.list-card')).toHaveAttribute(
        'href',
        '/lists/abc123'
      );
    });

    it('Default_NameRendersInNameTextSpan-WithTitleAttr', () => {
      render(<ListCard list={makeList({ name: 'Birthday Wishlist' })} />);
      const nameText = document.querySelector('.list-card-name-text');
      expect(nameText).toHaveTextContent('Birthday Wishlist');
      expect(nameText).toHaveAttribute('title', 'Birthday Wishlist');
    });

    it('Default_OccasionRendersInOccasionSpan', () => {
      render(<ListCard list={makeList({ occasion: 'Christmas' })} />);
      expect(document.querySelector('.list-card-occasion')).toHaveTextContent(
        'Christmas'
      );
    });

    it('Date_RendersInUtcTimeZone-NotLocalDay', () => {
      // 00:30 UTC on Jan 1 falls on Dec 31 in any zone west of UTC; the
      // `timeZone: 'UTC'` formatting option must pin the displayed day to Jan 01.
      render(
        <ListCard list={makeList({ date: new Date('2025-01-01T00:30:00Z') })} />
      );
      expect(document.querySelector('.list-card-date')).toHaveTextContent(
        'Jan 01, 2025'
      );
    });
  });

  describe('Subtitle', () => {
    it('SubtitlePresent_RendersSubtitleDiv-NoPlaceholder', () => {
      render(<ListCard list={makeList({ subtitle: 'For the whole family' })} />);
      expect(document.querySelector('.list-card-subtitle')).toHaveTextContent(
        'For the whole family'
      );
      expect(
        document.querySelector('.list-card-subtitle-placeholder')
      ).toBeNull();
    });

    it('SubtitleAbsent_RendersAriaHiddenPlaceholder-NoSubtitle', () => {
      render(<ListCard list={makeList({ subtitle: null })} />);
      const placeholder = document.querySelector(
        '.list-card-subtitle-placeholder'
      );
      expect(placeholder).not.toBeNull();
      expect(placeholder).toHaveAttribute('aria-hidden');
      expect(document.querySelector('.list-card-subtitle')).toBeNull();
    });
  });

  describe('BookmarkIndicator', () => {
    it('Bookmarked_RendersLabeledIndicatorInsideName', () => {
      render(<ListCard list={makeList()} bookmarked />);
      const indicator = document.querySelector('[aria-label="Bookmarked"]');
      expect(indicator).toHaveClass('list-card-bookmark-indicator');
      expect(document.querySelector('.list-card-name')).toContainElement(
        indicator as HTMLElement
      );
    });

    it('NotBookmarked_NoIndicator', () => {
      render(<ListCard list={makeList()} />);
      expect(document.querySelector('[aria-label="Bookmarked"]')).toBeNull();
    });
  });

  describe('OwnerByline', () => {
    it('ShowOwnerTrueWithName_RendersByline', () => {
      render(<ListCard list={makeList({ user: { name: 'Alice' } })} showOwner />);
      expect(document.querySelector('.list-card-byline')).toHaveTextContent(
        'Alice'
      );
    });

    it('ShowOwnerFalse_NoByline-EvenWithName', () => {
      render(<ListCard list={makeList({ user: { name: 'Alice' } })} />);
      expect(document.querySelector('.list-card-byline')).toBeNull();
    });

    it('ShowOwnerTrueButNullUser_NoByline', () => {
      render(<ListCard list={makeList({ user: null })} showOwner />);
      expect(document.querySelector('.list-card-byline')).toBeNull();
    });

    it('ShowOwnerTrueButNullName_NoByline', () => {
      render(<ListCard list={makeList({ user: { name: null } })} showOwner />);
      expect(document.querySelector('.list-card-byline')).toBeNull();
    });
  });
});
