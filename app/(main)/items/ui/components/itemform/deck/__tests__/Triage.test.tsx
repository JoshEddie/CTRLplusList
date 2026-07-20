import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Triage } from '../Triage';
import { makeItem } from './test-helpers';

function setup(over = {}, handlers = {}) {
  const props = {
    onBack: vi.fn(),
    onFocus: vi.fn(),
    ...handlers,
  };
  render(<Triage item={makeItem(over)} {...props} />);
  return props;
}

describe('Triage', () => {
  it('AllGood_RowsReadLooksGood', () => {
    setup();
    expect(screen.getAllByText('Looks good').length).toBeGreaterThanOrEqual(3);
  });

  it('NoPrice_PriceRowStatesPriceIssue', () => {
    setup({ store: { name: 'Lodge', link: 'https://l', price: '' } });
    const priceRow = screen.getByRole('button', { name: /Price/ });
    expect(priceRow).toHaveTextContent('Not set');
    expect(priceRow).toHaveTextContent('Add a price so people know the cost.');
    expect(priceRow).not.toHaveTextContent('Needs you');
  });

  it('FetchedPrice_ShowsProvenance', () => {
    setup({
      store: {
        name: 'Lodge',
        link: 'https://l',
        price: '29.99',
        price_fetched_at: '2026-01-01',
      },
    });
    expect(
      screen.getByRole('button', { name: /Price/ })
    ).toHaveTextContent('from fetch');
  });

  it('ClickPhotoRow_OpensPhotoFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup();
    await user.click(screen.getByRole('button', { name: /Photo/ }));
    expect(onFocus).toHaveBeenCalledWith('photo');
  });

  it('ClickNameRow_OpensTitleFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup();
    await user.click(screen.getByRole('button', { name: /Item name/ }));
    expect(onFocus).toHaveBeenCalledWith('title');
  });

  it('ClickNoteRow_OpensNoteFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup();
    await user.click(screen.getByRole('button', { name: /Note/ }));
    expect(onFocus).toHaveBeenCalledWith('note');
  });

  it('ClickPriceRow_OpensPriceFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup();
    await user.click(screen.getByRole('button', { name: /Price/ }));
    expect(onFocus).toHaveBeenCalledWith('price');
  });

  it('ClickStoreRow_OpensStoreFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup();
    await user.click(screen.getByRole('button', { name: /Store/ }));
    expect(onFocus).toHaveBeenCalledWith('store');
  });

  it('ClickBack_ReturnsToPreview', async () => {
    const user = userEvent.setup();
    const { onBack } = setup();
    await user.click(screen.getByRole('button', { name: /Back to preview/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('BackExit_IsPrimaryForwardAction', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /Back to preview/ })
    ).toHaveClass('primary');
  });

  it('ErrorName_NameRowStatesLimitIssue', () => {
    setup({ name: 'a'.repeat(120) });
    expect(
      screen.getByRole('button', { name: /Item name/ })
    ).toHaveTextContent('over the 100-character limit');
  });

  it('EmptyNote_NoteRowReadsOptionalNotLooksGood', () => {
    setup({ description: '' });
    const row = screen.getByRole('button', { name: /Note/ });
    expect(row).toHaveTextContent('Optional');
    expect(row).not.toHaveTextContent('Looks good');
    expect(row.className).toContain('deck-triage-good');
  });

  it('FilledNote_NoteRowReadsLooksGood', () => {
    setup({ description: 'A tidy note' });
    expect(
      screen.getByRole('button', { name: /Note/ })
    ).toHaveTextContent('Looks good');
  });

  it('OverCapDescription_NoteRowStatesTrimIssue', () => {
    setup({ description: 'x'.repeat(120) });
    expect(
      screen.getByRole('button', { name: /Note/ })
    ).toHaveTextContent('Over the 100-character limit — trim it.');
  });

  describe('EmptyShape', () => {
    const empty = {
      name: '',
      photos: [],
      store: { name: '', link: '', price: '' },
    };

    it('NoPhotos_PhotoRowStatesNoPhoto', () => {
      setup(empty);
      const row = screen.getByRole('button', { name: /Photo/ });
      expect(row).toHaveTextContent('None');
      expect(row).toHaveTextContent('No photo yet — add one.');
    });

    it('EmptyName_NameRowShowsNoneAndNeedsNameIssue', () => {
      setup(empty);
      const row = screen.getByRole('button', { name: /Item name/ });
      expect(row).toHaveTextContent('None');
      expect(row).toHaveTextContent('An item needs a name.');
    });

    it('NoStore_StoreRowReadsOptional', () => {
      // A blank store is a supported linkless state — the row reads "Optional",
      // not the found-and-verified "Looks good".
      setup(empty);
      const row = screen.getByRole('button', { name: /Store/ });
      expect(row).toHaveTextContent('None');
      expect(row).toHaveTextContent('Optional');
      expect(row).not.toHaveTextContent('Looks good');
      expect(row).not.toHaveTextContent('The store needs a name.');
    });

    it('AnyState_NoRowReadsNeedsYou', () => {
      setup(empty);
      expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
    });
  });
});
