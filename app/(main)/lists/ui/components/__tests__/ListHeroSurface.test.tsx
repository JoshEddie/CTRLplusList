import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListHeroSurface, { HERO_TOOLBAR_SLOT_ID } from '../ListHeroSurface';

// jsdom resolves the surface's sticky `top` to 0, so pinning is modelled by
// clamping its rect there while the sentinel's keeps scrolling: the gap
// between the two is exactly how far past the pin the page is.
let sentinelTop: number;

beforeEach(() => {
  sentinelTop = 0;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const pinned = this.classList.contains('list-hero-chrome');
      return { top: pinned ? Math.max(sentinelTop, 0) : sentinelTop } as DOMRect;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSurface() {
  return render(
    <ListHeroSurface
      title="Birthday wishes"
      kebab={<button type="button">Menu</button>}
    >
      <div data-testid="hero-content">Full hero</div>
      <input aria-label="Search items" />
    </ListHeroSurface>
  );
}

function surface() {
  return document.querySelector('.list-hero-chrome') as HTMLElement;
}

function toolbarSlot() {
  return document.getElementById(HERO_TOOLBAR_SLOT_ID);
}

// The page scrolls on body, not window; the component listens in the capture
// phase, so firing on body exercises the real propagation path.
function scrollToDepth(depth: number) {
  sentinelTop = -depth;
  fireEvent.scroll(document.body);
}

describe('ListHeroSurface', () => {
  it('AtRest_ShowsFullDetailsWithoutCollapsedState', () => {
    renderSurface();
    expect(surface()).toHaveClass('is-chrome');
    expect(surface()).not.toHaveClass('is-collapsed');
    expect(screen.getByTestId('hero-content')).toBeInTheDocument();
  });

  it('Mount_ProvidesTheToolbarSlotAndAnnouncesIt', () => {
    const announced = vi.fn();
    window.addEventListener('list-hero-slot-ready', announced);
    renderSurface();
    expect(toolbarSlot()).toBeInTheDocument();
    expect(announced).toHaveBeenCalled();
    window.removeEventListener('list-hero-slot-ready', announced);
  });

  it('ScrollingDownWithinThreshold_StaysExpanded', () => {
    renderSurface();
    scrollToDepth(30);
    expect(surface()).not.toHaveClass('is-collapsed');
  });

  it('ScrollingDownPastThreshold_CollapsesToTitleAndKebab', () => {
    renderSurface();
    scrollToDepth(300);
    expect(surface()).toHaveClass('is-collapsed');
    expect(screen.getByText('Birthday wishes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('ScrollingUpWithinThreshold_StaysCollapsed', () => {
    renderSurface();
    scrollToDepth(2000);
    scrollToDepth(1990);
    expect(surface()).toHaveClass('is-collapsed');
  });

  it('SustainedUpwardScrollMidList_ExpandsTheFullHero', () => {
    renderSurface();
    scrollToDepth(2000);
    scrollToDepth(1500);
    expect(surface()).not.toHaveClass('is-collapsed');
  });

  it('UpwardScrollInterruptedByDownward_DoesNotBankTravel', () => {
    renderSurface();
    scrollToDepth(2000);
    scrollToDepth(1700);
    scrollToDepth(1760);
    scrollToDepth(1460);
    expect(surface()).toHaveClass('is-collapsed');
  });

  it('ReturningToTop_Expands', () => {
    renderSurface();
    scrollToDepth(300);
    scrollToDepth(0);
    expect(surface()).not.toHaveClass('is-collapsed');
  });

  it('ReturningToTopWhileTicksAreQuieted_StillExpands', () => {
    renderSurface();
    scrollToDepth(300);
    expect(surface()).toHaveClass('is-collapsed');
    fireEvent.focusIn(screen.getByLabelText('Search items'));
    scrollToDepth(0);
    expect(surface()).not.toHaveClass('is-collapsed');
  });

  it('QuietedTicksMidList_KeepCurrentState', () => {
    renderSurface();
    fireEvent.focusIn(screen.getByLabelText('Search items'));
    scrollToDepth(300);
    expect(surface()).not.toHaveClass('is-collapsed');
  });

  it('FocusMovingToANonFieldElement_DoesNotQuietTicks', () => {
    renderSurface();
    fireEvent.focusIn(screen.getByRole('button', { name: 'Menu' }));
    scrollToDepth(300);
    expect(surface()).toHaveClass('is-collapsed');
  });

  it('RedundantTickAtTheSameDepth_KeepsBankedDownwardTravel', () => {
    renderSurface();
    scrollToDepth(30);
    scrollToDepth(30);
    scrollToDepth(60);
    expect(surface()).toHaveClass('is-collapsed');
  });

  it('Unmount_RemovesListenerAndChromeState', () => {
    const { unmount } = renderSurface();
    const el = surface();
    scrollToDepth(300);
    unmount();
    expect(el).not.toHaveClass('is-collapsed');
    expect(el).not.toHaveClass('is-chrome');
    scrollToDepth(350);
    expect(el).not.toHaveClass('is-collapsed');
  });
});
