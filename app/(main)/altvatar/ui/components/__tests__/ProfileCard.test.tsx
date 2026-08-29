/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The accent band, the avatar disc and the active badge are decorative nodes
 * carrying inline accent colour, so neither a role nor an accessible name
 * reaches them. `container` is the only way to assert "the stored accent is
 * the one painted" and "the tagline line is reserved but empty".
 */
/**
 * Pins `profiles-surface` — "A profile card SHALL carry the profile's
 * identity, the viewer's role, its counts, and a management menu", "A profile
 * card SHALL mark the active profile" and "An absent tagline SHALL reserve
 * its line".
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProfileSwitch } from '@/test/helpers/profile-switch';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import { switchActiveProfile } from '@/lib/data/profile.actions';
import toast from 'react-hot-toast';
import type { ProfileCardView } from '@/lib/types';
import ProfileCard from '../ProfileCard';

vi.mock('@/lib/data/profile.actions', () => ({
  switchActiveProfile: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const ACCENT = ACCENT_NAMES[0];
const OTHER_ACTIVE = 'someone-else';

vi.mock('next/link', async () => ({
  default: (await import('@/app/(auth)/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

function makeCard(overrides: Partial<ProfileCardView> = {}): ProfileCardView {
  return {
    id: 'p1',
    name: 'Ada Lovelace',
    tagline: null,
    role: 'owner',
    listCount: 3,
    itemCount: 3,
    accent: ACCENT,
    art: null,
    avatarStyle: null,
    ...overrides,
  };
}

// The card under test is `p1`; the default active profile is another one, so
// every case that does not name an active profile renders an inactive card.
function renderCard(
  overrides: Partial<ProfileCardView> = {},
  activeProfileId: string = OTHER_ACTIVE
) {
  return renderWithProfileSwitch(
    <ProfileCard
      profile={makeCard(overrides)}
      activeProfileId={activeProfileId}
    />
  );
}

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(switchActiveProfile).mockResolvedValue({
      success: true,
      message: 'Profile switched to Ada Lovelace',
    });
  });

  describe('RoleLabel', () => {
    it.each([
      ['self', 'You'],
      ['owner', 'Owner'],
      ['manager', 'Manager'],
    ] as const)('Role%s_RendersLabel%s', (role, label) => {
      renderCard({ role });
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('RoleOwner_RendersLabelAsNonInteractiveText', () => {
      renderCard({ role: 'owner' });
      const label = screen.getByText('Owner');
      expect(label.tagName).toBe('SPAN');
      expect(label).not.toHaveAttribute('href');
    });
  });

  describe('Tagline', () => {
    it('TaglinePresent_RendersIt', () => {
      renderCard({ tagline: 'Loves dinosaurs' });
      expect(screen.getByText('Loves dinosaurs')).toBeInTheDocument();
    });

    it('TaglineNull_ReservesTheLineWithNoText', () => {
      const { container } = renderCard({ tagline: null });
      const line = container.querySelector('.profile-card-tagline');
      expect(line).toBeInTheDocument();
      expect(line).toBeEmptyDOMElement();
    });
  });

  describe('Counts', () => {
    it('ThreeListsThreeItems_RendersPluralisedCounts', () => {
      renderCard();
      expect(screen.getByText('3 lists · 3 items')).toBeInTheDocument();
    });

    it('OneListOneItem_RendersSingularNouns', () => {
      renderCard({ listCount: 1, itemCount: 1 });
      expect(screen.getByText('1 list · 1 item')).toBeInTheDocument();
    });

    it('ZeroListsZeroItems_RendersZeroCounts', () => {
      renderCard({ listCount: 0, itemCount: 0 });
      expect(screen.getByText('0 lists · 0 items')).toBeInTheDocument();
    });
  });

  describe('ManagementMenu', () => {
    it('Default_RendersNoLinkUntilTheMenuIsOpened', () => {
      const { container } = renderCard();
      expect(container.querySelectorAll('a')).toHaveLength(0);
    });

    it('TriggerActivated_OpensMenuWithEditRowPointingAtTheProfileSpace', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );

      const edit = screen.getByRole('menuitem', {
        name: 'Edit Ada Lovelace',
      });
      expect(edit).toHaveAttribute('href', '/altvatar/p1');
    });

    it('TriggerActivatedTwice_ClosesTheMenuAgain', async () => {
      const user = userEvent.setup();
      renderCard();
      const trigger = screen.getByRole('button', {
        name: 'Ada Lovelace actions',
      });

      await user.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('EscapePressed_DismissesTheMenu', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('EditRowActivated_ClosesTheMenuBehindTheNavigation', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );
      await user.click(
        screen.getByRole('menuitem', { name: 'Edit Ada Lovelace' })
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('Default_CardRootIsAPlainDivWithNoHref', () => {
      // The root's tag and the absence of an href are what this layer can
      // actually observe. React never renders an `onclick` attribute, so
      // asserting its absence would hold for every component alike.
      const { container } = renderCard();
      const card = container.querySelector('.profile-card');
      expect(card?.tagName).toBe('DIV');
      expect(card).not.toHaveAttribute('href');
    });
  });

  describe('ActiveProfile', () => {
    it('ProfileIsActive_MarksTheCardAndBadgesTheAvatar', () => {
      const { container } = renderCard({}, 'p1');
      expect(screen.getByText('Active Altvatar')).toBeInTheDocument();
      expect(container.querySelector('.profile-card')).toHaveClass('is-active');
    });

    it.each(['self', 'owner', 'manager'] as const)(
      'Role%sButNotActive_LeavesTheCardUnmarked',
      (role) => {
        const { container } = renderCard({ role });
        expect(screen.queryByText('Active Altvatar')).not.toBeInTheDocument();
        expect(container.querySelector('.profile-card')).not.toHaveClass(
          'is-active'
        );
      }
    );

    it('ProfileIsActive_OffersTheAccentsDarkStopToTheBadgeAndTheCardFace', () => {
      const { container } = renderCard({}, 'p1');
      const { dark } = ACCENT_PRESETS[ACCENT];
      const card = container.querySelector('.profile-card');
      // `is-active` is what altvatar-space.css keys the card-face paint on; the two
      // variables are the colours it reaches for.
      expect(card).toHaveClass('is-active');
      expect(card?.getAttribute('style')).toContain(`--accent-dark: ${dark}`);
      expect(card?.getAttribute('style')).toContain(
        `--accent-shadow: ${dark}55`
      );
    });
  });

  describe('Switching', () => {
    it('BodyClicked_SwitchesToThatProfileWithoutNavigating', async () => {
      const user = userEvent.setup();
      const { container } = renderCard();

      await user.click(screen.getByText('3 lists · 3 items'));

      expect(switchActiveProfile).toHaveBeenCalledExactlyOnceWith('p1');
      expect(container.querySelectorAll('a')).toHaveLength(0);
    });

    it('ActiveCardBodyClicked_SwitchesNothing', async () => {
      const user = userEvent.setup();
      renderCard({}, 'p1');

      await user.click(screen.getByText('3 lists · 3 items'));

      expect(switchActiveProfile).not.toHaveBeenCalled();
    });

    it('MenuTriggerClicked_OpensTheMenuWithoutSwitching', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(switchActiveProfile).not.toHaveBeenCalled();
    });

    it('SwitchRowActivated_SwitchesAndClosesTheMenu', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );
      await user.click(
        screen.getByRole('menuitem', { name: 'Switch to Ada Lovelace' })
      );

      expect(switchActiveProfile).toHaveBeenCalledExactlyOnceWith('p1');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('SwitchSucceeds_RaisesTheActionsConfirmationCopy', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(screen.getByText('3 lists · 3 items'));

      expect(toast.success).toHaveBeenCalledExactlyOnceWith(
        'Profile switched to Ada Lovelace'
      );
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('SwitchRejected_RaisesTheActionsFailureCopy', async () => {
      vi.mocked(switchActiveProfile).mockResolvedValue({
        success: false,
        message: 'Failed to switch profile',
        error: 'Failed',
      });
      const user = userEvent.setup();
      renderCard();

      await user.click(screen.getByText('3 lists · 3 items'));

      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        'Failed to switch profile'
      );
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('SwitchRowOrderedFirst_PrecedesTheEditDestination', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );

      expect(
        screen.getAllByRole('menuitem').map((row) => row.textContent)
      ).toEqual(['Switch to Ada Lovelace', 'Edit Ada Lovelace']);
    });

    it('ActiveProfilesMenu_CarriesEditAloneWithNoSwitchRow', async () => {
      const user = userEvent.setup();
      renderCard({}, 'p1');

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );

      expect(
        screen.getAllByRole('menuitem').map((row) => row.textContent)
      ).toEqual(['Edit Ada Lovelace']);
    });
  });

  describe('Avatar', () => {
    it('NoAvatarYet_RendersInitialsInTheDisc', () => {
      const { container } = renderCard();
      expect(container.querySelector('.profile-card-avatar')).toHaveTextContent(
        'AL'
      );
    });
  });

  describe('Accent', () => {
    it('StoredAccent_CarriesItsBandAndDiscStopsAsTheCardsVariables', () => {
      const { container } = renderCard({ accent: ACCENT });
      const style =
        container.querySelector('.profile-card')?.getAttribute('style') ?? '';
      const { light, dark, ink } = ACCENT_PRESETS[ACCENT];

      // The band runs both of the preset's stops...
      expect(style).toContain(
        `--accent-bg: linear-gradient(120deg, ${light}, ${dark})`
      );
      // ...while the disc paints the light stop alone, which is the colour the
      // ink is measured against.
      expect(style).toContain(`--accent-disc: ${light}`);
      expect(style).toContain(`--accent-ink: ${ink}`);
    });

    it('NoStoredAccent_RendersTheIrisPresetFallback', () => {
      const { container } = renderCard({ accent: null });
      const style =
        container.querySelector('.profile-card')?.getAttribute('style') ?? '';
      const { light, dark, ink } = ACCENT_PRESETS.iris;
      expect(style).toContain(
        `--accent-bg: linear-gradient(120deg, ${light}, ${dark})`
      );
      expect(style).toContain(`--accent-disc: ${light}`);
      expect(style).toContain(`--accent-ink: ${ink}`);
    });
  });
});
