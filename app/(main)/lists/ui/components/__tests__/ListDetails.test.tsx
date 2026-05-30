/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The list-hero-header spec mandates structural / DOM-order facts (exact class
 * strings, sibling order, wrapper presence-or-absence) on non-interactive
 * elements that carry no ARIA role; container.querySelector is the only way to
 * assert them. Interactive affordances are still queried by role / accessible
 * name. */
import { render, within } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import ListDetails from '../ListDetails';
import { makeList, type TestList } from './test-helpers';

// Out-of-carve-out collaborators stubbed to inert nodes (§3.1). ShareButton
// and EditListAction are real (in carve-out, §3.2).
vi.mock('../VisibilityPicker', () => ({
  default: () => <div data-testid="visibility-picker-stub" />,
}));
vi.mock('../ListActionsMenu', () => ({
  default: (props: {
    spoilerHref?: string;
    previewHref?: string;
    exitPreviewHref?: string;
  }) => (
    <div
      data-testid="actions-menu-stub"
      data-spoiler-href={props.spoilerHref}
      data-preview-href={props.previewHref}
      data-exit-href={props.exitPreviewHref}
    />
  ),
}));
vi.mock('@/app/(main)/users/ui/components/Avatar', () => ({
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
vi.mock('../HeroCollapseShell', () => ({
  default: ({
    title,
    collapsedKebab,
    children,
  }: {
    title: string;
    collapsedKebab: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="collapse-shell" data-title={title}>
      {children}
      <div data-testid="collapsed-kebab">{collapsedKebab}</div>
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
vi.mock('@/app/actions/lists', () => ({ setListVisibility: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

type Props = Parameters<typeof ListDetails>[0];

const baseProps: Props = {
  isOwner: true,
  list: makeList(),
  owner_name: 'Olivia Owner',
  owner_image: undefined,
  viewer_id: 'owner-1',
  itemCount: 3,
};

async function renderHero(overrides: Partial<Props> = {}) {
  const view = render(await ListDetails({ ...baseProps, ...overrides }));
  return { ...view, ...heroOf(view.container) };
}

function heroOf(container: HTMLElement) {
  const hero = container.querySelector('.list-hero') as HTMLElement;
  const identity = hero.querySelector('.list-hero-card-identity') as HTMLElement;
  const controls = hero.querySelector(
    '.list-hero-card-controls'
  ) as HTMLElement;
  return { hero, identity, controls };
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
    it('Owner_RendersGridWithIdentityThenControls', async () => {
      const { container } = await renderHero({ list: sharedOwnerList() });
      const grid = container.querySelector('.list-hero-grid') as HTMLElement;
      expect(grid.children[0]).toHaveClass('list-hero-card-identity');
      expect(grid.children[1]).toHaveClass('list-hero-card-controls');
    });

    it('OwnerShared_IdentityTopHasSingleShareWrapper-WithPickerAndShare', async () => {
      const { container, identity } = await renderHero({
        list: sharedOwnerList(),
      });
      expect(container.querySelectorAll('.list-hero-share-wrapper')).toHaveLength(
        1
      );
      const wrapper = identity.querySelector(
        '.list-hero-share-wrapper'
      ) as HTMLElement;
      expect(
        wrapper.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeInTheDocument();
      expect(
        within(wrapper).getByRole('button', { name: 'Share list' })
      ).toBeInTheDocument();
      expectInOrder(
        identity.querySelector('.list-hero-identity-top') as HTMLElement,
        ['.list-hero-share-wrapper', '.list-hero-title']
      );
    });

    it('OwnerPrivate_ShareWrapperHasPickerOnly-NoShareButton', async () => {
      const { identity } = await renderHero({
        list: makeList({ shared: false }),
      });
      const wrapper = identity.querySelector(
        '.list-hero-share-wrapper'
      ) as HTMLElement;
      expect(
        wrapper.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeInTheDocument();
      expect(
        within(wrapper).queryByRole('button', { name: 'Share list' })
      ).not.toBeInTheDocument();
    });

    it('Owner_ControlsCardHasActionRowThenChooseItems', async () => {
      const { controls } = await renderHero({
        list: sharedOwnerList({ id: 'list-7' }),
      });
      const actionRow = controls.querySelector(
        '.list-hero-action-row'
      ) as HTMLElement;
      expect(
        within(actionRow).getByRole('button', { name: 'Edit list' })
      ).toBeInTheDocument();
      expect(
        actionRow.querySelector('[data-testid="actions-menu-stub"]')
      ).toBeInTheDocument();
      const chooseItems = within(controls).getByRole('link', {
        name: 'Choose items',
      });
      expect(chooseItems).toHaveAttribute('href', '/lists/list-7/choose-items');
      expectInOrder(controls, [
        '.list-hero-action-row',
        'a[href="/lists/list-7/choose-items"]',
      ]);
    });

    it('Owner_ControlsCardHasNoShareButton', async () => {
      const { controls } = await renderHero({ list: sharedOwnerList() });
      expect(
        within(controls).queryByRole('button', { name: 'Share list' })
      ).not.toBeInTheDocument();
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
      viewer_id: 'viewer-9',
      list: makeList({ shared: true, user_id: 'owner-1' }),
    };

    it('Viewer_ControlsCardHasBylineThenDividerThenActionRow', async () => {
      const { controls } = await renderHero(viewerProps);
      expectInOrder(controls, [
        '.list-hero-byline-group',
        '.list-hero-divider',
        '.list-hero-action-row',
      ]);
    });

    it('Viewer_BylineHasAvatarLinkedNameFollow', async () => {
      const { container } = await renderHero(viewerProps);
      const byline = container.querySelector(
        '.list-hero-byline-group'
      ) as HTMLElement;
      const nameLink = within(byline).getByRole('link', {
        name: 'Olivia Owner',
      });
      expect(nameLink).toHaveAttribute('href', '/user/owner-1');
      expectInOrder(byline, [
        '[data-testid="avatar-stub"]',
        '.list-hero-byline-link',
        '[data-testid="follow-stub"]',
      ]);
    });

    it('Viewer_ActionRowHasShareAndBookmark', async () => {
      const { controls } = await renderHero(viewerProps);
      const actionRow = controls.querySelector(
        '.list-hero-action-row'
      ) as HTMLElement;
      expect(
        within(actionRow).getByRole('button', { name: 'Share list' })
      ).toBeInTheDocument();
      expect(
        actionRow.querySelector('[data-testid="bookmark-stub"]')
      ).toBeInTheDocument();
      expect(
        actionRow.querySelector('[data-testid="actions-menu-stub"]')
      ).not.toBeInTheDocument();
      expect(
        within(actionRow).queryByRole('button', { name: 'Edit list' })
      ).not.toBeInTheDocument();
    });

    it('Viewer_IdentityTopHasNoShareWrapper-NoPicker', async () => {
      const { container } = await renderHero(viewerProps);
      const hero = container.querySelector('.list-hero') as HTMLElement;
      expect(hero.querySelector('.list-hero-share-wrapper')).toBeNull();
      expect(
        hero.querySelector('[data-testid="visibility-picker-stub"]')
      ).toBeNull();
    });

    it('UnnamedOwner_BylineLinkRendersWithEmptyName', async () => {
      const { container } = await renderHero({
        ...viewerProps,
        owner_name: undefined,
      });
      const link = container.querySelector(
        '.list-hero-byline-link'
      ) as HTMLElement;
      expect(link).toHaveAttribute('href', '/user/owner-1');
      expect(link).toHaveTextContent('');
    });
  });

  // The hero computes spoiler/preview/exit nav hrefs and hands them to the
  // collapsed kebab; assert the exact strings across the showSpoilers ×
  // previewMode matrix.
  describe('NavHrefs', () => {
    function kebabOf(container: HTMLElement) {
      return container.querySelector(
        '[data-testid="collapsed-kebab"] [data-testid="actions-menu-stub"]'
      ) as HTMLElement;
    }

    const cases: [
      string,
      Partial<Props>,
      { spoiler: string; preview: string; exit: string },
    ][] = [
      [
        'NoSpoilerOwnerView',
        {},
        {
          spoiler: '/lists/list-1?spoilers=1',
          preview: '/lists/list-1?preview=viewer',
          exit: '/lists/list-1',
        },
      ],
      [
        'NoSpoilerPreview',
        { previewMode: true },
        {
          spoiler: '/lists/list-1?preview=viewer&spoilers=1',
          preview: '/lists/list-1?preview=viewer',
          exit: '/lists/list-1',
        },
      ],
      [
        'SpoilerOwnerView',
        { showSpoilers: true },
        {
          spoiler: '/lists/list-1',
          preview: '/lists/list-1?preview=viewer&spoilers=1',
          exit: '/lists/list-1?spoilers=1',
        },
      ],
      [
        'SpoilerPreview',
        { showSpoilers: true, previewMode: true },
        {
          spoiler: '/lists/list-1?preview=viewer',
          preview: '/lists/list-1?preview=viewer&spoilers=1',
          exit: '/lists/list-1?spoilers=1',
        },
      ],
    ];

    for (const [label, overrides, expected] of cases) {
      it(`${label}_ComputesSpoilerPreviewExitHrefs`, async () => {
        const { container } = await renderHero(overrides);
        const kebab = kebabOf(container);
        expect(kebab).toHaveAttribute('data-spoiler-href', expected.spoiler);
        expect(kebab).toHaveAttribute('data-preview-href', expected.preview);
        expect(kebab).toHaveAttribute('data-exit-href', expected.exit);
      });
    }
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
      const { container } = await renderHero(previewProps);
      const hero = container.querySelector('.list-hero') as HTMLElement;
      expect(hero.querySelector('.list-hero-share-wrapper')).toBeNull();
      expect(within(hero).queryByRole('link', { name: 'Choose items' })).toBeNull();
      expect(within(hero).queryByRole('button', { name: 'Edit list' })).toBeNull();
    });

    it('Preview_ControlsCardHasOnlyActionRowWithKebab', async () => {
      const { controls } = await renderHero(previewProps);
      const rows = controls.querySelectorAll('.list-hero-action-row');
      expect(rows).toHaveLength(1);
      expect(
        rows[0].querySelector('[data-testid="actions-menu-stub"]')
      ).toBeInTheDocument();
      expect(
        controls.querySelector('.list-hero-byline-group')
      ).toBeNull();
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
      return (
        container.querySelector('.list-hero-identity-foot') as HTMLElement
      ).textContent;
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

      it.each(cases)('Bucket%s_FooterShowsUpdatedAgo', async (_label, deltaSeconds, expected) => {
        const updated_at = new Date(fixedNow.getTime() - deltaSeconds * 1000);
        const { container } = await renderHero({
          itemCount: 4,
          list: makeList({ updated_at }),
        });
        expect(
          (container.querySelector('.list-hero-identity-foot') as HTMLElement)
            .textContent
        ).toBe(`4 items · updated ${expected}`);
      });
    });
  });
});
