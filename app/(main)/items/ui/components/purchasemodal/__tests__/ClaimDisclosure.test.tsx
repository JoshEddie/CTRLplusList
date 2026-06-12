/* eslint-disable testing-library/no-node-access --
 * The null-name pool row renders with no accessible name, so it is reached
 * through its list item.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClaimDisclosure from '../ClaimDisclosure';

function renderDisclosure(
  overrides: Partial<React.ComponentProps<typeof ClaimDisclosure>> = {}
) {
  const props: React.ComponentProps<typeof ClaimDisclosure> = {
    label: 'Claiming for someone else?',
    circleLabel: "Olivia's circle",
    status: 'ready',
    pool: [
      { id: 'u2', name: 'Sam Smith', image: null },
      { id: 'u5', name: null, image: null },
    ],
    onRetry: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    ...overrides,
  };
  render(<ClaimDisclosure {...props} />);
  return props;
}

const trigger = () =>
  screen.getByRole('button', { name: /Claiming for someone else\?/ });

describe('ClaimDisclosure', () => {
  it('NullNamePoolMemberSelected_ConfirmFallsBackToSomeone', async () => {
    const user = userEvent.setup();
    const { onAttributedClaim } = renderDisclosure();
    await user.click(trigger());
    const rows = screen.getAllByRole('listitem');
    await user.click(rows[1].querySelector('button') as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Confirm — Someone' }));
    expect(onAttributedClaim).toHaveBeenCalledWith({
      id: 'u5',
      name: null,
      image: null,
    });
  });

  it('NullNamePoolMember_NeverMatchesSearchQuery', async () => {
    const user = userEvent.setup();
    renderDisclosure();
    await user.click(trigger());
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    await user.type(screen.getByRole('searchbox'), 'sam');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('ClearSearchClick_RestoresFullPool', async () => {
    const user = userEvent.setup();
    renderDisclosure();
    await user.click(trigger());
    await user.type(screen.getByRole('searchbox'), 'sam');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
