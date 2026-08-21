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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import type { ProfileCardView } from '@/lib/types';
import ProfileCard from '../ProfileCard';

const ACCENT = ACCENT_NAMES[0];

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
    ...overrides,
  };
}

describe('ProfileCard', () => {
  describe('RoleLabel', () => {
    it.each([
      ['self', 'You'],
      ['owner', 'Owner'],
      ['manager', 'Manager'],
    ] as const)('Role%s_RendersLabel%s', (role, label) => {
      render(<ProfileCard profile={makeCard({ role })} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('RoleOwner_RendersLabelAsNonInteractiveText', () => {
      render(<ProfileCard profile={makeCard({ role: 'owner' })} />);
      const label = screen.getByText('Owner');
      expect(label.tagName).toBe('SPAN');
      expect(label).not.toHaveAttribute('href');
    });
  });

  describe('Tagline', () => {
    it('TaglinePresent_RendersIt', () => {
      render(
        <ProfileCard profile={makeCard({ tagline: 'Loves dinosaurs' })} />
      );
      expect(screen.getByText('Loves dinosaurs')).toBeInTheDocument();
    });

    it('TaglineNull_ReservesTheLineWithNoText', () => {
      const { container } = render(
        <ProfileCard profile={makeCard({ tagline: null })} />
      );
      const line = container.querySelector('.profile-card-tagline');
      expect(line).toBeInTheDocument();
      expect(line).toBeEmptyDOMElement();
    });
  });

  describe('Counts', () => {
    it('ThreeListsThreeItems_RendersPluralisedCounts', () => {
      render(<ProfileCard profile={makeCard()} />);
      expect(screen.getByText('3 lists · 3 items')).toBeInTheDocument();
    });

    it('OneListOneItem_RendersSingularNouns', () => {
      render(
        <ProfileCard profile={makeCard({ listCount: 1, itemCount: 1 })} />
      );
      expect(screen.getByText('1 list · 1 item')).toBeInTheDocument();
    });

    it('ZeroListsZeroItems_RendersZeroCounts', () => {
      render(
        <ProfileCard profile={makeCard({ listCount: 0, itemCount: 0 })} />
      );
      expect(screen.getByText('0 lists · 0 items')).toBeInTheDocument();
    });
  });

  describe('ManagementMenu', () => {
    it('Default_RendersNoLinkUntilTheMenuIsOpened', () => {
      const { container } = render(<ProfileCard profile={makeCard()} />);
      expect(container.querySelectorAll('a')).toHaveLength(0);
    });

    it('TriggerActivated_OpensMenuWithEditRowPointingAtTheProfileSpace', async () => {
      const user = userEvent.setup();
      render(<ProfileCard profile={makeCard()} />);

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );

      const edit = screen.getByRole('menuitem', {
        name: 'Edit Ada Lovelace',
      });
      expect(edit).toHaveAttribute('href', '/profiles/p1');
    });

    it('TriggerActivatedTwice_ClosesTheMenuAgain', async () => {
      const user = userEvent.setup();
      render(<ProfileCard profile={makeCard()} />);
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
      render(<ProfileCard profile={makeCard()} />);

      await user.click(
        screen.getByRole('button', { name: 'Ada Lovelace actions' })
      );
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('EditRowActivated_ClosesTheMenuBehindTheNavigation', async () => {
      const user = userEvent.setup();
      render(<ProfileCard profile={makeCard()} />);

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
      const { container } = render(<ProfileCard profile={makeCard()} />);
      const card = container.querySelector('.profile-card');
      expect(card?.tagName).toBe('DIV');
      expect(card).not.toHaveAttribute('href');
    });
  });

  describe('ActiveProfile', () => {
    it('RoleSelf_MarksTheCardActive', () => {
      const { container } = render(
        <ProfileCard profile={makeCard({ role: 'self' })} />
      );
      expect(screen.getByText('Active profile')).toBeInTheDocument();
      expect(container.querySelector('.profile-card')).toHaveClass('is-active');
    });

    it.each(['owner', 'manager'] as const)(
      'Role%s_LeavesTheCardUnmarked',
      (role) => {
        const { container } = render(
          <ProfileCard profile={makeCard({ role })} />
        );
        expect(screen.queryByText('Active profile')).not.toBeInTheDocument();
        expect(container.querySelector('.profile-card')).not.toHaveClass(
          'is-active'
        );
      }
    );

    it('RoleSelf_OffersTheAccentsDarkStopToTheBadgeAndTheCardFace', () => {
      const { container } = render(
        <ProfileCard profile={makeCard({ role: 'self' })} />
      );
      const { dark } = ACCENT_PRESETS[ACCENT];
      const card = container.querySelector('.profile-card');
      // `is-active` is what profiles.css keys the card-face paint on; the two
      // variables are the colours it reaches for.
      expect(card).toHaveClass('is-active');
      expect(card?.getAttribute('style')).toContain(`--accent-dark: ${dark}`);
      expect(card?.getAttribute('style')).toContain(
        `--accent-shadow: ${dark}55`
      );
    });
  });

  describe('Avatar', () => {
    it('NoAvatarYet_RendersInitialsInTheDisc', () => {
      const { container } = render(<ProfileCard profile={makeCard()} />);
      expect(container.querySelector('.profile-card-avatar')).toHaveTextContent(
        'AL'
      );
    });
  });

  describe('Accent', () => {
    it('StoredAccent_CarriesItsBandAndDiscStopsAsTheCardsVariables', () => {
      const { container } = render(
        <ProfileCard profile={makeCard({ accent: ACCENT })} />
      );
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

    it('NoStoredAccent_RendersHeroGradientFallbackAndNoPresetColour', () => {
      const { container } = render(
        <ProfileCard profile={makeCard({ accent: null })} />
      );
      const style =
        container.querySelector('.profile-card')?.getAttribute('style') ?? '';
      expect(style).toContain('--hero-gradient');
      for (const preset of Object.values(ACCENT_PRESETS)) {
        expect(style).not.toContain(preset.light);
      }
    });
  });
});
