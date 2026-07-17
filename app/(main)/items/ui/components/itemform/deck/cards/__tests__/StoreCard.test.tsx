import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import type { ItemViewModel } from '../../viewModel';
import { StoreCard } from '../StoreCard';

function setup(over: Partial<ItemViewModel> = {}) {
  const actions = mockActions();
  const onContinue = vi.fn();
  render(
    <StoreCard item={makeItem(over)} actions={actions} onContinue={onContinue} />
  );
  return { actions, onContinue };
}

describe('StoreCard', () => {
  it('MissingStoreName_DisablesContinue', () => {
    setup({ stores: [{ name: '', link: 'https://shop', price: '29.99' }] });
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
  });

  it('NameAndValidLink_EnablesContinue-ClickAdvances', async () => {
    const user = userEvent.setup();
    const { onContinue } = setup();
    const btn = screen.getByRole('button', { name: /Continue/ });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('TypeName_WritesToPrimaryStore', async () => {
    const user = userEvent.setup();
    const { actions } = setup({
      stores: [{ name: '', link: 'https://shop', price: '29.99' }],
    });
    await user.type(screen.getByLabelText('Store name'), 'L');
    expect(actions.setStore).toHaveBeenLastCalledWith(0, 'name', 'L');
  });

  it('TypeLink_WritesToPrimaryStore', async () => {
    const user = userEvent.setup();
    const { actions } = setup({
      stores: [{ name: 'Lodge', link: '', price: '29.99' }],
    });
    await user.type(screen.getByLabelText('Link'), 'h');
    expect(actions.setStore).toHaveBeenLastCalledWith(0, 'link', 'h');
  });

  it('NoStoreRow_RendersEmptyFieldsWithContinueDisabled', () => {
    setup({ stores: [] });
    expect(screen.getByLabelText('Store name')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
  });
});
