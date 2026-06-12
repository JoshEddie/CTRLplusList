import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ItemNameInput } from '../ItemNameInput';

describe('ItemNameInput', () => {
  it('Value_ShownInInputWithoutError', () => {
    render(<ItemNameInput value="Gift" error="" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Name/)).toHaveValue('Gift');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('Type_FiresOnChangeWithTypedValue', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ItemNameInput value="" error="" onChange={onChange} />);
    await user.type(screen.getByLabelText(/Name/), 'A');
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('Error_RendersErrorMessage', () => {
    render(
      <ItemNameInput value="" error="Name is required" onChange={vi.fn()} />
    );
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
