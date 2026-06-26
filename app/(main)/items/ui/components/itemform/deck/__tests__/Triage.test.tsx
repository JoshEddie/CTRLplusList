import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Triage } from '../Triage';
import { makeItem } from './test-helpers';

function setup(over = {}, handlers = {}) {
  const props = {
    onBack: vi.fn(),
    onFocus: vi.fn(),
    onOpenStores: vi.fn(),
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

  it('NoPrice_PriceRowNeedsYou', () => {
    setup({ stores: [{ name: 'Lodge', link: 'https://l', price: '' }] });
    const priceRow = screen.getByRole('button', { name: /Price/ });
    expect(priceRow).toHaveTextContent('Not set');
    expect(priceRow).toHaveTextContent('Needs you');
  });

  it('FetchedPrice_ShowsProvenance', () => {
    setup({
      stores: [
        {
          name: 'Lodge',
          link: 'https://l',
          price: '29.99',
          price_fetched_at: '2026-01-01',
        },
      ],
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
    await user.click(screen.getByRole('button', { name: /Name/ }));
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

  it('ClickStoreRow_OpensStoresSheet', async () => {
    const user = userEvent.setup();
    const { onOpenStores } = setup();
    await user.click(screen.getByRole('button', { name: /Store/ }));
    expect(onOpenStores).toHaveBeenCalledOnce();
  });

  it('ClickBack_ReturnsToPreview', async () => {
    const user = userEvent.setup();
    const { onBack } = setup();
    await user.click(screen.getByRole('button', { name: /Back to preview/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('ErrorName_NameRowNeedsYou', () => {
    setup({ name: 'a'.repeat(120) });
    expect(
      screen.getByRole('button', { name: /Name/ })
    ).toHaveTextContent('Needs you');
  });

  it('OverCapDescription_NoteRowNeedsYou', () => {
    setup({ description: 'x'.repeat(120) });
    expect(
      screen.getByRole('button', { name: /Note/ })
    ).toHaveTextContent('Needs you');
  });

  describe('EmptyShape', () => {
    const empty = {
      name: '',
      photos: [],
      stores: [{ name: '', link: '', price: '' }],
    };

    it('NoPhotos_PhotoRowNeedsYouNone', () => {
      setup(empty);
      const row = screen.getByRole('button', { name: /Photo/ });
      expect(row).toHaveTextContent('None');
      expect(row).toHaveTextContent('Needs you');
    });

    it('EmptyName_NameRowShowsNone', () => {
      setup(empty);
      expect(screen.getByRole('button', { name: /Name/ })).toHaveTextContent(
        'None'
      );
    });

    it('NoStore_StoreRowNeedsYouNone', () => {
      setup(empty);
      const row = screen.getByRole('button', { name: /Store/ });
      expect(row).toHaveTextContent('None');
      expect(row).toHaveTextContent('Needs you');
    });
  });
});
