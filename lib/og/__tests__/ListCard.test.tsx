import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PLUS_SRC } from '../assets';
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
    expect(screen.getByTestId('list-card-name')).toHaveTextContent('Birthday');
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

  it.each([
    ['UpTo10Chars', '112px', 'Birthday'],
    ['UpTo20Chars', '88px', 'Baby Shower'],
    ['UpTo32Chars', '72px', 'Housewarming Registry'],
    ['UpTo40Chars', '60px', 'Christmas Wishlist for the Whole Family'],
    ['Over40Chars', '50px', 'Eddie Family Christmas Wishlist 2026 (kids)'],
  ])('ListName%s_StepsTo%s', (_band, fontSize, listName) => {
    render(
      <ListCard ownerName="Jo" accent={null} art={null} listName={listName} />
    );

    expect(screen.getByText(listName)).toHaveStyle({ fontSize });
  });

  it.each([
    ['UpTo28Chars', '40px', 'Jo'],
    ['UpTo36Chars', '34px', 'Grace Example'],
    [
      'Over36Chars',
      '30px',
      'Alexandria Montgomery-Hartwell of the Kensington Hartwells',
    ],
  ])('ActionLine%s_StepsTo%s', (_band, fontSize, ownerName) => {
    render(
      <ListCard ownerName={ownerName} accent={null} art={null} listName="x" />
    );

    expect(screen.getByText(`${ownerName} shared a list with you`)).toHaveStyle(
      { fontSize }
    );
  });

  describe('UndrawableCharacters', () => {
    it('EmojiAndNonLatin_RemovedAndWhitespaceCollapsed', () => {
      render(
        <ListCard
          ownerName="  🎉 Grace 李 "
          accent={null}
          art={null}
          listName="Grace 👩‍👩‍👧 Turns   30 🎂"
        />
      );

      expect(
        screen.getByText('Grace shared a list with you')
      ).toBeInTheDocument();
      expect(screen.getByText('Grace Turns 30')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
    });

    it.each([
      ['Composed', 'Łukasz Dvořák'],
      ['Decomposed', 'Łukasz Dvořák'.normalize('NFD')],
    ])('Accented%sLatin_Kept', (_form, ownerName) => {
      render(
        <ListCard
          ownerName={ownerName}
          accent={null}
          art={null}
          listName="Ćwierć Ŧøß"
        />
      );

      expect(
        screen.getByText('Łukasz Dvořák shared a list with you')
      ).toBeInTheDocument();
      expect(screen.getByText('Ćwierć Ŧøß')).toBeInTheDocument();
    });

    it.each([
      [
        'ActionLine',
        'Łukasz Dvořák shared a list with you',
        'Roboto Condensed Ext',
      ],
      ['ListName', 'Ćwierć Ŧøß', 'Crimson Pro Ext'],
    ])(
      'LatinExtIn%s_FallsBackToItsFamilysExtSubset',
      (_line, text, extFont) => {
        render(
          <ListCard
            ownerName="Łukasz Dvořák"
            accent={null}
            art={null}
            listName="Ćwierć Ŧøß"
          />
        );

        expect(screen.getByText(text).style.fontFamily).toContain(extFont);
      }
    );

    it('ListNameStripsToEmpty_LeavesNameLineOff', () => {
      render(
        <ListCard
          ownerName="Grace"
          accent={null}
          art={null}
          listName=" 🎂 🎉 "
        />
      );

      expect(
        screen.getByText('Grace shared a list with you')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('list-card-name')).toBeNull();
    });

    it('OwnerNameStripsToEmpty_ActionLineNamesNoOwner', () => {
      render(
        <ListCard
          ownerName="🦊✨"
          accent={null}
          art={null}
          listName="Birthday"
        />
      );

      expect(
        screen.getByText('A list was shared with you')
      ).toBeInTheDocument();
    });

    it('OwnerNameStripsToEmptyWithNoArt_PaintsBrandPlusMarkInDisc', () => {
      render(
        <ListCard
          ownerName="🦊✨"
          accent={null}
          art={null}
          listName="Birthday"
        />
      );

      expect(screen.getByTestId('list-card-art')).toHaveAttribute(
        'src',
        PLUS_SRC
      );
    });
  });
});
