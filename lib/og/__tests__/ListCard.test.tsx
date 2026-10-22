import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ListCard from '../ListCard';

const ART = 'data:image/svg+xml;base64,PHN2Zy8+';

const renderCard = (art: string | null) =>
  render(
    <ListCard
      ownerName="Grace Example"
      accent="rose"
      art={art}
      listName="Birthday"
    />
  );

describe('ListCard', () => {
  it('OwnerAndList_ShowsActionLineWithAltvatarName-ListName', () => {
    renderCard(null);

    expect(
      screen.getByText('Grace Example shared a list with you')
    ).toBeInTheDocument();
    expect(screen.getByText('Birthday')).toBeInTheDocument();
  });

  it('NoArt_ShowsInitialsOfAltvatarName', () => {
    renderCard(null);

    expect(screen.getByText('GE')).toBeInTheDocument();
    expect(screen.queryByTestId('list-card-art')).toBeNull();
  });

  it('WithArt_PaintsTheArtInsteadOfInitials', () => {
    renderCard(ART);

    expect(screen.getByTestId('list-card-art')).toHaveAttribute('src', ART);
    expect(screen.queryByText('GE')).toBeNull();
  });

  // Steps as drawn on the design's stress-test card.
  it.each([
    ['Birthday', '112px'],
    ['Housewarming Registry', '72px'],
    ['Baby Shower', '88px'],
    ['Christmas Wishlist for the Whole Family', '60px'],
    ['Eddie Family Christmas Wishlist 2026 (kids)', '50px'],
  ])('ListName%s_StepsTo%s', (listName, fontSize) => {
    render(
      <ListCard ownerName="Jo" accent={null} art={null} listName={listName} />
    );

    expect(screen.getByText(listName)).toHaveStyle({ fontSize });
  });

  it.each([
    ['Jo', '40px'],
    ['Grace Example', '34px'],
    ['Alexandria Montgomery-Hartwell of the Kensington Hartwells', '30px'],
  ])('Owner%s_StepsActionLineTo%s', (ownerName, fontSize) => {
    render(
      <ListCard ownerName={ownerName} accent={null} art={null} listName="x" />
    );

    expect(screen.getByText(`${ownerName} shared a list with you`)).toHaveStyle(
      { fontSize }
    );
  });
});
