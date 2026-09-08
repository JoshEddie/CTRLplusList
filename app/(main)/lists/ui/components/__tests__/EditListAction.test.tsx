import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditListAction from '../EditListAction';
import { makeList } from './test-helpers';

vi.mock('../ListFormContainer', async () => ({
  default: (await import('./list-form-stub')).ListFormContainerStub,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('EditListAction', () => {
  it('Default_RendersIconOnlyPencilOnDark-NoFormOpen', () => {
    render(<EditListAction list={makeList()} deleteDisabled={false} />);
    const button = screen.getByRole('button', { name: 'Edit list' });
    expect(button).toHaveClass('btn', 'on-dark', 'btn-icon');
    expect(button).toHaveTextContent('');
    // eslint-disable-next-line testing-library/no-node-access -- react-icons renders an unlabeled <svg>; querySelector is the only way to assert the icon is present.
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });

  it('Click_OpensListFormContainer-WithIsEditingAndList', async () => {
    render(<EditListAction list={makeList({ id: 'list-42' })} deleteDisabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit list' }));
    const container = screen.getByTestId('list-form-container');
    expect(container).toHaveAttribute('data-editing', 'true');
    expect(container).toHaveAttribute('data-list-id', 'list-42');
  });

  // Delete now lives in the form's footer, so the floor the pencil's opener
  // resolves is the only thing gating it.
  it('DeleteDisabled_FormRendersItsDeleteDisabled', async () => {
    render(<EditListAction list={makeList()} deleteDisabled />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit list' }));
    expect(screen.getByTestId('list-form-container')).toHaveAttribute(
      'data-delete-disabled',
      'true'
    );
  });

  it('FormOnClose_UnmountsContainer', async () => {
    render(<EditListAction list={makeList()} deleteDisabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit list' }));
    await userEvent.click(screen.getByRole('button', { name: 'close-form' }));
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });
});
