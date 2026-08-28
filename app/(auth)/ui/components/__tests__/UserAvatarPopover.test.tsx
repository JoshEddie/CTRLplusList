import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProfileSwitch } from '@/test/helpers/profile-switch';
import type { Session } from 'next-auth';
import { switchActiveProfile } from '@/lib/data/profile.actions';
import type { ProfileSwitcherView } from '@/lib/data/profile.active';
import UserAvatarPopover from '../UserAvatarPopover';
import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';

vi.mock('@/lib/data/user.actions', () => ({
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock('@/lib/data/profile.actions', () => ({
  switchActiveProfile: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));
vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

type User = NonNullable<Session['user']>;
const fullUser: User = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: 'https://img.example/ada.png',
};

const trigger = () => screen.getByRole('button', { name: 'User menu' });

const face = { accent: null, art: null, avatarStyle: null };
const SELF = { id: 'p-self', name: 'Ada Lovelace', ...face };
const KIDDO = { id: 'p-kiddo', name: 'Kiddo', ...face };
const NANA = { id: 'p-nana', name: 'Nana', ...face };

// The viewer acts as their own profile, so the two managed ones are offered
// and neither reads as the way back.
const THREE_PROFILES: ProfileSwitcherView = {
  rows: [KIDDO, NANA],
  profileCount: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(switchActiveProfile).mockResolvedValue({
    success: true,
    message: 'Profile switched to Kiddo',
  });
});

describe('UserAvatarPopover', () => {
  it('Default_RendersClosedTrigger', () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ClickTrigger_OpensMenuWithHeader-Profiles-Connections-SignOut', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();

    const profiles = screen.getByRole('menuitem', { name: /profiles/i });
    expect(profiles).toHaveAttribute('href', '/profiles');
    const connections = screen.getByRole('menuitem', { name: /connections/i });
    expect(connections).toHaveAttribute('href', '/settings/connections');
    expect(
      screen.getByRole('menuitem', { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it('ActiveProfile_RendersItsInitialsInTheTriggerNotTheAccountImage', () => {
    renderWithProfileSwitch(
      <UserAvatarPopover user={fullUser} activeProfile={KIDDO} />
    );
    expect(trigger()).toHaveTextContent('K');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('ActiveProfileWithArt_RendersThatArtInTheTriggerNotInitials', () => {
    renderWithProfileSwitch(
      <UserAvatarPopover
        user={fullUser}
        activeProfile={{
          ...KIDDO,
          art: 'data:image/svg+xml,<svg/>',
          avatarStyle: 'avataaars',
        }}
      />
    );
    expect(screen.getByTestId('altvatar-art')).toHaveAttribute(
      'src',
      'data:image/svg+xml,<svg/>'
    );
    expect(trigger()).not.toHaveTextContent('K');
  });

  it('ActiveProfileAccent_RingsTheTriggerWithThatProfilesColour', () => {
    const accent = ACCENT_NAMES[0];
    const { dark, light, ink } = ACCENT_PRESETS[accent];
    renderWithProfileSwitch(
      <UserAvatarPopover user={fullUser} activeProfile={{ ...KIDDO, accent }} />
    );

    /* eslint-disable testing-library/no-node-access -- the accent variables sit on the disc inside the trigger, which is aria-hidden and carries only a class: no role and no accessible name of its own. */
    const style =
      trigger().querySelector('.altvatar-disc')?.getAttribute('style') ?? '';
    /* eslint-enable testing-library/no-node-access */

    // The ring is keyed off the dark stop; the disc paints the light one.
    expect(style).toContain(`--accent-dark: ${dark}`);
    expect(style).toContain(`--accent-disc: ${light}`);
    expect(style).toContain(`--accent-ink: ${ink}`);
  });

  it('ClickTrigger_OrdersProfilesBeforeConnectionsBeforeSignOut', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent)
    ).toEqual(['Profiles', 'Connections', 'Sign out']);
  });

  it('ClickTrigger_GivesProfilesAndConnectionsDistinctIcons', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());

    /* eslint-disable testing-library/no-node-access -- an icon is a decorative <svg> carrying no role or accessible name, so comparing the two rows' rendered paths is the only way to assert they differ at icon size. */
    const iconPathOf = (name: RegExp) =>
      screen.getByRole('menuitem', { name }).querySelector('svg')?.innerHTML ??
      '';
    /* eslint-enable testing-library/no-node-access */

    expect(iconPathOf(/profiles/i)).not.toBe('');
    expect(iconPathOf(/profiles/i)).not.toBe(iconPathOf(/connections/i));
  });

  it('SparseUser_ShowsSignedInFallbackWithoutEmail', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={{} as User} />);
    await userEvent.click(trigger());
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  describe('Switcher', () => {
    it('SingleProfileViewer_OffersNoSwitchRowsAndNoCount', async () => {
      renderWithProfileSwitch(
        <UserAvatarPopover user={fullUser} activeProfile={SELF} />
      );
      await userEvent.click(trigger());

      expect(
        screen.getAllByRole('menuitem').map((item) => item.textContent)
      ).toEqual(['Profiles', 'Connections', 'Sign out']);
    });

    it('ThreeProfilesActingAsSelf_OffersTheOtherTwoAboveTheDestinations', async () => {
      renderWithProfileSwitch(
        <UserAvatarPopover
          user={fullUser}
          activeProfile={SELF}
          switcher={THREE_PROFILES}
        />
      );
      await userEvent.click(trigger());

      // Accessible names rather than textContent: a switch row's leading slot
      // is aria-hidden, and the count on the Profiles row rides in its label.
      const rows = screen.getAllByRole('menuitem');
      expect(rows).toHaveLength(5);
      for (const [index, name] of [
        'Kiddo',
        'Nana',
        'Profiles (3)',
        'Connections',
        'Sign out',
      ].entries()) {
        expect(rows[index]).toHaveAccessibleName(name);
      }
      expect(rows[2]).toHaveAttribute('href', '/profiles');
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('ActingAsManagedProfile_OffersTheViewersOwnRowByNameAndDropsTheActiveOne', async () => {
      renderWithProfileSwitch(
        <UserAvatarPopover
          user={fullUser}
          activeProfile={KIDDO}
          switcher={{ rows: [SELF, NANA], profileCount: 3 }}
        />
      );
      await userEvent.click(trigger());

      expect(
        screen.getByRole('menuitem', { name: 'Ada Lovelace' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Kiddo' })
      ).not.toBeInTheDocument();
    });

    it('SwitchRowActivated_CallsSwitchActiveProfileAndClosesTheMenu', async () => {
      renderWithProfileSwitch(
        <UserAvatarPopover
          user={fullUser}
          activeProfile={SELF}
          switcher={THREE_PROFILES}
        />
      );
      await userEvent.click(trigger());
      await userEvent.click(screen.getByRole('menuitem', { name: 'Kiddo' }));

      expect(switchActiveProfile).toHaveBeenCalledExactlyOnceWith('p-kiddo');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('SwitchRow_LeadsWithTheProfilesInitialsAndNoNavigationIcon', async () => {
      renderWithProfileSwitch(
        <UserAvatarPopover
          user={fullUser}
          activeProfile={SELF}
          switcher={THREE_PROFILES}
        />
      );
      await userEvent.click(trigger());

      /* eslint-disable testing-library/no-node-access -- the leading slot is a decorative span carrying no role; reaching for it is the only way to assert it holds the profile's initials rather than an icon. */
      const row = screen.getByRole('menuitem', { name: 'Kiddo' });
      expect(row.querySelector('.menu-profile-avatar')).toHaveTextContent('K');
      expect(row.querySelector('svg')).toBeNull();
      /* eslint-enable testing-library/no-node-access */
    });
  });

  it('Escape_ClosesMenu', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('ReClickTrigger_TogglesMenuClosed', async () => {
    renderWithProfileSwitch(<UserAvatarPopover user={fullUser} />);
    await userEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(trigger());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
