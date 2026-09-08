import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LinkTabs } from '../LinkTabs';
import type { TabLinkItem } from '../types';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

const LINKS: TabLinkItem[] = [
  { label: 'My Lists', href: '/lists' },
  { label: 'Bookmarks', href: '/lists/bookmarks' },
];

describe('LinkTabs', () => {
  it('Render_PlacesEveryLinkInsideTheNavLandmark', () => {
    render(
      <LinkTabs items={LINKS} activeHref="/lists" aria-label="List collections" />
    );

    const nav = screen.getByRole('navigation', { name: 'List collections' });
    expect(
      screen
        .getAllByRole('link')
        .map((link) => [link.getAttribute('href'), link.textContent])
    ).toEqual([
      ['/lists', 'My Lists'],
      ['/lists/bookmarks', 'Bookmarks'],
    ]);
    expect(nav).toContainElement(screen.getByRole('link', { name: 'My Lists' }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('ActiveHrefMatchesItem_MarksOnlyThatLinkAriaCurrentPage', () => {
    render(
      <LinkTabs
        items={LINKS}
        activeHref="/lists/bookmarks"
        aria-label="List collections"
      />
    );

    expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'My Lists' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('ActiveHrefMatchesNoItem_MarksNoLinkCurrent', () => {
    render(
      <LinkTabs
        items={LINKS}
        activeHref="/altvatar/abc123"
        aria-label="List collections"
      />
    );

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('Render_CarriesNoTabClassOnAnyLink', () => {
    render(
      <LinkTabs items={LINKS} activeHref="/lists" aria-label="List collections" />
    );

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('class');
    }
  });
});
