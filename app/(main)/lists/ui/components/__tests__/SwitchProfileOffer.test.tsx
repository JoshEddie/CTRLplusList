/**
 * Pins `list-hero-header` — the switch offer is a floating, dismissible card
 * that names the profile and drives the same switch the avatar dropdown does;
 * dismissing collapses it to a chip that restores it.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
import SwitchProfileOffer from '../SwitchProfileOffer';

const switchProfile = vi.fn();
vi.mock('@/app/ui/components/ProfileSwitchProvider', () => ({
  useProfileSwitch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProfileSwitch).mockReturnValue(switchProfile);
});

describe('SwitchProfileOffer', () => {
  it('Render_NamesTheProfileInBothTheNoticeAndTheControl', () => {
    render(<SwitchProfileOffer profileId="kiddo" profileName="Kiddo" />);

    expect(screen.getByRole('status')).toHaveTextContent('Managing as Kiddo');
    expect(
      screen.getByRole('button', { name: 'Switch to Kiddo' })
    ).toBeInTheDocument();
  });

  it('ControlActivated_SwitchesToThatProfileById', async () => {
    const user = userEvent.setup();
    render(<SwitchProfileOffer profileId="kiddo" profileName="Kiddo" />);
    await user.click(screen.getByRole('button', { name: 'Switch to Kiddo' }));

    expect(switchProfile).toHaveBeenCalledWith('kiddo');
  });

  it('Dismissed_CollapsesToARestoringChip', async () => {
    const user = userEvent.setup();
    render(<SwitchProfileOffer profileId="kiddo" profileName="Kiddo" />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // The card is gone; the switch control with it. A chip stands in its place.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Switch to Kiddo' })
    ).not.toBeInTheDocument();
    const chip = screen.getByRole('button', { name: /Managing/ });

    // Restoring brings the card — and its switch control — back.
    await user.click(chip);
    expect(screen.getByRole('status')).toHaveTextContent('Managing as Kiddo');
    expect(
      screen.getByRole('button', { name: 'Switch to Kiddo' })
    ).toBeInTheDocument();
  });
});
