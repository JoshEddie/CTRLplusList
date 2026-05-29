import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditListAction from '../EditListAction';
import { makeList } from './test-helpers';

vi.mock('../ListFormContainer', () => ({
  default: ({
    isEditing,
    list,
    onClose,
  }: {
    isEditing?: boolean;
    list: { id: string };
    onClose: () => void;
  }) => (
    <div
      data-testid="list-form-container"
      data-editing={String(!!isEditing)}
      data-list-id={list.id}
    >
      <button type="button" onClick={onClose}>
        close-form
      </button>
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('EditListAction', () => {
  it('Default_RendersEditButtonOnDark-NoFormOpen', () => {
    render(<EditListAction list={makeList()} />);
    const button = screen.getByRole('button', { name: 'Edit list' });
    expect(button).toHaveClass('btn', 'on-dark');
    // eslint-disable-next-line testing-library/no-node-access -- react-icons renders an unlabeled <svg>; querySelector is the only way to assert the icon is present.
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });

  it('Click_OpensListFormContainer-WithIsEditingAndList', async () => {
    render(<EditListAction list={makeList({ id: 'list-42' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit list' }));
    const container = screen.getByTestId('list-form-container');
    expect(container).toHaveAttribute('data-editing', 'true');
    expect(container).toHaveAttribute('data-list-id', 'list-42');
  });

  it('FormOnClose_UnmountsContainer', async () => {
    render(<EditListAction list={makeList()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit list' }));
    await userEvent.click(screen.getByRole('button', { name: 'close-form' }));
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });
});
