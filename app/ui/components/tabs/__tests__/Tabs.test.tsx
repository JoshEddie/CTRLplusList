import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from '../Tabs';
import type { TabButtonItem, TabLinkItem } from '../types';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

const LINKS: TabLinkItem[] = [
  { label: 'My Lists', href: '/lists' },
  { label: 'Bookmarks', href: '/lists/bookmarks' },
];

const BUTTONS: TabButtonItem<'active' | 'archived'>[] = [
  { label: 'Active', value: 'active', panelId: 'panel-active' },
  { label: 'Archived', value: 'archived', panelId: 'panel-archived' },
];

function mountButtons(
  value: 'active' | 'archived' = 'active',
  onChange = vi.fn()
) {
  render(
    <Tabs
      items={BUTTONS}
      value={value}
      onChange={onChange}
      aria-label="Filter"
    />
  );
  return onChange;
}

describe('Tabs', () => {
  describe('LinkMode', () => {
    it('ItemsWithHref_RendersLinksInsideNav', () => {
      render(
        <Tabs items={LINKS} activeHref="/lists" aria-label="List collections" />
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
      expect(nav).toContainElement(
        screen.getByRole('link', { name: 'My Lists' })
      );
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('ActiveHrefMatchesItem_MarksOnlyThatLinkAriaCurrentPage', () => {
      render(
        <Tabs
          items={LINKS}
          activeHref="/lists/bookmarks"
          aria-label="List collections"
        />
      );

      expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(
        screen.getByRole('link', { name: 'My Lists' })
      ).not.toHaveAttribute('aria-current');
    });

    it('ActiveHrefMatchesNoItem_MarksNoLinkCurrent', () => {
      render(
        <Tabs
          items={LINKS}
          activeHref="/altvatar/abc123"
          aria-label="List collections"
        />
      );

      for (const link of screen.getAllByRole('link')) {
        expect(link).not.toHaveAttribute('aria-current');
      }
    });
  });

  describe('ButtonMode', () => {
    it('ItemsWithoutHref_RendersTabsInsideTablist', () => {
      mountButtons();

      const tablist = screen.getByRole('tablist', { name: 'Filter' });
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Active',
        'Archived',
      ]);
      expect(tablist).toContainElement(
        screen.getByRole('tab', { name: 'Active' })
      );
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('Render_MarksActiveTabSelected-PointsAriaControlsAtItsPanel', () => {
      mountButtons('archived');

      expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute(
        'aria-controls',
        'panel-active'
      );
      expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute(
        'aria-controls',
        'panel-archived'
      );
    });

    it('Render_PlacesOnlyTheActiveTabInTheTabOrder', async () => {
      render(
        <>
          <button type="button">Before</button>
          <Tabs
            items={BUTTONS}
            value="active"
            onChange={vi.fn()}
            aria-label="Filter"
          />
          <button type="button">After</button>
        </>
      );

      screen.getByRole('button', { name: 'Before' }).focus();
      await userEvent.tab();
      expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('ClickInactiveTab_CallsOnChangeWithItsValue', async () => {
      const onChange = mountButtons();

      await userEvent.click(screen.getByRole('tab', { name: 'Archived' }));

      expect(onChange).toHaveBeenCalledWith('archived');
    });

    it('ArrowRight_MovesFocusToNextTab-CallsOnChangeWithNextValue', async () => {
      const onChange = mountButtons();

      screen.getByRole('tab', { name: 'Active' }).focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith('archived');
      expect(screen.getByRole('tab', { name: 'Archived' })).toHaveFocus();
    });

    it('ArrowRightOnLastTab_WrapsToFirstTab', async () => {
      const onChange = mountButtons('archived');

      screen.getByRole('tab', { name: 'Archived' }).focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith('active');
      expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus();
    });

    it('ArrowLeftOnFirstTab_WrapsToLastTab', async () => {
      const onChange = mountButtons();

      screen.getByRole('tab', { name: 'Active' }).focus();
      await userEvent.keyboard('{ArrowLeft}');

      expect(onChange).toHaveBeenCalledWith('archived');
      expect(screen.getByRole('tab', { name: 'Archived' })).toHaveFocus();
    });

    it('ArrowDown_LeavesSelectionAndFocusUnchanged', async () => {
      const onChange = mountButtons();

      screen.getByRole('tab', { name: 'Active' }).focus();
      await userEvent.keyboard('{ArrowDown}');

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus();
    });

    it('ItemWithId_RendersThatIdOnTheTab', () => {
      render(
        <Tabs
          items={[
            { label: 'Settings', value: 'settings', panelId: 'p', id: 't' },
          ]}
          value="settings"
          onChange={vi.fn()}
          aria-label="Sections"
        />
      );

      expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
        'id',
        't'
      );
    });
  });

  describe('Size', () => {
    it('SizeOmitted_EmitsTabsDefaultClass', () => {
      mountButtons();

      expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs--default');
    });

    it('SizeSm_EmitsTabsSmClass-KeepsCallerClassName', () => {
      render(
        <Tabs
          items={BUTTONS}
          value="active"
          onChange={vi.fn()}
          size="sm"
          className="items-tabs"
          aria-label="Filter"
        />
      );

      expect(screen.getByRole('tablist')).toHaveClass(
        'tabs',
        'tabs--sm',
        'items-tabs'
      );
      expect(screen.getByRole('tablist')).not.toHaveClass('tabs--default');
    });
  });
});
