import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DeckStepState } from '../neededSteps';
import { StepTracker } from '../StepTracker';

const STEPS: DeckStepState[] = [
  { step: 'title', complete: true },
  { step: 'price', complete: true },
  { step: 'photo', complete: false },
  { step: 'note', complete: false },
];

function setup(
  over: Partial<{
    viewed: number;
    valid: boolean[];
    reachableCap: number;
    onJump: (i: number) => void;
  }> = {}
) {
  const onJump = over.onJump ?? vi.fn();
  render(
    <StepTracker
      steps={STEPS}
      viewed={over.viewed ?? 2}
      valid={over.valid ?? [true, true, false, false]}
      reachableCap={over.reachableCap ?? 2}
      onJump={onJump}
    />
  );
  return { onJump };
}

describe('StepTracker', () => {
  it('EntryState_MarksDoneCurrentAndFutureNodes', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Go back to The Name' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Go back to The Price' })
    ).toBeEnabled();
    const current = screen.getByRole('button', { name: 'Photo step' });
    expect(current).toHaveAttribute('data-status', 'current');
    expect(current).toBeDisabled();
    const future = screen.getByRole('button', { name: 'Note step' });
    expect(future).toHaveAttribute('data-status', 'future');
    expect(future).toBeDisabled();
  });

  it('ViewedNode_IsOutlinedAndCarriesAriaCurrent', () => {
    setup({ viewed: 0 });
    const onScreen = screen.getByRole('button', { name: 'Name step' });
    expect(onScreen).toHaveAttribute('data-viewed', 'true');
    expect(onScreen).toHaveAttribute('aria-current', 'step');
    // The working step is coloured current but is NOT where the user is.
    expect(
      screen.getByRole('button', { name: 'Go to The Photo' })
    ).not.toHaveAttribute('aria-current');
  });

  it('GroupLabel_ExposesViewedPosition', () => {
    setup({ viewed: 0 });
    expect(
      screen.getByRole('group', { name: 'Progress' })
    ).toHaveTextContent('Step 1 of 4');
  });

  it('DoneNode_ClickJumpsToThatStep', async () => {
    const user = userEvent.setup();
    const { onJump } = setup();
    await user.click(
      screen.getByRole('button', { name: 'Go back to The Name' })
    );
    expect(onJump).toHaveBeenCalledWith(0);
  });

  it('FutureNode_IsNotInteractive', async () => {
    const user = userEvent.setup();
    const { onJump } = setup();
    const future = screen.getByRole('button', { name: 'Note step' });
    expect(future).toBeDisabled();
    await user.click(future);
    expect(onJump).not.toHaveBeenCalled();
  });

  it('CompletedWorkingStep_UnlocksTheNextStep', () => {
    // Photo (the working step) is now valid, so the cap advances onto note.
    setup({ valid: [true, true, true, false], reachableCap: 3 });
    const next = screen.getByRole('button', { name: 'Go to The Note' });
    expect(next).toBeEnabled();
    expect(next).toHaveAttribute('data-status', 'current');
  });

  it('ValidReachableStep_ReadsAsDoneGreen', () => {
    // An optional-but-valid step in reach reads done (green) straight away.
    setup({ viewed: 0, valid: [true, true, true, true], reachableCap: 3 });
    expect(
      screen.getByRole('button', { name: 'Go to The Note' })
    ).toHaveAttribute('data-status', 'done');
  });

  it('ValidStepLockedBehindABrokenStep_ReadsAsFuture', () => {
    // Title on screen, price broken (cap=1): photo is valid but unreachable.
    setup({ viewed: 0, valid: [true, false, true, false], reachableCap: 1 });
    const locked = screen.getByRole('button', { name: 'Photo step' });
    expect(locked).toHaveAttribute('data-status', 'future');
    expect(locked).toBeDisabled();
  });

  it('NotInAriaLiveRegion_AdvanceIsNotAnnounced', () => {
    setup();
    expect(
      screen.getByRole('group', { name: 'Progress' })
    ).not.toHaveAttribute('aria-live');
  });

  it('RovingTabindex_GroupIsOneTabStop', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    const stops = buttons.filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(buttons.filter((b) => b.tabIndex === -1)).toHaveLength(
      buttons.length - 1
    );
  });

  it('JumpingToTheArrowFocusedNode_KeepsATabStopInTheGroup', async () => {
    const user = userEvent.setup();
    const props = {
      steps: STEPS,
      valid: [true, true, false, false],
      reachableCap: 2,
      onJump: vi.fn(),
    };
    const { rerender } = render(<StepTracker {...props} viewed={2} />);
    screen.getByRole('button', { name: 'Go back to The Name' }).focus();
    await user.keyboard('{ArrowRight}');
    // Jump lands on the arrow-focused node, making it the non-interactive
    // viewed step; the tab stop must fall back, not vanish.
    rerender(<StepTracker {...props} viewed={1} />);
    const stops = screen
      .getAllByRole('button')
      .filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
  });

  it('ArrowKeys_MoveFocusBetweenInteractiveNodes', async () => {
    const user = userEvent.setup();
    setup();
    const first = screen.getByRole('button', { name: 'Go back to The Name' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: 'Go back to The Price' })
    ).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveFocus();
    // At the boundary the focus stays put instead of wrapping.
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveFocus();
  });
});
