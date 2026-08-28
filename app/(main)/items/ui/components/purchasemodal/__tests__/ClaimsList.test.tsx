/**
 * Pins `claim-attribution` — a claim row's face comes from the purchasing
 * profile and from nothing else. The row branches on whether a *profile* made
 * the claim, never on whether an account backs that profile, so a managed
 * profile renders its art on the same terms as a self-profile does.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PurchaseView } from '@/lib/types';
import ClaimsList from '../ClaimsList';

const ART = 'data:image/svg+xml;utf8,%3Csvg%2F%3E';

const claim = (over: Partial<PurchaseView>): PurchaseView => ({
  id: 'p1',
  by: 'other',
  firstName: 'Grace',
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
        firstName: 'Managed Profile',
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
    renderList([claim({ id: 'p3', firstName: 'Ada', avatar: undefined })]);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByTestId('altvatar-art')).toBeNull();
  });

  it('ProfileAndFreeTextPurchasersTogether_EachTakesItsOwnFillNotTheOthers', () => {
    renderList([
      claim({
        id: 'p1',
        firstName: 'Grace',
        avatar: {
          name: 'Grace Hopper',
          accent: 'rose',
          art: ART,
          avatarStyle: 'avataaars',
        },
      }),
      claim({ id: 'p2', firstName: 'Ada', avatar: undefined }),
    ]);

    expect(screen.getAllByTestId('altvatar-art')).toHaveLength(1);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
