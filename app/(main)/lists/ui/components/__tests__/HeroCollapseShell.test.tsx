/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The collapse shell exposes contract via exact-string structural classes
 * (`.list-hero-shell`, `.list-hero-shell-collapsed`, `.list-hero-collapsed-strip`,
 * `.list-hero-collapsed-title`, `.list-hero-collapsed-trailing`,
 * `.list-hero-collapse-handle`) and a chevron `<svg>` that carry no role and
 * no accessible name, so class/tag queries are the only path to assert them.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroCollapseShell from '../HeroCollapseShell';

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }));

function setParams(search = '') {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>
  );
}

let replaceSpy: ReturnType<typeof vi.spyOn>;
let pushSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Reset to a clean detail URL before installing the spies so the reset
  // itself is not counted as a toggle-driven history write.
  window.history.replaceState(null, '', '/lists/abc123');
  setParams('');
  replaceSpy = vi.spyOn(window.history, 'replaceState');
  pushSpy = vi.spyOn(window.history, 'pushState');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderShell(title = 'My List', kebab: ReactNode = <button data-testid="kebab" />) {
  return render(
    <HeroCollapseShell title={title} collapsedKebab={kebab}>
      <div data-testid="expanded" />
    </HeroCollapseShell>
  );
}

const expandHandle = () => screen.getByRole('button', { name: 'Expand list info' });
const collapseHandle = () => screen.getByRole('button', { name: 'Collapse list info' });

describe('HeroCollapseShell', () => {
  describe('Expanded', () => {
    it('Default_RendersExpandedChildren-AbsentCollapsedStrip', () => {
      const { container } = renderShell();
      expect(screen.getByTestId('expanded')).toBeInTheDocument();
      expect(container.querySelector('.list-hero-collapsed-strip')).toBeNull();
    });

    it('Default_RendersBottomHandle-AriaExpandedTrue-CollapseLabel-ChevronSvg-ShellWithoutCollapsedModifier', () => {
      const { container } = renderShell();
      const handle = collapseHandle();
      expect(handle).toHaveClass('list-hero-collapse-handle');
      expect(handle).toHaveAttribute('aria-expanded', 'true');
      expect(handle.querySelector('svg')).not.toBeNull();
      const shell = container.querySelector('.list-hero-shell');
      expect(shell).not.toBeNull();
      expect(shell).not.toHaveClass('list-hero-shell-collapsed');
    });
  });

  describe('Collapsed', () => {
    beforeEach(() => setParams('hero=closed'));

    it('Default_RendersCollapsedStrip-AbsentExpandedChildren-AbsentBottomHandle-ShellHasCollapsedModifier', () => {
      const { container } = renderShell();
      expect(container.querySelector('.list-hero-collapsed-strip')).not.toBeNull();
      expect(screen.queryByTestId('expanded')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Collapse list info' })
      ).not.toBeInTheDocument();
      expect(container.querySelector('.list-hero-shell')).toHaveClass(
        'list-hero-shell-collapsed'
      );
    });

    it('Default_StripHasButtonRole-Tabindex0-AriaExpandedFalse-ExpandLabel', () => {
      renderShell();
      const strip = expandHandle();
      expect(strip).toHaveClass('list-hero-collapsed-strip');
      expect(strip).toHaveAttribute('tabindex', '0');
      expect(strip).toHaveAttribute('aria-expanded', 'false');
    });

    it('Default_StripContentIsChevronTitleKebab', () => {
      const { container } = renderShell('Birthday Wishlist');
      expect(container.querySelector('.list-hero-collapsed-chevron')).not.toBeNull();
      const title = container.querySelector('h1.list-hero-collapsed-title');
      expect(title?.textContent).toBe('Birthday Wishlist');
      const trailing = container.querySelector('.list-hero-collapsed-trailing');
      expect(within(trailing as HTMLElement).getByTestId('kebab')).toBeInTheDocument();
    });
  });

  describe('PointerToggle', () => {
    it('ClickBottomHandle_Collapses-AriaExpandedFalse', async () => {
      const user = userEvent.setup();
      renderShell();
      await user.click(collapseHandle());
      expect(expandHandle()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('expanded')).not.toBeInTheDocument();
    });

    it('ClickCollapsedStrip_Expands', async () => {
      setParams('hero=closed');
      const user = userEvent.setup();
      renderShell();
      await user.click(expandHandle());
      expect(screen.getByTestId('expanded')).toBeInTheDocument();
    });

    it('ClickKebabExclusionZone_DoesNotExpand', async () => {
      setParams('hero=closed');
      const user = userEvent.setup();
      renderShell();
      await user.click(screen.getByTestId('kebab'));
      expect(screen.queryByTestId('expanded')).not.toBeInTheDocument();
      expect(expandHandle()).toBeInTheDocument();
    });
  });

  describe('KeyboardToggle', () => {
    beforeEach(() => setParams('hero=closed'));

    it('EnterOnStrip_Expands-PreventsDefault', () => {
      renderShell();
      const strip = expandHandle();
      // fireEvent returns false when a handler called preventDefault.
      const notPrevented = fireEvent.keyDown(strip, { key: 'Enter' });
      expect(notPrevented).toBe(false);
      expect(screen.getByTestId('expanded')).toBeInTheDocument();
    });

    it('SpaceOnStrip_Expands-PreventsDefault', () => {
      renderShell();
      const strip = expandHandle();
      const notPrevented = fireEvent.keyDown(strip, { key: ' ' });
      expect(notPrevented).toBe(false);
      expect(screen.getByTestId('expanded')).toBeInTheDocument();
    });

    it('OtherKeyOnStrip_DoesNotExpand-NotPrevented', () => {
      renderShell();
      const strip = expandHandle();
      const notPrevented = fireEvent.keyDown(strip, { key: 'a' });
      expect(notPrevented).toBe(true);
      expect(screen.queryByTestId('expanded')).not.toBeInTheDocument();
    });
  });

  describe('UrlState', () => {
    it('Collapse_ReplaceStateAddsHeroClosed', async () => {
      const user = userEvent.setup();
      renderShell();
      replaceSpy.mockClear();
      await user.click(collapseHandle());
      expect(replaceSpy).toHaveBeenCalled();
      expect(window.location.search).toContain('hero=closed');
    });

    it('Expand_ReplaceStateRemovesHeroParam', async () => {
      window.history.replaceState(null, '', '/lists/abc123?hero=closed');
      setParams('hero=closed');
      const user = userEvent.setup();
      renderShell();
      replaceSpy.mockClear();
      await user.click(expandHandle());
      expect(replaceSpy).toHaveBeenCalled();
      expect(window.location.search).not.toContain('hero');
    });

    it('Toggle_NeverCallsPushState', async () => {
      const user = userEvent.setup();
      renderShell();
      await user.click(collapseHandle());
      await user.click(expandHandle());
      expect(pushSpy).not.toHaveBeenCalled();
    });
  });
});
