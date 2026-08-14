import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StoreEditor } from '../StoreEditor';

function setup(
  over: Partial<React.ComponentProps<typeof StoreEditor>> = {}
) {
  const props: React.ComponentProps<typeof StoreEditor> = {
    name: 'Lodge',
    link: 'https://lodge.example',
    onNameChange: vi.fn(),
    onLinkChange: vi.fn(),
    ...over,
  };
  render(<StoreEditor {...props} />);
  return props;
}

describe('StoreEditor', () => {
  it('Render_ShowsNameAndLinkFieldsOnly', () => {
    setup();
    expect(screen.getByLabelText('Store name')).toHaveValue('Lodge');
    expect(screen.getByLabelText('Link')).toHaveValue('https://lodge.example');
    expect(screen.queryByLabelText('Price')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add another store' })
    ).not.toBeInTheDocument();
  });

  it('TypeInNameField_FiresOnNameChange', async () => {
    const user = userEvent.setup();
    const { onNameChange } = setup({ name: '' });
    await user.type(screen.getByLabelText('Store name'), 'A');
    expect(onNameChange).toHaveBeenCalledWith('A');
  });

  it('TypeInLinkField_FiresOnLinkChange', async () => {
    const user = userEvent.setup();
    const { onLinkChange } = setup({ link: '' });
    await user.type(screen.getByLabelText('Link'), 'h');
    expect(onLinkChange).toHaveBeenCalledWith('h');
  });

  it('EmptyName_ShowsNameErrorNote', () => {
    setup({ name: '' });
    expect(screen.getByText('The store needs a name.')).toBeInTheDocument();
  });

  it('InvalidLink_ShowsLinkErrorNote', () => {
    setup({ link: 'lodge.example' });
    expect(
      screen.getByText('The store needs a valid link.')
    ).toBeInTheDocument();
  });

  it('CompleteNameAndLink_ShowsNoErrorNote', () => {
    setup();
    expect(screen.queryByText(/store needs/)).not.toBeInTheDocument();
  });
});
