import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StoreInputContainer } from '../StoreInput';

type Store = {
  name: string;
  link: string;
  price: string;
  price_fetched_at?: Date | string | null;
};

function renderStores(
  stores: Store[],
  handlers: {
    change?: ReturnType<typeof vi.fn>;
    add?: ReturnType<typeof vi.fn>;
    remove?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const change = handlers.change ?? vi.fn();
  const add = handlers.add ?? vi.fn();
  const remove = handlers.remove ?? vi.fn();
  render(
    <StoreInputContainer
      itemForm={{ stores } as never}
      itemFormErrors={
        { stores: stores.map(() => ({ name: '', link: '', price: '' })) } as never
      }
      handleStoreChange={change as never}
      handleStoreAdd={add as never}
      handleStoreRemove={remove as never}
    />
  );
  return { change, add, remove };
}

const EMPTY: Store = { name: '', link: '', price: '' };

describe('StoreInputContainer', () => {
  it('SingleStore_OmitsRemoveButton-ShowsAddStore', () => {
    renderStores([EMPTY]);
    expect(
      screen.queryByRole('button', { name: /Remove store/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '+ Add Store' })
    ).toBeInTheDocument();
  });

  it('MultipleStores_RenderRemoveButtonsAndFilledPrice', () => {
    renderStores([
      { name: 'Amazon', link: '', price: '9.99' },
      EMPTY,
    ]);
    expect(
      screen.getAllByRole('button', { name: /Remove store/ })
    ).toHaveLength(2);
    // Filled price decodes to the formatted display in the first row.
    const row1 = screen.getByRole('group', { name: 'Store 1' });
    expect(within(row1).getByLabelText('Price')).toHaveValue('9.99');
  });

  it('TypeStoreName_CallsHandleStoreChange', async () => {
    const user = userEvent.setup();
    const { change } = renderStores([EMPTY]);
    await user.type(screen.getByLabelText('Store'), 'B');
    expect(change).toHaveBeenCalledWith(0, 'B', 'name');
  });

  it('TypeLink_CallsHandleStoreChange', async () => {
    const user = userEvent.setup();
    const { change } = renderStores([EMPTY]);
    await user.type(screen.getByLabelText('Link'), 'h');
    expect(change).toHaveBeenCalledWith(0, 'h', 'link');
  });

  it('ChangePrice_CallsHandleStoreChangeWithFixedString', () => {
    const { change } = renderStores([EMPTY]);
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '5' },
    });
    expect(change).toHaveBeenCalledWith(0, '0.05', 'price');
  });

  it('ClickAddStore_CallsHandleStoreAddWithLength', async () => {
    const user = userEvent.setup();
    const { add } = renderStores([EMPTY]);
    await user.click(screen.getByRole('button', { name: '+ Add Store' }));
    expect(add).toHaveBeenCalledWith(1);
  });

  describe('PriceAsOfAnnotation', () => {
    it('FetchedPrice_RendersPriceAsOfCaptureDate', () => {
      renderStores([
        {
          name: 'Amazon',
          link: 'https://a.co/x',
          price: '24.50',
          price_fetched_at: new Date('2026-06-01T12:00:00Z'),
        },
      ]);
      expect(
        screen.getByText(
          `price as of ${new Date('2026-06-01T12:00:00Z').toLocaleDateString()}`
        )
      ).toBeInTheDocument();
    });

    it('ManualPrice_RendersNoAnnotation', () => {
      renderStores([{ name: 'Amazon', link: 'https://a.co/x', price: '9.99' }]);
      expect(screen.queryByText(/price as of/)).not.toBeInTheDocument();
    });

    it('UnparseableFetchedAt_RendersNoAnnotation', () => {
      renderStores([
        {
          name: 'Amazon',
          link: 'https://a.co/x',
          price: '24.50',
          price_fetched_at: 'not-a-date',
        },
      ]);
      expect(screen.queryByText(/price as of/)).not.toBeInTheDocument();
    });
  });

  it('ClickRemove_CallsHandleStoreRemoveWithIndex', async () => {
    const user = userEvent.setup();
    const { remove } = renderStores([EMPTY, EMPTY]);
    await user.click(screen.getByRole('button', { name: 'Remove store 2' }));
    expect(remove).toHaveBeenCalledWith(1);
  });
});
