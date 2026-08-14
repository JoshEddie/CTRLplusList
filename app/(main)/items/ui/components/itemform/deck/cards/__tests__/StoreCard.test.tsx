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
    setup({ store: { name: '', link: 'https://shop', price: '29.99' } });
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

  it('TypeName_WritesToStore', async () => {
    const user = userEvent.setup();
    const { actions } = setup({
      store: { name: '', link: 'https://shop', price: '29.99' },
    });
    await user.type(screen.getByLabelText('Store name'), 'L');
    expect(actions.setStore).toHaveBeenLastCalledWith('name', 'L');
  });

  it('TypeLink_WritesToStore', async () => {
    const user = userEvent.setup();
    const { actions } = setup({
      store: { name: 'Lodge', link: '', price: '29.99' },
    });
    await user.type(screen.getByLabelText('Link'), 'h');
    expect(actions.setStore).toHaveBeenLastCalledWith('link', 'h');
  });

  it('EmptyStore_RendersEmptyFieldsWithContinueEnabledLinkless', () => {
    // Both fields empty is a supported linkless state — advance is allowed.
    setup({ store: { name: '', link: '', price: '' } });
    expect(screen.getByLabelText('Store name')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled();
  });
});
