/**
 * Pins the profile space's tab strip: the panels arrive already rendered and
 * the strip only chooses which one shows, so a hidden panel stays mounted and
 * out of the accessibility tree.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ProfileSpaceTabs from '../ProfileSpaceTabs';

const panels = [
  { id: 'permissions', label: 'Permissions', content: <p>Roster</p> },
  { id: 'settings', label: 'Settings', content: <p>Fields</p> },
];

describe('ProfileSpaceTabs', () => {
  it('Render_SelectsTheFirstPanelAndHidesTheRest', () => {
    render(<ProfileSpaceTabs panels={panels} />);

    expect(screen.getByRole('tab', { name: 'Permissions' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    // A hidden panel is out of the accessibility tree, so exactly one is
    // exposed at a time.
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Roster');
  });

  it('ActivateASecondTab_MovesTheSelectionAndTheHiddenPanel', async () => {
    render(<ProfileSpaceTabs panels={panels} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Fields');
    // Both panels stay mounted — they are server-rendered content the strip
    // only shows or hides — so the hidden one is still in the document.
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(2);
    expect(screen.getByText('Roster')).toBeInTheDocument();
  });
});
