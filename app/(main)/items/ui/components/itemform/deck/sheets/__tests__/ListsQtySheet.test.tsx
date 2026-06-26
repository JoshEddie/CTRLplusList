import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { ListsQtySheet } from '../ListsQtySheet';

const LIST_OPTIONS = [
  { value: '1', label: 'Birthday' },
  { value: '2', label: 'Wedding' },
];

function setup(over = {}, listOptions = LIST_OPTIONS) {
  const actions = mockActions();
  render(
    <ListsQtySheet
      item={makeItem(over)}
      actions={actions}
      listOptions={listOptions}
    />
  );
  return actions;
}

describe('ListsQtySheet', () => {
  describe('Lists', () => {
    it('ToggleOff_AddsListMembership', async () => {
      const user = userEvent.setup();
      const actions = setup();
      await user.click(screen.getByRole('checkbox', { name: 'Birthday' }));
      expect(actions.setLists).toHaveBeenCalledWith([
        { value: '1', label: 'Birthday' },
      ]);
    });

    it('ToggleOn_RemovesListMembership', async () => {
      const user = userEvent.setup();
      const actions = setup({ lists: [{ value: '1', label: 'Birthday' }] });
      await user.click(screen.getByRole('checkbox', { name: 'Birthday' }));
      expect(actions.setLists).toHaveBeenCalledWith([]);
    });

    it('NoListOptions_ShowsEmptyState', () => {
      setup({}, []);
      expect(screen.getByText(/don't have any lists yet/)).toBeInTheDocument();
    });
  });

  describe('Quantity', () => {
    it('DefaultLimitOne_StepperShowsOne-DecreaseDisabled', () => {
      setup();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Decrease quantity' })
      ).toBeDisabled();
    });

    it('ClickIncrease_SetsQtyToTwo', async () => {
      const user = userEvent.setup();
      const actions = setup();
      await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
      expect(actions.setQty).toHaveBeenCalledWith(2);
    });

    it('LimitThree_DecreaseSetsQtyToTwo', async () => {
      const user = userEvent.setup();
      const actions = setup({ qty: 3 });
      await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
      expect(actions.setQty).toHaveBeenCalledWith(2);
    });

    it('SelectUnlimited_SetsQtyNull', async () => {
      const user = userEvent.setup();
      const actions = setup();
      await user.click(screen.getByRole('radio', { name: 'Unlimited' }));
      expect(actions.setQty).toHaveBeenCalledWith(null);
    });

    it('Unlimited_HidesStepper', () => {
      setup({ qty: null });
      expect(
        screen.queryByRole('button', { name: 'Increase quantity' })
      ).not.toBeInTheDocument();
    });

    it('SelectLimitFromUnlimited_SetsQtyOne', async () => {
      const user = userEvent.setup();
      const actions = setup({ qty: null });
      await user.click(screen.getByRole('radio', { name: 'Limit' }));
      expect(actions.setQty).toHaveBeenCalledWith(1);
    });
  });
});
