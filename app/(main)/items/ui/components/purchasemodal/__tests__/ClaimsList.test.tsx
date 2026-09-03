/**
 * Pins `claim-attribution` — a claim row's face comes from the purchasing
 * profile and from nothing else. The row branches on whether a *profile* made
 * the claim, never on whether an account backs that profile, so a managed
 * profile renders its art on the same terms as a self-profile does.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { PurchaseView } from '@/lib/types';
import ClaimsList from '../ClaimsList';

const ART = 'data:image/svg+xml;utf8,%3Csvg%2F%3E';

const claim = (over: Partial<PurchaseView>): PurchaseView => ({
  id: 'p1',
  by: 'other',
  name: 'Grace',
  claimedByViewer: false,
  ...over,
});

const renderList = (claims: PurchaseView[]) =>
  render(
    <ClaimsList claims={claims} canRemove={() => false} onRemoveClaim={vi.fn()} />
  );

describe('ClaimsList', () => {
  it('ProfilePurchaserWithArt_RendersThatProfilesArt', () => {
    renderList([
      claim({
        avatar: {
          name: 'Grace Hopper',
          accent: 'rose',
          art: ART,
          avatarStyle: 'avataaars',
        },
      }),
    ]);

    expect(screen.getByTestId('altvatar-art')).toHaveAttribute('src', ART);
  });

  it('AccountLessManagedProfilePurchaser_RendersItsArtAllTheSame', () => {
    // The same row shape as above. Nothing here says whether an account backs
    // the profile, because nothing in the row asks.
    renderList([
      claim({
        id: 'p2',
        name: 'Managed Profile',
        avatar: {
          name: 'Managed Profile',
          accent: 'denim',
          art: ART,
          avatarStyle: 'personas',
        },
      }),
    ]);

    expect(screen.getByTestId('altvatar-art')).toBeInTheDocument();
  });

  it('FreeTextPurchaser_RendersInitialsFromTheNameThatWasTyped', () => {
    // No profile, so no face — the typed name is all there is to draw from.
    renderList([claim({ id: 'p3', name: 'Ada', avatar: undefined })]);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByTestId('altvatar-art')).toBeNull();
  });

  it('ProfileAndFreeTextPurchasersTogether_EachTakesItsOwnFillNotTheOthers', () => {
    renderList([
      claim({
        id: 'p1',
        name: 'Grace',
        avatar: {
          name: 'Grace Hopper',
          accent: 'rose',
          art: ART,
          avatarStyle: 'avataaars',
        },
      }),
      claim({ id: 'p2', name: 'Ada', avatar: undefined }),
    ]);

    expect(screen.getAllByTestId('altvatar-art')).toHaveLength(1);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  /**
   * Pins the disabled-not-absent half of `profile-permissions` — whichever
   * floor the caller applied, a refused removal renders present and inert
   * rather than being dropped from the row.
   */
  describe('RemovalDisabled', () => {
    const renderRemovable = (removalDisabled: boolean) =>
      render(
        <ClaimsList
          claims={[claim({ name: 'Grace' })]}
          canRemove={() => true}
          removalDisabled={removalDisabled}
          onRemoveClaim={vi.fn()}
        />
      );

    it('Set_RendersTheRemovalControlPresentAndDisabled', () => {
      renderRemovable(true);

      expect(
        screen.getByRole('button', { name: "Remove Grace's claim" })
      ).toBeDisabled();
    });

    it('Unset_RendersTheRemovalControlOperable', () => {
      renderRemovable(false);

      expect(
        screen.getByRole('button', { name: "Remove Grace's claim" })
      ).toBeEnabled();
    });
  });
});

/**
 * Pins `claim-attribution` — a claim the projection stripped of its name is not
 * a row: the list renders the named rows in full and collapses the rest into a
 * count. Removal rights are not the tell — the owner may remove every claim on
 * their item, so a nameless row would still offer a Remove button.
 */
describe('WithheldClaims', () => {
  const own = claim({
    id: 'mine',
    by: 'self',
    name: 'Vic',
    claimedByViewer: true,
    purchasedAt: new Date('2026-08-01T00:00:00Z'),
  });
  // What the `claims` projection leaves of another party's claim: an id and
  // nothing else.
  const others = [
    claim({ id: 'o1', name: undefined }),
    claim({ id: 'o2', name: undefined }),
  ];

  const renderWithheld = () =>
    render(
      <ClaimsList
        claims={[own, ...others]}
        canRemove={(c) => c.by === 'self' || c.claimedByViewer}
        onRemoveClaim={vi.fn()}
      />
    );

  it('ViewerOwnClaim_RendersInFullWithItsRemovalAction', () => {
    renderWithheld();

    expect(screen.getByText('Vic (you)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove your claim' })
    ).toBeInTheDocument();
  });

  it('OtherPartiesClaims_CollapseIntoACountCarryingNoIdentity', () => {
    renderWithheld();

    expect(screen.getByText('2 other claims')).toBeInTheDocument();
    expect(screen.queryByText('Someone')).not.toBeInTheDocument();
    expect(screen.queryByText(/Added by/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('OneOtherPartyClaim_ReadsSingular', () => {
    render(
      <ClaimsList
        claims={[own, others[0]]}
        canRemove={(c) => c.by === 'self'}
        onRemoveClaim={vi.fn()}
      />
    );

    expect(screen.getByText('1 other claim')).toBeInTheDocument();
  });

  // The owner's list passes `canRemove: () => true`, so removal rights cannot
  // stand in for disclosure: a nameless claim stays a count either way.
  it('NamelessClaimTheViewerMayRemove_StaysACountRatherThanASomeoneRow', () => {
    render(
      <ClaimsList
        claims={[own, ...others]}
        canRemove={() => true}
        onRemoveClaim={vi.fn()}
      />
    );

    expect(screen.getByText('2 other claims')).toBeInTheDocument();
    expect(screen.queryByText('Someone')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('EveryClaimNamed_RendersEveryRowInFullWithNoCount', () => {
    render(
      <ClaimsList
        claims={[
          own,
          claim({ id: 'o1', name: 'Grace', claimerName: 'Ida' }),
          claim({ id: 'o2', name: 'Sam' }),
        ]}
        canRemove={(c) => c.by === 'self'}
        onRemoveClaim={vi.fn()}
      />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.queryByText(/other claim/)).not.toBeInTheDocument();
  });

  // A claim's units are editable wherever it is removable — the viewer's own
  // claim, one they asserted, and (in the owner's master list) somebody else's.
  // An entry asking for one has nothing to edit.
  describe('UnitEditing', () => {
    const mountEditable = (
      over: Partial<React.ComponentProps<typeof ClaimsList>> = {}
    ) => {
      const onUpdateUnits = vi.fn();
      render(
        <ClaimsList
          claims={[claim({ by: 'self', name: 'You', units: 2 })]}
          canRemove={() => true}
          capacity={{ quantity: 4, remaining: 2 }}
          onRemoveClaim={vi.fn()}
          onUpdateUnits={onUpdateUnits}
          {...over}
        />
      );
      return onUpdateUnits;
    };

    it('EntryWithRoomToGrow_ShowsTheClaimsCurrentUnits', () => {
      mountEditable();

      expect(screen.getByRole('spinbutton')).toHaveValue(2);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '4');
    });

    it('StatusGiven_ItSitsBesideTheUnitsControl', () => {
      mountEditable({ unitsStatus: '2 of 4 claimed' });

      expect(screen.getByText('2 of 4 claimed')).toBeInTheDocument();
    });

    it('NoStatusGiven_TheRowSaysNothingAboutWhatIsClaimed', () => {
      mountEditable();

      expect(screen.queryByText(/of 4 claimed/)).not.toBeInTheDocument();
    });

    it('UntouchedCount_LeavesUpdateInert', () => {
      const onUpdateUnits = mountEditable();

      expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
      expect(onUpdateUnits).not.toHaveBeenCalled();
    });

    it('SingleUnitEntry_RendersNoUnitsControl', () => {
      mountEditable({
        claims: [claim({ by: 'self', name: 'You', units: 1 })],
        capacity: { quantity: 1, remaining: 0 },
      });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('RowTheViewerCannotRemove_RendersNoUnitsControl', () => {
      mountEditable({ canRemove: () => false });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('MasterUnclaimBelowTheOwnerFloor_RendersNoUnitsControl', () => {
      mountEditable({ removalDisabled: true });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('NewCountThenUpdate_ReportsTheClaimAndItsUnits', async () => {
      const user = userEvent.setup();
      const onUpdateUnits = mountEditable();

      await user.clear(screen.getByRole('spinbutton'));
      await user.type(screen.getByRole('spinbutton'), '4');
      await user.click(screen.getByRole('button', { name: 'Update to 4' }));

      expect(onUpdateUnits).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        4
      );
    });

    it('CountBeyondTheCeiling_ClampedToIt', async () => {
      const user = userEvent.setup();
      const onUpdateUnits = mountEditable();

      await user.clear(screen.getByRole('spinbutton'));
      await user.type(screen.getByRole('spinbutton'), '9');
      await user.click(screen.getByRole('button', { name: 'Update to 4' }));

      expect(onUpdateUnits).toHaveBeenCalledWith(expect.anything(), 4);
    });

    it('CountMovedThenBack_LeavesUpdateInertAgain', async () => {
      const user = userEvent.setup();
      const onUpdateUnits = mountEditable();

      await user.click(screen.getByRole('button', { name: 'Increase' }));
      await user.click(screen.getByRole('button', { name: 'Decrease' }));

      expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
      expect(onUpdateUnits).not.toHaveBeenCalled();
    });
  });
});
