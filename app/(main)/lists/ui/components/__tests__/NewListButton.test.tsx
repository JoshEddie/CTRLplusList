import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewListButton from '../NewListButton';

vi.mock('../ListFormContainer', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="list-form-container">
      <button type="button" onClick={onClose}>
        close-form
      </button>
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('NewListButton', () => {
  it('Default_RendersBtnPrimaryTrigger-MobileHideLabel-Closed', () => {
    render(<NewListButton />);
    const button = screen.getByRole('button', { name: 'New List' });
    expect(button).toHaveClass('btn', 'primary');
    expect(screen.getByText('New List')).toHaveClass('mobile-hide');
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });

  it('SecondaryVariantWithLabel_RendersBtnSecondaryTrigger-MobileHideLabel', () => {
    render(<NewListButton variant="secondary" label="Add list" />);
    const button = screen.getByRole('button', { name: 'Add list' });
    expect(button).toHaveClass('btn', 'secondary');
    expect(screen.getByText('Add list')).toHaveClass('mobile-hide');
  });

  it('Click_OpensListFormContainer', async () => {
    const user = userEvent.setup();
    render(<NewListButton />);
    await user.click(screen.getByRole('button', { name: 'New List' }));
    expect(screen.getByTestId('list-form-container')).toBeInTheDocument();
  });

  it('FormOnClose_UnmountsContainer', async () => {
    const user = userEvent.setup();
    render(<NewListButton />);
    await user.click(screen.getByRole('button', { name: 'New List' }));
    await user.click(screen.getByRole('button', { name: 'close-form' }));
    expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
  });
});
