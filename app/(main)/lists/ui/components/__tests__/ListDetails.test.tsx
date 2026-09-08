/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The list-hero-header spec mandates structural / DOM-order facts (exact class
 * strings, sibling order, wrapper presence-or-absence) on non-interactive
 * elements that carry no ARIA role; container.querySelector is the only way to
 * assert them. Interactive affordances are still queried by role / accessible
 * name. */
import { ROLES } from '@/lib/data/profile.roles';
import { PROTECTED_TIER } from '@/lib/spoilers';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFollowState, type FollowState } from '@/lib/data/follow';
import { getProfileForViewer } from '@/lib/data/profile';
import { writableMembership } from '@/lib/data/profile.gate';
import { authedIdentity } from '@/lib/data/user.session';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import ListDetails from '../ListDetails';
import { makeList, type TestList } from './test-helpers';

// Out-of-carve-out collaborators stubbed to inert nodes (§3.1). ShareButton
// and EditListAction are real (in carve-out, §3.2).
vi.mock('../VisibilityPicker', () => ({
  default: (props: { disabled?: boolean }) => (
    <div
      data-testid="visibility-picker-stub"
      data-disabled={props.disabled || undefined}
    />
  ),
}));
vi.mock('../ListActionsMenu', () => ({
  default: (props: {
    deleteDisabled?: boolean;
    prependedItems?: React.ReactNode;
  }) => (
    <div
      data-testid="actions-menu-stub"
      data-disabled={props.deleteDisabled || undefined}
    >
      {props.prependedItems}
    </div>
  ),
}));
vi.mock('../SwitchProfileOffer', () => ({
  default: (p: { profileId: string; profileName: string }) => (
    <div
      data-testid="switch-offer-stub"
      data-profile-id={p.profileId}
      data-profile-name={p.profileName}
    />
  ),
}));
vi.mock('@/lib/data/profile.gate', () => ({
  writableMembership: vi.fn(),
}));
vi.mock('@/app/ui/components/ProfileAvatar', () => ({
  default: () => <div data-testid="avatar-stub" />,
}));
// The card is a client control owning its own popover (covered by its own
// tests); inert here, so what ListDetails feeds it is what gets asserted.
vi.mock('../BylineProfileCard', () => ({
  default: (p: {
    profileId: string;
    listCount: number;
    followState?: FollowState | null;
    asMenuRow?: boolean;
  }) => (
    <div
      data-testid={p.asMenuRow ? 'byline-card-row' : 'byline-card'}
      data-profile-id={p.profileId}
      data-list-count={p.listCount}
      data-offers-follow={p.followState ? 'true' : undefined}
    />
  ),
}));
vi.mock('@/lib/data/profile', () => ({ getProfileForViewer: vi.fn() }));
vi.mock('@/lib/data/follow', () => ({ getFollowState: vi.fn() }));
vi.mock('../BookmarkContainer', () => ({
  default: () => <div data-testid="bookmark-stub" />,
}));
vi.mock('../HeroCollapsedItemsContainer', () => ({
  HeroCollapsedOwnerItems: () => <div data-testid="collapsed-owner-items" />,
  HeroCollapsedViewerItems: () => <div data-testid="collapsed-viewer-items" />,
}));
// The Spoilers tile and its collapsed-kebab twin are client controls owning
// their own popover behavior (covered by SpoilerPicker's own tests); here they
// are inert nodes so ListDetails' placement / gating is what gets asserted.
vi.mock('@/app/ui/components/SpoilerPicker', () => ({
  default: (p: { tier: string; baseline: string }) => (
    <div
      data-testid="spoiler-tile"
      data-tier={p.tier}
      data-baseline={p.baseline}
    />
  ),
}));
vi.mock('../HeroCollapsedItems', () => ({
  SpoilerMenuItems: (p: { tier: string; baseline: string }) => (
    <div
      data-testid="spoiler-menu-items"
      data-tier={p.tier}
      data-baseline={p.baseline}
    />
  ),
}));
vi.mock('../ListHeroSurface', () => ({
  default: ({
    title,
    kebab,
    children,
  }: {
    title: string;
    kebab: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="sticky-strip" data-title={title}>
      <div data-testid="collapsed-kebab">{kebab}</div>
      {children}
    </div>
  ),
}));
// EditListAction is real; its downstream form (owned by 4.9) is mocked away.
vi.mock('@/app/(main)/lists/ui/components/ListFormContainer', async () => ({
  default: (await import('./list-form-stub')).ListFormContainerStub,
}));
// ShareButton is real but calls useRouter at render and imports a server
// action whose module initializes the DB at load — mock both boundaries.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/lib/data/list.actions', () => ({ setListVisibility: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));

beforeEach(() => {
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity(
      'owner-1',
      makeProfile('owner-profile-1'),
      makeProfile('owner-profile-1', 'Olivia Owner', ROLES.owner)
    )
  );
  vi.mocked(writableMembership).mockResolvedValue(null);
  vi.mocked(getFollowState).mockResolvedValue({
    following: false,
    requireDisclosure: false,
  });
  vi.mocked(getProfileForViewer).mockResolvedValue({
    publicListCount: 9,
  } as Awaited<ReturnType<typeof getProfileForViewer>>);
});

afterEach(() => {
  vi.clearAllMocks();
});

type Props = Parameters<typeof ListDetails>[0];

const baseProps: Props = {
  isOwner: true,
  list: makeList(),
  owner: {
    name: 'Olivia Owner',
    accent: null,
    art: null,
    avatarStyle: null,
  },
  viewer_user_id: 'owner-1',
  viewer_self_profile_id: 'owner-profile-1',
  tier: PROTECTED_TIER,
  baseline: PROTECTED_TIER,
  viewerIsMember: true,
  itemCount: 3,
};

async function renderHero(overrides: Partial<Props> = {}) {
  const view = render(await ListDetails({ ...baseProps, ...overrides }));
  return { ...view, ...heroOf(view.container) };
}

function heroOf(container: HTMLElement) {
  const hero = container.querySelector('.list-hero') as HTMLElement;
  const titleblock = hero.querySelector(
    '.list-hero-titleblock'
  ) as HTMLElement;
  const titleLine = hero.querySelector('.list-hero-title-line') as HTMLElement;
  const actions = hero.querySelector('.list-hero-actions') as HTMLElement;
  const row1 = hero.querySelectorAll('.list-hero-row')[0] as HTMLElement;
  const row2 = hero.querySelectorAll('.list-hero-row')[1] as HTMLElement;
  const meta = hero.querySelector('.list-hero-meta') as HTMLElement;
  return { hero, titleblock, titleLine, actions, row1, row2, meta };
}

function expectInOrder(scope: Element, selectors: string[]) {
  const nodes = selectors.map((selector) => {
    const el = scope.querySelector(selector);
    expect(el).not.toBeNull();
    return el as Element;
  });
  for (let i = 1; i < nodes.length; i++) {
    const relation = nodes[i - 1].compareDocumentPosition(nodes[i]);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
}

const sharedOwnerList = (overrides: Partial<TestList> = {}) =>
  makeList({ shared: true, ...overrides });

describe('ListDetails', () => {
  describe('Owner', () => {
    it('Owner_Row1HoldsTitleblockThenByline-Row2HoldsShareVisibilitySpoilersMeta', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      const rows = container.querySelectorAll('.list-hero-main > .list-hero-row');
      expect(rows).toHaveLength(2);
      expectInOrder(rows[0], [
        '.list-hero-title-line',
        '[data-testid="byline-card"]',
      ]);
      expectInOrder(rows[1], [
        '.list-hero-actions',
        '[data-testid="visibility-picker-stub"]',
        '[data-testid="spoiler-tile"]',
        '.list-hero-meta',
      ]);
    });

    it('OwnerShared_ActionsHaveShareButton', async () => {
      const { actions } = await renderHero({ list: sharedOwnerList() });
      expect(
        within(actions).getByRole('button', { name: 'Share list' })
      ).toBeInTheDocument();
    });

    // Share is the owner's only button, so an owner-only list leaves the row
    // with nothing to hold.
    it('OwnerPrivate_Row2HasPicker-OmitsTheActionsRow', async () => {
      const { row2, container } = await renderHero({
        list: makeList({ shared: false }),
      });
      expect(
        row2.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeInTheDocument();
      expect(container.querySelector('.list-hero-actions')).toBeNull();
    });

    it('Owner_TitleLineHoldsTitleThenPencil', async () => {
      const { titleLine } = await renderHero({ list: sharedOwnerList() });
      expect(titleLine.querySelector('.list-hero-title')).toHaveTextContent(
        'Birthday Wishlist'
      );
      expectInOrder(titleLine, ['.list-hero-title', '.btn']);
      expect(
        within(titleLine).getByRole('button', { name: 'Edit list' })
      ).toBeInTheDocument();
    });

    // The kebab and its Edit-items door are gone: the pencil reaches the list
    // form in one press, and the form carries Delete.
    it('Owner_HeroHasNoKebabOrEditItemsLink', async () => {
      const { hero } = await renderHero({ list: sharedOwnerList() });
      expect(
        hero.querySelector('[data-testid="actions-menu-stub"]')
      ).toBeNull();
      expect(
        within(hero).queryByRole('link', { name: 'Edit Items' })
      ).not.toBeInTheDocument();
    });

    // The owner looking at their own self-profile's list: the card names the
    // profile and counts its lists, and offers no Follow.
    it('OwnerIsTheOwningSelfProfile_CardCarriesTheListCount-NoFollow', async () => {
      const { titleblock } = await renderHero({ list: sharedOwnerList() });
      const card = titleblock.querySelector(
        '[data-testid="byline-card"]'
      ) as HTMLElement;
      expect(card).toHaveAttribute('data-profile-id', 'owner-profile-1');
      expect(card).toHaveAttribute('data-list-count', '9');
      expect(card).not.toHaveAttribute('data-offers-follow');
    });

    // Acting as a profile that is not the viewer's own self still reaches
    // Follow — following a managed profile one owns is supported.
    it('OwnerActingAsAManagedProfile_CardStillCarriesFollow', async () => {
      const { titleblock } = await renderHero({
        list: sharedOwnerList(),
        viewer_self_profile_id: 'viewer-self-1',
      });
      expect(
        titleblock.querySelector('[data-testid="byline-card"]')
      ).toHaveAttribute('data-offers-follow', 'true');
    });
  });

  describe('Viewer', () => {
    const viewerProps: Partial<Props> = {
      isOwner: false,
      viewer_user_id: 'viewer-9',
      viewer_self_profile_id: 'viewer-profile-9',
      viewerIsMember: false,
      list: makeList({ shared: true, profile_id: 'owner-profile-1' }),
    };

    it('Viewer_TitleblockEndsWithTheCard-Row2HoldsShareThenBookmarkThenMeta', async () => {
      const { titleblock, row2, actions } = await renderHero(viewerProps);
      expect(titleblock.lastElementChild).toHaveAttribute(
        'data-testid',
        'byline-card'
      );
      expectInOrder(row2, ['.list-hero-actions', '.list-hero-meta']);
      expect(
        row2.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeNull();
      expectInOrder(actions, [
        'button[aria-label="Share list"]',
        '[data-testid="bookmark-stub"]',
      ]);
    });

    // Share is the row's fixed anchor: it opens the cluster whoever is
    // looking, so no control ever lands where a different one just stood.
    it('ViewerMember_ShareLeadsTheRowAheadOfEveryViewerKeyedControl', async () => {
      const { row2 } = await renderHero({
        ...viewerProps,
        viewerIsMember: true,
        tier: 'claims',
      });
      expect(row2.firstElementChild).toHaveClass('list-hero-actions');
      expect(
        (row2.firstElementChild as HTMLElement).firstElementChild
      ).toHaveAttribute('aria-label', 'Share list');
    });

    it('Viewer_CardCarriesFollowForTheOwningProfile', async () => {
      const { container } = await renderHero(viewerProps);
      const card = container.querySelector(
        '[data-testid="byline-card"]'
      ) as HTMLElement;
      expect(card).toHaveAttribute('data-profile-id', 'owner-profile-1');
      expect(card).toHaveAttribute('data-offers-follow', 'true');
    });

    it('Viewer_HeroHasNoPencilOrKebab', async () => {
      const { hero } = await renderHero(viewerProps);
      expect(
        hero.querySelector('[data-testid="actions-menu-stub"]')
      ).not.toBeInTheDocument();
      expect(
        within(hero).queryByRole('button', { name: 'Edit list' })
      ).not.toBeInTheDocument();
    });

    it('Viewer_HasNoVisibilityPicker', async () => {
      const { hero } = await renderHero(viewerProps);
      expect(
        hero.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeNull();
    });

    it('SignedOutViewer_StillSeesTheByline-NoActionsClusterAndNoKebabPrepends', async () => {
      const { container } = await renderHero({
        ...viewerProps,
        viewer_user_id: undefined,
        viewer_self_profile_id: undefined,
      });
      const kebab = screen.getByTestId('collapsed-kebab');
      expect(
        kebab.querySelector('[data-testid="collapsed-viewer-items"]')
      ).toBeNull();
      expect(
        kebab.querySelector('[data-testid="collapsed-owner-items"]')
      ).toBeNull();
      expect(container.querySelector('.list-hero-actions')).toBeNull();
      const card = container.querySelector(
        '[data-testid="byline-card"]'
      ) as HTMLElement;
      expect(card).toHaveAttribute('data-profile-id', 'owner-profile-1');
      expect(card).not.toHaveAttribute('data-offers-follow');
    });
  });

  describe('EyebrowSubtitle', () => {
    it('OccasionAndSubtitle_RendersEyebrowAndSubtitleAsSiblings', async () => {
      const { container } = await renderHero({
        list: makeList({ occasion: 'WEDDING', subtitle: 'Our big day' }),
      });
      const wrapper = container.querySelector(
        '.list-hero-eyebrow-subtitle-wrapper'
      ) as HTMLElement;
      expect(wrapper.querySelector('.list-hero-eyebrow')).toHaveTextContent(
        'WEDDING'
      );
      expect(wrapper.querySelector('.list-hero-subtitle')).toHaveTextContent(
        'Our big day'
      );
      expectInOrder(wrapper, ['.list-hero-eyebrow', '.list-hero-subtitle']);
    });

    it('NoOccasion_OmitsEyebrow', async () => {
      const { container } = await renderHero({
        list: makeList({ occasion: '', subtitle: 'Just a subtitle' }),
      });
      const wrapper = container.querySelector(
        '.list-hero-eyebrow-subtitle-wrapper'
      ) as HTMLElement;
      expect(wrapper.querySelector('.list-hero-subtitle')).toHaveTextContent(
        'Just a subtitle'
      );
      expect(wrapper.querySelector('.list-hero-eyebrow')).toBeNull();
    });

    // divergence: a non-empty occasion with an empty subtitle currently renders
    // NO eyebrow (the eyebrow lives only inside the subtitle-gated wrapper).
    // This documents current behavior; it does NOT lock it as correct — see
    // tasks.md §7.10 / design Decision 8.
    it('NoSubtitle_OmitsEyebrowSubtitleWrapper', async () => {
      const { container } = await renderHero({
        list: makeList({ occasion: 'WEDDING', subtitle: null }),
      });
      expect(
        container.querySelector('.list-hero-eyebrow-subtitle-wrapper')
      ).toBeNull();
      expect(container.querySelector('.list-hero-eyebrow')).toBeNull();
    });
  });

  describe('Footer', () => {
    function footText(container: HTMLElement) {
      return (container.querySelector('.list-hero-meta') as HTMLElement)
        .textContent;
    }

    // updated_at passed as an ISO string (as a raw DB read can be) exercises
    // timeAgo's string-coercion branch.
    it('MultipleItems_FooterShowsPluralCountAndUpdated', async () => {
      const { container } = await renderHero({
        itemCount: 12,
        list: makeList({
          updated_at: new Date().toISOString() as unknown as Date,
        }),
      });
      expect(footText(container)).toMatch(/^12 items · updated /);
    });

    it('SingleItem_FooterShowsSingularItem', async () => {
      const { container } = await renderHero({
        itemCount: 1,
        list: makeList({ updated_at: new Date() }),
      });
      expect(footText(container)).toMatch(/^1 item · updated /);
    });

    it('ZeroItems_FooterStillRenders', async () => {
      const { container } = await renderHero({
        itemCount: 0,
        list: makeList({ updated_at: new Date() }),
      });
      expect(footText(container)).toMatch(/^0 items · updated /);
    });

    it('NoUpdatedAt_OmitsUpdatedTail', async () => {
      const { container } = await renderHero({
        itemCount: 5,
        list: makeList({ updated_at: null as unknown as Date }),
      });
      expect(footText(container)).toBe('5 items');
    });

    describe('TimeAgoBuckets', () => {
      const fixedNow = new Date('2030-06-15T12:00:00Z');

      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      const cases: [string, number, string][] = [
        ['JustNow', 30, 'just now'],
        ['Minutes', 5 * 60, '5 minutes ago'],
        ['Hours', 2 * 3600, '2 hours ago'],
        ['Days', 2 * 86400, '2 days ago'],
        ['Weeks', 3 * 604800, '3 weeks ago'],
        ['Months', 2 * 2592000, '2 months ago'],
        ['Years', 2 * 31536000, '2 years ago'],
      ];

      it.each(cases)(
        'Bucket%s_FooterShowsUpdatedAgo',
        async (_label, deltaSeconds, expected) => {
          const updated_at = new Date(fixedNow.getTime() - deltaSeconds * 1000);
          const { container } = await renderHero({
            itemCount: 4,
            list: makeList({ updated_at }),
          });
          expect(
            (container.querySelector('.list-hero-meta') as HTMLElement)
              .textContent
          ).toBe(`4 items · updated ${expected}`);
        }
      );
    });
  });

  describe('Manager', () => {
    beforeEach(() => {
      vi.mocked(authedIdentity).mockResolvedValue(
        makeIdentity(
          'mgr-1',
          makeProfile('mgr-self'),
          makeProfile('owner-profile-1', 'Olivia Owner', ROLES.manager)
        )
      );
    });

    it('Manager_VisibilityPickerRendersDisabled', async () => {
      const { row2 } = await renderHero({ list: sharedOwnerList() });
      const picker = row2.querySelector(
        '[data-testid="visibility-picker-stub"]'
      ) as HTMLElement;
      expect(picker).toHaveAttribute('data-disabled', 'true');
    });

    it('ManagerOpensTheListForm_DeleteRendersDisabled', async () => {
      const user = userEvent.setup();
      const { titleLine } = await renderHero({ list: sharedOwnerList() });
      await user.click(
        within(titleLine).getByRole('button', { name: 'Edit list' })
      );
      expect(screen.getByTestId('list-form-container')).toHaveAttribute(
        'data-delete-disabled',
        'true'
      );
    });

    it('Manager_CollapsedKebabDisabled', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      const kebab = container.querySelector(
        '[data-testid="collapsed-kebab"] [data-testid="actions-menu-stub"]'
      ) as HTMLElement;
      expect(kebab).toHaveAttribute('data-disabled', 'true');
    });
  });

  /**
   * Pins `list-hero-header` — the footer's claimed-count progress renders only
   * where the resolved tier is `progress` or above AND a count was read; at
   * `surprise` the line carries item count and time alone.
   */
  describe('FooterProgress', () => {
    const foot = (container: HTMLElement) =>
      container.querySelector('.list-hero-meta') as HTMLElement;

    it('SurpriseTier_CarriesItemCountAndTimeAlone-NoProgress', async () => {
      const { container } = await renderHero({});
      const line = foot(container);

      expect(line).toHaveTextContent('3 items');
      expect(line).not.toHaveTextContent('claimed');
      expect(line.querySelector('.list-hero-progress')).toBeNull();
    });

    it('ProgressTier_RendersClaimProgressAgainstTheTotal', async () => {
      const { container } = await renderHero({
        tier: 'progress',
        claimedCount: 4,
        itemCount: 10,
      });
      const line = foot(container);

      expect(line).toHaveTextContent('4 / 10 claimed');
      expect(
        within(line).getByRole('group', { name: '4 of 10 items claimed' })
      ).toBeInTheDocument();
    });

    it('ClaimsTier_StillRendersClaimProgress', async () => {
      const { container } = await renderHero({
        tier: 'claims',
        claimedCount: 6,
        itemCount: 10,
      });

      expect(foot(container)).toHaveTextContent('6 / 10 claimed');
    });

    // The tier gate is met but no count was read (surprise costs no query, and
    // a higher tier with an undefined count must not fabricate a placeholder).
    it('ProgressTierNoClaimedCount_OmitsProgress', async () => {
      const { container } = await renderHero({
        tier: 'progress',
        claimedCount: undefined,
      });
      const line = foot(container);

      expect(line).toHaveTextContent('3 items');
      expect(line.querySelector('.list-hero-progress')).toBeNull();
    });
  });

  /**
   * Pins `list-hero-collapse` / `spoiler-visibility` — the Spoilers tile is
   * offered to any member, the owner included: beside the visibility picker
   * for an owner and in the viewer controls for a non-owner member; its
   * strip-kebab twin hoists in lockstep.
   */
  describe('SpoilersTile', () => {
    it('OwnerMember_RendersTileAfterShareAndTheVisibilityPicker', async () => {
      const { row2 } = await renderHero({ list: sharedOwnerList() });
      const tile = row2.querySelector(
        '[data-testid="spoiler-tile"]'
      ) as HTMLElement;
      expect(tile).toBeInTheDocument();
      expect(tile).toHaveAttribute('data-tier', 'surprise');
      expect(tile).toHaveAttribute('data-baseline', 'surprise');
      expectInOrder(row2, [
        '.list-hero-actions',
        '[data-testid="visibility-picker-stub"]',
        '[data-testid="spoiler-tile"]',
      ]);
    });

    it('ViewerMember_RendersTileAfterTheActionsRow', async () => {
      const { row2 } = await renderHero({
        isOwner: false,
        viewer_user_id: 'viewer-9',
        viewer_self_profile_id: 'viewer-profile-9',
        viewerIsMember: true,
        tier: 'claims',
        baseline: 'surprise',
        list: makeList({ shared: true, profile_id: 'owner-profile-1' }),
      });
      const tile = row2.querySelector(
        '[data-testid="spoiler-tile"]'
      ) as HTMLElement;
      expect(tile).toBeInTheDocument();
      expect(tile).toHaveAttribute('data-tier', 'claims');
      expectInOrder(row2, [
        '.list-hero-actions',
        '[data-testid="spoiler-tile"]',
        '.list-hero-meta',
      ]);
    });

    it('NonMemberViewer_RendersNoTile', async () => {
      const { container } = await renderHero({
        isOwner: false,
        viewer_user_id: 'viewer-9',
        viewer_self_profile_id: 'viewer-profile-9',
        viewerIsMember: false,
        list: makeList({ shared: true, profile_id: 'owner-profile-1' }),
      });
      expect(
        container.querySelector('[data-testid="spoiler-tile"]')
      ).toBeNull();
    });

    it('OwnerMember_CollapsedKebabHoistsSpoilerMenuItems', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      const kebab = container.querySelector(
        '[data-testid="collapsed-kebab"]'
      ) as HTMLElement;
      expect(
        kebab.querySelector('[data-testid="spoiler-menu-items"]')
      ).toBeInTheDocument();
    });

    it('NonMemberViewer_CollapsedKebabOmitsSpoilerMenuItems', async () => {
      const { container } = await renderHero({
        isOwner: false,
        viewer_user_id: 'viewer-9',
        viewer_self_profile_id: 'viewer-profile-9',
        viewerIsMember: false,
        list: makeList({ shared: true, profile_id: 'owner-profile-1' }),
      });
      const kebab = container.querySelector(
        '[data-testid="collapsed-kebab"]'
      ) as HTMLElement;
      expect(
        kebab.querySelector('[data-testid="spoiler-menu-items"]')
      ).toBeNull();
    });
  });

  /**
   * The collapsed kebab mirrors the expanded hero: the byline survives the
   * collapse as a row opening the same card, and Follow is inside it rather
   * than standing alone.
   */
  describe('CollapsedMenu', () => {
    const kebab = () => screen.getByTestId('collapsed-kebab');

    it('Owner_KebabLeadsWithTheProfileRowCarryingTheSameCardProps', async () => {
      await renderHero({ list: sharedOwnerList() });
      const row = kebab().querySelector(
        '[data-testid="byline-card-row"]'
      ) as HTMLElement;
      expect(row).toHaveAttribute('data-profile-id', 'owner-profile-1');
      expect(row).toHaveAttribute('data-list-count', '9');
      expect(kebab().firstElementChild?.firstElementChild).toBe(row);
    });

    it('SignedOutViewer_KebabStillCarriesTheProfileRow', async () => {
      await renderHero({
        isOwner: false,
        viewerIsMember: false,
        viewer_user_id: undefined,
        viewer_self_profile_id: undefined,
        list: sharedOwnerList(),
      });
      expect(
        kebab().querySelector('[data-testid="byline-card-row"]')
      ).toBeInTheDocument();
    });
  });

  /**
   * Pins `list-hero-header` — the inline switch offer renders for a viewer
   * holding a membership on the owning profile while acting as another, and is
   * independent of the resolved spoiler state.
   */
  describe('SwitchOffer', () => {
    const asViewerOfSharedList = {
      isOwner: false,
      list: sharedOwnerList(),
      viewer_user_id: 'viewer-9',
      viewer_self_profile_id: 'viewer-profile-9',
    };

    // The account runs the owning profile but is acting as another, which is
    // the whole case the offer exists for.
    beforeEach(() => {
      vi.mocked(authedIdentity).mockResolvedValue(
        makeIdentity(
          'viewer-9',
          makeProfile('viewer-profile-9'),
          makeProfile('acting-profile-2', 'Other', ROLES.owner)
        )
      );
    });

    it('MembershipOnTheOwningProfile_RendersTheOfferNamingIt', async () => {
      vi.mocked(writableMembership).mockResolvedValue({
        name: 'Kiddo',
        role: ROLES.manager,
        last_active_at: null,
      });
      await renderHero(asViewerOfSharedList);

      const offer = screen.getByTestId('switch-offer-stub');
      expect(offer).toHaveAttribute('data-profile-name', 'Kiddo');
    });

    it('NoMembershipOnTheOwningProfile_RendersNoOffer', async () => {
      vi.mocked(writableMembership).mockResolvedValue(null);
      await renderHero(asViewerOfSharedList);

      expect(
        screen.queryByTestId('switch-offer-stub')
      ).not.toBeInTheDocument();
    });

    it('RaisedSpoilerTier_StillRendersTheOffer', async () => {
      vi.mocked(writableMembership).mockResolvedValue({
        name: 'Kiddo',
        role: ROLES.manager,
        last_active_at: null,
      });
      await renderHero({
        ...asViewerOfSharedList,
        tier: 'claims',
      });

      expect(screen.getByTestId('switch-offer-stub')).toBeInTheDocument();
    });
  });
});