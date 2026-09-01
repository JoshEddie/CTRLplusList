/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The list-hero-header spec mandates structural / DOM-order facts (exact class
 * strings, sibling order, wrapper presence-or-absence) on non-interactive
 * elements that carry no ARIA role; container.querySelector is the only way to
 * assert them. Interactive affordances are still queried by role / accessible
 * name. */
import { ROLES } from '@/lib/data/profile.roles';
import { PROTECTED_TIER } from '@/lib/spoilers';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    spoilerHref?: string;
    previewHref?: string;
    exitPreviewHref?: string;
    disabled?: boolean;
    prependedItems?: React.ReactNode;
  }) => (
    <div
      data-testid="actions-menu-stub"
      data-preview-href={props.previewHref}
      data-exit-href={props.exitPreviewHref}
      data-disabled={props.disabled || undefined}
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
vi.mock('@/app/(main)/users/ui/components/FollowContainer', () => ({
  default: () => <div data-testid="follow-stub" />,
}));
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
vi.mock('@/app/(main)/lists/ui/components/ListFormContainer', () => ({
  default: () => <div data-testid="list-form-container" />,
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
  const kebab = hero.querySelector('.list-hero-kebab') as HTMLElement;
  const actions = hero.querySelector('.list-hero-actions') as HTMLElement;
  const tiles = hero.querySelector('.list-hero-tiles') as HTMLElement;
  const meta = hero.querySelector('.list-hero-meta') as HTMLElement;
  return { hero, titleblock, kebab, actions, tiles, meta };
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
    it('Owner_RendersTitleKebabActionsTilesMetaInOrder', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      const main = container.querySelector('.list-hero-main') as HTMLElement;
      expectInOrder(main, [
        '.list-hero-titleblock',
        '.list-hero-kebab',
        '.list-hero-actions',
        '.list-hero-tiles',
        '.list-hero-meta',
      ]);
    });

    it('OwnerShared_TilesHavePickerThenSpoilerTile', async () => {
      const { tiles } = await renderHero({ list: sharedOwnerList() });
      expect(
        tiles.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeInTheDocument();
      expect(
        tiles.querySelector('[data-testid="spoiler-tile"]')
      ).toBeInTheDocument();
      expectInOrder(tiles, [
        '[data-testid="visibility-picker-stub"]',
        '[data-testid="spoiler-tile"]',
      ]);
    });

    it('OwnerShared_ActionsHaveShareButton', async () => {
      const { actions } = await renderHero({ list: sharedOwnerList() });
      expect(
        within(actions).getByRole('button', { name: 'Share list' })
      ).toBeInTheDocument();
    });

    it('OwnerPrivate_TilesHavePicker-ActionsHaveNoShareButton', async () => {
      const { tiles, actions } = await renderHero({
        list: makeList({ shared: false }),
      });
      expect(
        tiles.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeInTheDocument();
      expect(
        within(actions).queryByRole('button', { name: 'Share list' })
      ).not.toBeInTheDocument();
    });

    it('Owner_ActionsHaveChooseItems-KebabIsCorner-NoEditButton', async () => {
      const { actions, kebab } = await renderHero({
        list: sharedOwnerList({ id: 'list-7' }),
      });
      const chooseItems = within(actions).getByRole('link', {
        name: 'Choose items',
      });
      expect(chooseItems).toHaveAttribute('href', '/lists/list-7/choose-items');
      // Edit is never a hero button; it lives in the corner kebab menu, which
      // sits outside the actions cluster.
      expect(
        within(actions).queryByRole('button', { name: 'Edit list' })
      ).not.toBeInTheDocument();
      expect(
        actions.querySelector('[data-testid="actions-menu-stub"]')
      ).not.toBeInTheDocument();
      expect(
        kebab.querySelector('[data-testid="actions-menu-stub"]')
      ).toBeInTheDocument();
    });

    it('Owner_NoBylineGroup', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      expect(
        container.querySelector('.list-hero-byline-group')
      ).not.toBeInTheDocument();
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

    it('Viewer_TilesHoldByline-ActionsHoldShareAndBookmark', async () => {
      const { tiles, actions } = await renderHero(viewerProps);
      expect(
        tiles.querySelector('.list-hero-byline-group')
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole('button', { name: 'Share list' })
      ).toBeInTheDocument();
      expect(
        actions.querySelector('[data-testid="bookmark-stub"]')
      ).toBeInTheDocument();
    });

    it('Viewer_BylineHasAvatarLinkedNameFollow', async () => {
      const { container } = await renderHero(viewerProps);
      const byline = container.querySelector(
        '.list-hero-byline-group'
      ) as HTMLElement;
      const nameLink = within(byline).getByRole('link', {
        name: 'Olivia Owner',
      });
      expect(nameLink).toHaveAttribute('href', '/altvatar/owner-profile-1');
      expectInOrder(byline, [
        '[data-testid="avatar-stub"]',
        '.list-hero-byline-link',
        '[data-testid="follow-stub"]',
      ]);
    });

    it('Viewer_ActionsHaveNoKebabOrEdit', async () => {
      const { actions } = await renderHero(viewerProps);
      expect(
        actions.querySelector('[data-testid="actions-menu-stub"]')
      ).not.toBeInTheDocument();
      expect(
        within(actions).queryByRole('button', { name: 'Edit list' })
      ).not.toBeInTheDocument();
    });

    it('Viewer_HasNoVisibilityPicker', async () => {
      const { hero } = await renderHero(viewerProps);
      expect(
        hero.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeNull();
    });

    it('UnnamedOwner_BylineLinkRendersWithEmptyName', async () => {
      const { container } = await renderHero({
        ...viewerProps,
        owner: { name: '', accent: null, art: null, avatarStyle: null },
      });
      const link = container.querySelector(
        '.list-hero-byline-link'
      ) as HTMLElement;
      expect(link).toHaveAttribute('href', '/altvatar/owner-profile-1');
      expect(link).toHaveTextContent('');
    });
  });

  // With the spoiler toggle retired, the kebab carries the preview pair alone.
  describe('NavHrefs', () => {
    function kebabOf(container: HTMLElement) {
      return container.querySelector(
        '[data-testid="collapsed-kebab"] [data-testid="actions-menu-stub"]'
      ) as HTMLElement;
    }

    it('OwnerView_ComputesPreviewAndExitHrefs', async () => {
      const { container } = await renderHero({});
      const kebab = kebabOf(container);
      expect(kebab).toHaveAttribute(
        'data-preview-href',
        '/lists/list-1?preview=viewer'
      );
      expect(kebab).toHaveAttribute('data-exit-href', '/lists/list-1');
    });

    it('Preview_ComputesTheSamePreviewAndExitHrefs', async () => {
      const { container } = await renderHero({ previewMode: true });
      const kebab = kebabOf(container);
      expect(kebab).toHaveAttribute(
        'data-preview-href',
        '/lists/list-1?preview=viewer'
      );
      expect(kebab).toHaveAttribute('data-exit-href', '/lists/list-1');
    });

    it('AnyMode_CarriesNoSpoilerHref', async () => {
      const { container } = await renderHero({});
      expect(kebabOf(container)).not.toHaveAttribute('data-spoiler-href');
    });
  });

  describe('Preview', () => {
    const previewProps: Partial<Props> = {
      isOwner: true,
      previewMode: true,
      list: sharedOwnerList(),
    };

    it('Preview_RendersBannerWithExitLink', async () => {
      const { container } = await renderHero(previewProps);
      const banner = container.querySelector('.preview-banner') as HTMLElement;
      expect(banner).toHaveAttribute('role', 'status');
      const exit = within(banner).getByRole('link', { name: 'Exit preview' });
      expect(exit).toHaveAttribute('href', '/lists/list-1');
    });

    it('Preview_HidesVisibilityClusterAndSecondaryActions', async () => {
      const { hero } = await renderHero(previewProps);
      expect(
        hero.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeNull();
      expect(
        within(hero).queryByRole('link', { name: 'Choose items' })
      ).toBeNull();
      expect(
        within(hero).queryByRole('button', { name: 'Edit list' })
      ).toBeNull();
    });

    it('Preview_KebabInCorner-NoActions-TilesEmpty-NoByline', async () => {
      const { hero, kebab, tiles } = await renderHero(previewProps);
      // The kebab (its Exit-preview) is the only control; no actions cluster.
      expect(
        kebab.querySelector('[data-testid="actions-menu-stub"]')
      ).toBeInTheDocument();
      expect(hero.querySelector('.list-hero-actions')).toBeNull();
      expect(tiles).toBeEmptyDOMElement();
      expect(tiles.querySelector('.list-hero-byline-group')).toBeNull();
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
      const { tiles } = await renderHero({ list: sharedOwnerList() });
      const picker = tiles.querySelector(
        '[data-testid="visibility-picker-stub"]'
      ) as HTMLElement;
      expect(picker).toHaveAttribute('data-disabled', 'true');
    });

    it('Manager_CornerKebabDisabled', async () => {
      // Edit/Delete live in the corner kebab, which the owner floor disables —
      // there is no separate hero Edit button to gate.
      const { kebab } = await renderHero({ list: sharedOwnerList() });
      const menu = kebab.querySelector(
        '[data-testid="actions-menu-stub"]'
      ) as HTMLElement;
      expect(menu).toHaveAttribute('data-disabled', 'true');
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
   * offered only to a member viewing outside preview, beside the visibility
   * picker for an owner and in the viewer controls for a non-owner member; its
   * strip-kebab twin hoists in lockstep.
   */
  describe('SpoilersTile', () => {
    it('OwnerMember_RendersTileBesideTheVisibilityPickerInTiles', async () => {
      const { tiles } = await renderHero({ list: sharedOwnerList() });
      const tile = tiles.querySelector(
        '[data-testid="spoiler-tile"]'
      ) as HTMLElement;
      expect(tile).toBeInTheDocument();
      expect(tile).toHaveAttribute('data-tier', 'surprise');
      expect(tile).toHaveAttribute('data-baseline', 'surprise');
      expectInOrder(tiles, [
        '[data-testid="visibility-picker-stub"]',
        '[data-testid="spoiler-tile"]',
      ]);
    });

    it('ViewerMember_RendersTileInTilesAfterByline', async () => {
      const { tiles } = await renderHero({
        isOwner: false,
        viewer_user_id: 'viewer-9',
        viewer_self_profile_id: 'viewer-profile-9',
        viewerIsMember: true,
        tier: 'claims',
        baseline: 'surprise',
        list: makeList({ shared: true, profile_id: 'owner-profile-1' }),
      });
      const tile = tiles.querySelector(
        '[data-testid="spoiler-tile"]'
      ) as HTMLElement;
      expect(tile).toBeInTheDocument();
      expect(tile).toHaveAttribute('data-tier', 'claims');
      expectInOrder(tiles, [
        '.list-hero-byline-group',
        '[data-testid="spoiler-tile"]',
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

    it('PreviewMode_HidesTheTile', async () => {
      const { container } = await renderHero({
        list: sharedOwnerList(),
        previewMode: true,
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
        tier: 'identity',
      });

      expect(screen.getByTestId('switch-offer-stub')).toBeInTheDocument();
    });
  });
});