import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { ListsSheet } from '../ListsSheet';

const LIST_OPTIONS = [
  { value: '1', label: 'Birthday' },
  { value: '2', label: 'Wedding' },
];

function setup(over = {}, listOptions = LIST_OPTIONS) {
  const actions = mockActions();
  render(
    <ListsSheet
      item={makeItem(over)}
      actions={actions}
      listOptions={listOptions}
    />
  );
  return actions;
}

describe('ListsSheet', () => {
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
