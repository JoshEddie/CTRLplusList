/**
 * Pins `profile-permissions` — "The profile's space SHALL render a Permissions
 * section for a managed profile": the roster's ordering (never-acted-as last),
 * the sole-owner tooltip, and that a pending invite row is an owner's alone,
 * because the row carries the token and a token is the grant itself.
 */
import { PROTECTED_TIER } from '@/lib/spoilers';
import { ROLES } from '@/lib/data/profile.roles';
import type { RoleShape } from '@/lib/types';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getPendingInvites,
  getProfileMembers,
} from '@/lib/data/profile.members';
import PermissionsSection from '../PermissionsSection';

vi.mock('@/lib/data/profile.members', () => ({
  getProfileMembers: vi.fn(),
  getPendingInvites: vi.fn(),
}));
vi.mock('../MemberRow', () => ({
  default: ({
    member,
    soleOwner,
  }: {
    member: { user_id: string };
    soleOwner: boolean;
  }) => (
    <li
      data-testid="member-row"
      data-user-id={member.user_id}
      data-sole-owner={String(soleOwner)}
    />
  ),
}));
vi.mock('../InviteRow', () => ({
  default: ({
    invite,
    daysLeft,
  }: {
    invite: { token: string };
    daysLeft: number;
  }) => (
    <li
      data-testid="invite-row"
      data-token={invite.token}
      data-days-left={String(daysLeft)}
    />
  ),
}));

const member = (
  user_id: string,
  role: RoleShape,
  last_active_at: Date | null = null
) => ({
  user_id,
  role,
  last_active_at,
  baseline: PROTECTED_TIER,
  id: `self-${user_id}`,
  name: user_id,
  accent: null,
  art: null,
  avatarStyle: null,
});

const renderSection = async (viewerIsOwner = true) =>
  render(
    await PermissionsSection({
      profileId: 'kiddo',
      viewerUserId: 'viewer',
      viewerIsOwner,
    })
  );

const rowIds = () =>
  screen
    .getAllByTestId('member-row')
    .map((el) => el.getAttribute('data-user-id'));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPendingInvites).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PermissionsSection', () => {
  describe('Ordering', () => {
    it('MixedActivity_SortsRecentFirstWithNeverActedLast', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('never', ROLES.manager, null),
        member('old', ROLES.manager, new Date('2026-01-01')),
        member('recent', ROLES.owner, new Date('2026-08-01')),
      ]);

      await renderSection();

      expect(rowIds()).toEqual(['recent', 'old', 'never']);
    });

    it('NeverActedArrivesAfterAnActedOne_StaysLast', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('acted', ROLES.owner, new Date('2026-08-01')),
        member('never', ROLES.manager, null),
      ]);

      await renderSection();

      expect(rowIds()).toEqual(['acted', 'never']);
    });

    it('EveryMembershipNeverActed_KeepsThemAllWithoutReordering', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('a', ROLES.owner, null),
        member('b', ROLES.manager, null),
      ]);

      await renderSection();

      expect(rowIds()).toEqual(['a', 'b']);
    });
  });

  describe('SoleOwner', () => {
    it('ViewerIsTheOnlyOwner_MarksTheirOwnRowOnly', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('viewer', ROLES.owner),
        member('other', ROLES.manager),
      ]);

      await renderSection();

      const rows = screen.getAllByTestId('member-row');
      expect(rows[0]).toHaveAttribute('data-sole-owner', 'true');
      expect(rows[1]).toHaveAttribute('data-sole-owner', 'false');
    });

    it('SecondOwnerPresent_MarksNoRow', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('viewer', ROLES.owner),
        member('other', ROLES.owner),
      ]);

      await renderSection();

      for (const row of screen.getAllByTestId('member-row')) {
        expect(row).toHaveAttribute('data-sole-owner', 'false');
      }
    });

    it('ManagerViewer_MarksNoRowEvenWithOneOwner', async () => {
      vi.mocked(getProfileMembers).mockResolvedValue([
        member('viewer', ROLES.manager),
        member('other', ROLES.owner),
      ]);

      await renderSection(false);

      for (const row of screen.getAllByTestId('member-row')) {
        expect(row).toHaveAttribute('data-sole-owner', 'false');
      }
    });
  });

  describe('PendingInvites', () => {
    beforeEach(() => {
      vi.mocked(getProfileMembers).mockResolvedValue([member('viewer', ROLES.owner)]);
      vi.mocked(getPendingInvites).mockResolvedValue([
        {
          token: 'tok-1',
          role: ROLES.manager,
          created_at: new Date('2026-08-28'),
          expires_at: new Date('2026-09-04'),
        },
      ]);
    });

    it('OwnerViewer_RendersThePendingRowAfterTheMemberships', async () => {
      await renderSection(true);

      expect(screen.getByTestId('invite-row')).toHaveAttribute(
        'data-token',
        'tok-1'
      );
    });

    it('ExpiryFiveAndAHalfDaysOut_CountsSixWholeDays', async () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-08-29T12:00:00Z'));

      await renderSection(true);

      // Rounded up, so a link with any life left never reads as expiring today.
      expect(screen.getByTestId('invite-row')).toHaveAttribute(
        'data-days-left',
        '6'
      );
    });

    it('ExpiryAlreadyPassed_FloorsTheCountAtOneDay', async () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-09-05T00:00:00Z'));

      await renderSection(true);

      // The read filters expired invites out, so a non-positive count can only
      // come of expiring between that read and this render.
      expect(screen.getByTestId('invite-row')).toHaveAttribute(
        'data-days-left',
        '1'
      );
    });

    it('ManagerViewer_ReadsNoInvitesAndRendersNoPendingRow', async () => {
      await renderSection(false);

      // The token is the grant, so a manager who cannot mint one must not be
      // handed one to forward.
      expect(getPendingInvites).not.toHaveBeenCalled();
      expect(screen.queryByTestId('invite-row')).toBeNull();
    });
  });
});
