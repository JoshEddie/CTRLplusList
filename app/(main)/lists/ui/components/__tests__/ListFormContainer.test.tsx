import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ListFormContainer from '../ListFormContainer';
import { makeList } from './test-helpers';

vi.mock('../ListForm', () => ({
  default: ({
    list,
    isEditing,
    onClose,
    onSuccess,
  }: {
    list?: { id: string };
    isEditing?: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
  }) => (
    <div
      data-testid="list-form"
      data-list-id={list?.id ?? ''}
      data-editing={String(!!isEditing)}
    >
      <button type="button" onClick={onClose}>
        close
      </button>
      <button type="button" onClick={onSuccess}>
        succeed
      </button>
    </div>
  ),
}));

describe('ListFormContainer', () => {
  it('Editing_ForwardsListAndEditingFlagToListForm', () => {
    render(
      <ListFormContainer
        list={makeList({ id: 'l5' })}
        isEditing
        onClose={vi.fn()}
      />
    );
    const form = screen.getByTestId('list-form');
    expect(form).toHaveAttribute('data-list-id', 'l5');
    expect(form).toHaveAttribute('data-editing', 'true');
  });

  it('CloseAndSuccess_ForwardedCallbacksInvoked', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ListFormContainer onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'close' }));
    await user.click(screen.getByRole('button', { name: 'succeed' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
