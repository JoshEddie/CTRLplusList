/**
 * The card's two content shapes turn on viewer identity — a stranger, and
 * someone who is not the owning profile's self — which is why they are proven
 * here rather than end-to-end.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProfileAvatarView } from '@/lib/types';
import BylineProfileCard from '../BylineProfileCard';

// FollowControls is real — the card renders it from the follow state it is
// handed — so its action module and router are mocked at the boundary.
vi.mock('@/lib/data/profile.actions', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));
// Only `useRouter` is stubbed: `next/link` reaches into this module too, and
// replacing the whole of it leaves the card's Altvatar link unrenderable.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const NOT_FOLLOWING = { following: false, requireDisclosure: false };

const owner: ProfileAvatarView = {
  name: 'Olivia Owner',
  accent: null,
  art: null,
  avatarStyle: null,
};

const baseProps = {
  profileId: 'owner-profile-1',
  owner,
  listCount: 3,
};

const trigger = () =>
  screen.getByRole('button', { name: 'About Olivia Owner' });
const card = () => screen.queryByRole('dialog', { name: 'About Olivia Owner' });

afterEach(() => {
  // The placement tests stub layout onto shared prototypes; left in place they
  // would silently feed every later test a fabricated geometry.
  vi.restoreAllMocks();
  for (const prop of ['offsetWidth', 'offsetHeight']) {
    delete (HTMLDivElement.prototype as unknown as Record<string, unknown>)[
      prop
    ];
  }
  delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)
    .showModal;
  vi.clearAllMocks();
});

describe('BylineProfileCard', () => {
  describe('ContentShapes', () => {
    it('NoFollowOrMembership_ShowsNameListCountAndAltvatarLinkOnly', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      await user.click(trigger());

      const open = card() as HTMLElement;
      expect(open).toHaveTextContent('Olivia Owner');
      expect(open).toHaveTextContent('3 shared lists');
      expect(
        screen.getByRole('link', { name: 'View Altvatar' })
      ).toHaveAttribute('href', '/altvatar/owner-profile-1');
      expect(
        screen.queryByRole('button', { name: /^Switch to/ })
      ).not.toBeInTheDocument();
    });

    it('FollowState_RendersFollowBesideTheNameAndCount', async () => {
      const user = userEvent.setup();
      render(
        <BylineProfileCard
          {...baseProps}
          listCount={1}
          followState={NOT_FOLLOWING}
        />
      );
      await user.click(trigger());

      expect(card()).toHaveTextContent('1 shared list');
      expect(
        screen.getByRole('button', { name: 'Follow' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'View Altvatar' })
      ).toBeInTheDocument();
    });
  });

  describe('Opening', () => {
    it('Click_OpensTheCard-MarksTheTriggerExpanded', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      expect(card()).not.toBeInTheDocument();

      await user.click(trigger());

      expect(card()).toBeInTheDocument();
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    });

    // The press follows a hover that already opened the card, so a toggle
    // would make pressing the byline close it.
    it('HoverThenClick_LeavesTheCardOpen', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      await user.hover(trigger());
      await user.click(trigger());

      expect(card()).toBeInTheDocument();
    });

    it('EnterKey_OpensTheCard', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      await user.tab();
      await user.keyboard('{Enter}');

      expect(card()).toBeInTheDocument();
    });

    it('PointerDeviceHover_OpensTheCardEarly', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      await user.hover(trigger());

      expect(card()).toBeInTheDocument();
    });

  });

  describe('Dismissal', () => {
    it('PointerLeave_ClosesTheCard', async () => {
      const user = userEvent.setup();
      render(
        <>
          <BylineProfileCard {...baseProps} />
          <span>elsewhere</span>
        </>
      );
      await user.click(trigger());
      await user.hover(screen.getByText('elsewhere'));

      expect(card()).not.toBeInTheDocument();
    });

    // The wrapper holds trigger and card alike, so the pointer's path from
    // one to the other never leaves the group. Driven with the raw
    // mouseout/mouseover pair React derives its leave from — userEvent's
    // pointer model routes through the body under jsdom, which has no layout
    // to place the floating card under the cursor.
    it('PointerMovesFromTriggerIntoTheCard_LeavesItOpen', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} />);
      await user.hover(trigger());
      const into = screen.getByRole('link', { name: 'View Altvatar' });

      fireEvent.mouseOut(trigger(), { relatedTarget: into });
      fireEvent.mouseOver(into, { relatedTarget: trigger() });

      expect(card()).toBeInTheDocument();
    });

    // A first follow raises a modal dialog, which takes the pointer with it;
    // dismissing on that leave would close the card out from under it.
    it('DisclosureDialogOpen_PointerLeaveKeepsTheCardOpen', async () => {
      const user = userEvent.setup({ skipHover: true });
      // jsdom does not implement showModal at all, so stand in for it and
      // flip `open` the way a browser would.
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = true;
        },
      });
      render(
        <>
          <BylineProfileCard
            {...baseProps}
            followState={{ following: false, requireDisclosure: true }}
          />
          <span>elsewhere</span>
        </>
      );
      await user.click(trigger());
      await user.click(screen.getByRole('button', { name: 'Follow' }));
      fireEvent.mouseLeave(card() as HTMLElement);

      expect(card()).toBeInTheDocument();
    });

    it('OutsideMouseDown_ClosesTheCard', async () => {
      const user = userEvent.setup({ skipHover: true });
      render(
        <>
          <BylineProfileCard {...baseProps} />
          <button type="button">elsewhere</button>
        </>
      );
      await user.click(trigger());
      await user.click(screen.getByRole('button', { name: 'elsewhere' }));

      expect(card()).not.toBeInTheDocument();
    });

    it('MouseDownInsideTheCard_LeavesItOpen', async () => {
      const user = userEvent.setup({ skipHover: true });
      render(<BylineProfileCard {...baseProps} />);
      await user.click(trigger());
      await user.click(
        screen.getByRole('link', { name: 'View Altvatar' })
      );

      expect(card()).toBeInTheDocument();
    });

    it('EscapeKey_ClosesTheCard', async () => {
      const user = userEvent.setup({ skipHover: true });
      render(<BylineProfileCard {...baseProps} />);
      await user.click(trigger());
      await user.keyboard('{Escape}');

      expect(card()).not.toBeInTheDocument();
    });

    // The hero collapses the byline away as the page scrolls, taking the
    // card's anchor with it.
    it('PageScrolls_ClosesTheCard', async () => {
      const user = userEvent.setup({ skipHover: true });
      render(<BylineProfileCard {...baseProps} />);
      await user.click(trigger());

      fireEvent.scroll(window);

      expect(card()).not.toBeInTheDocument();
    });
  });

  describe('MenuRow', () => {
    const row = () =>
      screen.getByRole('menuitem', { name: 'About Olivia Owner' });

    it('AsMenuRow_TriggerIsAMenuItemOpeningTheSameCard', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} asMenuRow />);
      await user.click(row());

      expect(card()).toHaveTextContent('3 shared lists');
    });

    // Sizes are stubbed because jsdom lays nothing out: the menu is pinned to
    // the right of a 1024px viewport, its rows are inset by its 6px padding,
    // and the card measures 220x200.
    const MENU_PADDING = 6;
    const ROW_TOP = 500;
    const ROW_HEIGHT = 44;
    function stubLayout(menuLeft: number, viewportWidth = 1024) {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const isMenu = this.classList.contains('menu-popover');
          return {
            top: isMenu ? 100 : ROW_TOP,
            bottom: isMenu ? 600 : ROW_TOP + ROW_HEIGHT,
            left: isMenu ? menuLeft : menuLeft + MENU_PADDING,
          } as DOMRect;
        }
      );
      for (const prop of ['offsetWidth', 'offsetHeight']) {
        Object.defineProperty(HTMLDivElement.prototype, prop, {
          configurable: true,
          value: prop === 'offsetWidth' ? 220 : 200,
        });
      }
      window.innerWidth = viewportWidth;
      window.innerHeight = 768;
    }

    const inMenu = (node: React.ReactNode) => (
      <div className="menu-popover">{node}</div>
    );

    // Covering the kebab would hide the rows the viewer was reading, so the
    // card flies out to its left.
    it('AsMenuRow_OpensClearOfTheMenusLeftEdge', async () => {
      const user = userEvent.setup({ skipHover: true });
      stubLayout(700);
      render(inMenu(<BylineProfileCard {...baseProps} asMenuRow />));
      await user.click(row());

      // 700 - 220 - 8: the card's right edge clears the menu by the margin.
      expect(card()).toHaveStyle({ position: 'fixed', left: '472px' });
      expect(card()).toHaveStyle({ top: '500px' });
    });

    // The pointer has to cross the flyout's gap AND the menu's own padding to
    // reach the card; every pixel of that is outside the row holding the
    // leave handler, so the card spans it.
    it('AsMenuRow_BridgesTheWholeCorridorBackToTheRow', async () => {
      const user = userEvent.setup({ skipHover: true });
      stubLayout(700);
      render(inMenu(<BylineProfileCard {...baseProps} asMenuRow />));
      await user.click(row());

      // Card right edge at 472 + 220 = 692; the row starts at 700 + 6.
      expect(card()).toHaveStyle({ '--byline-card-bridge': '14px' });
    });

    // A phone's menu is nearly the whole width, so there is no room beside it
    // and the card drops from the row instead of flying off the left edge.
    it('AsMenuRowOnAPhone_DropsFromTheRowInsteadOfBesideTheMenu', async () => {
      const user = userEvent.setup({ skipHover: true });
      stubLayout(60, 390);
      render(inMenu(<BylineProfileCard {...baseProps} asMenuRow />));
      await user.click(row());

      // Row's own left edge, and its bottom rather than its top.
      expect(card()).toHaveStyle({ left: '66px', top: '544px' });
    });

    // Dropped from the row the card already touches it, so there is no
    // corridor for the pointer to cross.
    it('AsMenuRowOnAPhone_NeedsNoBridge', async () => {
      const user = userEvent.setup({ skipHover: true });
      stubLayout(60, 390);
      render(inMenu(<BylineProfileCard {...baseProps} asMenuRow />));
      await user.click(row());

      expect(card()).toHaveStyle({ '--byline-card-bridge': '0px' });
    });

    it('AsMenuRow_HoverOpensTheCardAsTheBylineDoes', async () => {
      const user = userEvent.setup();
      render(<BylineProfileCard {...baseProps} asMenuRow />);
      await user.hover(row());

      expect(card()).toBeInTheDocument();
    });
  });

  describe('UnnamedProfile', () => {
    it('EmptyName_LabelsTheTriggerWithTheOwnerPlaceholder', () => {
      render(
        <BylineProfileCard {...baseProps} owner={{ ...owner, name: '' }} />
      );

      expect(
        screen.getByRole('button', { name: 'About the owner' })
      ).toBeInTheDocument();
    });
  });
});
