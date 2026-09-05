/* eslint-disable testing-library/no-node-access --
 * ListCard's contract is the exact DOM: the `<a class="list-card">` root, the
 * classed name/occasion/date spans, the `title` attribute, the conditional
 * `.list-card-byline`, and the subtitle-vs-placeholder swap. Role queries reach
 * the link and the labeled bookmark icon but cannot read class-named spans or
 * assert element absence by class; classed `document` queries are required.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ListCard from '../ListCard';
import { makeList } from './test-helpers';
import { makeProfile } from '@/test/helpers/profile';
import { ACCENT_PRESETS } from '@/lib/accent';

const ART = 'data:image/svg+xml;utf8,%3Csvg%2F%3E';

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
      render(
        <ListCard list={makeList({ subtitle: 'For the whole family' })} />
      );
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
    it('ShowOwnerTrueWithName_RendersBylineWithOwnerDisc', () => {
      render(
        <ListCard list={makeList({ profile: makeProfile('p1', 'Alice') })} showOwner />
      );
      const byline = document.querySelector('.list-card-byline');
      expect(byline).toHaveTextContent('Alice');
      expect(byline?.querySelector('.list-card-byline-avatar')).not.toBeNull();
    });

    it('ShowOwnerFalse_NoByline-EvenWithName', () => {
      render(
        <ListCard list={makeList({ profile: makeProfile('p1', 'Alice') })} />
      );
      expect(document.querySelector('.list-card-byline')).toBeNull();
    });

    it('ShowOwnerTrueButNullProfile_NoByline', () => {
      render(<ListCard list={makeList({ profile: null })} showOwner />);
      expect(document.querySelector('.list-card-byline')).toBeNull();
    });

    it('OwnerProfileWithArt_BylineRendersThatProfilesArt', () => {
      render(
        <ListCard
          list={makeList({
            profile: {
              ...makeProfile('p1', 'Alice'),
              art: ART,
              avatarStyle: 'avataaars',
            },
          })}
          showOwner
        />
      );
      expect(screen.getByTestId('altvatar-art')).toHaveAttribute('src', ART);
    });

    it('OwnerProfileWithNoArt_BylineRendersInitials', () => {
      // The byline reads the profile and only the profile. There is no account
      // hop behind it, so nothing here can branch on whether one exists.
      render(
        <ListCard list={makeList({ profile: makeProfile('p1', 'Alice') })} showOwner />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByTestId('altvatar-art')).toBeNull();
    });
  });

  describe('AccentPill', () => {
    it('OwnerHasAccent_CardCarriesAccentVars', () => {
      render(
        <ListCard
          list={makeList({
            profile: { ...makeProfile('p1', 'Alice'), accent: 'rose' },
          })}
        />
      );
      // The byline pill is painted from --accent-disc/--accent-ink, so the
      // custom properties on the root are what carry the owner's colour to it.
      const card = document.querySelector<HTMLElement>('a.list-card');
      expect(card?.style.getPropertyValue('--accent-disc')).toBe(
        ACCENT_PRESETS.rose.light
      );
      expect(card?.style.getPropertyValue('--accent-ink')).toBe(
        ACCENT_PRESETS.rose.ink
      );
    });

    it('NoOwnerAccent_PillFallsBackToTheIrisPreset', () => {
      render(<ListCard list={makeList({ profile: null })} />);
      const card = document.querySelector<HTMLElement>('a.list-card');
      expect(card?.style.getPropertyValue('--accent-disc')).toBe(
        ACCENT_PRESETS.iris.light
      );
      expect(card?.style.getPropertyValue('--accent-ink')).toBe(
        ACCENT_PRESETS.iris.ink
      );
    });
  });
});
