/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The `home-digest` spec mandates structural facts the rail wrapper carries no
 * role for: the `.rail`/`.rail-body`/`.rail-chevron` classes, the `collapsed`
 * modifier, and the `.rail-header-extra` slot. The wrapper is a non-interactive
 * `<section>`, so role-based queries cannot reach it; `container.querySelector`
 * is the only way to lock those class/structure contracts. The toggle button's
 * AT-observable surface (role, aria-expanded) is still asserted via attributes.
 */
import { fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CollapsibleRail from '../CollapsibleRail';

const KEY = 'home.rail.x.open';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderRail(props: Partial<React.ComponentProps<typeof CollapsibleRail>> = {}) {
  return render(
    <CollapsibleRail name="x" title="My Title" {...props}>
      <p data-testid="rail-child">body content</p>
    </CollapsibleRail>
  );
}

describe('CollapsibleRail', () => {
  describe('DefaultState', () => {
    it('NoStoredValue_RendersOpenWithBodyAndAriaExpandedTrue', () => {
      const { container } = renderRail();
      const section = container.querySelector('.rail')!;
      expect(section.classList.contains('collapsed')).toBe(false);
      expect(container.querySelector('.rail-toggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      const body = container.querySelector('.rail-body');
      expect(body).not.toBeNull();
      expect(body).toContainElement(
        container.querySelector('[data-testid="rail-child"]')
      );
    });

    it('ServerSnapshot_RendersOpenWithBody', () => {
      // The pre-hydration / server render path uses the useSyncExternalStore
      // server snapshot (`() => null`), which resolves to the `true` default
      // — so the rail renders open (body present) before hydration.
      const el = (
        <CollapsibleRail name="x" title="My Title">
          <p>body content</p>
        </CollapsibleRail>
      );
      expect(renderToString(el)).toContain('rail-body');
      expect(renderToString(el)).toContain('body content');
    });

    it('GetItemThrows_FallsBackToOpenDefault', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      const { container } = renderRail();
      // The read falls back to null → the `true` default → open.
      expect(container.querySelector('.rail')!.classList.contains('collapsed')).toBe(
        false
      );
      expect(container.querySelector('.rail-body')).not.toBeNull();
    });

    it('StoredFalse_RendersCollapsedNoBody', () => {
      localStorage.setItem(KEY, 'false');
      const { container } = renderRail();
      expect(container.querySelector('.rail')!.classList.contains('collapsed')).toBe(
        true
      );
      expect(container.querySelector('.rail-toggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(container.querySelector('.rail-body')).toBeNull();
    });
  });

  describe('ToggleBehavior', () => {
    it('ClickToggle_WritesFalseAndCollapses', () => {
      const { container } = renderRail();
      fireEvent.click(container.querySelector('.rail-toggle')!);
      expect(localStorage.getItem(KEY)).toBe('false');
      expect(container.querySelector('.rail-toggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(container.querySelector('.rail-body')).toBeNull();
    });

    it('ClickToggleTwice_WritesTrueAndExpands', () => {
      const { container } = renderRail();
      const toggle = container.querySelector('.rail-toggle')!;
      fireEvent.click(toggle);
      fireEvent.click(toggle);
      expect(localStorage.getItem(KEY)).toBe('true');
      expect(container.querySelector('.rail-body')).not.toBeNull();
    });

    it('ClickToggle_ChevronGetsCollapsedClass', () => {
      const { container } = renderRail();
      const chevron = () => container.querySelector('.rail-chevron')!;
      expect(chevron().classList.contains('collapsed')).toBe(false);
      fireEvent.click(container.querySelector('.rail-toggle')!);
      expect(chevron().classList.contains('collapsed')).toBe(true);
    });
  });

  describe('HeaderSlots', () => {
    it('SeeAllHrefProvided_RendersLinkButtonAnchor', () => {
      const { container } = renderRail({ seeAllHref: '/h' });
      const anchor = container.querySelector('.rail-header-extra a');
      expect(anchor).toHaveAttribute('href', '/h');
      expect(anchor).toHaveTextContent('See all');
    });

    it('NoSeeAllHref_RendersNoSeeAllLink', () => {
      const { container } = renderRail();
      expect(container.querySelector('.rail-header-extra a')).toBeNull();
    });

    it('HeaderExtraProvided_RendersIntoHeaderExtra', () => {
      const { container } = renderRail({
        headerExtra: <span data-testid="extra">EX</span>,
      });
      const extra = container.querySelector('.rail-header-extra');
      expect(extra).toContainElement(
        container.querySelector('[data-testid="extra"]')
      );
    });

    it('TitleProp_RendersInRailTitle', () => {
      const { container } = renderRail();
      expect(container.querySelector('.rail-title')).toHaveTextContent(
        'My Title'
      );
    });
  });

  describe('StorageFailureTolerance', () => {
    it('SetItemThrows_ToggleSwallowsError', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      const { container } = renderRail();
      expect(() =>
        fireEvent.click(container.querySelector('.rail-toggle')!)
      ).not.toThrow();
    });
  });
});
