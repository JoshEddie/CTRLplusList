import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListHeroChrome, { HERO_TOOLBAR_SLOT_ID } from '../ListHeroChrome';

// The component measures the sentinel during the mount effect, so the rect
// must be mocked at the prototype level before render. jsdom computes the
// chrome's sticky `top` as 0, so the collapse threshold sits at -40 and
// the hero counts as at-top whenever the sentinel top is >= 0.
let sentinelTop: number;

beforeEach(() => {
  sentinelTop = 0;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ top: sentinelTop }) as DOMRect
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The soft keyboard reveals a field by displacing the visual viewport, which
// shifts every client rect by that amount with no user scroll.
function displaceViewport(offsetTop: number) {
  Object.defineProperty(window, 'visualViewport', {
    value: { offsetTop },
    configurable: true,
    writable: true,
  });
}

function renderChrome() {
  return render(
    <ListHeroChrome
      title="Birthday wishes"
      kebab={<button type="button">Menu</button>}
    >
      <div data-testid="hero-content">Full hero</div>
    </ListHeroChrome>
  );
}

function chrome() {
  return document.querySelector('.list-hero-chrome') as HTMLElement;
}

function toolbarSlot() {
  return document.getElementById(HERO_TOOLBAR_SLOT_ID);
}

// The page scrolls on body, not window; the component listens in the
// capture phase, so firing on body exercises the real propagation path.
function scrollSentinelTo(top: number) {
  sentinelTop = top;
  fireEvent.scroll(document.body);
}

describe('ListHeroChrome', () => {
  it('AtRest_ShowsFullDetailsWithoutCollapsedState', () => {
    renderChrome();
    expect(chrome()).toHaveClass('is-chrome');
    expect(chrome()).not.toHaveClass('is-collapsed');
    expect(screen.getByTestId('hero-content')).toBeInTheDocument();
  });

  it('Mount_ProvidesTheToolbarSlotAndAnnouncesIt', () => {
    const announced = vi.fn();
    window.addEventListener('list-hero-slot-ready', announced);
    renderChrome();
    expect(toolbarSlot()).toBeInTheDocument();
    expect(announced).toHaveBeenCalled();
    window.removeEventListener('list-hero-slot-ready', announced);
  });

  it('ScrollingDownWithinThreshold_StaysExpanded', () => {
    renderChrome();
    scrollSentinelTo(-30);
    expect(chrome()).not.toHaveClass('is-collapsed');
  });

  it('ScrollingDownPastThreshold_CollapsesToTitleAndKebab', () => {
    renderChrome();
    scrollSentinelTo(-300);
    expect(chrome()).toHaveClass('is-collapsed');
    expect(screen.getByText('Birthday wishes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('StateFlip_EntersTheAnimatingWindowUntilTransitionEnd', () => {
    renderChrome();
    scrollSentinelTo(-300);
    expect(chrome()).toHaveClass('is-animating');
    fireEvent.transitionEnd(chrome(), { propertyName: 'grid-template-rows' });
    expect(chrome()).not.toHaveClass('is-animating');
  });

  it('UnrelatedTransitionEnds_KeepsTheAnimatingWindowOpen', () => {
    renderChrome();
    scrollSentinelTo(-300);
    fireEvent.transitionEnd(chrome(), { propertyName: 'opacity' });
    expect(chrome()).toHaveClass('is-animating');
  });

  it('SustainedUpwardScrollMidList_ExpandsTheFullHero', () => {
    renderChrome();
    scrollSentinelTo(-2000);
    scrollSentinelTo(-500);
    expect(chrome()).not.toHaveClass('is-collapsed');
  });

  it('ScrollingUpWithinThreshold_StaysCollapsed', () => {
    renderChrome();
    scrollSentinelTo(-2000);
    scrollSentinelTo(-1990);
    expect(chrome()).toHaveClass('is-collapsed');
  });

  it('UpwardScrollInterruptedByDownward_DoesNotBankTravel', () => {
    renderChrome();
    scrollSentinelTo(-2000);
    scrollSentinelTo(-1700);
    scrollSentinelTo(-1710);
    scrollSentinelTo(-1410);
    expect(chrome()).toHaveClass('is-collapsed');
  });

  it('ScrollingDownAgainMidList_CollapsesAgain', () => {
    renderChrome();
    scrollSentinelTo(-2000);
    scrollSentinelTo(-500);
    scrollSentinelTo(-510);
    expect(chrome()).toHaveClass('is-collapsed');
  });

  it('ReturningToTop_StaysExpanded', () => {
    renderChrome();
    scrollSentinelTo(-300);
    scrollSentinelTo(5);
    expect(chrome()).not.toHaveClass('is-collapsed');
  });

  it('UnrelatedContainerScroll_KeepsCurrentState', () => {
    renderChrome();
    scrollSentinelTo(-300);
    fireEvent.scroll(document.body);
    expect(chrome()).toHaveClass('is-collapsed');
  });

  it('Unmount_RemovesListenerAndChromeState', () => {
    const { unmount } = renderChrome();
    const el = chrome();
    scrollSentinelTo(-300);
    unmount();
    expect(el).not.toHaveClass('is-collapsed');
    expect(el).not.toHaveClass('is-chrome');
    scrollSentinelTo(-350);
    expect(el).not.toHaveClass('is-collapsed');
  });

  it('KeyboardOpen_IgnoresTheViewportOffsetShiftAndKeepsCurrentState', () => {
    renderChrome();
    displaceViewport(146);
    scrollSentinelTo(-146);
    expect(chrome()).not.toHaveClass('is-collapsed');
  });

  it('KeyboardOpenWhileCollapsed_DoesNotExpandOnTheOffsetShift', () => {
    renderChrome();
    scrollSentinelTo(-60);
    expect(chrome()).toHaveClass('is-collapsed');
    displaceViewport(146);
    scrollSentinelTo(600);
    expect(chrome()).toHaveClass('is-collapsed');
  });

  it('KeyboardCloses_BankedTravelExcludesTheOffsetShift', () => {
    renderChrome();
    scrollSentinelTo(-600);
    expect(chrome()).toHaveClass('is-collapsed');
    displaceViewport(146);
    // 340px of phantom upward shift from the visual-viewport offset, then a
    // genuine 200px upward scroll. Banked together they clear EXPAND_TRAVEL;
    // only the genuine run should count, so the hero stays collapsed.
    scrollSentinelTo(-260);
    displaceViewport(0);
    scrollSentinelTo(-60);
    expect(chrome()).toHaveClass('is-collapsed');
  });
});
