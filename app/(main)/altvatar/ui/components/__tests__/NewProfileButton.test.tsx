/**
 * Pins `profiles-surface` — the birth form is "an overlay opened from a
 * 'New Altvatar' control in the Altvatars page header, not a route of its own".
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NewProfileButton from '../NewProfileButton';

vi.mock('../NewProfileForm', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="birth-overlay">
      <button type="button" onClick={onClose}>
        Dismiss
      </button>
    </div>
  ),
}));

const control = () => screen.getByRole('button', { name: /new altvatar/i });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NewProfileButton', () => {
  it('Default_RendersControlWithOverlayClosed', () => {
    render(<NewProfileButton />);
    expect(control()).toBeInTheDocument();
    expect(screen.queryByTestId('birth-overlay')).not.toBeInTheDocument();
  });

  it('ClickControl_MountsBirthOverlayInPlace', async () => {
    render(<NewProfileButton />);
    await userEvent.click(control());
    expect(screen.getByTestId('birth-overlay')).toBeInTheDocument();
  });

  it('DismissOverlay_UnmountsItAndLeavesControl', async () => {
    render(<NewProfileButton />);
    await userEvent.click(control());
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('birth-overlay')).not.toBeInTheDocument();
    expect(control()).toBeInTheDocument();
  });
});
