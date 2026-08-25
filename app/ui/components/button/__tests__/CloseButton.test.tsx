import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CloseButton } from '../CloseButton';

describe('CloseButton', () => {
  it('Default_RendersButtonNamedClose', () => {
    render(<CloseButton />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('close-button');
  });

  it('CustomLabel_OverridesAccessibleName', () => {
    render(<CloseButton label="Dismiss sign-in" />);
    expect(
      screen.getByRole('button', { name: 'Dismiss sign-in' })
    ).toBeInTheDocument();
  });

  it('Click_FiresOnClick', async () => {
    const onClick = vi.fn();
    render(<CloseButton onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ClassName_AppendsLayoutPivotToPrimitiveClass', () => {
    render(<CloseButton className="deck-screen-close-pivot" />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveClass('close-button', 'deck-screen-close-pivot');
  });
});
