import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { StoresSheet } from '../StoresSheet';

describe('StoresSheet', () => {
  it('ClickAddAnotherStore_CallsAddStore', async () => {
    const user = userEvent.setup();
    const actions = mockActions();
    render(<StoresSheet item={makeItem()} actions={actions} />);
    await user.click(
      screen.getByRole('button', { name: 'Add another store' })
    );
    expect(actions.addStore).toHaveBeenCalledOnce();
  });

  it('SingleStore_HasNoRemoveButton', () => {
    render(<StoresSheet item={makeItem()} actions={mockActions()} />);
    expect(
      screen.queryByRole('button', { name: /Remove store/ })
    ).not.toBeInTheDocument();
  });

  it('MultipleStores_RemoveCallsRemoveStoreWithIndex', async () => {
    const user = userEvent.setup();
    const actions = mockActions();
    render(
      <StoresSheet
        item={makeItem({
          stores: [
            { name: 'Lodge', link: 'https://l', price: '29.99' },
            { name: 'Amazon', link: 'https://a', price: '34.99' },
          ],
        })}
        actions={actions}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Remove store 2' }));
    expect(actions.removeStore).toHaveBeenCalledWith(1);
  });

  it('EditPrice_CallsSetStoreWithFormattedPrice', async () => {
    const user = userEvent.setup();
    const actions = mockActions();
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: 'Lodge', link: 'https://l', price: '' }] })}
        actions={actions}
      />
    );
    // PriceField is cents-based: "5" → $0.05.
    await user.type(screen.getByLabelText('Price'), '5');
    expect(actions.setStore).toHaveBeenLastCalledWith(0, 'price', '0.05');
  });

  it('PartiallyFilledRow_ShowsAllOrNothingError', () => {
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: 'Lodge', link: '', price: '' }] })}
        actions={mockActions()}
      />
    );
    expect(screen.getByText(/needs a name, a link, and a price/)).toBeInTheDocument();
  });

  it('CompleteRow_ShowsNoError', () => {
    render(<StoresSheet item={makeItem()} actions={mockActions()} />);
    expect(
      screen.queryByText(/needs a name, a link, and a price/)
    ).not.toBeInTheDocument();
  });

  it('EditStoreName_CallsSetStoreWithNameField', async () => {
    const user = userEvent.setup();
    const actions = mockActions();
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: '', link: 'https://l', price: '1' }] })}
        actions={actions}
      />
    );
    await user.type(screen.getByLabelText('Store name'), 'A');
    expect(actions.setStore).toHaveBeenCalledWith(0, 'name', 'A');
  });

  it('EditStoreLink_CallsSetStoreWithLinkField', async () => {
    const user = userEvent.setup();
    const actions = mockActions();
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: 'A', link: '', price: '1' }] })}
        actions={actions}
      />
    );
    await user.type(screen.getByLabelText('Link'), 'x');
    expect(actions.setStore).toHaveBeenCalledWith(0, 'link', 'x');
  });

  it('FullyEmptyRow_ShowsNoError', () => {
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: '', link: '', price: '' }] })}
        actions={mockActions()}
      />
    );
    expect(
      screen.queryByText(/needs a name, a link, and a price/)
    ).not.toBeInTheDocument();
  });

  it('LinkOnlyRow_ShowsAllOrNothingError', () => {
    render(
      <StoresSheet
        item={makeItem({ stores: [{ name: '', link: 'https://l', price: '' }] })}
        actions={mockActions()}
      />
    );
    expect(
      screen.getByText(/needs a name, a link, and a price/)
    ).toBeInTheDocument();
  });
});
